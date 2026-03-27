# Virtual Card Lifecycle — Claude Code Instructions

## Project Overview
EU-focused virtual card lifecycle feature: card creation, freeze/unfreeze, spending limits, transaction history, with GDPR and PSD2/SCA controls.

## Tech Stack
- Runtime: Node.js (LTS)
- Framework: Express
- Language: JavaScript

## Architecture
```
src/
  routes/          # cards.js (end-user), ops.js (internal roles)
  controllers/     # cardsController.js, opsController.js
  services/        # Business logic
  repositories/    # Data access
  middleware/      # auth.js, requireSca.js, errorHandler.js
  validators/      # Input validation at API boundary
  models/          # Domain schemas
  errors/          # AppError class
  audit/           # Append-only audit logger
  config/          # Privacy policy, platform defaults
tests/
```

## Domain Rules
- One card per user; end-users act on their own card only.
- Card states: `active` ↔ `frozen` (idempotent); `closed` is terminal — only ops role can close.
- Amounts stored in minor currency units (cents); no floating point.
- Daily limit must not exceed monthly limit.

## Security & Compliance
- All endpoints require authenticated user context.
- Sensitive actions (freeze, unfreeze, update limits) require step-up SCA (freshness window: 5 min).
- Never log PAN, CVV, tokens, or raw secrets.
- Audit trail is append-only; failures must not leak sensitive data.
- Apply GDPR data minimization: store only necessary fields, attach retention metadata.

## API Conventions
- Consistent JSON error shape: `{ code, message, requestId }`.
- Stable machine-readable error codes (no internal details in responses).
- Include `requestId` in responses and structured logs.
- HTTP status codes must be explicit and correct.

## Code Quality
- Business logic lives in services, not controllers or routes.
- Validate all request payloads at the API boundary before service calls.
- Prefer clear names; avoid hidden side effects and shared mutable state.

## Testing
- Cover every lifecycle endpoint + critical negative paths.
- Assert: ownership enforcement, SCA enforcement, idempotent freeze/unfreeze, limit validation, pagination, audit event generation.
- Confirm sensitive fields are absent from logs and error responses.

## Reference Documents
- Full specification: `specification.md`
- Agent guidelines: `agents.md`
