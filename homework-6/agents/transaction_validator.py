"""
Transaction Validator Agent
===========================
Validates incoming banking transactions for required fields, positive decimal
amounts, and ISO 4217 currency codes. Routes valid transactions to
shared/processing/ and rejected transactions directly to shared/results/.

Author: H. Bondarenko
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger("transaction_validator")

ISO_4217_CODES: frozenset[str] = frozenset(
    {
        "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "SGD", "HKD",
        "MXN", "BRL", "CNY", "KRW", "INR", "NOK", "SEK", "DKK", "NZD",
        "ZAR", "TRY", "RUB", "PLN", "CZK", "HUF", "RON", "BGN", "HRK",
    }
)

REQUIRED_FIELDS: tuple[str, ...] = (
    "transaction_id",
    "amount",
    "currency",
    "transaction_type",
    "source_account",
    "destination_account",
)


def _mask_account(account: str) -> str:
    """Mask account number for safe logging (show last 4 chars only)."""
    if len(account) <= 4:
        return "****"
    return f"****{account[-4:]}"


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class TransactionValidator:
    """Validates transaction messages and routes them to the next pipeline stage."""

    def __init__(self, base_dir: str = ".") -> None:
        self.base_dir = Path(base_dir)
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        for sub in ("shared/input", "shared/processing", "shared/output", "shared/results"):
            (self.base_dir / sub).mkdir(parents=True, exist_ok=True)

    def _validate_required_fields(self, data: dict) -> list[str]:
        return [f for f in REQUIRED_FIELDS if f not in data or data[f] is None]

    def _validate_amount(self, raw_amount: str) -> tuple[Decimal | None, str | None]:
        try:
            amount = Decimal(str(raw_amount))
        except (InvalidOperation, TypeError, ValueError):
            return None, f"amount '{raw_amount}' is not a valid decimal number"
        if amount <= Decimal("0"):
            return None, f"amount must be positive, got {amount}"
        return amount, None

    def _validate_currency(self, currency: str) -> str | None:
        if currency.upper() not in ISO_4217_CODES:
            return f"'{currency}' is not a recognized ISO 4217 currency code"
        return None

    def process_message(self, message: dict) -> dict:
        """
        Validate a transaction message.

        Returns the output message dict (also written to shared/processing/ or
        shared/results/ depending on validation outcome).
        """
        data = message.get("data", {})
        transaction_id = data.get("transaction_id", "UNKNOWN")
        source_account = data.get("source_account", "")
        masked_account = _mask_account(source_account)

        errors: list[str] = []

        # 1. Required fields
        missing = self._validate_required_fields(data)
        if missing:
            errors.extend(f"missing required field: {f}" for f in missing)

        # 2. Amount (only if field present)
        validated_amount: Decimal | None = None
        if "amount" in data:
            validated_amount, amount_error = self._validate_amount(data["amount"])
            if amount_error:
                errors.append(amount_error)

        # 3. Currency (only if field present)
        if "currency" in data:
            currency_error = self._validate_currency(data["currency"])
            if currency_error:
                errors.append(currency_error)

        now = _utcnow()
        out_message_id = str(uuid.uuid4())

        if errors:
            # REJECTED — write directly to shared/results/
            output_data = {**data, "validation_status": "REJECTED", "validation_errors": errors, "validated_at": now}
            output_message = {
                "message_id": out_message_id,
                "timestamp": now,
                "source_agent": "transaction_validator",
                "target_agent": "results_store",
                "message_type": "rejected_transaction",
                "data": output_data,
            }
            result_path = self.base_dir / "shared" / "results" / f"{transaction_id}_rejected.json"
            result_path.write_text(json.dumps(output_message, indent=2))
            logger.info(
                "REJECTED | txn=%s | account=%s | errors=%s",
                transaction_id,
                masked_account,
                errors,
            )
        else:
            # VALIDATED — normalize amount and forward to fraud detector
            normalized_amount = validated_amount.quantize(Decimal("0.01"))
            output_data = {
                **data,
                "amount": str(normalized_amount),
                "currency": data["currency"].upper(),
                "validation_status": "VALIDATED",
                "validation_errors": [],
                "validated_at": now,
            }
            output_message = {
                "message_id": out_message_id,
                "timestamp": now,
                "source_agent": "transaction_validator",
                "target_agent": "fraud_detector",
                "message_type": "validated_transaction",
                "data": output_data,
            }
            proc_path = self.base_dir / "shared" / "processing" / f"{out_message_id}.json"
            proc_path.write_text(json.dumps(output_message, indent=2))
            logger.info(
                "VALIDATED | txn=%s | account=%s | amount=%s %s",
                transaction_id,
                masked_account,
                normalized_amount,
                data.get("currency", ""),
            )

        return output_message
