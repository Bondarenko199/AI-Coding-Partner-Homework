# 📄 Homework 3: Specification-Driven Design

> **Student Name**: h.bondarenko
> **Date Submitted**: 2026-02-08
> **AI Tools Used**: Claude Code (claude-sonnet-4-5-20250929), OpenAI Codex (GPT-5.3 Codex)

---

## 📋 Project Overview

This homework delivers a specification package for an EU-focused virtual card lifecycle feature.  
No implementation code is included; the output is documentation designed to guide future AI-assisted implementation.

### Deliverables in This Submission

- `specification.md` - full feature specification with objectives, context, implementation notes, and low-level tasks
- `agents.md` - AI agent behavior rules for future implementation
- `CLAUDE.md` - Claude Code project instructions (editor/AI rules)
- `README.md` - rationale and best-practice mapping

---

## 🧭 Scope Summary (Student and Task Summary)

- **Domain**: Virtual card lifecycle
- **Focus**: End-user actions first
- **Region**: EU-focused compliance assumptions
- **Core operations**: create card, freeze/unfreeze, set spending limits, view transactions
- **Compliance level**: Practical/lightweight (GDPR + PSD2/SCA baseline)
- **Future implementation stack assumption**: Node.js + Express

---

## 🧱 Document Structure

```text
homework-3/
├── specification.md   # Full implementation-ready specification
├── agents.md          # AI coding partner rules and constraints
├── CLAUDE.md          # Claude Code project instructions (editor/AI rules)
└── README.md          # Homework rationale and best-practice mapping
```

---

## 🎯 Rationale

The specification follows the provided template structure in a semi-strict way, then expands it with a fuller low-level execution plan so implementation can start with minimal ambiguity.

Design decisions were made to balance delivery clarity with realistic fintech constraints:

1. **End-user value first**: The scope centers on concrete lifecycle operations users care about.
2. **Practical compliance**: GDPR and PSD2/SCA controls are included where risk is highest, without overengineering.
3. **Execution readiness**: Each low-level task includes actionable prompt intent, target files, and target functions.
4. **Operational safety**: Ownership checks, redacted logging, and append-only audit events are baked into the plan.

---

## ✅ Industry Best Practices and Where They Appear

| Best Practice | Where It Appears |
|------|-------------|
| Objective decomposition from business goal to execution tasks | `specification.md`: `High-Level Objective`, `Mid-Level Objectives`, `Low-Level Tasks` |
| Separation of concerns (route/controller/service/repository) | `specification.md`: `Implementation Notes`; low-level tasks 2, 4, 5, 9 |
| Secure-by-default access model | `specification.md`: low-level tasks 3, 6, 9; `agents.md`: `Domain Rules`, `Security and Compliance Constraints` |
| PSD2/SCA step-up for sensitive actions | `specification.md`: low-level task 6; `agents.md`: `Security and Compliance Constraints` |
| GDPR data minimization and sensitive-data redaction | `specification.md`: low-level task 7; `agents.md`: `Security and Compliance Constraints` |
| Auditability for security-sensitive actions | `specification.md`: low-level task 8; `agents.md`: `Definition of Done` |
| Consistent API error model | `specification.md`: low-level task 9; `agents.md`: `API and Error Conventions` |
| Risk-oriented test planning | `specification.md`: low-level task 10; `agents.md`: `Testing Expectations` |
| Role-based access control (ops vs end-user) | `specification.md`: `Stakeholders`, low-level task 11; `agents.md`: `Domain Rules` |
| Compliance tooling (audit query, data-subject export) | `specification.md`: `Stakeholders`, low-level task 11; `agents.md`: `Domain Rules` |

---

## 📝 Notes

- This homework intentionally contains no code implementation.
- The documents are written so a future implementation team (human + AI) can execute consistently.
