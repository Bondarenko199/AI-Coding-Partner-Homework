#!/usr/bin/env bash
# Coverage Gate Hook
# ==================
# PreToolUse hook that intercepts git push commands and blocks the push
# if pytest coverage for agents/ is below 80%.
#
# Exit codes:
#   0 = allow the tool use to proceed
#   2 = block the tool use (stderr shown to user and fed back to Claude)
#
# Author: H. Bondarenko

set -uo pipefail

# Read the PreToolUse JSON payload from stdin
RAW_INPUT=$(cat)

# Extract the bash command being executed
COMMAND=$(echo "$RAW_INPUT" | python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    print(data.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
")

# Only intercept git push commands
if [[ "$COMMAND" != *"git push"* ]]; then
    exit 0
fi

echo "⚙️  Coverage gate triggered by: git push" >&2
echo "Running pytest coverage check on agents/ ..." >&2

# Run pytest with coverage (capture output, don't fail script on test failure)
PYTEST_OUTPUT=$(python3 -m pytest --cov=agents --cov-report=term --tb=no -q 2>&1 || true)

# Parse TOTAL line to extract coverage percentage (integer)
COVERAGE=$(echo "$PYTEST_OUTPUT" | grep "^TOTAL" | awk '{print $4}' | tr -d '%' | head -1)

if [[ -z "$COVERAGE" ]]; then
    echo "❌ ERROR: Could not parse coverage from pytest output." >&2
    echo "pytest output:" >&2
    echo "$PYTEST_OUTPUT" >&2
    exit 2
fi

echo "📊 Current coverage: ${COVERAGE}%" >&2

if (( COVERAGE < 80 )); then
    echo "" >&2
    echo "🚫 BLOCKED: Coverage ${COVERAGE}% is below the required 80% minimum." >&2
    echo "   Fix tests before pushing. Run:" >&2
    echo "   pytest --cov=agents --cov-report=term-missing" >&2
    echo "   to see which lines need coverage." >&2
    exit 2
fi

echo "✅ Coverage gate PASSED (${COVERAGE}% ≥ 80%). Proceeding with push." >&2
exit 0
