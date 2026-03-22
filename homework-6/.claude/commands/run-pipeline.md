---
description: Run the multi-agent banking pipeline end-to-end and show a results summary table.
---

Run the multi-agent banking pipeline end-to-end.

Steps:
1. Check that sample-transactions.json exists in the current directory
2. Clear shared/ directories (input, processing, output — NOT results if you want to preserve prior runs)
3. Run the pipeline: `python integrator.py`
4. Wait for completion
5. Read all files in shared/results/
6. Show a summary table of results:

   | TXN ID  | Amount    | Currency | Risk   | Disposition    | Fee    |
   |---------|-----------|----------|--------|----------------|--------|
   | TXN001  | $1,500.00 | USD      | LOW    | SETTLED        | $3.75  |
   | ...     | ...       | ...      | ...    | ...            | ...    |

7. Report any transactions that were REJECTED and the reason for each rejection
8. Report the total count: X settled, Y held, Z pending review, W rejected
