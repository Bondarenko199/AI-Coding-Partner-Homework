"""
Pipeline Integrator / Orchestrator
===================================
Loads sample-transactions.json, wraps each transaction in a message envelope,
and runs the full pipeline: TransactionValidator → FraudDetector → SettlementProcessor.

Usage:
    python integrator.py                        # Run full pipeline
    python integrator.py --dry-run              # Validation only
    python integrator.py --transaction TXN001   # Single transaction

Author: H. Bondarenko
"""

import argparse
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from agents.fraud_detector import FraudDetector
from agents.notification_agent import NotificationAgent
from agents.settlement_processor import SettlementProcessor
from agents.transaction_validator import TransactionValidator


BASE_DIR = Path(".")
SAMPLE_FILE = BASE_DIR / "sample-transactions.json"


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ensure_dirs(base_dir: Path) -> None:
    for sub in ("shared/input", "shared/processing", "shared/output", "shared/results", "shared/notifications"):
        (base_dir / sub).mkdir(parents=True, exist_ok=True)


def _wrap_transaction(txn: dict) -> dict:
    """Wrap a raw transaction record in a message envelope."""
    return {
        "message_id": str(uuid.uuid4()),
        "timestamp": _utcnow(),
        "source_agent": "integrator",
        "target_agent": "transaction_validator",
        "message_type": "transaction",
        "data": txn,
    }


def _load_transactions(txn_id_filter: str | None = None) -> list[dict]:
    if not SAMPLE_FILE.exists():
        raise FileNotFoundError(f"sample-transactions.json not found at {SAMPLE_FILE.resolve()}")
    with SAMPLE_FILE.open() as f:
        transactions = json.load(f)
    if txn_id_filter:
        transactions = [t for t in transactions if t.get("transaction_id") == txn_id_filter]
        if not transactions:
            raise ValueError(f"Transaction {txn_id_filter!r} not found in sample-transactions.json")
    return transactions


def _print_summary(results: list[dict]) -> None:
    print("\n" + "=" * 70)
    print("Banking Pipeline Results")
    print("=" * 70)
    header = f"{'TXN ID':<10} {'Status':<12} {'Risk':<8} {'Disposition':<20} {'Fee':<10}"
    print(header)
    print("-" * 70)

    settled = held = pending = rejected = 0

    for r in results:
        data = r.get("data", {})
        txn_id = data.get("transaction_id", "?")
        val_status = data.get("validation_status", "")
        risk = data.get("risk_level", "N/A") if val_status == "VALIDATED" else "N/A"
        disposition = data.get("disposition", "N/A") if val_status == "VALIDATED" else "N/A"
        fee_amt = data.get("fee_amount", "N/A") if val_status == "VALIDATED" else "N/A"
        currency = data.get("currency", "") if val_status == "VALIDATED" else ""
        fee_str = f"{currency} {fee_amt}" if fee_amt != "N/A" else "N/A"
        display_status = data.get("settlement_status", val_status)

        print(f"{txn_id:<10} {display_status:<12} {risk:<8} {disposition:<20} {fee_str:<10}")

        if display_status == "SETTLED":
            settled += 1
        elif display_status == "HELD":
            held += 1
        elif display_status == "PENDING_REVIEW":
            pending += 1
        elif val_status == "REJECTED":
            rejected += 1

    print("-" * 70)
    print(f"Total: {len(results)} | Settled: {settled} | Held: {held} | "
          f"Pending Review: {pending} | Rejected: {rejected}")

    # Show rejection reasons
    rejected_list = [r for r in results if r.get("data", {}).get("validation_status") == "REJECTED"]
    if rejected_list:
        print("\nRejection Details:")
        for r in rejected_list:
            data = r.get("data", {})
            txn_id = data.get("transaction_id", "?")
            errors = data.get("validation_errors", [])
            print(f"  {txn_id}: {'; '.join(errors)}")
    print()


def run(
    base_dir: str = ".",
    dry_run: bool = False,
    txn_id_filter: str | None = None,
) -> list[dict]:
    """
    Run the full pipeline for all transactions (or a single one if txn_id_filter set).
    Returns list of final result dicts.
    """
    base = Path(base_dir)
    _ensure_dirs(base)

    validator = TransactionValidator(base_dir=str(base))
    fraud_detector = FraudDetector(base_dir=str(base))
    notification_agent = NotificationAgent(base_dir=str(base))
    settlement = SettlementProcessor(base_dir=str(base))

    transactions = _load_transactions(txn_id_filter)
    final_results: list[dict] = []

    for txn in transactions:
        message = _wrap_transaction(txn)
        msg_id = message["message_id"]
        txn_id = txn.get("transaction_id", "?")

        # Write to shared/input/
        input_path = base / "shared" / "input" / f"{msg_id}.json"
        input_path.write_text(json.dumps(message, indent=2))

        # Stage 1: Validation
        validated = validator.process_message(message)
        val_status = validated.get("data", {}).get("validation_status", "REJECTED")

        if val_status == "REJECTED" or dry_run:
            final_results.append(validated)
            continue

        # Stage 2: Fraud Detection
        scored = fraud_detector.process_message(validated)

        # Stage 2b: Notifications (side effect — scored is not modified)
        notification_agent.process_message(scored)

        # Stage 3: Settlement
        result = settlement.process_message(scored)
        final_results.append(result)

    return final_results


def main() -> None:
    parser = argparse.ArgumentParser(description="Banking Pipeline Integrator")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run validation only, skip fraud detection and settlement",
    )
    parser.add_argument(
        "--transaction",
        metavar="TXN_ID",
        help="Process a single transaction by ID",
    )
    args = parser.parse_args()

    results = run(dry_run=args.dry_run, txn_id_filter=args.transaction)
    _print_summary(results)


if __name__ == "__main__":
    main()
