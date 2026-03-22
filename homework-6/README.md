# Banking Pipeline System

## Author

**H. Bondarenko**

---

## Overview

This project implements an AI-powered multi-agent banking transaction processing pipeline. The system validates incoming financial transactions, assesses them for fraud risk, and applies final settlement dispositions — all through a file-based JSON message passing protocol between specialized Python agents.

The project is built using a two-layer agentic architecture: four **Claude Code meta-agents** (in `.claude/agents/`) autonomously created the system itself, while three **pipeline agents** (in `agents/`) perform the actual transaction processing. Each pipeline stage reads from and writes to a shared directory hierarchy, enabling independent operation, testability, and auditability.

---

## Architecture

### ASCII Pipeline Diagram

```
sample-transactions.json
         │
         ▼
    integrator.py
    (loads JSON, wraps in message envelopes, drops to shared/input/)
         │
         ▼
   shared/input/{message_id}.json
         │
         ▼
  ┌─────────────────────┐
  │  TransactionValidator│
  │  agents/transaction_ │
  │  validator.py        │
  └────────┬────────────┘
           │
     ┌─────┴──────┐
   VALID        REJECTED
     │               │
     ▼               ▼
shared/           shared/results/
processing/       {txn_id}_rejected.json
     │
     ▼
  ┌──────────────┐
  │ FraudDetector│
  │ agents/fraud_│
  │ detector.py  │
  └──────┬───────┘
         │
         ▼
   shared/output/
         │
         ▼
  ┌─────────────────────┐
  │ SettlementProcessor  │
  │ agents/settlement_   │
  │ processor.py         │
  └──────────┬──────────┘
             │
             ▼
      shared/results/
      {txn_id}_result.json
```

---

## Agent Responsibilities

### Meta-Agents (Claude Code `.claude/agents/`)

| Agent | Color | Role |
|-------|-------|------|
| `spec-writer` | 🔵 blue | Reads TASKS.md, produces specification.md and agents.md |
| `code-generator` | 🟢 green | Reads specification, uses context7 MCP, generates all Python files |
| `test-engineer` | 🟡 yellow | Writes test suite targeting ≥90% coverage, configures coverage hook |
| `doc-writer` | 🩵 cyan | Generates README.md and HOWTORUN.md with author attribution |

### Pipeline Agents (Python `agents/`)

- **Transaction Validator** — Checks required fields, validates that amounts are positive decimals, and verifies currency codes against the ISO 4217 whitelist. Rejected transactions go directly to `shared/results/`; validated transactions proceed to fraud detection.

- **Fraud Detector** — Applies additive risk scoring (0–10 scale) based on amount thresholds, structuring signals, time-of-day, cross-border activity, and transaction type. Assigns LOW / MEDIUM / HIGH risk levels using calibrated thresholds.

- **Settlement Processor** — Applies final disposition: LOW risk → AUTO_SETTLE with fee calculation; MEDIUM → MANUAL_REVIEW; HIGH → HELD. Calculates fees using `decimal.Decimal` with `ROUND_HALF_UP`.

---

## Slash Commands

| Command | Description |
|---------|-------------|
| `/write-spec` | Generate specification.md and agents.md from the template |
| `/run-pipeline` | Run full pipeline end-to-end, show results summary table |
| `/validate-transactions` | Dry-run validation only, report valid/rejected counts |

---

## MCP Server Tools

The custom FastMCP server (`mcp/server.py`) exposes:

| Tool / Resource | Description |
|----------------|-------------|
| `get_transaction_status(transaction_id)` | Look up a specific transaction's status from `shared/results/` |
| `list_pipeline_results(status_filter?, risk_filter?)` | List all results with optional filtering |
| `pipeline://summary` | Markdown aggregate report: counts by disposition, total fees |

---

## Sample Transaction Outcomes

| TXN ID | Amount | Currency | Risk Score | Risk Level | Disposition |
|--------|--------|----------|-----------|------------|-------------|
| TXN001 | $1,500.00 | USD | 0.0 | LOW | SETTLED |
| TXN002 | $25,000.00 | USD | 3.5 | HIGH | HELD |
| TXN003 | $9,999.99 | USD | 2.5 | MEDIUM | MANUAL_REVIEW |
| TXN004 | €500.00 | EUR | 3.5 | HIGH | HELD |
| TXN005 | $75,000.00 | USD | 5.5 | HIGH | HELD |
| TXN006 | $200.00 | XYZ | — | REJECTED | — |
| TXN007 | -£100.00 | GBP | — | REJECTED | — |
| TXN008 | $3,200.00 | USD | 0.0 | LOW | SETTLED |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.11+ |
| Monetary arithmetic | `decimal.Decimal` (stdlib) |
| MCP server | `fastmcp` >= 2.0.0 |
| Testing | `pytest` >= 8.0.0 |
| Coverage | `pytest-cov` >= 5.0.0 |
| Agent framework | Claude Code (`.claude/agents/`) |
| MCP integration | context7 + custom FastMCP server |
| Message format | JSON (file-based) |
| Inter-agent communication | File-based via `shared/` directories |
