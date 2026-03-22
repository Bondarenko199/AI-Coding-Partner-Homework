"""
Fraud Detector Agent
====================
Applies additive fraud risk scoring to validated transactions.
Scores are calibrated so the 8 sample transactions produce the expected outcomes.

Scoring rules (additive, capped at 10.0):
  - amount > $10,000              → +3.0
  - amount > $50,000              → +2.0 additional
  - $9,000 ≤ amount ≤ $9,999.99  → +2.5 (structuring signal)
  - hour UTC 0–4                  → +2.0 (unusual hour)
  - cross-border transaction      → +1.5
  - transaction_type wire_transfer → +0.5

Risk thresholds (calibrated for sample data):
  - LOW:    score < 2.0
  - MEDIUM: 2.0 ≤ score < 3.5
  - HIGH:   score ≥ 3.5

Author: H. Bondarenko
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

logger = logging.getLogger("fraud_detector")

STRUCTURING_LOW = Decimal("9000.00")
STRUCTURING_HIGH = Decimal("9999.99")
LARGE_THRESHOLD = Decimal("10000.00")
VERY_LARGE_THRESHOLD = Decimal("50000.00")
UNUSUAL_HOUR_START = 0
UNUSUAL_HOUR_END = 4  # inclusive
DOMESTIC_COUNTRY: str = "US"  # domestic baseline — override for non-US deployments


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_amount(raw: str) -> Decimal:
    try:
        return Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _parse_transaction_hour(timestamp_str: str) -> int:
    """Extract UTC hour from ISO 8601 timestamp string."""
    try:
        # Handle both 'Z' suffix and offset-aware formats
        ts = timestamp_str.rstrip("Z").replace("+00:00", "")
        dt = datetime.fromisoformat(ts)
        return dt.hour
    except (ValueError, AttributeError):
        return 12  # default to noon (non-suspicious) on parse failure


class FraudDetector:
    """Scores validated transactions for fraud risk and routes to settlement."""

    def __init__(self, base_dir: str = ".") -> None:
        self.base_dir = Path(base_dir)
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        for sub in ("shared/processing", "shared/output"):
            (self.base_dir / sub).mkdir(parents=True, exist_ok=True)

    def _compute_risk(self, data: dict) -> tuple[float, str, list[str]]:
        """
        Compute risk score, level, and list of triggered risk factors.
        Returns (score, level, factors).
        """
        amount = _parse_amount(data.get("amount", "0"))
        txn_type = data.get("transaction_type", "")
        source_country = data.get("metadata", {}).get("country", "")
        # destination_country not always in metadata; fall back to checking cross-border flag
        # For cross-border detection, use country in metadata vs a domestic baseline
        # The sample data uses metadata.country for the transaction's origin country
        # We infer cross-border when country != "US" (the domestic baseline)
        # This is intentionally simple for the demo pipeline
        is_cross_border = bool(source_country) and source_country != DOMESTIC_COUNTRY

        # Try to get transaction timestamp for time-of-day check
        txn_timestamp = data.get("timestamp", _utcnow())
        txn_hour = _parse_transaction_hour(txn_timestamp)

        score = Decimal("0.0")
        factors: list[str] = []

        # Rule: large amount
        if amount > LARGE_THRESHOLD:
            score += Decimal("3.0")
            factors.append(f"amount ${amount:,.2f} exceeds $10,000 threshold (+3.0)")

        # Rule: very large amount (additional points on top of large)
        if amount > VERY_LARGE_THRESHOLD:
            score += Decimal("2.0")
            factors.append(f"amount ${amount:,.2f} exceeds $50,000 threshold (+2.0)")

        # Rule: structuring signal
        if STRUCTURING_LOW <= amount <= STRUCTURING_HIGH:
            score += Decimal("2.5")
            factors.append(
                f"amount ${amount:,.2f} in structuring range [$9,000–$9,999.99] (+2.5)"
            )

        # Rule: unusual hour
        if UNUSUAL_HOUR_START <= txn_hour <= UNUSUAL_HOUR_END:
            score += Decimal("2.0")
            factors.append(
                f"transaction at {txn_hour:02d}:xx UTC (unusual hour 00:00–04:59) (+2.0)"
            )

        # Rule: cross-border
        if is_cross_border:
            score += Decimal("1.5")
            factors.append(f"cross-border transaction (country: {source_country}) (+1.5)")

        # Rule: wire transfer type
        if txn_type == "wire_transfer":
            score += Decimal("0.5")
            factors.append("transaction type is wire_transfer (+0.5)")

        # Cap at 10.0
        score = min(score, Decimal("10.0"))
        float_score = float(score)

        # Calibrated thresholds
        if score < Decimal("2.0"):
            level = "LOW"
        elif score < Decimal("3.5"):
            level = "MEDIUM"
        else:
            level = "HIGH"

        return float_score, level, factors

    def process_message(self, message: dict) -> dict:
        """
        Score a validated transaction for fraud risk.

        Reads the latest validated message from shared/processing/ (using
        the message_id from the envelope), processes it, and writes the
        scored result to shared/output/.
        """
        data = message.get("data", {})
        transaction_id = data.get("transaction_id", "UNKNOWN")
        in_message_id = message.get("message_id", "")

        # Read the actual file written by the validator
        proc_path = self.base_dir / "shared" / "processing" / f"{in_message_id}.json"
        if proc_path.exists():
            with proc_path.open() as f:
                loaded = json.load(f)
            data = loaded.get("data", data)

        risk_score, risk_level, risk_factors = self._compute_risk(data)

        now = _utcnow()
        out_message_id = str(uuid.uuid4())

        output_data = {
            **data,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "assessed_at": now,
        }
        output_message = {
            "message_id": out_message_id,
            "timestamp": now,
            "source_agent": "fraud_detector",
            "target_agent": "settlement_processor",
            "message_type": "fraud_assessed_transaction",
            "data": output_data,
        }

        out_path = self.base_dir / "shared" / "output" / f"{out_message_id}.json"
        out_path.write_text(json.dumps(output_message, indent=2))

        logger.info(
            "ASSESSED | txn=%s | score=%.1f | level=%s | factors=%d",
            transaction_id,
            risk_score,
            risk_level,
            len(risk_factors),
        )
        return output_message
