# Agent Registry — Banking Pipeline

**Author:** H. Bondarenko

---

## Meta-Agents (Claude Code `.claude/agents/`)

These agents autonomously *create* the banking pipeline system.

| Name | Role | Color | Model | Tools |
|------|------|-------|-------|-------|
| `spec-writer` | Writes specification.md and agents.md | blue | inherit | Read, Write, Glob |
| `code-generator` | Generates all Python pipeline code | green | inherit | Read, Write, Bash, Glob, Grep |
| `test-engineer` | Writes tests and configures coverage hook | yellow | inherit | Read, Write, Bash, Glob |
| `doc-writer` | Generates README.md and HOWTORUN.md | cyan | inherit | Read, Write, Glob, Bash |

### Trigger phrases

| Agent | Triggers on |
|-------|------------|
| spec-writer | "write the spec", "create specification.md", "/write-spec" |
| code-generator | "build the pipeline", "generate the agents", "implement the code" |
| test-engineer | "write the tests", "set up coverage gate", "create test suite" |
| doc-writer | "write the README", "generate documentation", "create docs" |

---

## Pipeline Agents (Python `agents/`)

These are the banking transaction processing agents produced by the meta-agents.

| Name | File | Input | Output |
|------|------|-------|--------|
| TransactionValidator | `agents/transaction_validator.py` | `shared/input/{id}.json` | `shared/processing/{id}.json` or `shared/results/{txn_id}_rejected.json` |
| FraudDetector | `agents/fraud_detector.py` | `shared/processing/{id}.json` | `shared/output/{id}.json` |
| SettlementProcessor | `agents/settlement_processor.py` | `shared/output/{id}.json` | `shared/results/{txn_id}_result.json` |

### Common interface

All pipeline agents implement:
```python
class AgentName:
    def __init__(self, base_dir: str = ".") -> None: ...
    def process_message(self, message: dict) -> dict: ...
```

The `base_dir` parameter redirects all file I/O, enabling test isolation.

---

## Message Envelope Schema

All inter-agent messages follow this JSON structure:

```json
{
  "message_id": "uuid4-string",
  "timestamp": "2026-03-16T10:00:00Z",
  "source_agent": "transaction_validator",
  "target_agent": "fraud_detector",
  "message_type": "validated_transaction",
  "data": {
    "transaction_id": "TXN001",
    "amount": "1500.00",
    "currency": "USD",
    "transaction_type": "transfer",
    "source_account": "ACC-1001",
    "destination_account": "ACC-2001",
    "timestamp": "2026-03-16T09:00:00Z",
    "metadata": {"channel": "online", "country": "US"},
    "validation_status": "VALIDATED",
    "validation_errors": [],
    "validated_at": "2026-03-16T10:00:01Z"
  }
}
```

---

## Slash Commands

| Command | File | Description |
|---------|------|-------------|
| `/write-spec` | `.claude/commands/write-spec.md` | Generate specification.md and agents.md from template |
| `/run-pipeline` | `.claude/commands/run-pipeline.md` | Run full pipeline end-to-end, show results table |
| `/validate-transactions` | `.claude/commands/validate-transactions.md` | Dry-run validation only, report valid/rejected counts |

---

## Communication Protocol

```
sample-transactions.json
         │
         ▼
    integrator.py  (wraps each txn in message envelope, writes to shared/input/)
         │
         ▼
   shared/input/{message_id}.json
         │
         ▼
  TransactionValidator.process_message()
    ┌────┴────┐
  VALID    REJECTED
    │          │
    ▼          ▼
shared/      shared/
processing/  results/
    │        {txn_id}_rejected.json
    ▼
  FraudDetector.process_message()
    │
    ▼
shared/output/{message_id}.json
    │
    ▼
SettlementProcessor.process_message()
    │
    ▼
shared/results/{txn_id}_result.json
```
