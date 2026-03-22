"""Unit tests for TransactionValidator."""

import json
from decimal import Decimal
from pathlib import Path

import pytest

from agents.transaction_validator import TransactionValidator
from tests.conftest import (
    make_message,
    txn_invalid_currency,
    txn_negative_amount,
    txn_valid_usd,
)


def _make_validator(tmp_path: Path) -> TransactionValidator:
    return TransactionValidator(base_dir=str(tmp_path))


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

def test_valid_usd_transfer_returns_validated(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    msg = make_message(txn_valid_usd())
    result = v.process_message(msg)
    assert result["data"]["validation_status"] == "VALIDATED"


def test_valid_usd_writes_to_processing(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    msg = make_message(txn_valid_usd())
    result = v.process_message(msg)
    out_msg_id = result["message_id"]
    proc_file = tmp_shared_dirs / "shared" / "processing" / f"{out_msg_id}.json"
    assert proc_file.exists(), "Expected file in shared/processing/"


def test_valid_usd_not_in_results(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    msg = make_message(txn_valid_usd())
    v.process_message(msg)
    results = list((tmp_shared_dirs / "shared" / "results").glob("*.json"))
    assert len(results) == 0, "Valid transaction should NOT go to shared/results/"


def test_amount_normalized_to_two_decimals(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    txn = txn_valid_usd()
    txn["amount"] = "1500"  # no decimal places
    msg = make_message(txn)
    result = v.process_message(msg)
    assert result["data"]["amount"] == "1500.00"


def test_message_envelope_has_required_keys(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    result = v.process_message(make_message(txn_valid_usd()))
    for key in ("message_id", "timestamp", "source_agent", "target_agent", "message_type", "data"):
        assert key in result, f"Missing key: {key}"


def test_validated_target_agent_is_fraud_detector(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    result = v.process_message(make_message(txn_valid_usd()))
    assert result["target_agent"] == "fraud_detector"


def test_valid_eur_transfer(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    from tests.conftest import txn_unusual_hour_crossborder
    result = v.process_message(make_message(txn_unusual_hour_crossborder()))
    assert result["data"]["validation_status"] == "VALIDATED"


def test_currency_uppercased_in_output(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    txn = txn_valid_usd()
    txn["currency"] = "usd"
    result = v.process_message(make_message(txn))
    assert result["data"]["currency"] == "USD"


# ---------------------------------------------------------------------------
# Rejection: invalid currency
# ---------------------------------------------------------------------------

def test_invalid_currency_xyz_rejected(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    result = v.process_message(make_message(txn_invalid_currency()))
    assert result["data"]["validation_status"] == "REJECTED"


def test_invalid_currency_error_message(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    result = v.process_message(make_message(txn_invalid_currency()))
    errors = result["data"]["validation_errors"]
    assert any("XYZ" in e for e in errors)


def test_invalid_currency_writes_to_results(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    v.process_message(make_message(txn_invalid_currency()))
    result_file = tmp_shared_dirs / "shared" / "results" / "TXN006_rejected.json"
    assert result_file.exists()


def test_invalid_currency_not_in_processing(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    v.process_message(make_message(txn_invalid_currency()))
    processing_files = list((tmp_shared_dirs / "shared" / "processing").glob("*.json"))
    assert len(processing_files) == 0


# ---------------------------------------------------------------------------
# Rejection: negative amount
# ---------------------------------------------------------------------------

def test_negative_amount_rejected(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    result = v.process_message(make_message(txn_negative_amount()))
    assert result["data"]["validation_status"] == "REJECTED"


def test_negative_amount_error_message(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    result = v.process_message(make_message(txn_negative_amount()))
    errors = result["data"]["validation_errors"]
    assert any("positive" in e.lower() or "-100" in e for e in errors)


# ---------------------------------------------------------------------------
# Rejection: zero amount
# ---------------------------------------------------------------------------

def test_zero_amount_rejected(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    txn = txn_valid_usd()
    txn["amount"] = "0"
    result = v.process_message(make_message(txn))
    assert result["data"]["validation_status"] == "REJECTED"


# ---------------------------------------------------------------------------
# Rejection: non-numeric amount
# ---------------------------------------------------------------------------

def test_non_numeric_amount_rejected(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    txn = txn_valid_usd()
    txn["amount"] = "not-a-number"
    result = v.process_message(make_message(txn))
    assert result["data"]["validation_status"] == "REJECTED"


# ---------------------------------------------------------------------------
# Rejection: missing required fields
# ---------------------------------------------------------------------------

def test_missing_amount_field_rejected(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    txn = txn_valid_usd()
    del txn["amount"]
    result = v.process_message(make_message(txn))
    assert result["data"]["validation_status"] == "REJECTED"
    assert any("amount" in e for e in result["data"]["validation_errors"])


def test_missing_currency_field_rejected(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    txn = txn_valid_usd()
    del txn["currency"]
    result = v.process_message(make_message(txn))
    assert result["data"]["validation_status"] == "REJECTED"
    assert any("currency" in e for e in result["data"]["validation_errors"])


def test_missing_transaction_id_rejected(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    txn = txn_valid_usd()
    del txn["transaction_id"]
    result = v.process_message(make_message(txn))
    assert result["data"]["validation_status"] == "REJECTED"


def test_missing_source_account_rejected(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    txn = txn_valid_usd()
    del txn["source_account"]
    result = v.process_message(make_message(txn))
    assert result["data"]["validation_status"] == "REJECTED"


# ---------------------------------------------------------------------------
# Output file content
# ---------------------------------------------------------------------------

def test_processing_file_is_valid_json(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    result = v.process_message(make_message(txn_valid_usd()))
    out_id = result["message_id"]
    proc_file = tmp_shared_dirs / "shared" / "processing" / f"{out_id}.json"
    loaded = json.loads(proc_file.read_text())
    assert loaded["data"]["validation_status"] == "VALIDATED"


def test_rejected_file_is_valid_json(tmp_shared_dirs):
    v = _make_validator(tmp_shared_dirs)
    v.process_message(make_message(txn_invalid_currency()))
    result_file = tmp_shared_dirs / "shared" / "results" / "TXN006_rejected.json"
    loaded = json.loads(result_file.read_text())
    assert loaded["data"]["validation_status"] == "REJECTED"
