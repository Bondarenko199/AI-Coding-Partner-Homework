# Implementation Plan: Customer Support Ticket Management System

**Project**: AI Coding Partner - Homework 2
**Date Created**: February 1, 2026
**Status**: ✅ COMPLETED

---

## Overview

Build a complete customer support ticket management system with multi-format import (CSV/JSON/XML), auto-classification, comprehensive tests (>85% coverage), and full documentation.

### Tech Stack

- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Testing**: Node.js native test runner
- **Storage**: In-memory (Map-based)
- **Validation**: Joi
- **Parsing Libraries**: csv-parse, fast-xml-parser, uuid

---

## Project Structure

```
homework-2/
├── src/
│   ├── models/
│   │   ├── Ticket.ts                    # Core types, interfaces, enums
│   │   └── ValidationSchemas.ts         # Joi schemas
│   ├── services/
│   │   ├── TicketStore.ts              # In-memory storage with indexes
│   │   ├── ImportService.ts            # Import orchestrator
│   │   ├── CsvParser.ts                # CSV parsing
│   │   ├── JsonParser.ts               # JSON parsing
│   │   ├── XmlParser.ts                # XML parsing
│   │   └── ClassificationService.ts    # Auto-categorization
│   ├── middleware/
│   │   ├── ValidationMiddleware.ts     # Request validation
│   │   └── ErrorHandler.ts             # Error handling
│   ├── routes/
│   │   ├── ticketRoutes.ts             # All endpoints
│   │   └── index.ts                    # Route aggregator
│   ├── utils/
│   │   ├── logger.ts                   # Logging
│   │   └── httpResponses.ts            # Response helpers
│   ├── app.ts                          # Express config
│   └── server.ts                       # Entry point
├── tests/
│   ├── ticketApi.test.ts               # 11 API tests
│   ├── ticketModel.test.ts             # 9 validation tests
│   ├── importCsv.test.ts               # 6 CSV tests
│   ├── importJson.test.ts              # 5 JSON tests
│   ├── importXml.test.ts               # 5 XML tests
│   ├── categorization.test.ts          # 10 classification tests
│   ├── integration.test.ts             # 5 end-to-end tests
│   ├── performance.test.ts             # 5 performance tests
│   ├── helpers/
│   │   ├── testServer.ts               # Test utilities
│   │   └── assertions.ts               # Custom assertions
│   └── fixtures/                        # Test data
├── fixtures/
│   ├── sample_tickets.csv              # 50 tickets
│   ├── sample_tickets.json             # 20 tickets
│   └── sample_tickets.xml              # 30 tickets
├── docs/
│   ├── README.md                       # Developer guide
│   ├── API_REFERENCE.md                # API docs
│   ├── ARCHITECTURE.md                 # Architecture docs
│   ├── TESTING_GUIDE.md                # Testing guide
│   └── screenshots/
│       └── test_coverage.png           # Coverage screenshot
├── package.json
├── tsconfig.json
├── tsconfig.test.json
└── .gitignore
```

---

## Implementation Phases

### Phase 1: Project Setup & Core Models

**1.1 Initialize Project**

Create `package.json` with dependencies:

**Production Dependencies:**
```json
{
  "express": "^4.18.2",
  "joi": "^17.11.0",
  "uuid": "^9.0.1",
  "csv-parse": "^5.5.3",
  "fast-xml-parser": "^4.3.3"
}
```

**Development Dependencies:**
```json
{
  "typescript": "^5.3.3",
  "tsx": "^4.7.0",
  "@types/express": "^4.17.21",
  "@types/node": "^20.10.6",
  "@types/uuid": "^9.0.7",
  "@typescript-eslint/eslint-plugin": "^6.17.0",
  "@typescript-eslint/parser": "^6.17.0",
  "eslint": "^8.56.0"
}
```

Configure NPM scripts:
- `test`: `node --import tsx --test tests/**/*.test.ts`
- `test:coverage`: `node --import tsx --experimental-test-coverage --test tests/**/*.test.ts`
- `dev`: `tsx watch src/server.ts`
- `build`: `tsc`

**1.2 TypeScript Configuration**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

Create `tsconfig.test.json` extending base config.

**1.3 Core Type Definitions**

Create `src/models/Ticket.ts` with:

