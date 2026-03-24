"""
Notification Agent
==================
6th pipeline agent — fires alerts for high-risk or rejected transactions.

Alert rules (configurable via config/rules.json):
  - risk_level in alert_on_risk_levels  → risk-level alert
  - validation_status == "REJECTED" AND alert_on_rejected → rejection alert

Writes alert files to shared/notifications/{transaction_id}_alert.json.

Author: H. Bondarenko
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("notification_agent")

ALERT_TYPE_MAP = {
    "HIGH": "HIGH_RISK_FLAGGED",
    "MEDIUM": "MEDIUM_RISK_FLAGGED",
}


def _load_rules(base_dir: str) -> dict:
    path = Path(base_dir) / "config" / "rules.json"
    if path.exists():
        with path.open() as f:
            return json.load(f)
    return {}


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class NotificationAgent:
    """Sends alerts for high-risk or rejected transactions."""

    def __init__(self, base_dir: str = ".") -> None:
        self.base_dir = Path(base_dir)
        cfg = _load_rules(base_dir).get("notifications", {})
        self.alert_levels = set(cfg.get("alert_on_risk_levels", ["HIGH"]))
        self.alert_on_rejected = cfg.get("alert_on_rejected", True)
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        (self.base_dir / "shared" / "notifications").mkdir(parents=True, exist_ok=True)

    def process_message(self, message: dict) -> dict:
        """
        Evaluate a fraud-assessed message and fire an alert if warranted.

        Follows the file-based protocol: reads from shared/output/{message_id}.json
        if the file exists (consistent with FraudDetector and SettlementProcessor).
        Returns the alert dict if an alert was triggered, or {"alerted": false}.
        """
        in_message_id = message.get("message_id", "")
        data = message.get("data", {})

        # File-based fallback: read from shared/output/ if written by fraud_detector
        out_path = self.base_dir / "shared" / "output" / f"{in_message_id}.json"
        if out_path.exists():
            with out_path.open() as f:
                loaded = json.load(f)
            data = loaded.get("data", data)

        transaction_id = data.get("transaction_id", "UNKNOWN")
        risk_level = data.get("risk_level", "")
        validation_status = data.get("validation_status", "")

        should_alert_risk = risk_level in self.alert_levels
        should_alert_rejected = self.alert_on_rejected and validation_status == "REJECTED"

        if not (should_alert_risk or should_alert_rejected):
            return {"alerted": False}

        now = _utcnow()

        if should_alert_rejected and not should_alert_risk:
            alert_type = "TRANSACTION_REJECTED"
        else:
            alert_type = ALERT_TYPE_MAP.get(risk_level, f"{risk_level}_RISK_FLAGGED")

        alert = {
            "message_id": str(uuid.uuid4()),
            "timestamp": now,
            "source_agent": "notification_agent",
            "target_agent": "audit_log",
            "message_type": "alert",
            "data": {
                "transaction_id": transaction_id,
                "alert_type": alert_type,
                "risk_level": risk_level or None,
                "risk_score": data.get("risk_score"),
                "risk_factors": data.get("risk_factors", []),
                "amount": str(data.get("amount", "")),
                "currency": data.get("currency", ""),
                "alerted_at": now,
            },
        }

        alert_path = (
            self.base_dir / "shared" / "notifications" / f"{transaction_id}_alert.json"
        )
        alert_path.write_text(json.dumps(alert, indent=2))

        logger.info(
            "ALERT | txn=%s | type=%s | risk=%s",
            transaction_id,
            alert_type,
            risk_level or "N/A",
        )
        return alert
