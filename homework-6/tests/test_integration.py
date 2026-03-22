"""
Integration tests for the full banking pipeline.

Tests run the complete validator → fraud_detector → settlement_processor chain
using isolated tmp_path directories.
"""

import json
from pathlib import Path

import pytest

from agents.fraud_detector import FraudDetector
from agents.settlement_processor import SettlementProcessor
from agents.transaction_validator import TransactionValidator
from tests.conftest import (
    make_message,
    txn_high_value_wire,
    txn_invalid_currency,
    txn_negative_amount,
    txn_normal_salary,
    txn_structuring,
    txn_unusual_hour_crossborder,
    txn_valid_usd,
    txn_very_large_wire,
)


ALL_SAMPLE_TRANSACTIONS = [
    txn_valid_usd(),
    txn_high_value_wire(),
    txn_structuring(),
    txn_unusual_hour_crossborder(),
    txn_very_large_wire(),
    txn_invalid_currency(),
    txn_negative_amount(),
    txn_normal_salary(),
]


def _run_pipeline(tmp_path: Path, txn_data: dict) -> dict:
    """Run a single transaction through the complete pipeline."""
    v = TransactionValidator(base_dir=str(tmp_path))
    fd = FraudDetector(base_dir=str(tmp_path))
    sp = SettlementProcessor(base_dir=str(tmp_path))

    msg = make_message(txn_data)
    validated = v.process_message(msg)
    if validated["data"]["validation_status"] == "REJECTED":
        return validated
    scored = fd.process_message(validated)
    return sp.process_message(scored)


# ---------------------------------------------------------------------------
# Individual transaction integration tests
# ---------------------------------------------------------------------------

def test_txn001_full_pipeline_settled(tmp_shared_dirs):
    result = _run_pipeline(tmp_shared_dirs, txn_valid_usd())
    assert result["data"]["settlement_status"] == "SETTLED"
    assert result["data"]["risk_level"] == "LOW"


def test_txn001_result_file_in_results(tmp_shared_dirs):
    _run_pipeline(tmp_shared_dirs, txn_valid_usd())
    assert (tmp_shared_dirs / "shared" / "results" / "TXN001_result.json").exists()


def test_txn002_full_pipeline_held(tmp_shared_dirs):
    result = _run_pipeline(tmp_shared_dirs, txn_high_value_wire())
    assert result["data"]["settlement_status"] == "HELD"


def test_txn003_full_pipeline_manual_review(tmp_shared_dirs):
    result = _run_pipeline(tmp_shared_dirs, txn_structuring())
    assert result["data"]["settlement_status"] == "PENDING_REVIEW"


def test_txn004_full_pipeline_held(tmp_shared_dirs):
    result = _run_pipeline(tmp_shared_dirs, txn_unusual_hour_crossborder())
    assert result["data"]["settlement_status"] == "HELD"


def test_txn005_full_pipeline_held(tmp_shared_dirs):
    result = _run_pipeline(tmp_shared_dirs, txn_very_large_wire())
    assert result["data"]["settlement_status"] == "HELD"


def test_txn006_rejected_at_validator(tmp_shared_dirs):
    result = _run_pipeline(tmp_shared_dirs, txn_invalid_currency())
    assert result["data"]["validation_status"] == "REJECTED"


def test_txn007_rejected_at_validator(tmp_shared_dirs):
    result = _run_pipeline(tmp_shared_dirs, txn_negative_amount())
    assert result["data"]["validation_status"] == "REJECTED"


def test_txn008_full_pipeline_settled(tmp_shared_dirs):
    result = _run_pipeline(tmp_shared_dirs, txn_normal_salary())
    assert result["data"]["settlement_status"] == "SETTLED"


# ---------------------------------------------------------------------------
# Rejection short-circuit: rejected transaction must not advance to processing
# ---------------------------------------------------------------------------

def test_txn006_not_in_processing(tmp_shared_dirs):
    _run_pipeline(tmp_shared_dirs, txn_invalid_currency())
    processing_files = list((tmp_shared_dirs / "shared" / "processing").glob("*.json"))
    assert len(processing_files) == 0, "Rejected transaction must not reach shared/processing/"