**Enums:**
- `TicketCategory`: account_access, technical_issue, billing_question, feature_request, bug_report, other
- `TicketPriority`: urgent, high, medium, low
- `TicketStatus`: open, in_progress, resolved, closed, pending
- `Source`: email, web, mobile, api
- `DeviceType`: desktop, mobile, tablet, other

**Interfaces:**
- `Ticket`: All fields including classification metadata
- `TicketMetadata`: source, browser, device_type
- `TicketFilters`: For query parameters
- `CreateTicketDTO`, `UpdateTicketDTO`
- `ImportResult`, `ClassificationResult`

**1.4 Validation Schemas**

Create `src/models/ValidationSchemas.ts`:

Using Joi, define schemas for:
- `createTicketSchema`: Validate ticket creation
- `updateTicketSchema`: Validate ticket updates
- `ticketFiltersSchema`: Validate query parameters
- `importTicketSchema`: Validate imported records

**Validation Rules:**
- Email format validation
- String length constraints (subject: 1-200, description: 10-2000)
- Enum validation for all categorical fields

**Critical Files:**
- `/src/models/Ticket.ts` (~150 lines)
- `/src/models/ValidationSchemas.ts` (~120 lines)

---

### Phase 2: Storage & Basic API

**2.1 In-Memory Storage**

Create `src/services/TicketStore.ts`:

**Data Structures:**
```typescript
class TicketStore {
  private tickets: Map<string, Ticket>;
  private categoryIndex: Map<TicketCategory, Set<string>>;
  private priorityIndex: Map<TicketPriority, Set<string>>;
  private statusIndex: Map<TicketStatus, Set<string>>;
}
```

**Methods:**
- `create(dto: CreateTicketDTO): Ticket` - Create ticket with UUID
- `findById(id: string): Ticket | undefined` - O(1) lookup
- `findAll(): Ticket[]` - Get all tickets
- `findByFilters(filters: TicketFilters): Ticket[]` - Indexed filtering
- `update(id: string, dto: UpdateTicketDTO): Ticket | undefined`
- `delete(id: string): boolean`

**Index Maintenance:**
- Automatically update indexes on create/update/delete
- Enables O(1) filtered queries for category/priority/status

**2.2 Express Application**

Create `src/app.ts`:
- Initialize Express
- Configure JSON middleware (50mb limit)
- Mount routes
- Add error handler middleware
- Add health check endpoint

Create `src/server.ts`:
- Start HTTP server
- Configure port (default 3000)
- Graceful shutdown handling

**2.3 Middleware**

Create `src/middleware/ErrorHandler.ts`:
- `AppError` class for custom errors
- `errorHandler`: Global error handling middleware
- `notFoundHandler`: 404 handler
- `asyncHandler`: Wrapper for async route handlers
- Joi error formatting

Create `src/middleware/ValidationMiddleware.ts`:
- `validateBody(schema)`: Validate request body
- `validateQuery(schema)`: Validate query parameters
- Attach validated data to `req.validatedBody`

**2.4 Ticket Routes (CRUD)**

Create `src/routes/ticketRoutes.ts`:

**Endpoints:**
1. `POST /tickets` - Create ticket
   - Optional query param: `?autoClassify=true`
   - Validate with createTicketSchema
   - Return 201 with created ticket

2. `GET /tickets` - List tickets
   - Query params: category, priority, status, customer_id, assigned_to
   - Validate with ticketFiltersSchema
   - Return 200 with { count, tickets }

3. `GET /tickets/:id` - Get by ID
   - Return 200 with ticket or 404

4. `PUT /tickets/:id` - Update ticket
   - Validate with updateTicketSchema
   - Return 200 with updated ticket or 404

5. `DELETE /tickets/:id` - Delete ticket
   - Return 204 on success or 404

**Critical Files:**
- `/src/services/TicketStore.ts` (~200 lines)
- `/src/routes/ticketRoutes.ts` (~250 lines)
- `/src/app.ts` (~80 lines)

---

### Phase 3: Multi-Format Import

**3.1 Parser Implementations**

Create `src/services/CsvParser.ts`:
- Use `csv-parse` library with sync parsing
- Map CSV columns to Ticket fields
- Handle both snake_case and camelCase column names
- Parse comma-separated tags
- Convert date strings to Date objects
- Type conversion and error collection per row
- Return `{ success: ParsedTicket[], errors: ErrorInfo[] }`

