# Virtual Card Lifecycle Specification

> Ingest the information from this file, implement the Low-Level Tasks, and generate the code that will satisfy the High and Mid-Level Objectives.

## Stakeholders

| Stakeholder | Primary Needs |
|---|---|
| End-users | Create and manage their own virtual card; view transactions; self-service freeze/unfreeze |
| Ops / Support | Look up card status and audit history for a user without exposing full PAN; close a card when required |
| Compliance | Access append-only audit trail for regulatory review and confirm GDPR and PSD2/SCA controls are active |

## High-Level Objective
- Build a virtual card lifecycle feature for EU users that supports card creation, freeze/unfreeze, spending limit management, and transaction viewing with practical GDPR and PSD2/SCA controls.

## Mid-Level Objectives
- Allow authenticated end-users to create, freeze, and unfreeze their own virtual cards with clear card state transitions.
- Enforce spending limits (daily and monthly) and ensure new transactions respect active limits.
- Provide transaction history retrieval with filtering, pagination, and stable sorting for a good end-user experience.
- Apply practical EU compliance controls: GDPR data minimization and PSD2-aligned step-up authentication for sensitive actions.
- Preserve an audit trail for security-sensitive card actions and transaction access, while enforcing consistent validation and API error behavior.
- Enable ops to close cards and enable compliance to query the audit trail by user and date range via role-restricted internal endpoints.

## Implementation Notes
- Target stack: Node.js + Express.
- Architecture: route-controller-service-repository separation; business logic must not live in route handlers.
- Monetary handling: store amounts in minor units (for example, cents) and avoid floating point arithmetic for limit checks.
- Card state model: `active`, `frozen`, `closed`; freeze/unfreeze transitions must be idempotent; only ops can close a card.
- Security baseline: require authenticated user context for all endpoints and step-up authentication for card freeze/unfreeze and limit changes.
- Compliance baseline: apply GDPR data minimization and redaction rules, and apply PSD2/SCA controls with logged SCA events.
- Observability: use structured logs for request ID, user ID, card ID, action, outcome, and timestamp; keep audit logs append-only and separate from debug logs.

## Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Latency | P95 < 300 ms for transaction list endpoint (indexed storage, moderate dataset) |
| Availability | 99.5% uptime target for card lifecycle endpoints |
| Rate limiting | Max 60 requests / minute per authenticated user; return `429` with `Retry-After` header |
| Data retention | User-linked card records retained for 5 years post-closure (PSD2 record-keeping); soft-delete only |
| Audit log retention | Audit events immutable and retained for 7 years for compliance review |
| Error budget | No more than 0.5% of lifecycle requests may return 5xx per rolling 30-day window |

## Context

### Beginning context
- No production-ready virtual card implementation exists yet.
- The implementation target is a Node.js + Express service.
- The team has only high-level homework constraints and needs an implementable plan.
- Regulated environment constraints are known at a high level (GDPR and PSD2/SCA), but concrete implementation tasks are not yet defined.

### Ending context
- A complete implementation plan exists for virtual card lifecycle and transaction visibility.
- Engineering tasks are decomposed into low-level, executable prompts for AI-assisted delivery.
- Security and compliance requirements are mapped to concrete files/functions and tests.
- The resulting codebase is expected to include: `src/routes/cards.js`, `src/routes/ops.js`, `src/controllers/cardsController.js`, `src/controllers/opsController.js`, `src/services/cardService.js`, `src/services/limitService.js`, `src/services/scaService.js`, `src/services/transactionService.js`, `src/middleware/auth.js`, `src/middleware/requireSca.js`, `src/validators/cardValidators.js`, `src/repositories/cardRepository.js`, `src/repositories/transactionRepository.js`, `src/repositories/auditRepository.js`, `src/audit/auditLogger.js`, and `tests/`.

## Low-Level Tasks

### 1. Define domain models and validation contracts

What prompt would you run to complete this task?
Create virtual card and transaction domain schemas for Node.js + Express, including enum constraints for card status and strong input validation for limit values and currencies.

What file do you want to CREATE or UPDATE?
`src/models/cardModel.js`, `src/models/transactionModel.js`, `src/validators/cardValidators.js`

What function do you want to CREATE or UPDATE?
`validateCreateCardRequest`, `validateUpdateLimitsRequest`, `validateCardActionRequest`

What are details you want to add to drive the code changes?
- Enforce required fields and strict schema validation.
- Validate currency format (ISO-like uppercase code).
- Validate limit values as non-negative integers in minor units.
- Reject unknown fields in sensitive requests to reduce attack surface.

Acceptance criteria:
- Invalid currency code returns `400` with error code `INVALID_CURRENCY`.
- Negative limit value returns `400` with error code `INVALID_LIMIT`.
- Unknown fields in request body return `400` with error code `UNEXPECTED_FIELD`.

### 2. Implement virtual card creation flow

What prompt would you run to complete this task?
Implement authenticated endpoint and service logic to create a virtual card with default status active, default limits, and ownership linked to current user.

