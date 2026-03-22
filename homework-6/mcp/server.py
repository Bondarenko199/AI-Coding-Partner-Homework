"""
Banking Pipeline MCP Server
============================
FastMCP server exposing pipeline status query tools and resources.

Tools:
    get_transaction_status(transaction_id)  - Look up a specific transaction
    list_pipeline_results(...)              - List all results with optional filters

Resources:
    pipeline://summary                      - Markdown aggregate summary

Author: H. Bondarenko
"""

import json
from decimal import Decimal, InvalidOperation
from pathlib import Path

from fastmcp import FastMCP

RESULTS_DIR = Path(__file__).resolve().parent.parent / "shared" / "results"

mcp = FastMCP("banking-pipeline-status")


def _load_all_results() -> list[dict]:
    """Load all JSON files from shared/results/."""
    if not RESULTS_DIR.exists():
        return []
    results = []
    for f in sorted(RESULTS_DIR.glob("*.json")):
        try:
            with f.open() as fh:
                results.append(json.load(fh))
        except (json.JSONDecodeError, OSError):
            continue
    return results


def _summarize(result: dict) -> dict:
    """Extract a flat summary dict from a full result message."""
    data = result.get("data", {})
    return {
        "transaction_id": data.get("transaction_id", "?"),
        "validation_status": data.get("validation_status", "?"),
        "risk_level": data.get("risk_level", "N/A"),
        "risk_score": data.get("risk_score", None),
        "disposition": data.get("disposition", "N/A"),
        "settlement_status": data.get("settlement_status", data.get("validation_status", "?")),
        "amount": data.get("amount", "?"),
        "currency": data.get("currency", "?"),
        "fee_amount": data.get("fee_amount", "N/A"),
        "net_amount": data.get("net_amount", "N/A"),
        "processed_at": data.get("processed_at", data.get("validated_at", "?")),
    }


@mcp.tool()
def get_transaction_status(transaction_id: str) -> dict:
    """
    Get the current status of a specific transaction.

    Args:
        transaction_id: The transaction ID to look up (e.g., "TXN001")

    Returns:
        Summary dict with status, risk level, disposition, and fee info.
        Returns {"error": "not found"} if the transaction is not in results.
    """
    for result in _load_all_results():
        data = result.get("data", {})
        if data.get("transaction_id") == transaction_id:
            return _summarize(result)
    return {"error": f"Transaction {transaction_id!r} not found in shared/results/"}


@mcp.tool()
def list_pipeline_results(
    status_filter: str | None = None,
    risk_filter: str | None = None,
) -> list[dict]:
    """
    List all processed transactions with optional filtering.

    Args:
        status_filter: Filter by settlement_status
                       ("SETTLED", "PENDING_REVIEW", "HELD", "REJECTED")
        risk_filter:   Filter by risk_level ("LOW", "MEDIUM", "HIGH")

    Returns:
        List of summary dicts sorted by processed_at timestamp.
    """
    summaries = [_summarize(r) for r in _load_all_results()]

    if status_filter:
        summaries = [
            s for s in summaries
            if s.get("settlement_status", "").upper() == status_filter.upper()
        ]
    if risk_filter:
        summaries = [
            s for s in summaries
            if s.get("risk_level", "").upper() == risk_filter.upper()
        ]

    return sorted(summaries, key=lambda s: s.get("processed_at", ""))


@mcp.resource("pipeline://summary")
def pipeline_summary() -> str:
    """
    Returns a Markdown-formatted summary of all pipeline results.

    Includes aggregate statistics: counts by disposition, total fees collected,
    and breakdown by risk level.
    """
    results = _load_all_results()
    if not results:
        return "# Pipeline Summary\n\nNo results found in shared/results/. Run `python integrator.py` first."

    summaries = [_summarize(r) for r in results]

    # Count by settlement status
    status_counts: dict[str, int] = {}
    for s in summaries:
        key = s.get("settlement_status", "UNKNOWN")
        status_counts[key] = status_counts.get(key, 0) + 1

    # Count by risk level
    risk_counts: dict[str, int] = {}
    for s in summaries:
        key = s.get("risk_level", "N/A")
        risk_counts[key] = risk_counts.get(key, 0) + 1

    # Total fees (Decimal safe)
    total_fees = Decimal("0.00")
    for s in summaries:
        fee_str = s.get("fee_amount", "0.00")
        if fee_str and fee_str != "N/A":
            try:
                total_fees += Decimal(str(fee_str))
            except (InvalidOperation, TypeError):
                pass

    # Build Markdown
    lines = [
        "# Pipeline Summary",
        "",
        f"**Total Transactions:** {len(summaries)}",
        f"**Total Fees Collected:** ${total_fees:.2f}",
        "",
        "## Results by Disposition",
        "",
        "| Status | Count |",
        "|--------|-------|",
    ]
    for status, count in sorted(status_counts.items()):
        lines.append(f"| {status} | {count} |")

    lines += [
        "",
        "## Results by Risk Level",
        "",
        "| Risk Level | Count |",
        "|------------|-------|",
    ]
    for risk, count in sorted(risk_counts.items()):
        lines.append(f"| {risk} | {count} |")

    lines += [
        "",
        "## Transaction Detail",
        "",
        "| TXN ID | Status | Risk | Disposition | Fee |",
        "|--------|--------|------|-------------|-----|",
    ]
    for s in summaries:
        fee = s.get("fee_amount", "N/A")
        curr = s.get("currency", "")
        fee_display = f"{curr} {fee}" if fee != "N/A" else "N/A"
        lines.append(
            f"| {s['transaction_id']} | {s['settlement_status']} | "
            f"{s['risk_level']} | {s['disposition']} | {fee_display} |"
        )

    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run()