Create `src/services/JsonParser.ts`:
- Parse JSON array
- Validate array structure
- Validate each object against schema
- Convert date strings to Date objects
- Return success and error arrays

Create `src/services/XmlParser.ts`:
- Use `fast-xml-parser` library
- Handle nested elements (metadata, tags)
- Handle single ticket vs array of tickets
- Normalize to Ticket interface
- Convert numeric tags to strings
- Parse tags array from <tag> elements

**3.2 Import Orchestrator**

Create `src/services/ImportService.ts`:

**File Type Detection:**
```typescript
detectFileType(content: string, filename?: string): FileType {
  // Check filename extension
  // Check content (JSON starts with { or [, XML starts with <, default CSV)
}
```

**Import Flow:**
1. Detect or use specified file type
2. Route to appropriate parser (CSV/JSON/XML)
3. Validate each record with `importTicketSchema`
4. Optionally auto-classify records
5. Create tickets in store
6. Aggregate results: `{ total, successful, failed, errors[], tickets[] }`

**3.3 Import Endpoint**

Add to `src/routes/ticketRoutes.ts`:

6. `POST /tickets/import` - Bulk import
   - Request body: `{ content, fileType?, filename?, autoClassify? }`
   - Parse based on file type
   - Validate all records
   - Return import summary

**Critical Files:**
- `/src/services/CsvParser.ts` (~180 lines)
- `/src/services/JsonParser.ts` (~120 lines)
- `/src/services/XmlParser.ts` (~150 lines)
- `/src/services/ImportService.ts` (~200 lines)

---

### Phase 4: Auto-Classification

**4.1 Classification Engine**

Create `src/services/ClassificationService.ts`:

**Category Keywords:**
```typescript
const CATEGORY_KEYWORDS = {
  account_access: ['login', 'password', '2fa', 'sign in', 'access denied', ...],
  technical_issue: ['error', 'bug', 'crash', 'broken', 'not working', ...],
  billing_question: ['payment', 'invoice', 'refund', 'subscription', ...],
  feature_request: ['feature', 'enhancement', 'suggestion', 'would like', ...],
  bug_report: ['bug', 'defect', 'reproduce', 'expected', 'actual', ...],
  other: []
}
```

**Priority Keywords:**
```typescript
const PRIORITY_KEYWORDS = {
  urgent: ['critical', 'production down', 'security', 'can\'t access', ...],
  high: ['important', 'blocking', 'asap', 'high priority', ...],
  medium: [],
  low: ['minor', 'cosmetic', 'suggestion', 'when you have time', ...]
}
```

**4.2 Classification Logic**

```typescript
classify(subject: string, description: string): ClassificationResult {
  // 1. Combine subject + description, convert to lowercase
  // 2. Scan for category keywords
  // 3. Calculate category confidence (weighted scoring)
  // 4. Scan for priority keywords
  // 5. Calculate priority confidence
  // 6. Generate reasoning
  // 7. Return { category, priority, confidence, reasoning, keywords }
}
```

**Scoring Algorithm:**
- Subject keyword match: +0.3
- Description keyword match: +0.15
- Multiple matches increase confidence
- Default to "other" if confidence < 0.3
- Default to "medium" if no priority keywords

**4.3 Classification Endpoint**

Add to `src/routes/ticketRoutes.ts`:

7. `POST /tickets/:id/auto-classify` - Auto-classify
   - Get existing ticket
   - Run classification
   - Update ticket category and priority
   - Store classification metadata
   - Return ticket and classification result

**Integration:**
- Also used in `POST /tickets?autoClassify=true`
- Also used in import with `autoClassify=true`

**Critical Files:**
- `/src/services/ClassificationService.ts` (~280 lines)

---

### Phase 5: Test Suite (>85% Coverage)

**5.1 Test Infrastructure**

Create `tests/helpers/testServer.ts`:
```typescript
// Start test server on random port
startTestServer(): Promise<{ url: string, close: () => void }>

// Make HTTP requests
request(url: string, options): Promise<{ status, body, headers }>
```

Create `tests/helpers/assertions.ts`:
```typescript
// Custom assertions
assertTicket(ticket): void
assertValidationError(response, field?): void
assertNotFound(response): void
assertSuccess(response, expectedStatus): void
```

**5.2 Unit Tests**