What file do you want to CREATE or UPDATE?
`src/routes/cards.js`, `src/controllers/cardsController.js`, `src/services/cardService.js`, `src/repositories/cardRepository.js`

What function do you want to CREATE or UPDATE?
`createVirtualCard`

What are details you want to add to drive the code changes?
- Generate unique card identifier.
- Persist masked card reference only; do not store CVV in retrievable form.
- Return only safe response fields.
- Include created timestamp and actor metadata for audit.
- Enforce one-card-per-user policy at service/repository level.

Acceptance criteria:
- Successful creation returns `201` with `id`, `status: "active"`, `createdAt`, and masked card reference.
- Duplicate create request for a user with an existing card returns `409` with error code `CARD_ALREADY_EXISTS`.
- Response must not contain PAN, CVV, or raw token.
- Audit event `CARD_CREATED` is recorded with actor and timestamp.

### 3. Implement freeze/unfreeze operations with idempotency

What prompt would you run to complete this task?
Add card freeze and unfreeze endpoints with clear state transition rules and idempotent behavior.

What file do you want to CREATE or UPDATE?
`src/routes/cards.js`, `src/controllers/cardsController.js`, `src/services/cardService.js`

What function do you want to CREATE or UPDATE?
`freezeCard`, `unfreezeCard`

What are details you want to add to drive the code changes?
- If card already frozen, freeze operation returns success without additional state-changing side effects.
- If card already active, unfreeze operation returns success without additional state-changing side effects.
- Deny operations on cards not owned by the authenticated user.
- Emit audit events for every requested action and final outcome (including idempotent no-op outcomes).

Acceptance criteria:
- Freeze on active card returns `200` with `status: "frozen"`; audit event `CARD_FROZEN` recorded.
- Freeze on already-frozen card returns `200`; audit event is still recorded with outcome `NO_OP`.
- Unfreeze on already-active card returns `200`; audit event is still recorded with outcome `NO_OP`.
- Request from non-owner returns `403`.

### 4. Implement spending limit configuration

What prompt would you run to complete this task?
Implement endpoint to set daily and monthly spending limits for a virtual card with validation and audit logging.

What file do you want to CREATE or UPDATE?
`src/routes/cards.js`, `src/controllers/cardsController.js`, `src/services/limitService.js`

What function do you want to CREATE or UPDATE?
`updateCardLimits`, `validateLimitBounds`

What are details you want to add to drive the code changes?
- Support per-card daily and monthly limits in minor units.
- Validate daily limit is not greater than monthly limit.
- Allow explicit reset to platform defaults.
- Return effective limits after update.

Acceptance criteria:
- Valid update returns `200` with effective `dailyLimit` and `monthlyLimit` in minor units.
- Daily limit exceeding monthly limit returns `400` with error code `LIMIT_CONFLICT`.
- Audit event `LIMITS_UPDATED` recorded with old and new values.

### 5. Implement transaction history retrieval

What prompt would you run to complete this task?
Implement transaction list endpoint for a card with filters (date range, status, merchant category), pagination, and deterministic sorting.

What file do you want to CREATE or UPDATE?
`src/routes/cards.js`, `src/controllers/cardsController.js`, `src/services/transactionService.js`, `src/repositories/transactionRepository.js`

What function do you want to CREATE or UPDATE?
`listCardTransactions`

What are details you want to add to drive the code changes?
- Restrict access to transactions by card ownership.
- Provide page, pageSize, totalCount, and nextPage token or index.
- Default sort by newest transaction first.
- Validate date range and reject invalid intervals.

Acceptance criteria:
- Valid request returns `200` with `data[]`, `page`, `pageSize`, `totalCount`.
- Date range where `from > to` returns `400` with error code `INVALID_DATE_RANGE`.
- Non-owner access returns `403`.
- Response time meets P95 < 300 ms NFR.

### 6. Add PSD2/SCA step-up middleware for sensitive actions

What prompt would you run to complete this task?
Implement middleware that verifies a recent successful step-up authentication before allowing freeze/unfreeze and limit updates.

What file do you want to CREATE or UPDATE?
`src/middleware/requireSca.js`, `src/services/scaService.js`, `src/routes/cards.js`

What function do you want to CREATE or UPDATE?
`requireSca`, `verifyRecentSca`

What are details you want to add to drive the code changes?
- Apply middleware only to sensitive endpoints.
- Define SCA freshness window (for example, 5 minutes).
- Return standard authorization error when SCA is missing or stale.
- Audit SCA verification result for each sensitive request.

Acceptance criteria:
- Sensitive action with valid SCA token proceeds and returns expected response.
- Sensitive action with missing SCA token returns `403` with error code `SCA_REQUIRED`.
- Sensitive action with stale SCA token (>5 min) returns `403` with error code `SCA_EXPIRED`.
- Each SCA check result is recorded in audit log.

### 7. Add GDPR-oriented data minimization and logging redaction

What prompt would you run to complete this task?
Introduce GDPR-focused handling rules: data minimization, redacted logging, and limited retention metadata for personal data.

