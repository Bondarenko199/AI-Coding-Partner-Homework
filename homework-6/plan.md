# Workshop 9 — 4 Parallel Batches

**Base:** homework-6 banking pipeline
**Goal:** Extend with new agent, configurable rule engine, REST API, and automated demo script.

---

## Dependency Map

```
Batch 1 (Rule Engine)   ──┐
Batch 2 (New Agent)     ──┤──► Batch 4 (Integration + Demo)  ← merge LAST
Batch 3 (API Gateway)   ──┘
```

Batches 1, 2, 3 are **fully independent** — no shared files, no ordering required between them.

---

## BATCH 1 — Rule Engine Lead

**Role:** Externalize all hardcoded thresholds into a config file
**Files:** `config/rules.json` (CREATE), `agents/fraud_detector.py` (MODIFY), `agents/settlement_processor.py` (MODIFY)
**No dependency on any other batch.**

### Step 1A — Create `config/rules.json`

```json
{
  "fraud_detection": {
    "high_value_threshold": 10000,
    "very_high_value_threshold": 50000,
    "structuring_low": 9000,
    "structuring_high": 9999.99,
    "unusual_hours_start": 0,
    "unusual_hours_end": 4,
    "large_amount_score": 3.0,
    "very_large_amount_score": 2.0,
    "structuring_score": 2.5,
    "unusual_hour_score": 2.0,
    "cross_border_score": 1.5,
    "wire_transfer_score": 0.5,
    "risk_thresholds": { "medium": 2.0, "high": 3.5 },
    "score_cap": 10.0
  },
  "compliance": {
    "blocked_currencies": ["XYZ"],
    "aml_reporting_threshold": 10000
  },
  "velocity": {
    "max_transactions_per_hour": 5
  },
  "settlement": {
    "fee_rates": {
      "transfer": 0.0025,
      "wire_transfer": 0.0050,
      "payment": 0.0015,
      "default": 0.0025
    }
  },
  "notifications": {
    "alert_on_risk_levels": ["HIGH", "MEDIUM"],
    "alert_on_rejected": true
  }
}
```

### Step 1B — Update `agents/fraud_detector.py`

Add this helper function (before the class):
```python
def _load_rules(base_dir: str) -> dict:
    path = Path(base_dir) / "config" / "rules.json"
    if path.exists():
        with path.open() as f:
            return json.load(f)
    return {}
```

Replace `__init__` to load all constants from config (with fallback defaults matching current hardcoded values):
```python
def __init__(self, base_dir: str = ".") -> None:
    self.base_dir = Path(base_dir)
    cfg = _load_rules(base_dir).get("fraud_detection", {})
    self.LARGE_THRESHOLD = Decimal(str(cfg.get("high_value_threshold", 10000)))
    self.VERY_LARGE_THRESHOLD = Decimal(str(cfg.get("very_high_value_threshold", 50000)))
    self.STRUCTURING_LOW = Decimal(str(cfg.get("structuring_low", 9000)))
    self.STRUCTURING_HIGH = Decimal(str(cfg.get("structuring_high", 9999.99)))
    self.UNUSUAL_HOUR_START = cfg.get("unusual_hours_start", 0)
    self.UNUSUAL_HOUR_END = cfg.get("unusual_hours_end", 4)
    self.LARGE_SCORE = Decimal(str(cfg.get("large_amount_score", 3.0)))
    self.VERY_LARGE_SCORE = Decimal(str(cfg.get("very_large_amount_score", 2.0)))
    self.STRUCTURING_SCORE = Decimal(str(cfg.get("structuring_score", 2.5)))
    self.UNUSUAL_HOUR_SCORE = Decimal(str(cfg.get("unusual_hour_score", 2.0)))
    self.CROSS_BORDER_SCORE = Decimal(str(cfg.get("cross_border_score", 1.5)))
    self.WIRE_SCORE = Decimal(str(cfg.get("wire_transfer_score", 0.5)))
    self.SCORE_CAP = Decimal(str(cfg.get("score_cap", 10.0)))
    thresholds = cfg.get("risk_thresholds", {})
    self.MEDIUM_THRESHOLD = Decimal(str(thresholds.get("medium", 2.0)))
    self.HIGH_THRESHOLD = Decimal(str(thresholds.get("high", 3.5)))
    self._ensure_dirs()
```

Update `_compute_risk` to use `self.LARGE_THRESHOLD`, `self.WIRE_SCORE`, etc. instead of module-level constants.

### Step 1C — Update `agents/settlement_processor.py`