**tests/ticketModel.test.ts** (9 tests):
1. Validate valid ticket
2. Reject invalid email
3. Reject subject > 200 chars
4. Reject subject < 1 char
5. Reject description < 10 chars
6. Reject description > 2000 chars
7. Reject invalid category
8. Reject invalid priority
9. Validate partial update

**tests/importCsv.test.ts** (6 tests):
1. Parse valid CSV file
2. Handle CSV with invalid data
3. Handle malformed CSV
4. Handle empty CSV
5. Parse tags correctly
6. Handle special characters and quotes

**tests/importJson.test.ts** (5 tests):
1. Parse valid JSON file
2. Handle invalid data
3. Reject non-array JSON
4. Handle empty array
5. Handle invalid JSON syntax

**tests/importXml.test.ts** (5 tests):
1. Parse valid XML file
2. Handle invalid data
3. Handle malformed XML
4. Handle missing root element
5. Handle single ticket correctly

**tests/categorization.test.ts** (10 tests):
1. Classify account_access issues
2. Classify technical_issue
3. Classify billing_question
4. Classify feature_request
5. Classify bug_report
6. Default to other category
7. Classify urgent priority
8. Classify high priority
9. Classify low priority
10. Default to medium priority

**5.3 Integration Tests**

**tests/ticketApi.test.ts** (11 tests):
1. Create new ticket
2. Create with auto-classification
3. Reject invalid email
4. Get all tickets
5. Filter by category
6. Get specific ticket by ID
7. Return 404 for non-existent
8. Update ticket
9. Delete ticket
10. Auto-classify existing ticket
11. Handle bulk import

**tests/integration.test.ts** (5 tests):
1. Complete ticket lifecycle (create → update → classify → resolve → close)
2. Import and auto-classify bulk tickets
3. Handle concurrent operations (20+ requests)
4. Filter by multiple criteria
5. End-to-end workflow with validation errors

**tests/performance.test.ts** (5 tests):
1. Create 1000 tickets efficiently
2. Retrieve with filtering efficiently
3. Large bulk import (500 tickets)
4. Concurrent read/write operations
5. Auto-classify multiple tickets

**Test Execution:**
```bash
npm test                 # All tests
npm run test:coverage    # With coverage
```

**Coverage Target:** >85% line coverage

**Test Files:**
- 8 test files totaling ~1800 lines
- `tests/fixtures/` with valid and invalid sample files

---

### Phase 6: Sample Data Generation

**6.1 Create Sample Files**

**fixtures/sample_tickets.csv** (50 tickets):
- Balanced distribution across categories
- All priority levels represented
- Various statuses
- Different sources and device types
- Edge cases: max lengths, special characters

**fixtures/sample_tickets.json** (20 tickets):
- Similar distribution as CSV
- Nested metadata structure
- Tags as arrays

**fixtures/sample_tickets.xml** (30 tickets):
- XML structure with <tickets> root
- Nested <ticket> elements
- <tags> with multiple <tag> children
- Nested <metadata> structure

**6.2 Test Fixtures**

Create invalid data files in `tests/fixtures/`:
- `invalid_tickets.csv` - Validation errors
- `invalid_tickets.json` - Schema violations
- `invalid_tickets.xml` - Invalid data
- `malformed.csv` - Parsing errors
- `malformed.json` - Syntax errors
- `malformed.xml` - Invalid XML

---

### Phase 7: Documentation

**7.1 Developer Documentation**

**docs/README.md**:
- Project overview and features
- Architecture diagram (Mermaid) showing components
- Installation steps (`npm install`)
- Usage commands (dev, test, build)
- Project structure tree
- Quick start examples
- API endpoint summary
- Technology stack
- Performance metrics

**7.2 API Documentation**

**docs/API_REFERENCE.md**:
- Base URL and table of contents
- All 7 endpoints with:
  - HTTP method and path
  - Request parameters
  - Request body schema
  - Response format
  - Example cURL commands
  - Example responses
- Error response formats
- Data type definitions
- Validation rules

**7.3 Architecture Documentation**

**docs/ARCHITECTURE.md**:
- High-level architecture diagram (Mermaid)
- Component descriptions:
  - API layer (Express, routes, middleware)
  - Business logic (services)
  - Data layer (store, indexes)
  - Parsers (CSV, JSON, XML)
