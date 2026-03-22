"""Unit tests for FraudDetector."""

import json
from pathlib import Path

import pytest

from agents.fraud_detector import FraudDetector
from agents.transaction_validator import TransactionValidator
from tests.conftest import (
    make_message,
    txn_high_value_wire,
    txn_normal_salary,
    txn_structuring,
    txn_unusual_hour_crossborder,
    txn_valid_usd,
    txn_very_large_wire,
)


def _pipeline_to_fraud(tmp_path: Path, txn_data: dict) -> dict:
    """Run a transaction through validation, then return the fraud detector result."""
    v = TransactionValidator(base_dir=str(tmp_path))
    fd = FraudDetector(base_dir=str(tmp_path))
    validated = v.process_message(make_message(txn_data))
    assert validated["data"]["validation_status"] == "VALIDATED", \
        f"Precondition failed: transaction was rejected: {validated['data'].get('validation_errors')}"
    return fd.process_message(validated)


# ---------------------------------------------------------------------------
# Risk levels for sample transactions
# ---------------------------------------------------------------------------

def test_txn001_low_risk(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_valid_usd())
    assert result["data"]["risk_level"] == "LOW"


def test_txn002_high_risk(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_high_value_wire())
    assert result["data"]["risk_level"] == "HIGH"


def test_txn003_medium_risk_structuring(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_structuring())
    assert result["data"]["risk_level"] == "MEDIUM"


def test_txn004_high_risk_unusual_hour_crossborder(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_unusual_hour_crossborder())
    assert result["data"]["risk_level"] == "HIGH"


def test_txn005_high_risk_very_large(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_very_large_wire())
    assert result["data"]["risk_level"] == "HIGH"


def test_txn008_low_risk(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_normal_salary())
    assert result["data"]["risk_level"] == "LOW"


# ---------------------------------------------------------------------------
# Individual scoring rules
# ---------------------------------------------------------------------------

def test_large_amount_rule(tmp_shared_dirs):
    """amount > $10,000 → score += 3.0"""
    txn = txn_valid_usd()
    txn["amount"] = "10001.00"
    txn["transaction_id"] = "TST_LARGE"
    result = _pipeline_to_fraud(tmp_shared_dirs, txn)
    # 3.0 >= 2.0 threshold → at least MEDIUM
    assert result["data"]["risk_score"] >= 3.0
    assert any("10,000" in f for f in result["data"]["risk_factors"])


def test_very_large_amount_rule(tmp_shared_dirs):
    """amount > $50,000 → +2.0 additional on top of +3.0"""
    txn = txn_valid_usd()
    txn["amount"] = "50001.00"
    txn["transaction_id"] = "TST_VLARGE"
    result = _pipeline_to_fraud(tmp_shared_dirs, txn)
    assert result["data"]["risk_score"] >= 5.0


def test_structuring_rule(tmp_shared_dirs):
    """$9,000–$9,999.99 → score += 2.5"""
    txn = txn_valid_usd()
    txn["amount"] = "9500.00"
    txn["transaction_id"] = "TST_STRUCT"
    result = _pipeline_to_fraud(tmp_shared_dirs, txn)
    assert any("structuring" in f.lower() for f in result["data"]["risk_factors"])


def test_structuring_lower_bound(tmp_shared_dirs):
    """amount == $9,000 exactly should trigger structuring rule."""
    txn = txn_valid_usd()
    txn["amount"] = "9000.00"
    txn["transaction_id"] = "TST_STRUCT_LB"
    result = _pipeline_to_fraud(tmp_shared_dirs, txn)
    assert any("structuring" in f.lower() for f in result["data"]["risk_factors"])


def test_no_structuring_below_lower_bound(tmp_shared_dirs):
    """amount == $8,999.99 should NOT trigger structuring."""
    txn = txn_valid_usd()
    txn["amount"] = "8999.99"
    txn["transaction_id"] = "TST_NO_STRUCT"
    result = _pipeline_to_fraud(tmp_shared_dirs, txn)
    assert not any("structuring" in f.lower() for f in result["data"]["risk_factors"])


def test_unusual_hour_rule(tmp_shared_dirs):
    """Hour 0–4 UTC adds 2.0 points."""
    txn = txn_valid_usd()
    txn["timestamp"] = "2026-03-16T03:30:00Z"
    txn["transaction_id"] = "TST_HOUR"
    result = _pipeline_to_fraud(tmp_shared_dirs, txn)
    assert any("unusual hour" in f.lower() for f in result["data"]["risk_factors"])


def test_crossborder_rule(tmp_shared_dirs):
    """Non-US country triggers cross-border rule."""
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_unusual_hour_crossborder())
    assert any("cross-border" in f.lower() for f in result["data"]["risk_factors"])


def test_wire_transfer_type_rule(tmp_shared_dirs):
    """wire_transfer type adds 0.5 points."""
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_high_value_wire())
    assert any("wire_transfer" in f for f in result["data"]["risk_factors"])


# ---------------------------------------------------------------------------
# Score cap
# ---------------------------------------------------------------------------

def test_score_capped_at_10(tmp_shared_dirs):
    """Maximum possible score must be capped at 10.0."""
    txn = {
        "transaction_id": "TST_MAX",
        "timestamp": "2026-03-16T02:00:00Z",  # unusual hour
        "source_account": "ACC-9001",
        "destination_account": "ACC-9002",
        "amount": "75000.00",     # large + very large
        "currency": "EUR",
        "transaction_type": "wire_transfer",
        "description": "Max risk test",
        "metadata": {"channel": "api", "country": "DE"},  # cross-border
    }
    result = _pipeline_to_fraud(tmp_shared_dirs, txn)
    assert result["data"]["risk_score"] <= 10.0


# ---------------------------------------------------------------------------
# Output structure
# ---------------------------------------------------------------------------

def test_output_file_written_to_shared_output(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_valid_usd())
    out_id = result["message_id"]
    out_file = tmp_shared_dirs / "shared" / "output" / f"{out_id}.json"
    assert out_file.exists()


def test_risk_factors_populated_for_high_risk(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_high_value_wire())
    assert len(result["data"]["risk_factors"]) > 0


def test_risk_factors_empty_for_low_risk(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_valid_usd())
    assert result["data"]["risk_factors"] == []


def test_output_file_is_valid_json(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_valid_usd())
    out_file = tmp_shared_dirs / "shared" / "output" / f"{result['message_id']}.json"
    loaded = json.loads(out_file.read_text())
    assert "risk_score" in loaded["data"]
    assert "risk_level" in loaded["data"]


def test_amount_threshold_exclusive_at_10000(tmp_shared_dirs):
    """amount == $10,000 exactly should NOT trigger the >$10,000 rule."""
    txn = txn_valid_usd()
    txn["amount"] = "10000.00"
    txn["transaction_id"] = "TST_EXACT_10K"
    result = _pipeline_to_fraud(tmp_shared_dirs, txn)
    assert not any("10,000" in f for f in result["data"]["risk_factors"])


def test_source_agent_is_fraud_detector(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_valid_usd())
    assert result["source_agent"] == "fraud_detector"


def test_target_agent_is_settlement_processor(tmp_shared_dirs):
    result = _pipeline_to_fraud(tmp_shared_dirs, txn_valid_usd())
    assert result["target_agent"] == "settlement_processor"