Add the same `_load_rules()` helper. Update `__init__`:
```python
cfg = _load_rules(base_dir).get("settlement", {})
fee_cfg = cfg.get("fee_rates", {})
self.FEE_RATES = {k: Decimal(str(v)) for k, v in fee_cfg.items() if k != "default"}
self.DEFAULT_FEE_RATE = Decimal(str(fee_cfg.get("default", 0.0025)))
```

Update `_calculate_fee` to use `self.FEE_RATES` and `self.DEFAULT_FEE_RATE`.

**Done when:** Change `high_value_threshold` to `1000` in rules.json → TXN001 becomes HIGH risk. Zero code changes needed.

---

## BATCH 2 — New Agent Lead

**Role:** Build the Notification Agent (6th pipeline agent)
**Files:** `agents/notification_agent.py` (CREATE), `shared/notifications/` dir (CREATE)
**No dependency on any other batch.**

### Step 2A — Create `agents/notification_agent.py`

Same interface as all other agents: `__init__(self, base_dir=".")` + `process_message(message: dict) -> dict`

```python
def __init__(self, base_dir: str = ".") -> None:
    self.base_dir = Path(base_dir)
    cfg = _load_rules(base_dir).get("notifications", {})
    self.alert_levels = set(cfg.get("alert_on_risk_levels", ["HIGH"]))
    self.alert_on_rejected = cfg.get("alert_on_rejected", True)
    self._ensure_dirs()  # creates shared/notifications/
```

`process_message()` logic:
- Read `risk_level` and `validation_status` from `message["data"]`
- Fire alert if: `risk_level in self.alert_levels` OR (`validation_status == "REJECTED"` AND `self.alert_on_rejected`)
- If alert: write to `shared/notifications/{transaction_id}_alert.json`

Alert file format (standard message envelope):
```json
{
  "message_id": "uuid4",
  "timestamp": "ISO8601Z",
  "source_agent": "notification_agent",
  "target_agent": "audit_log",
  "message_type": "alert",
  "data": {
    "transaction_id": "TXN002",
    "alert_type": "HIGH_RISK_FLAGGED",
    "risk_level": "HIGH",
    "risk_score": 3.5,
    "risk_factors": ["..."],
    "amount": "25000.00",
    "currency": "USD",
    "alerted_at": "ISO8601Z"
  }
}
```

`alert_type` values: `"HIGH_RISK_FLAGGED"` | `"MEDIUM_RISK_FLAGGED"` | `"TRANSACTION_REJECTED"`

Returns the alert dict, or `{"alerted": false}` if no alert triggered.

**Done when:** `NotificationAgent().process_message(fraud_scored_msg)` creates a JSON file in `shared/notifications/` for HIGH-risk transactions.

---

## BATCH 3 — API Lead

**Role:** Build the REST API gateway
**Files:** `api/__init__.py` (CREATE), `api/gateway.py` (CREATE), `requirements.txt` (MODIFY)
**No dependency on any other batch.**

### Step 3A — Update `requirements.txt`

Add:
```
fastapi>=0.110.0
uvicorn>=0.27.0
```

Install: `.venv/bin/pip install fastapi uvicorn`

### Step 3B — Create `api/__init__.py` (empty file)

### Step 3C — Create `api/gateway.py`

FastAPI app with 3 endpoints. Import agent classes directly and run pipeline inline for POST:

```python
from fastapi import FastAPI, HTTPException
from pathlib import Path
import json, uuid
from datetime import datetime, timezone

BASE_DIR = str(Path(__file__).resolve().parent.parent)
RESULTS_DIR = Path(BASE_DIR) / "shared" / "results"

app = FastAPI(title="Banking Pipeline API", version="1.0.0")
```

**`POST /api/transactions`** (returns HTTP 201):
- Validate required fields: `transaction_id`, `amount`, `currency`, `transaction_type`, `source_account`, `destination_account`
- Missing field → `400` + `{"error": "missing required field: X", "field": "X"}`
- Import and run `TransactionValidator`, `FraudDetector`, `SettlementProcessor` inline
- Return: `{"tracking_id": "<transaction_id>", "status": "accepted"}`

**`GET /api/transactions/{transaction_id}/status`** (returns HTTP 200):
- Search `RESULTS_DIR` for `{id}_result.json` or `{id}_rejected.json`
- Not found → `404` + `{"error": "Transaction not found", "transaction_id": id}`
- Return: `{"transaction_id": "...", "status": "approved|rejected|held|pending_review", "details": {...}}`

**`GET /api/results`** (returns HTTP 200):
- Read all `*.json` files from `RESULTS_DIR`
- Return list of summary dicts