- Data flow sequence diagram (Mermaid)
- Auto-classification flow diagram (Mermaid)
- Design decisions and rationale
- Trade-offs analysis
- Performance considerations
- Security considerations
- Extensibility guidelines

**7.4 Testing Documentation**

**docs/TESTING_GUIDE.md**:
- Test pyramid diagram (Mermaid)
- Test overview and coverage summary
- How to run tests (all commands)
- Test structure explanation
- Sample data locations
- Manual testing checklist (12+ steps)
- Performance benchmarks table
- Guidelines for writing new tests
- CI/CD integration example

**Total Mermaid Diagrams:** 5 across all docs (exceeds requirement of 3)

**Diagram Breakdown:**
1. Architecture diagram (README.md)
2. High-level system architecture (ARCHITECTURE.md)
3. Data flow sequence diagram (ARCHITECTURE.md)
4. Auto-classification flow diagram (ARCHITECTURE.md)
5. Test pyramid (TESTING_GUIDE.md)

---

## Critical Files to Implement

### Core Application (13 files)
1. **src/models/Ticket.ts** - Type system
2. **src/models/ValidationSchemas.ts** - Validation rules
3. **src/services/TicketStore.ts** - Data layer
4. **src/services/ClassificationService.ts** - Classification logic
5. **src/services/ImportService.ts** - Import orchestrator
6. **src/services/CsvParser.ts** - CSV parsing
7. **src/services/JsonParser.ts** - JSON parsing
8. **src/services/XmlParser.ts** - XML parsing
9. **src/middleware/ErrorHandler.ts** - Error handling
10. **src/middleware/ValidationMiddleware.ts** - Validation
11. **src/routes/ticketRoutes.ts** - API endpoints
12. **src/app.ts** - Express setup
13. **src/server.ts** - Entry point

### Test Suite (10 files)
1. **tests/ticketModel.test.ts** - 9 tests
2. **tests/ticketApi.test.ts** - 11 tests
3. **tests/importCsv.test.ts** - 6 tests
4. **tests/importJson.test.ts** - 5 tests
5. **tests/importXml.test.ts** - 5 tests
6. **tests/categorization.test.ts** - 10 tests
7. **tests/integration.test.ts** - 5 tests
8. **tests/performance.test.ts** - 5 tests
9. **tests/helpers/testServer.ts** - Test utilities
10. **tests/helpers/assertions.ts** - Custom assertions

### Sample Data (3 files)
1. **fixtures/sample_tickets.csv** - 50 tickets
2. **fixtures/sample_tickets.json** - 20 tickets
3. **fixtures/sample_tickets.xml** - 30 tickets

### Documentation (4 files)
1. **docs/README.md** - Developer guide
2. **docs/API_REFERENCE.md** - API reference
3. **docs/ARCHITECTURE.md** - Architecture docs
4. **docs/TESTING_GUIDE.md** - Testing guide

---

## API Endpoints

### 1. Create Ticket
```
POST /tickets?autoClassify=true (optional)
```

**Request:**
```json
{
  "customer_id": "CUST001",
  "customer_email": "user@example.com",
  "customer_name": "John Doe",
  "subject": "Cannot login",
  "description": "I forgot my password",
  "metadata": {
    "source": "web",
    "device_type": "desktop"
  }
}
```

**Response:** 201 Created with ticket object

### 2. Bulk Import
```
POST /tickets/import
```

**Request:**
```json
{
  "content": "customer_id,customer_email,...",
  "fileType": "csv",
  "autoClassify": true
}
```

**Response:** 200 OK with import summary

### 3. List Tickets
```
GET /tickets?category=billing_question&priority=high
```

**Response:** 200 OK with { count, tickets }

### 4. Get Ticket
```
GET /tickets/:id
```

**Response:** 200 OK or 404 Not Found

### 5. Update Ticket
```
PUT /tickets/:id
```

**Request:**
```json
{
  "status": "in_progress",
  "assigned_to": "agent123"
}
```

**Response:** 200 OK with updated ticket

### 6. Delete Ticket
```
DELETE /tickets/:id
```

**Response:** 204 No Content

### 7. Auto-Classify
```
POST /tickets/:id/auto-classify
```

**Response:** 200 OK with ticket and classification

---

## Verification Steps

After implementation, verify:

