"""
Settlement Processor Agent
==========================
Applies final disposition to fraud-assessed transactions.

Disposition rules:
  - LOW risk    → AUTO_SETTLE  / SETTLED       (with fee calculation)
  - MEDIUM risk → MANUAL_REVIEW / PENDING_REVIEW (fee deferred: 0.00)
  - HIGH risk   → HELD          / HELD           (fee deferred: 0.00)

Fee rates (applied only for SETTLED):
  - transfer:      0.25% (0.0025)
  - wire_transfer: 0.50% (0.0050)
  - payment:       0.15% (0.0015)
  - default:       0.25% (0.0025)

All monetary arithmetic uses decimal.Decimal with ROUND_HALF_UP.

Author: H. Bondarenko
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path

logger = logging.getLogger("settlement_processor")

FEE_RATES: dict[str, Decimal] = {
    "transfer": Decimal("0.0025"),
    "wire_transfer": Decimal("0.0050"),
    "payment": Decimal("0.0015"),
}
DEFAULT_FEE_RATE = Decimal("0.0025")
TWO_PLACES = Decimal("0.01")

DISPOSITION_MAP: dict[str, tuple[str, str]] = {
    "LOW": ("AUTO_SETTLE", "SETTLED"),
    "MEDIUM": ("MANUAL_REVIEW", "PENDING_REVIEW"),
    "HIGH": ("HELD", "HELD"),
}


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_amount(raw: str) -> Decimal:
    try:
        return Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


class SettlementProcessor:
    """Applies final disposition and fee calculation to fraud-assessed transactions."""

    def __init__(self, base_dir: str = ".") -> None:
        self.base_dir = Path(base_dir)
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        for sub in ("shared/output", "shared/results"):
            (self.base_dir / sub).mkdir(parents=True, exist_ok=True)

    def _calculate_fee(self, amount: Decimal, txn_type: str) -> tuple[Decimal, Decimal, Decimal]:
        """
        Returns (fee_rate, fee_amount, net_amount) as Decimal values.
        """
        rate = FEE_RATES.get(txn_type, DEFAULT_FEE_RATE)
        fee = (amount * rate).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        net = amount - fee
        return rate, fee, net

    def process_message(self, message: dict) -> dict:
        """
        Apply settlement disposition to a fraud-assessed transaction.

        Reads the fraud-assessed file from shared/output/ (identified by
        message_id), applies disposition and fee logic, and writes the
        final result to shared/results/.
        """
        data = message.get("data", {})
        transaction_id = data.get("transaction_id", "UNKNOWN")
        in_message_id = message.get("message_id", "")

        # Read the actual file written by fraud_detector
        out_path = self.base_dir / "shared" / "output" / f"{in_message_id}.json"
        if out_path.exists():
            with out_path.open() as f:
                loaded = json.load(f)
            data = loaded.get("data", data)

        risk_level = data.get("risk_level", "HIGH")
        txn_type = data.get("transaction_type", "transfer")
        amount = _parse_amount(data.get("amount", "0"))
        currency = data.get("currency", "USD")

        disposition, settlement_status = DISPOSITION_MAP.get(risk_level, ("HELD", "HELD"))

        now = _utcnow()
        out_message_id = str(uuid.uuid4())

        if settlement_status == "SETTLED":
            fee_rate, fee_amount, net_amount = self._calculate_fee(amount, txn_type)
            fee_rate_str = str(fee_rate)
            fee_amount_str = str(fee_amount.quantize(TWO_PLACES))
            net_amount_str = str(net_amount.quantize(TWO_PLACES))
        else:
            fee_rate_str = "0.0000"
            fee_amount_str = "0.00"
            net_amount_str = str(amount.quantize(TWO_PLACES))

        output_data = {
            **data,
            "disposition": disposition,
            "settlement_status": settlement_status,
            "fee_amount": fee_amount_str,
            "fee_currency": currency,
            "fee_rate": fee_rate_str,
            "net_amount": net_amount_str,
            "processed_at": now,
        }
        output_message = {
            "message_id": out_message_id,
            "timestamp": now,
            "source_agent": "settlement_processor",
            "target_agent": "results_store",
            "message_type": "settlement_result",
            "data": output_data,
        }

        result_path = self.base_dir / "shared" / "results" / f"{transaction_id}_result.json"
        result_path.write_text(json.dumps(output_message, indent=2))

        logger.info(
            "SETTLED | txn=%s | risk=%s | disposition=%s | fee=%s %s",
            transaction_id,
            risk_level,
            disposition,
            fee_amount_str,
            currency,
        )
        return output_message
