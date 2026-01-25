# AI Contributions

## Tools Used

| Tool | Model | Usage |
|------|-------|-------|
| Claude Code | Claude Opus 4.5 | CLI-based code generation, testing, documentation |
| GitHub Copilot | Copilot | Editor inline suggestions and completions |

## Code Contributions

| Component | File(s) | AI Contribution |
|-----------|---------|-----------------|
| Project Setup | `package.json` | Dependencies, scripts, metadata |
| Transaction Model | `src/models/transaction.js` | CRUD operations, filtering, balance calculation |
| Validation | `src/validators/transactionValidator.js` | Account/amount/currency validation with error messages |
| Utilities | `src/utils/helpers.js` | CSV export, response formatting |
| Routes | `src/routes/*.js` | All endpoints with proper HTTP status codes |
| Main App | `src/index.js` | Express setup, middleware, error handling |
| Demo Files | `demo/*` | run.sh, test.sh, requests.sh, sample-requests.http |
| Tests | `tests/**/*.test.js` | 132 tests, 99%+ coverage |

## Test Coverage

| Type | Tests | Files |
|------|-------|-------|
| Unit | 91 | validators, helpers, transaction model |
| Integration | 41 | transactions API, accounts API |
| **Total** | **132** | **99%+ coverage** |

## Screenshots

Located in `docs/screenshots/`:

| File | Content |
|------|---------|
| `claude-code-session-1.png` | Initial setup and requirements analysis |
| `claude-code-session-2.png` | Test implementation and results |
| `copilot-session-1.png` | Editor inline suggestions |

## Summary

| Aspect | AI | Human |
|--------|-----|-------|
| Architecture | Proposed structure | Confirmed |
| Code | Generated all files | Reviewed |
| Testing | 132 tests (99%+ coverage) | Chose native runner |
| Documentation | Generated | Provided screenshots |
| Feature Selection | Asked preference | Chose CSV export |

## Future Improvements

- Input sanitization for security
- Pagination for large lists
- CI/CD pipeline
