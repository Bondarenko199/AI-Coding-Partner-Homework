# Specification: AI-Powered Multi-Agent Banking Pipeline

**Author:** H. Bondarenko

---

## 1. High-Level Objective

Build a 3-agent Python pipeline that validates, scores for fraud risk, and settles banking transactions using file-based JSON message passing through a shared directory protocol.

---

## 2. Mid-Level Objectives

- Transactions with invalid ISO 4217 currency codes (e.g., "XYZ") are rejected by the validator with reason `invalid_currency` and written directly to `shared/results/`
- Transactions with non-positive amounts (zero or negative) are rejected by the validator with reason `negative_or_zero_amount`
- Transactions scoring ≥ 3.5 on the fraud risk scale are assigned `risk_level: "HIGH"` and disposition `HELD` by the settlement processor
- Transactions scoring in range [2.0, 3.5) are assigned `risk_level: "MEDIUM"` and disposition `MANUAL_REVIEW`
- The pipeline processes all 8 sample transactions and writes exactly 8 result files to `shared/results/`, with 2 SETTLED, 3 HELD, 1 MANUAL_REVIEW, and 2 REJECTED
- All agent operations are logged with ISO 8601 timestamps, agent name, transaction_id, and outcome; account numbers are masked in log output

---

## 3. Implementation Notes

- **Monetary calculations:** `decimal.Decimal` only — never `float`. Use `ROUND_HALF_UP` for rounding. Store amounts as strings in JSON.
- **Currency validation:** ISO 4217 whitelist — at minimum: USD, EUR, GBP, JPY, CHF, CAD, AUD, SGD, HKD, MXN, BRL, CNY, KRW, INR
- **Logging:** Audit trail with ISO 8601 timestamp, agent name, transaction_id, and outcome. No plaintext account numbers — mask to last 4 chars (e.g., `****1001`)
- **Message IDs:** Use `uuid.uuid4()` for each new message envelope
- **Timestamps:** `datetime.utcnow().isoformat() + "Z"` for all generated timestamps
- **Test isolation:** All pipeline agent classes must accept `base_dir: str = "."` in `__init__` so tests can redirect I/O to a temporary directory

---

## 4. Context

- **Beginning state:** `sample-transactions.json` exists with 8 raw transaction records. No pipeline agents exist. No `shared/` directories exist.
- **Ending state:** All 8 transactions processed and written to `shared/results/`. Test coverage ≥ 90% (gate at 80%). `README.md` and `HOWTORUN.md` complete with author H. Bondarenko. MCP server running and queryable.

---

## 5. Low-Level Tasks

### Task: Transaction Validator

**Prompt:** "Implement a Python class `TransactionValidator` in `agents/transaction_validator.py`. It must have `__init__(self, base_dir='.')` and `process_message(self, message: dict) -> dict`. It validates: (1) all required fields present (transaction_id, amount, currency, transaction_type, source_account, destination_account, timestamp), (2) amount is parseable as decimal.Decimal and strictly positive, (3) currency is in the ISO 4217 whitelist {USD, EUR, GBP, JPY, CHF, CAD, AUD, SGD, HKD, MXN, BRL, CNY, KRW, INR}. On success: write output message to `{base_dir}/shared/processing/{message_id}.json` with `validation_status: 'VALIDATED'` and `target_agent: 'fraud_detector'`. On failure: write directly to `{base_dir}/shared/results/{transaction_id}_rejected.json` with `validation_status: 'REJECTED'` and `validation_errors: [list of error strings]`. Never use float for amounts."

**File to CREATE:** `agents/transaction_validator.py`

**Function to CREATE:** `process_message(message: dict) -> dict`

**Details:**
- Check required fields: transaction_id, amount, currency, transaction_type, source_account, destination_account
- Validate amount: parse as Decimal, reject if <= 0 or unparseable
- Validate currency against ISO 4217 whitelist
- Normalize amount to 2 decimal places in output
- Return the output message dict (same dict that was written to file)

---

### Task: Fraud Detector

