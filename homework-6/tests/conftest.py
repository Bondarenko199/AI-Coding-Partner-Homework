"""
Shared pytest fixtures for the banking pipeline test suite.

All pipeline agents accept base_dir in __init__ so tests redirect I/O
to a temporary directory instead of touching the real shared/ hierarchy.
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@pytest.fixture
def tmp_shared_dirs(tmp_path: Path) -> Path:
    """Create an isolated shared/ directory hierarchy under tmp_path."""
    for sub in ("shared/input", "shared/processing", "shared/output", "shared/results"):
        (tmp_path / sub).mkdir(parents=True, exist_ok=True)
    return tmp_path


def make_message(
    txn_data: dict,
    source_agent: str = "integrator",
    target_agent: str = "transaction_validator",
    message_type: str = "transaction",
) -> dict:
    """Build a complete message envelope around raw transaction data."""
    return {
        "message_id": str(uuid.uuid4()),
        "timestamp": _utcnow(),
        "source_agent": source_agent,
        "target_agent": target_agent,
        "message_type": message_type,
        "data": txn_data,
    }


# ---------------------------------------------------------------------------
# Sample transaction data factories
# ---------------------------------------------------------------------------

def txn_valid_usd() -> dict:
    """TXN001-style: valid USD transfer, low risk."""
    return {
        "transaction_id": "TXN001",
        "timestamp": "2026-03-16T09:00:00Z",
        "source_account": "ACC-1001",
        "destination_account": "ACC-2001",
        "amount": "1500.00",
        "currency": "USD",
        "transaction_type": "transfer",
        "description": "Monthly rent payment",
        "metadata": {"channel": "online", "country": "US"},
    }


def txn_high_value_wire() -> dict:
    """TXN002-style: high-value wire, should be HIGH risk."""
    return {
        "transaction_id": "TXN002",
        "timestamp": "2026-03-16T09:15:00Z",
        "source_account": "ACC-1002",
        "destination_account": "ACC-3001",
        "amount": "25000.00",
        "currency": "USD",
        "transaction_type": "wire_transfer",
        "description": "Equipment purchase",
        "metadata": {"channel": "branch", "country": "US"},
    }


def txn_structuring() -> dict:
    """TXN003-style: structuring signal, $9,999.99."""
    return {
        "transaction_id": "TXN003",
        "timestamp": "2026-03-16T09:30:00Z",
        "source_account": "ACC-1003",
        "destination_account": "ACC-9999",
        "amount": "9999.99",
        "currency": "USD",
        "transaction_type": "transfer",
        "description": "Consulting payment",
        "metadata": {"channel": "online", "country": "US"},
    }


def txn_unusual_hour_crossborder() -> dict:
    """TXN004-style: 02:47 UTC cross-border EUR."""
    return {
        "transaction_id": "TXN004",
        "timestamp": "2026-03-16T02:47:00Z",
        "source_account": "ACC-1004",
        "destination_account": "ACC-5500",
        "amount": "500.00",
        "currency": "EUR",
        "transaction_type": "transfer",
        "description": "Invoice #4471",
        "metadata": {"channel": "api", "country": "DE"},
    }


def txn_very_large_wire() -> dict:
    """TXN005-style: $75,000 wire, HIGH risk."""
    return {
        "transaction_id": "TXN005",
        "timestamp": "2026-03-16T10:00:00Z",
        "source_account": "ACC-1005",
        "destination_account": "ACC-6600",
        "amount": "75000.00",
        "currency": "USD",
        "transaction_type": "wire_transfer",
        "description": "Property settlement",
        "metadata": {"channel": "branch", "country": "US"},
    }


def txn_invalid_currency() -> dict:
    """TXN006-style: invalid currency XYZ."""
    return {
        "transaction_id": "TXN006",
        "timestamp": "2026-03-16T10:05:00Z",
        "source_account": "ACC-1006",
        "destination_account": "ACC-7700",
        "amount": "200.00",
        "currency": "XYZ",
        "transaction_type": "transfer",
        "description": "Test payment",
        "metadata": {"channel": "online", "country": "US"},
    }


def txn_negative_amount() -> dict:
    """TXN007-style: negative amount refund."""
    return {
        "transaction_id": "TXN007",
        "timestamp": "2026-03-16T10:10:00Z",
        "source_account": "ACC-1007",
        "destination_account": "ACC-8800",
        "amount": "-100.00",
        "currency": "GBP",
        "transaction_type": "refund",
        "description": "Refund for order #8821",
        "metadata": {"channel": "online", "country": "GB"},
    }


def txn_normal_salary() -> dict:
    """TXN008-style: normal salary advance, low risk."""
    return {
        "transaction_id": "TXN008",
        "timestamp": "2026-03-16T10:15:00Z",
        "source_account": "ACC-1008",
        "destination_account": "ACC-9900",
        "amount": "3200.00",
        "currency": "USD",
        "transaction_type": "transfer",
        "description": "Salary advance",
        "metadata": {"channel": "mobile", "country": "US"},
    }