def test_txn006_not_in_output(tmp_shared_dirs):
    _run_pipeline(tmp_shared_dirs, txn_invalid_currency())
    output_files = list((tmp_shared_dirs / "shared" / "output").glob("*.json"))
    assert len(output_files) == 0, "Rejected transaction must not reach shared/output/"


def test_txn006_rejected_in_results(tmp_shared_dirs):
    _run_pipeline(tmp_shared_dirs, txn_invalid_currency())
    assert (tmp_shared_dirs / "shared" / "results" / "TXN006_rejected.json").exists()


# ---------------------------------------------------------------------------
# All 8 transactions — aggregate outcome check
# ---------------------------------------------------------------------------

def test_all_8_transactions_produce_result_files(tmp_shared_dirs):
    for txn in ALL_SAMPLE_TRANSACTIONS:
        _run_pipeline(tmp_shared_dirs, txn)
    result_files = list((tmp_shared_dirs / "shared" / "results").glob("*.json"))
    assert len(result_files) == 8, f"Expected 8 result files, got {len(result_files)}"


def test_all_8_transactions_disposition_summary(tmp_shared_dirs):
    """Verify the expected distribution of outcomes for all 8 sample transactions."""
    expected = {
        "TXN001": "SETTLED",
        "TXN002": "HELD",
        "TXN003": "PENDING_REVIEW",
        "TXN004": "HELD",
        "TXN005": "HELD",
        "TXN006": "REJECTED",
        "TXN007": "REJECTED",
        "TXN008": "SETTLED",
    }
    for txn in ALL_SAMPLE_TRANSACTIONS:
        result = _run_pipeline(tmp_shared_dirs, txn)
        data = result["data"]
        txn_id = data["transaction_id"]
        actual = data.get("settlement_status", data.get("validation_status", "?"))
        assert actual == expected[txn_id], \
            f"{txn_id}: expected {expected[txn_id]}, got {actual}"


# ---------------------------------------------------------------------------
# File progression test (TXN001 stages)
# ---------------------------------------------------------------------------

def test_txn001_file_progression(tmp_shared_dirs):
    """Verify TXN001 leaves files in input and arrives in results."""
    import uuid
    import json as _json

    v = TransactionValidator(base_dir=str(tmp_shared_dirs))
    fd = FraudDetector(base_dir=str(tmp_shared_dirs))
    sp = SettlementProcessor(base_dir=str(tmp_shared_dirs))

    txn = txn_valid_usd()
    msg = make_message(txn)
    msg_id = msg["message_id"]

    # Write to input manually (as integrator would)
    input_path = tmp_shared_dirs / "shared" / "input" / f"{msg_id}.json"
    input_path.write_text(_json.dumps(msg, indent=2))
    assert input_path.exists(), "Input file must be written"

    validated = v.process_message(msg)
    proc_id = validated["message_id"]
    proc_path = tmp_shared_dirs / "shared" / "processing" / f"{proc_id}.json"
    assert proc_path.exists(), "Validated file must be in shared/processing/"

    scored = fd.process_message(validated)
    out_id = scored["message_id"]
    out_path = tmp_shared_dirs / "shared" / "output" / f"{out_id}.json"
    assert out_path.exists(), "Scored file must be in shared/output/"

    sp.process_message(scored)
    result_path = tmp_shared_dirs / "shared" / "results" / "TXN001_result.json"
    assert result_path.exists(), "Final result must be in shared/results/"


# ---------------------------------------------------------------------------
# Result file content integrity
# ---------------------------------------------------------------------------

def test_result_file_preserves_transaction_id(tmp_shared_dirs):
    _run_pipeline(tmp_shared_dirs, txn_valid_usd())
    result_file = tmp_shared_dirs / "shared" / "results" / "TXN001_result.json"
    data = json.loads(result_file.read_text())["data"]
    assert data["transaction_id"] == "TXN001"


def test_result_file_has_all_pipeline_fields(tmp_shared_dirs):
    _run_pipeline(tmp_shared_dirs, txn_valid_usd())
    result_file = tmp_shared_dirs / "shared" / "results" / "TXN001_result.json"
    data = json.loads(result_file.read_text())["data"]
    for field in ("validation_status", "risk_level", "risk_score",
                  "disposition", "settlement_status", "fee_amount", "net_amount"):
        assert field in data, f"Missing field in result: {field}"