**Prompt:** "Implement a Python class `FraudDetector` in `agents/fraud_detector.py`. It must have `__init__(self, base_dir='.')` and `process_message(self, message: dict) -> dict`. It reads validated transaction data and applies additive fraud scoring: amount > $10,000 adds 3.0; amount > $50,000 adds an additional 2.0; amount in [$9,000, $9,999.99] (structuring signal) adds 2.5; transaction hour UTC 0–4 adds 2.0; source country != destination country adds 1.5; transaction_type == 'wire_transfer' adds 0.5. Cap total at 10.0. Thresholds: score < 2.0 = LOW, 2.0 <= score < 3.5 = MEDIUM, score >= 3.5 = HIGH. Write output to `{base_dir}/shared/output/{message_id}.json` with fields: risk_score, risk_level, risk_factors (list of human-readable strings). Never use float — compare amounts as decimal.Decimal."

**File to CREATE:** `agents/fraud_detector.py`

**Function to CREATE:** `process_message(message: dict) -> dict`

**Details:**
- Parse amount from string back to Decimal for comparison
- Parse transaction timestamp to extract UTC hour
- Populate risk_factors with descriptive strings for each triggered rule
- Read input from `{base_dir}/shared/processing/`, write to `{base_dir}/shared/output/`

---

### Task: Settlement Processor

**Prompt:** "Implement a Python class `SettlementProcessor` in `agents/settlement_processor.py`. It must have `__init__(self, base_dir='.')` and `process_message(self, message: dict) -> dict`. Based on risk_level: LOW → disposition='AUTO_SETTLE', settlement_status='SETTLED', calculate fee; MEDIUM → disposition='MANUAL_REVIEW', settlement_status='PENDING_REVIEW', fee='0.00'; HIGH → disposition='HELD', settlement_status='HELD', fee='0.00'. Fee rates for SETTLED: transfer=0.25%, wire_transfer=0.50%, payment=0.15%, default=0.25%. Calculate: fee = amount * rate (ROUND_HALF_UP, 2 decimal places), net_amount = amount - fee. Store all monetary values as Decimal-derived strings. Write result to `{base_dir}/shared/results/{message_id}.json`. Never use float."

**File to CREATE:** `agents/settlement_processor.py`

**Function to CREATE:** `process_message(message: dict) -> dict`

**Details:**
- Read input from `{base_dir}/shared/output/`
- Preserve all fields from prior stages in the output
- Add: disposition, settlement_status, fee_amount, fee_currency, fee_rate, net_amount, processed_at

---

### Task: Integrator (Orchestrator)

**Prompt:** "Implement `integrator.py` as the pipeline orchestrator. It loads `sample-transactions.json`, wraps each transaction in a message envelope (message_id=uuid4, timestamp=utcnow, source_agent='integrator', target_agent='transaction_validator', message_type='transaction'), writes each to `shared/input/{message_id}.json`, then instantiates TransactionValidator, FraudDetector, SettlementProcessor and runs each transaction through the pipeline sequentially. If validator returns REJECTED, skip fraud and settlement for that transaction. Print a summary table to stdout when complete. Support `--dry-run` flag (validator only) and `--transaction TXN_ID` flag (single transaction)."

**File to CREATE:** `integrator.py`

**Function to CREATE:** `run(dry_run: bool = False) -> list[dict]`

**Details:**
- Create shared/ subdirectories if they don't exist
- Handle REJECTED short-circuit correctly
- Print formatted summary table

---

### Task: MCP Server

**Prompt:** "Implement `mcp/server.py` using FastMCP. Expose: (1) tool `get_transaction_status(transaction_id: str) -> dict` that scans `shared/results/` for a result file containing the given transaction_id and returns a summary dict; (2) tool `list_pipeline_results(status_filter: str | None = None, risk_filter: str | None = None) -> list[dict]` that returns all results from `shared/results/` with optional filtering; (3) resource `pipeline://summary` that returns a Markdown-formatted aggregate summary of all results including counts by disposition and total fees collected using decimal.Decimal. Never use float for fee totals."

**File to CREATE:** `mcp/server.py`

**Details:**
- Server name: "banking-pipeline-status"
- Use FastMCP decorators: `@mcp.tool()` and `@mcp.resource("pipeline://summary")`
- Return `{"error": "not found"}` from get_transaction_status if transaction not in results
