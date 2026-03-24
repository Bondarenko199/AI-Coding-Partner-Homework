from fastapi import FastAPI, HTTPException
from pathlib import Path
import json
import uuid
from datetime import datetime, timezone

BASE_DIR = str(Path(__file__).resolve().parent.parent)
RESULTS_DIR = Path(BASE_DIR) / "shared" / "results"

app = FastAPI(title="Banking Pipeline API", version="1.0.0")

REQUIRED_FIELDS = [
    "transaction_id",
    "amount",
    "currency",
    "transaction_type",
    "source_account",
    "destination_account",
]


@app.post("/api/transactions", status_code=201)
def submit_transaction(body: dict):
    for field in REQUIRED_FIELDS:
        if field not in body:
            raise HTTPException(
                status_code=400,
                detail={"error": f"missing required field: {field}", "field": field},
            )

    from agents.transaction_validator import TransactionValidator
    from agents.fraud_detector import FraudDetector
    from agents.notification_agent import NotificationAgent
    from agents.settlement_processor import SettlementProcessor

    message = {
        "message_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source_agent": "api_gateway",
        "target_agent": "transaction_validator",
        "message_type": "transaction",
        "data": body,
    }

    validator = TransactionValidator(base_dir=BASE_DIR)
    fraud_detector = FraudDetector(base_dir=BASE_DIR)
    notification_agent = NotificationAgent(base_dir=BASE_DIR)
    settlement = SettlementProcessor(base_dir=BASE_DIR)

    validated = validator.process_message(message)
    if validated["data"].get("validation_status") != "REJECTED":
        scored = fraud_detector.process_message(validated)
        notification_agent.process_message(scored)
        settlement.process_message(scored)

    return {"tracking_id": body["transaction_id"], "status": "accepted"}


@app.get("/api/transactions/{transaction_id}/status")
def get_transaction_status(transaction_id: str):
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    for suffix in ("_result.json", "_rejected.json"):
        candidate = RESULTS_DIR / f"{transaction_id}{suffix}"
        if candidate.exists():
            data = json.loads(candidate.read_text())["data"]
            status = data.get(
                "settlement_status", data.get("validation_status", "unknown")
            )
            return {
                "transaction_id": transaction_id,
                "status": status.lower(),
                "details": data,
            }

    raise HTTPException(
        status_code=404,
        detail={"error": "Transaction not found", "transaction_id": transaction_id},
    )


@app.get("/api/results")
def list_results():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    for f in sorted(RESULTS_DIR.glob("*.json")):
        try:
            data = json.loads(f.read_text())["data"]
            results.append(data)
        except Exception:
            pass
    return results