### 1. Build & Run
```bash
npm install
npm run build
npm run dev
```

### 2. Test All Endpoints
```bash
# Create ticket
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{ "customer_id": "TEST", ... }'

# Import CSV
curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: application/json" \
  -d '{ "content": "...", "fileType": "csv" }'

# List tickets
curl http://localhost:3000/tickets

# Auto-classify
curl -X POST http://localhost:3000/tickets/{id}/auto-classify
```

### 3. Run Tests
```bash
npm test                 # All tests pass
npm run test:coverage    # Coverage >85%
```

### 4. Verify Deliverables
- [ ] All 8 test files present
- [ ] Coverage report shows >85%
- [ ] Screenshot saved to docs/screenshots/test_coverage.png
- [ ] 4 documentation files complete
- [ ] At least 5 Mermaid diagrams total
- [ ] 3 sample data files in fixtures/
- [ ] Invalid test files exist

### 5. Manual Testing
- Import each sample file format
- Verify auto-classification accuracy
- Test concurrent operations
- Validate filtering combinations

---

## Success Criteria

### Must Have
- ✅ All 7 API endpoints functional
- ✅ CSV/JSON/XML import working
- ✅ Auto-classification returns category, priority, confidence, reasoning, keywords
- ✅ Test coverage >85%
- ✅ All 56 tests passing (8 test files)
- ✅ 4 documentation files with 5+ Mermaid diagrams
- ✅ Sample data: 50 CSV, 20 JSON, 30 XML tickets
- ✅ TypeScript compiles with no errors
- ✅ ESLint passes

### Performance Targets
- Ticket creation: < 1ms per ticket
- Filtered queries: < 1ms per query
- Bulk import: < 0.2ms per ticket
- Auto-classification: < 1ms per ticket
- Concurrent operations: 100 ops in < 1000ms

---

## Technical Requirements

### Data Model

**Ticket Fields:**
- Identity: id (UUID), customer_id, customer_email, customer_name
- Content: subject (1-200 chars), description (10-2000 chars)
- Classification: category (6 types), priority (4 levels), status (5 states)
- Lifecycle: created_at, updated_at, resolved_at, assigned_to
- Context: tags (string[]), metadata (source, browser, device_type)
- Classification: confidence, keywords, reasoning, manually_classified

### Validation Rules
- Email format validation
- String length constraints
- Enum validation for all categorical fields
- Required field validation
- Type checking

### Error Handling
- 400 Bad Request - Validation errors
- 404 Not Found - Resource not found
- 500 Internal Server Error - Unexpected errors
- Meaningful error messages
- Detailed validation feedback

---

## Implementation Timeline

### Estimated Effort

| Phase | Tasks | Estimated Lines | Priority |
|-------|-------|----------------|----------|
| Phase 1 | Setup & Models | 300 lines | Critical |
| Phase 2 | Storage & API | 600 lines | Critical |
| Phase 3 | Import System | 650 lines | Critical |
| Phase 4 | Classification | 280 lines | Critical |
| Phase 5 | Test Suite | 1800 lines | Critical |
| Phase 6 | Sample Data | 100 tickets | High |
| Phase 7 | Documentation | 4 files | High |

**Total Estimated Code:** ~4,500 lines (source + tests)

---

## Dependencies

### package.json

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "joi": "^17.11.0",
    "uuid": "^9.0.1",
    "csv-parse": "^5.5.3",
    "fast-xml-parser": "^4.3.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "@types/uuid": "^9.0.7",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "eslint": "^8.56.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

---

## Notes

### Design Decisions

1. **In-Memory Storage**: Acceptable for homework/demo project; use database for production
2. **Indexed Filtering**: Trade memory for query performance
3. **Keyword-Based Classification**: Simple but effective; ML would be more accurate
4. **Native Test Runner**: Avoid external dependencies; simpler setup
5. **TypeScript Strict Mode**: Catch errors early; better IDE support

### Future Enhancements (Out of Scope)

- Database persistence (PostgreSQL)
- Authentication/Authorization
- File upload handling
- Email notifications
- Real-time updates (WebSocket)
- Pagination
- Full-text search
- Audit logging
- API rate limiting
- Docker containerization

---

**Plan Status**: ✅ COMPLETED
**Implementation Date**: February 1, 2026
**All Requirements**: MET AND EXCEEDED
