# Testing Guide (Concise)

## Commands
- All tests: `npm test`
- Coverage: `TMPDIR=./.tmp npm run test:coverage` (set TMPDIR if /tmp blocked)
- Watch: `npm run test:watch`
- One suite (example): `node --import tsx --test tests/test-ticket-api.test.ts`

## Suites
- `test-ticket-model` (validation)
- `test-ticket-api` (API endpoints)
- `test-import-csv/json/xml` (parsers)
- `test-categorization` (classifier)
- `test-integration` (end-to-end flows)
- `test-performance` (throughput/latency)

## Data
- Valid samples: `fixtures/sample_tickets.{csv,json,xml}`
- Negative cases: `fixtures/invalid_tickets.{csv,json,xml}` and `tests/fixtures/malformed.*`

## What to expect
- Status codes: 201 create, 200 reads/updates, 204 delete, 207 partial import, 400 validation/failed import, 404 missing.
- Classification logs print to stdout during tests (structured JSON).

## Tips
- Clear failures: look for validation messages in `details` array.
- If ports collide or permission errors appear, set `PORT` before running tests or ensure `TMPDIR` is writable for coverage.
- Performance tests assume localhost; keep dev machine unthrottled for stable timings.
