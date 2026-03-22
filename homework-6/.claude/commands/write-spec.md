---
description: Generate the project specification (specification.md and agents.md) from the template. Invokes the spec-writer agent.
---

Generate the full project specification for the AI-Powered Multi-Agent Banking Pipeline.

Steps:
1. Read TASKS.md to extract all requirements
2. Read specification-TEMPLATE-hint.md for the required structure
3. Read sample-transactions.json to understand all 8 input transactions
4. Write specification.md with all 5 required sections:
   - High-Level Objective (one sentence)
   - Mid-Level Objectives (4-5 testable requirements)
   - Implementation Notes (decimal, currency, logging, PII rules)
   - Context (beginning and ending state)
   - Low-Level Tasks (one entry per pipeline agent with exact prompts)
5. Write agents.md with complete agent registry (meta-agents + pipeline agents)
6. Confirm both files were written and display a summary of sections created
7. Include "Author: H. Bondarenko" in both documents
