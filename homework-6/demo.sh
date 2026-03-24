#!/usr/bin/env bash
# Automated end-to-end demo — zero manual steps required.
# Starts the API server, submits 3 test transactions, and prints a results summary.
#
# Usage: bash demo.sh
# Author: H. Bondarenko

set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=5000

echo "=== Banking Pipeline Demo ==="
echo ""

# 1. Start API server in background
echo "Starting API server on port ${PORT}..."
"${BASE_DIR}/.venv/bin/uvicorn" api.gateway:app \
    --host 0.0.0.0 --port "${PORT}" \
    --app-dir "${BASE_DIR}" \
    > /tmp/banking_api_server.log 2>&1 &
API_PID=$!
trap 'kill "${API_PID}" 2>/dev/null || true; echo ""; echo "Server stopped."' EXIT

# 2. Wait for server to be ready (up to 15s)
READY=0
for i in $(seq 1 15); do
    if curl -sf "http://localhost:${PORT}/api/results" > /dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 1
done

if [ "${READY}" -eq 0 ]; then
    echo "ERROR: Server did not start within 15 seconds." >&2
    echo "Server log:" >&2
    cat /tmp/banking_api_server.log >&2
    exit 1
fi
echo "Server ready."

# 3. Clear shared staging dirs (preserve results if needed)
rm -f "${BASE_DIR}"/shared/input/*.json \
      "${BASE_DIR}"/shared/processing/*.json \
      "${BASE_DIR}"/shared/output/*.json \
      "${BASE_DIR}"/shared/results/*.json \
      "${BASE_DIR}"/shared/notifications/*.json 2>/dev/null || true

echo ""
echo "Submitting 3 test transactions..."

# TXN-DEMO-1: valid low-risk USD transfer → expect APPROVED
curl -sf -X POST "http://localhost:${PORT}/api/transactions" \
    -H "Content-Type: application/json" \
    -d '{
        "transaction_id": "TXN-DEMO-1",
        "amount": "1500.00",
        "currency": "USD",
        "transaction_type": "transfer",
        "source_account": "ACC-D001",
        "destination_account": "ACC-D002",
        "timestamp": "2026-03-24T10:00:00Z",
        "metadata": {"channel": "online", "country": "US"}
    }' > /dev/null
echo "  POST TXN-DEMO-1 (\$1,500 USD transfer)  -> accepted"

# TXN-DEMO-2: high-value wire → expect HELD (HIGH risk)
curl -sf -X POST "http://localhost:${PORT}/api/transactions" \
    -H "Content-Type: application/json" \
    -d '{
        "transaction_id": "TXN-DEMO-2",
        "amount": "25000.00",
        "currency": "USD",
        "transaction_type": "wire_transfer",
        "source_account": "ACC-D003",
        "destination_account": "ACC-D004",
        "timestamp": "2026-03-24T10:05:00Z",
        "metadata": {"channel": "branch", "country": "US"}
    }' > /dev/null
echo "  POST TXN-DEMO-2 (\$25,000 USD wire)     -> accepted"

# TXN-DEMO-3: invalid currency → expect REJECTED
curl -sf -X POST "http://localhost:${PORT}/api/transactions" \
    -H "Content-Type: application/json" \
    -d '{
        "transaction_id": "TXN-DEMO-3",
        "amount": "200.00",
        "currency": "XYZ",
        "transaction_type": "transfer",
        "source_account": "ACC-D005",
        "destination_account": "ACC-D006",
        "timestamp": "2026-03-24T10:10:00Z",
        "metadata": {"channel": "online", "country": "US"}
    }' > /dev/null
echo "  POST TXN-DEMO-3 (\$200 XYZ — bad ccy)   -> accepted"

echo ""
echo "Fetching results..."
echo ""

# 4. Poll and print results
curl -sf "http://localhost:${PORT}/api/results" | python3 -c "
import sys, json

results = json.load(sys.stdin)
approved = held = pending = rejected = 0

for r in results:
    sid  = r.get('settlement_status', r.get('validation_status', '?'))
    txn  = r.get('transaction_id', '?')
    risk = r.get('risk_level', 'N/A')

    if sid == 'SETTLED':
        approved += 1
        label = 'APPROVED'
    elif sid == 'HELD':
        held += 1
        label = 'HELD (fraud review)'
    elif sid == 'PENDING_REVIEW':
        pending += 1
        label = 'PENDING REVIEW'
    else:
        rejected += 1
        label = 'REJECTED'

    print(f'  {txn}: {label} (risk: {risk})')

print()
print(f'Summary: {approved} approved, {held} held, {pending} pending review, {rejected} rejected')
"

echo ""
echo "=== Demo Complete ==="
