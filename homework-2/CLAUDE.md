# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a customer support ticket management system that imports tickets from multiple file formats (CSV, JSON, XML), automatically categorizes issues, and assigns priorities. The project focuses on applying the Context-Model-Prompt framework while generating comprehensive tests and documentation using AI tools.

## Tech Stack

**Node.js with Express**

Common commands:
- `npm install` - Install dependencies
- `npm start` - Start the server
- `npm test` - Run all tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run dev` - Start development server with hot reload

## Core System Architecture

### Ticket Data Model

The system revolves around a ticket entity with the following key fields:
- **Identity**: UUID, customer_id, customer_email, customer_name
- **Content**: subject (1-200 chars), description (10-2000 chars)
- **Classification**: category (6 types), priority (4 levels), status (5 states)
- **Lifecycle**: created_at, updated_at, resolved_at, assigned_to
- **Context**: tags, metadata (source, browser, device_type)

### API Endpoints Structure

```
POST   /tickets              - Create new ticket
POST   /tickets/import       - Bulk import from CSV/JSON/XML
GET    /tickets              - List with filtering
GET    /tickets/:id          - Get specific ticket
PUT    /tickets/:id          - Update ticket
DELETE /tickets/:id          - Delete ticket
POST   /tickets/:id/auto-classify - Auto-categorize and prioritize
```

### Node.js Project Structure

Typical Express.js organization:
- `src/routes/` - Express route handlers for ticket endpoints
- `src/models/` - Ticket data model and validation schemas
- `src/services/` - Business logic (import parsers, classification engine)
- `src/middleware/` - Validation, error handling
- `src/utils/` - Helper functions for parsing and classification
- `tests/` - Test suite with fixtures
- `fixtures/` or `tests/fixtures/` - Sample CSV/JSON/XML files

### Multi-Format Import System

The bulk import endpoint must handle three formats:
- **CSV**: Parse comma-separated values
- **JSON**: Parse JSON arrays of ticket objects
- **XML**: Parse XML with ticket elements

All imports must return a summary: total records, successful, failed with error details.

### Auto-Classification Engine

**Categories** (keyword-based detection):
- `account_access` - login, password, 2FA issues
- `technical_issue` - bugs, errors, crashes
- `billing_question` - payments, invoices, refunds
- `feature_request` - enhancements, suggestions
- `bug_report` - defects with reproduction steps
- `other` - fallback for uncategorizable

**Priority Rules** (keyword scanning):
- **Urgent**: "can't access", "critical", "production down", "security"
- **High**: "important", "blocking", "asap"
- **Medium**: default fallback
- **Low**: "minor", "cosmetic", "suggestion"

Auto-classification returns: category, priority, confidence score (0-1), reasoning, keywords found. Store classification confidence and allow manual override.

## Validation Requirements

Enforce strict validation on all ticket operations:
- Email format validation for customer_email
- String length constraints (subject: 1-200, description: 10-2000)
- Enum validation for category, priority, status, metadata.source, metadata.device_type
- Graceful handling of malformed files with meaningful error messages
- Appropriate HTTP status codes (201, 400, 404, etc.)

## Test Suite Structure

Tests must achieve >85% code coverage across these test files (using Jest, Mocha, or similar):

```
tests/
├── ticketApi.test.js        # API endpoints (11 tests)
├── ticketModel.test.js      # Data validation (9 tests)
├── importCsv.test.js        # CSV parsing (6 tests)
├── importJson.test.js       # JSON parsing (5 tests)
├── importXml.test.js        # XML parsing (5 tests)
├── categorization.test.js   # Classification logic (10 tests)
├── integration.test.js      # End-to-end workflows (5 tests)
├── performance.test.js      # Benchmarks (5 tests)
└── fixtures/                # Sample data files
```

Use `npm test` to run all tests, `npm run test:coverage` for coverage reports.

### Integration Test Scenarios

Required end-to-end test cases:
1. Complete ticket lifecycle workflow (create → update → classify → resolve → close)
2. Bulk import with auto-classification verification
3. Concurrent operations (20+ simultaneous requests)
4. Combined filtering by category and priority

## Documentation Structure

Generate 5 documentation files for different audiences:

1. **README.md** - Developers (overview, architecture diagram, installation, run tests, project structure)
2. **API_REFERENCE.md** - API consumers (endpoints, request/response examples, cURL commands)
3. **ARCHITECTURE.md** - Technical leads (architecture diagram, component descriptions, data flow, design decisions)
4. **TESTING_GUIDE.md** - QA engineers (test pyramid, run instructions, sample data, manual checklist, benchmarks)

All documentation must include Mermaid diagrams (at least 3 total across documents). Use different AI models for different doc types.

## Sample Data Requirements

Provide test fixtures in `fixtures/` or project root:
- `sample_tickets.csv` (50 tickets)
- `sample_tickets.json` (20 tickets)
- `sample_tickets.xml` (30 tickets)
- Invalid data files for negative testing

## Deliverables Checklist

- Source code with all API endpoints
- Test coverage report showing >85% (screenshot in `docs/screenshots/test_coverage.png`)
- Sample data files (CSV, JSON, XML)
- Five documentation files with Mermaid diagrams
