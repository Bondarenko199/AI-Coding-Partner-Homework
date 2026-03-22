---
description: Validate all transactions in sample-transactions.json without running the full pipeline (dry-run mode).
---

Validate all transactions in sample-transactions.json without processing them through fraud detection or settlement.

Steps:
1. Read sample-transactions.json
2. Run the validator in dry-run mode against each transaction:
   `python integrator.py --dry-run`
   Or if --dry-run is not available, instantiate TransactionValidator directly and call process_message() for each transaction without writing files
3. Report the validation results:
   - Total transactions: N
   - Valid: X
   - Invalid: Y
4. Show a detailed table:

   | TXN ID  | Status  | Reason (if rejected)                          |
   |---------|---------|-----------------------------------------------|
   | TXN001  | VALID   |                                               |
   | TXN006  | INVALID | XYZ is not a recognized ISO 4217 currency code |
   | TXN007  | INVALID | Amount must be positive, got -100.00           |

5. Do NOT write any files to shared/ directories (this is a read-only validation)