Start command: `uvicorn api.gateway:app --host 0.0.0.0 --port 5000`

**Done when:** All 3 curl commands return correct status codes and JSON.

---

## BATCH 4 — Demo & Integration Lead

**Role:** Wire everything together + automated end-to-end demo script
**Files:** `integrator.py` (MODIFY), `demo.sh` (CREATE)
**Depends on:** Batch 2 (`notification_agent.py` must exist — use a stub interface if not ready yet)
**Independent of:** Batch 1 (config is optional, agents fall back to defaults), Batch 3 (separate process)

### Step 4A — Update `integrator.py`

```python
from agents.notification_agent import NotificationAgent
```

In `run()`, add instantiation:
```python
notification_agent = NotificationAgent(base_dir=str(base))
```

In the per-transaction loop, after fraud detection and before settlement (side effect — does NOT modify `scored`):
```python
scored = fraud_detector.process_message(validated)
notification_agent.process_message(scored)   # ← side effect only
result = settlement.process_message(scored)
```

### Step 4B — Create `demo.sh`

Fully automated — zero manual steps:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Banking Pipeline Demo ==="
echo ""

echo "Starting API server on port 5000..."
.venv/bin/uvicorn api.gateway:app --host 0.0.0.0 --port 5000 > /tmp/api_server.log 2>&1 &
API_PID=$!
trap "kill $API_PID 2>/dev/null; echo 'Server stopped.'" EXIT

# Wait for server ready (up to 10s)
for i in $(seq 1 10); do
    if curl -sf http://localhost:5000/api/results > /dev/null 2>&1; then
        echo "Server ready."; break
    fi
    sleep 1
done

# Clear staging dirs
rm -f shared/input/*.json shared/processing/*.json shared/output/*.json \
      shared/results/*.json shared/notifications/*.json 2>/dev/null || true

echo ""
echo "Submitting 3 test transactions..."

curl -sf -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"TXN-DEMO-1","amount":"1500.00","currency":"USD","transaction_type":"transfer","source_account":"ACC-D001","destination_account":"ACC-D002","timestamp":"2026-03-22T10:00:00Z","metadata":{"channel":"online","country":"US"}}' > /dev/null
echo "  POST TXN-DEMO-1 (\$1,500 USD transfer) -> accepted"

curl -sf -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"TXN-DEMO-2","amount":"25000.00","currency":"USD","transaction_type":"wire_transfer","source_account":"ACC-D003","destination_account":"ACC-D004","timestamp":"2026-03-22T10:05:00Z","metadata":{"channel":"branch","country":"US"}}' > /dev/null
echo "  POST TXN-DEMO-2 (\$25,000 USD wire)   -> accepted"

curl -sf -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"TXN-DEMO-3","amount":"200.00","currency":"XYZ","transaction_type":"transfer","source_account":"ACC-D005","destination_account":"ACC-D006","timestamp":"2026-03-22T10:10:00Z","metadata":{"channel":"online","country":"US"}}' > /dev/null
echo "  POST TXN-DEMO-3 (\$200 XYZ)           -> accepted"

echo ""
echo "Fetching results..."
curl -sf http://localhost:5000/api/results | python3 -c "
import sys, json
results = json.load(sys.stdin)
approved = held = pending = rejected = 0
for r in results:
    sid = r.get('settlement_status', r.get('validation_status', '?'))
    txn = r.get('transaction_id', '?')
    risk = r.get('risk_level', 'N/A')
    if sid == 'SETTLED':         approved += 1; label = 'APPROVED'
    elif sid == 'HELD':          held += 1;     label = 'HELD (fraud review)'
    elif sid == 'PENDING_REVIEW': pending += 1; label = 'PENDING REVIEW'
    else:                        rejected += 1; label = 'REJECTED'
    print(f'  {txn}: {label} (risk: {risk})')
print()
print(f'Summary: {approved} approved, {held} held, {pending} pending review, {rejected} rejected')
"
echo ""
echo "=== Demo Complete ==="
```

Make executable: `chmod +x demo.sh`

**Done when:** `bash demo.sh` completes end-to-end with correct summary and no errors.

---

## Merge Order

```
1. Merge Batch 1  ┐
2. Merge Batch 2  ├── any order
3. Merge Batch 3  ┘
4. Merge Batch 4  ← last
```

## Final Verification

```bash
python integrator.py          # 8 txns correct + files in shared/notifications/
bash demo.sh                  # end-to-end with API, no errors
pytest --cov=agents -q        # 80 tests still green
```
