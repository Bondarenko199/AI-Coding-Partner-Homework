# Research Notes — Context7 Queries

**Author:** H. Bondarenko

These notes document context7 queries made during code generation for the banking pipeline.

---

## Query 1: Python `decimal` module — monetary arithmetic

**Search:** "Python decimal module ROUND_HALF_UP monetary arithmetic"

**context7 library ID:** `/python/decimal`

**Key insight applied:**

The `decimal` module provides arbitrary-precision decimal arithmetic that avoids the floating-point representation errors inherent in Python's `float` type. For financial calculations, the key patterns are:

```python
from decimal import Decimal, ROUND_HALF_UP

# Construct from string — NEVER from float (float introduces imprecision at construction)
amount = Decimal("1500.00")          # correct
amount = Decimal(1500.00)            # WRONG — float passed in

# Rounding for fees
fee_rate = Decimal("0.0025")
fee = (amount * fee_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
# Result: Decimal("3.75") — exact

# String storage in JSON
json_safe_amount = str(fee)          # "3.75"

# Parsing back from JSON
amount_back = Decimal(json_amount_string)  # safe reconstruction
```

**Applied in:** `agents/settlement_processor.py` — all fee calculations use `ROUND_HALF_UP` and store results as strings. `agents/transaction_validator.py` — amounts normalized to 2 decimal places via `.quantize(Decimal("0.01"))`. `agents/fraud_detector.py` — amount comparison uses `Decimal` parsed from string before any threshold checks.

---

## Query 2: FastMCP — tool and resource decorators

**Search:** "fastmcp Python MCP server tool resource decorator"

**context7 library ID:** `/jlowin/fastmcp`

**Key insight applied:**

FastMCP simplifies MCP server creation to decorator-based function definitions. The critical patterns:

```python
from fastmcp import FastMCP

mcp = FastMCP("server-name")

# Tool: callable by MCP clients
@mcp.tool()
def my_tool(param: str) -> dict:
    """Docstring becomes the tool description in the MCP registry."""
    return {"result": param}

# Resource: read-only data exposed at a URI
@mcp.resource("myscheme://path")
def my_resource() -> str:
    """Returns static or computed content as a string."""
    return "# Markdown content"

# Running the server (stdio transport by default)
if __name__ == "__main__":
    mcp.run()
```

Type hints in tool function signatures are used to generate the JSON schema for the MCP tool definition, so `str | None = None` correctly produces an optional string parameter in the schema.

**Applied in:** `mcp/server.py` — `get_transaction_status`, `list_pipeline_results` implemented as `@mcp.tool()` decorated functions with full type annotations; `pipeline_summary` implemented as `@mcp.resource("pipeline://summary")`.

---

## Query 3: `pytest-cov` — coverage configuration

**Search:** "pytest-cov coverage report term-missing configuration"

**context7 library ID:** `/pytest-dev/pytest-cov`

**Key insight applied:**

Coverage can be configured via command line or `pyproject.toml`. For the coverage gate hook, the key command is:

```bash
python3 -m pytest --cov=agents --cov-report=term --tb=no -q
```

The `TOTAL` line in the terminal report gives the overall percentage:
```
TOTAL                     245     18    93%
```

The `--cov=agents` flag limits coverage measurement to the `agents/` package only (excludes `mcp/`, `tests/`, `integrator.py`), which is the appropriate scope for the gate.

**Applied in:** `.claude/hooks/coverage-gate.sh` — parses the `TOTAL` line to extract the coverage percentage before deciding whether to block the git push.
