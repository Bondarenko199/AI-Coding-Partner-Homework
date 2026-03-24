# How to Run — Banking Pipeline System

## Author

**H. Bondarenko**

---

## Prerequisites

- Python 3.11 or later
- Node.js 18+ (for context7 MCP server via npx)
- pip

---

## Installation

1. Clone the repository and navigate to the homework-6 directory:
   ```bash
   cd homework-6
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Verify the installation:
   ```bash
   python -c "from agents.transaction_validator import TransactionValidator; print('OK')"
   ```

---

## Running the Full Pipeline

1. Run the complete pipeline against all 8 sample transactions:
   ```bash
   python integrator.py
   ```

2. The pipeline will print a summary table:
   ```
   ======================================================================
   Banking Pipeline Results
   ======================================================================
   TXN ID     Status       Risk     Disposition          Fee
   ----------------------------------------------------------------------
   TXN001     SETTLED      LOW      AUTO_SETTLE          USD 3.75
   TXN002     HELD         HIGH     HELD                 USD 0.00
   ...
   ```

3. Results are written to `shared/results/` — one JSON file per transaction.

### Options

```bash
python integrator.py --dry-run              # Validation only (no fraud/settlement)
python integrator.py --transaction TXN001   # Run a single transaction
```

---

## Running Individual Agents

Run each agent standalone for development or debugging:

```bash
# Validator only — produces files in shared/processing/
python -c "
from agents.transaction_validator import TransactionValidator
import json, uuid
from datetime import datetime, timezone

txn = json.load(open('sample-transactions.json'))[0]
msg = {'message_id': str(uuid.uuid4()), 'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
       'source_agent': 'integrator', 'target_agent': 'transaction_validator',
       'message_type': 'transaction', 'data': txn}
result = TransactionValidator().process_message(msg)
print(result['data']['validation_status'])
"
```

---

## Using Slash Commands

With Claude Code running in this directory:

```
/write-spec               # Generate specification.md and agents.md
/run-pipeline             # Run the full pipeline via AI assistant
/validate-transactions    # Dry-run validation check
```

---

## Running Tests

1. Run the full test suite:
   ```bash
   pytest -v
   ```

2. Run with coverage report:
   ```bash
   pytest --cov=agents --cov-report=term-missing -v
   ```

3. Run a specific test file:
   ```bash
   pytest tests/test_transaction_validator.py -v
   pytest tests/test_integration.py -v
   ```

4. Expected coverage output:
   ```
   TOTAL    245    18    93%
   ```

---

## REST API Gateway

The API gateway exposes the pipeline over HTTP using FastAPI.

### Start the server

```bash
.venv/bin/uvicorn api.gateway:app --host 0.0.0.0 --port 5000
```

Interactive docs are available at `http://localhost:5000/docs` once the server is running.

### Endpoints

#### `POST /api/transactions` — Submit a transaction

Required fields: `transaction_id`, `amount`, `currency`, `transaction_type`, `source_account`, `destination_account`.

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN-001",
    "amount": "1500.00",
    "currency": "USD",
    "transaction_type": "transfer",
    "source_account": "ACC-001",
    "destination_account": "ACC-002",
    "timestamp": "2026-03-24T10:00:00Z",
    "metadata": {"channel": "online", "country": "US"}
  }'
```

Response `201`:
```json
{"tracking_id": "TXN-001", "status": "accepted"}
```

Missing field → `400`:
```json
{"detail": {"error": "missing required field: currency", "field": "currency"}}
```

#### `GET /api/transactions/{transaction_id}/status` — Check status

```bash
curl http://localhost:5000/api/transactions/TXN-001/status
```

Response `200`:
```json
{
  "transaction_id": "TXN-001",
  "status": "settled",
  "details": {
    "risk_level": "LOW",
    "settlement_status": "SETTLED",
    "fee_amount": "3.75",
    "net_amount": "1496.25"
  }
}
```

Not found → `404`:
```json
{"detail": {"error": "Transaction not found", "transaction_id": "TXN-001"}}
```

Possible `status` values: `settled`, `held`, `pending_review`, `rejected`.

#### `GET /api/results` — List all processed transactions

```bash
curl http://localhost:5000/api/results
```

Returns a JSON array of result data objects from `shared/results/`.

### Automated end-to-end demo

```bash
bash demo.sh
```

Starts the server, submits 3 test transactions, and prints a summary. Requires the server to not already be running on port 5000.

---

## MCP Server

1. Start the pipeline status MCP server:
   ```bash
   python3 mcp/server.py
   ```

2. The server exposes tools at stdio transport:
   - `get_transaction_status("TXN001")` — returns status dict
   - `list_pipeline_results()` — returns all results
   - `pipeline://summary` — returns Markdown aggregate report

3. Both MCP servers (context7 + pipeline-status) are configured in `.mcp.json` and auto-start with Claude Code.

---

## Interpreting Output

### Result file format (`shared/results/TXN001_result.json`)

```json
{
  "message_id": "...",
  "source_agent": "settlement_processor",
  "data": {
    "transaction_id": "TXN001",
    "validation_status": "VALIDATED",
    "risk_score": 0.0,
    "risk_level": "LOW",
    "risk_factors": [],
    "disposition": "AUTO_SETTLE",
    "settlement_status": "SETTLED",
    "fee_amount": "3.75",
    "fee_currency": "USD",
    "fee_rate": "0.0025",
    "net_amount": "1496.25"
  }
}
```

### Disposition meanings

| settlement_status | Meaning |
|-------------------|---------|
| SETTLED | Transaction approved and fees applied |
| PENDING_REVIEW | Medium risk — requires manual review |
| HELD | High risk — blocked for investigation |
| REJECTED | Failed validation (invalid currency, negative amount, etc.) |

### Coverage gate hook

The hook at `.claude/hooks/coverage-gate.sh` intercepts `git push` commands. If `pytest --cov=agents` reports coverage below 80%, the push is blocked with an error message. To check coverage manually:

```bash
pytest --cov=agents --cov-report=term-missing
```
