#!/usr/bin/env bash
set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Banking Pipeline Demo ==="
echo ""

# Create venv if missing
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate venv
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Clear working directories (preserve results/)
rm -f shared/input/*.json shared/processing/*.json shared/output/*.json

# Run the pipeline
echo ""
echo "Running pipeline against demo/sample-data/sample-transactions.json..."
echo ""
python integrator.py

echo ""
echo "Results written to shared/results/"
