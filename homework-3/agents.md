# AI Agent Guidelines for Virtual Card Lifecycle

## Purpose
This file defines how an AI coding partner should behave when implementing the virtual card lifecycle feature described in `specification.md`.

## Project Scope
- Domain: EU-focused virtual card lifecycle.
- In scope: create card, freeze/unfreeze, set spending limits, view transactions.
- Out of scope: physical cards, chargebacks, full core-banking platform features.

## Tech Stack
- Runtime: Node.js (LTS).
- Framework: Express.
- Style preference: JavaScript with clear module boundaries.
- Suggested architecture: routes -> controllers -> services -> repositories -> shared middleware/utilities.

## Domain Rules
- A card belongs to exactly one end-user account.
- End-users can only perform lifecycle actions on their own card; they cannot close it.
- Ops/compliance roles (via auth token claim) can close a card and query the audit trail.
- Card states: `active`, `frozen`, `closed`; freeze/unfreeze are idempotent; `closed` is terminal.
- Limits are represented in minor currency units and validated before persistence.

## Security and Compliance Constraints
- Compliance baseline: GDPR and PSD2/SCA (practical, lightweight).
- Require authenticated user context for all endpoints.
- Require step-up authentication for sensitive actions: freeze card, unfreeze card, and update spending limits.
- Never log full PAN, CVV, tokens, or secrets.
- Maintain append-only audit events for security-sensitive actions.
- Use least-data principles for personal information.

## API and Error Conventions
- Use explicit HTTP status codes and stable error codes.
- Return consistent JSON error shape across validation, auth, not-found, and business-rule failures.
- Keep internal implementation details out of client-facing error messages.
- Include request ID in responses and logs when available.

## Code Quality Rules
- Keep controllers thin; place business logic in services.
- Validate request payloads at API boundary before service execution.
- Use small, pure helper functions for data transformations where possible.
- Prefer clear names over short names.
- Avoid hidden side effects and shared mutable state.

## Testing Expectations
- Write tests for every lifecycle endpoint and critical negative paths.
- Include tests for ownership enforcement, SCA enforcement, idempotent freeze/unfreeze behavior, spending-limit validation, transaction filtering/pagination, and audit event generation.
- Ensure sensitive fields are absent from logs and error responses.

## AI Collaboration Workflow
- Before code generation, restate the objective and constraints from `specification.md`, then list target files and functions.
- During implementation, make small reviewable changes and keep behavior aligned with security/compliance rules.
- After implementation, run tests, summarize coverage of compliance and lifecycle scenarios, and document assumptions that need product/legal confirmation.

## Definition of Done
- Feature behavior matches `specification.md` high-level and mid-level objectives.
- Sensitive actions enforce recent SCA.
- Audit trail exists for card lifecycle and transaction access actions.
- Tests cover happy path, security boundary, and key edge cases.
- No sensitive data leakage in logs or responses.
