# Repository Guidelines

## Project Overview
- Customer support ticket system that imports tickets from CSV/JSON/XML, auto-classifies category/priority, and manages full ticket lifecycle.
- Uses the Context-Model-Prompt framework with comprehensive tests and docs.

## Project Structure & Module Organization
- `src/` holds the TypeScript source: `server.ts` bootstraps the app, `app.ts` wires middleware/routes, `routes/` defines HTTP endpoints (e.g. `ticketRoutes.ts`), `services/` contains business logic (import, classification, storage), `models/` holds DTOs and schemas, and `middleware/` handles validation/errors.
- `tests/` contains the Node test suite with `*.test.ts`, plus `tests/fixtures/` and `tests/helpers/`.
- `fixtures/` stores sample CSV/JSON/XML ticket data for imports.
- `docs/` includes README, architecture, API reference, and testing guides (with Mermaid diagrams).
- `dist/` is the compiled output from `tsc` (generated).

## API Surface
```
POST   /tickets                     - Create new ticket (optional auto-classify via ?autoClassify=true)
POST   /tickets/import              - Bulk import from CSV/JSON/XML
GET    /tickets                     - List with filtering
GET    /tickets/:id                 - Get specific ticket
PUT    /tickets/:id                 - Update ticket
DELETE /tickets/:id                 - Delete ticket
POST   /tickets/:id/auto-classify   - Auto-categorize and prioritize an existing ticket
```

## Ticket Model & Classification Rules
- Fields cover identity (id, customer_id/email/name), content (subject 1-200 chars, description 10-2000), classification (category, priority, status), lifecycle timestamps, assignment, tags, and metadata (source, browser, device_type).
- Categories: `account_access`, `technical_issue`, `billing_question`, `feature_request`, `bug_report`, `other`.
- Priority keywords: Urgent ("can't access", "critical", "production down", "security"), High ("important", "blocking", "asap"), Medium (default), Low ("minor", "cosmetic", "suggestion").
- Classification returns category, priority, confidence (0-1), reasoning, and keywords; manual overrides should preserve confidence info.

## Validation & Processing Requirements
- Enforce email format; subject length 1-200; description length 10-2000.
- Enum validation for category, priority, status, metadata.source, metadata.device_type.
- Graceful handling of malformed files with clear error messages and appropriate HTTP status codes (201, 200, 400, 404, 204, etc.).

## Import & Auto-Classification
- Supports CSV, JSON, XML; file type auto-detection by extension or content when absent.
- Bulk import response summarizes `total`, `successful`, `failed`, and `errors` with row details plus created tickets.
- Auto-classify during import when requested or when category/priority missing.

## Documentation & Sample Data
- Core docs: `README.md`, `API_REFERENCE.md`, `ARCHITECTURE.md`, `TESTING_GUIDE.md`, plus supporting artifacts under `docs/` (include ≥3 Mermaid diagrams across docs).
- Fixtures: `sample_tickets.csv` (~50 tickets), `sample_tickets.json` (~20 tickets), `sample_tickets.xml` (~30 tickets) plus invalid samples for negative tests.

## Build, Test, and Development Commands
```bash
npm install       # install dependencies
npm run dev       # start dev server with tsx watch
npm run build     # compile TypeScript to dist/
npm start         # run compiled server
npm test          # run all tests (node --test with tsx)
npm run test:watch
npm run test:coverage
npm run lint
npm run lint:fix
```

## Testing Guidelines
- Tests use the built-in Node test runner (`node --test`) with `tsx` for TS transpilation; target >85% coverage.
- Suites live in `tests/`: validation (`ticketModel.test.ts`), API (`ticketApi.test.ts`), parsers (`importCsv/Json/Xml.test.ts`), classification (`categorization.test.ts`), end-to-end (`integration.test.ts`), and performance benchmarks (`performance.test.ts`).
- Place new fixtures under `tests/fixtures/` or `fixtures/`; mirror feature names for new test files.

## Coding Style & Naming Conventions
- TypeScript + ESM; keep `.js` extensions in import paths for Node ESM resolution.
- Use 2-space indentation and semicolons (match existing files).
- Naming: PascalCase for classes/types and service files (`TicketStore.ts`), camelCase for variables/functions, and `*.test.ts` for tests.
- Linting via ESLint with `@typescript-eslint`; prefer typed alternatives to `any` and prefix unused params with `_`.

## Commit & Pull Request Guidelines
- Existing commits are short and plain-language (e.g. "Readme update") with no Conventional Commits prefix. Follow the same style: one topic, brief message.
- PRs should include a concise summary, test commands run (for example `npm test`), and docs updates when behavior changes. Add screenshots only when updating docs under `docs/screenshots/`.

## Configuration & Runtime Notes
- `PORT` controls the server port (default 3000).
- Treat `dist/` as build output; do not edit it directly.