What file do you want to CREATE or UPDATE?
`src/config/privacyPolicy.js`, `src/audit/auditLogger.js`, `src/services/cardService.js`

What function do you want to CREATE or UPDATE?
`redactSensitiveFields`, `buildRetentionMetadata`

What are details you want to add to drive the code changes?
- Never log full PAN, CVV, or raw authentication tokens.
- Keep only fields necessary for operations and support.
- Attach retention class/timer metadata for user-linked records.
- Document what personal data is stored and why.

Acceptance criteria:
- Log output for any card action contains no PAN, CVV, or token substring.
- Each persisted user-linked record includes `retentionClass` and `retainUntil` fields.
- A written data inventory comment exists in `privacyPolicy.js` listing stored personal fields and legal basis.

### 8. Implement append-only audit trail

What prompt would you run to complete this task?
Create an append-only audit logger for card lifecycle and transaction access actions with immutable event records.

What file do you want to CREATE or UPDATE?
`src/audit/auditLogger.js`, `src/services/cardService.js`, `src/services/transactionService.js`

What function do you want to CREATE or UPDATE?
`recordAuditEvent`

What are details you want to add to drive the code changes?
- Record actor, action, target, outcome, timestamp, request ID, and reason code when available.
- Ensure audit logging failures do not expose sensitive data in error messages.
- Keep schema stable for later compliance reporting.

Acceptance criteria:
- Every card lifecycle action and transaction access produces an audit event with all required fields.
- Audit log storage is append-only (no update or delete operations exposed).
- Audit logging failure does not return sensitive data in the error response.

### 9. Standardize error model and response mapping

What prompt would you run to complete this task?
Implement a shared error model and Express error middleware so validation, auth, not-found, and conflict responses are consistent.

What file do you want to CREATE or UPDATE?
`src/errors/appError.js`, `src/middleware/errorHandler.js`, `src/controllers/cardsController.js`

What function do you want to CREATE or UPDATE?
`AppError`, `errorHandler`

What are details you want to add to drive the code changes?
- Use stable machine-readable error codes.
- Include user-friendly message and traceable request ID.
- Hide internal details from client responses.
- Map errors to clear HTTP status codes.

Acceptance criteria:
- All error responses conform to `{ code, message, requestId }` shape.
- No stack trace or internal path appears in any error response.
- Each error code maps to exactly one HTTP status code across all endpoints.

### 10. Build test suite for lifecycle, security, and compliance behaviors

What prompt would you run to complete this task?
Generate automated tests for virtual card lifecycle endpoints, SCA enforcement, ownership checks, limit validation, transaction listing, and audit/logging behavior; include observability checks for latency, availability, and error budget tracking.

What file do you want to CREATE or UPDATE?
`tests/cardLifecycle.test.js`, `tests/scaEnforcement.test.js`, `tests/transactionListing.test.js`, `tests/auditLogging.test.js`, `tests/sloVerification.test.js`

What function do you want to CREATE or UPDATE?
Test cases for `createVirtualCard`, `freezeCard`, `unfreezeCard`, `updateCardLimits`, `listCardTransactions`, and `requireSca`; plus validation checks for lifecycle endpoint latency/error-rate metrics.

What are details you want to add to drive the code changes?
- Cover happy paths and key negative paths.
- Add edge cases for idempotent freeze/unfreeze behavior.
- Verify unauthorized or cross-user access is blocked.
- Assert that sensitive data is absent from logs and error payloads.
- Verify SLI metric definitions exist for availability, 5xx rate, and request latency.

Acceptance criteria:
- Test suite passes with no failures.
- Coverage includes at least one test per acceptance criterion across tasks 1–11.
- No test asserts against or logs sensitive field values (PAN, CVV, token).
- SLO verification tests assert NFR thresholds for availability, latency, and 5xx error budget using defined SLI metric formulas.

### 11. Implement ops card closure and compliance audit-query endpoints

What prompt would you run to complete this task?
Add internal ops endpoint to close a card (transition to `closed` state) and a compliance endpoint to query audit events by user and date range.

What file do you want to CREATE or UPDATE?
`src/routes/ops.js`, `src/controllers/opsController.js`, `src/services/cardService.js`, `src/repositories/auditRepository.js`

What function do you want to CREATE or UPDATE?
`closeCard`, `queryAuditEvents`

What are details you want to add to drive the code changes?
- Restrict ops endpoints to internal roles (`ops` or `compliance` claim in auth token).
- `closeCard` transitions state to `closed` and emits `CARD_CLOSED` audit event with actor and reason.
- `queryAuditEvents` accepts `userId`, `from`, `to`, and optional `action` filter; returns paginated events.
- Never expose full PAN in audit query results.
- Closing a card that is already closed returns a conflict error.

Acceptance criteria:
- Non-ops caller to close endpoint returns `403`.
- Closing an already-closed card returns `409` with error code `CARD_ALREADY_CLOSED`.
- Audit query returns paginated list with correct fields; PAN is absent from all results.
- `CARD_CLOSED` audit event recorded with actor, reason, and timestamp.
