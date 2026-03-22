"""Unit tests for SettlementProcessor."""

import json
from decimal import Decimal
from pathlib import Path

import pytest

from agents.fraud_detector import FraudDetector
from agents.settlement_processor import SettlementProcessor
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


def _pipeline_to_settlement(tmp_path: Path, txn_data: dict) -> dict:
    """Run a transaction through the full pipeline, return settlement result."""
    v = TransactionValidator(base_dir=str(tmp_path))
    fd = FraudDetector(base_dir=str(tmp_path))
    sp = SettlementProcessor(base_dir=str(tmp_path))

    validated = v.process_message(make_message(txn_data))
    assert validated["data"]["validation_status"] == "VALIDATED"
    scored = fd.process_message(validated)
    return sp.process_message(scored)


# ---------------------------------------------------------------------------
# Disposition rules
# ---------------------------------------------------------------------------

def test_low_risk_auto_settle(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    assert result["data"]["disposition"] == "AUTO_SETTLE"
    assert result["data"]["settlement_status"] == "SETTLED"


def test_medium_risk_manual_review(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_structuring())
    assert result["data"]["disposition"] == "MANUAL_REVIEW"
    assert result["data"]["settlement_status"] == "PENDING_REVIEW"


def test_high_risk_held(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_high_value_wire())
    assert result["data"]["disposition"] == "HELD"
    assert result["data"]["settlement_status"] == "HELD"


def test_txn004_high_risk_held(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_unusual_hour_crossborder())
    assert result["data"]["settlement_status"] == "HELD"


def test_txn005_very_large_held(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_very_large_wire())
    assert result["data"]["settlement_status"] == "HELD"


def test_txn008_normal_settled(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_normal_salary())
    assert result["data"]["settlement_status"] == "SETTLED"


# ---------------------------------------------------------------------------
# Fee calculation
# ---------------------------------------------------------------------------

def test_transfer_fee_rate_025_percent(tmp_shared_dirs):
    """$1,500 transfer @ 0.25% = $3.75"""
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    assert result["data"]["fee_amount"] == "3.75"


def test_wire_fee_rate_050_percent(tmp_shared_dirs):
    """Need a settled wire — use $1 wire (LOW risk)."""
    txn = txn_valid_usd()
    txn["transaction_id"] = "TST_WIRE_FEE"
    txn["transaction_type"] = "wire_transfer"
    txn["amount"] = "1000.00"
    result = _pipeline_to_settlement(tmp_shared_dirs, txn)
    # $1,000 wire @ 0.50% = $5.00
    assert result["data"]["fee_amount"] == "5.00"


def test_net_amount_equals_amount_minus_fee(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    amount = Decimal(result["data"]["amount"])
    fee = Decimal(result["data"]["fee_amount"])
    net = Decimal(result["data"]["net_amount"])
    assert net == amount - fee


def test_fee_decimal_precision(tmp_shared_dirs):
    """Fee must have exactly 2 decimal places."""
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    fee_str = result["data"]["fee_amount"]
    assert "." in fee_str
    assert len(fee_str.split(".")[1]) == 2


def test_held_fee_is_zero(tmp_shared_dirs):
    """HELD transactions have fee_amount = '0.00'."""
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_high_value_wire())
    assert result["data"]["fee_amount"] == "0.00"


def test_pending_review_fee_is_zero(tmp_shared_dirs):
    """PENDING_REVIEW transactions have fee_amount = '0.00'."""
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_structuring())
    assert result["data"]["fee_amount"] == "0.00"


def test_held_net_amount_equals_original_amount(tmp_shared_dirs):
    """HELD transaction net_amount should equal original amount (no fee deducted)."""
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_high_value_wire())
    amount = Decimal(result["data"]["amount"])
    net = Decimal(result["data"]["net_amount"])
    assert net == amount


def test_fee_currency_matches_transaction_currency(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    assert result["data"]["fee_currency"] == result["data"]["currency"]


# ---------------------------------------------------------------------------
# Output file
# ---------------------------------------------------------------------------

def test_result_file_written_to_shared_results(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    txn_id = result["data"]["transaction_id"]
    result_file = tmp_shared_dirs / "shared" / "results" / f"{txn_id}_result.json"
    assert result_file.exists()


def test_result_file_is_valid_json(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    txn_id = result["data"]["transaction_id"]
    result_file = tmp_shared_dirs / "shared" / "results" / f"{txn_id}_result.json"
    loaded = json.loads(result_file.read_text())
    assert "disposition" in loaded["data"]
    assert "settlement_status" in loaded["data"]


def test_message_envelope_structure(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    for key in ("message_id", "timestamp", "source_agent", "target_agent", "message_type", "data"):
        assert key in result


def test_source_agent_is_settlement_processor(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    assert result["source_agent"] == "settlement_processor"


def test_processed_at_field_present(tmp_shared_dirs):
    result = _pipeline_to_settlement(tmp_shared_dirs, txn_valid_usd())
    assert "processed_at" in result["data"]
    assert result["data"]["processed_at"].endswith("Z")
