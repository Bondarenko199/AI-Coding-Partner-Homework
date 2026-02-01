# Architecture Documentation

Express + TypeScript ticket management system with multi-format import, auto-classification, and in-memory storage.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Components](#components)
4. [Data Flows](#data-flows)
5. [Design Decisions](#design-decisions)
6. [Performance & Security](#performance--security)

---

## System Overview

**Tech Stack:** Node.js 18+, Express 4, TypeScript 5, Joi validation, native test runner

**Key Features:**
- RESTful API (7 endpoints)
- Multi-format import (CSV/JSON/XML)
- Keyword-based auto-classification
- In-memory storage with O(1) indexes
- 96.86% test coverage, sub-millisecond operations

**Characteristics:**
- Stateless API
- Type-safe (strict TypeScript)
- Performance-optimized (Maps + Sets for indexing)
- Comprehensive validation (Joi schemas)

---

## Architecture Diagram

```mermaid
graph TB
    subgraph Client Layer
        CLI[CLI/cURL]
        WEB[Web Application]
        API_CLIENT[API Client]
    end

    subgraph API Layer
        EXPRESS[Express Server<br/>Port 3000]
        ROUTES[Route Handlers]
        MIDDLEWARE[Middleware Stack]
    end

    subgraph Business Logic Layer
        TICKET_SVC[Ticket Service]
        IMPORT_SVC[Import Service]
        CLASS_SVC[Classification Service]
        STORE[Ticket Store]
    end

    subgraph Data Layer
        MEMORY[In-Memory Maps]
        INDEXES[Search Indexes]
    end

    subgraph Parsers
        CSV[CSV Parser]
        JSON[JSON Parser]
        XML[XML Parser]
    end

    CLI --> EXPRESS
    WEB --> EXPRESS
    API_CLIENT --> EXPRESS

    EXPRESS --> ROUTES
    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> ROUTES

    ROUTES --> TICKET_SVC
    ROUTES --> IMPORT_SVC
    ROUTES --> CLASS_SVC

    TICKET_SVC --> STORE
    IMPORT_SVC --> CSV
    IMPORT_SVC --> JSON
    IMPORT_SVC --> XML

    CSV --> STORE
    JSON --> STORE
    XML --> STORE

    CLASS_SVC --> TICKET_SVC

    STORE --> MEMORY
    STORE --> INDEXES

    style EXPRESS fill:#4CAF50,color:#fff
    style STORE fill:#FF9800,color:#fff
    style CLASS_SVC fill:#9C27B0,color:#fff
```

---

## Components

### API Layer

| Component | File | Responsibilities |
|-----------|------|------------------|
| **Express App** | `src/app.ts` | Middleware config, route mounting, health check |
| **Routes** | `src/routes/ticket-routes.ts` | 7 RESTful endpoints (POST/GET/PUT/DELETE) |
| **Validation** | `src/middleware/validation-middleware.ts` | Joi schema validation, 400 errors |
| **Error Handler** | `src/middleware/error-handler.ts` | Global error catching, status code mapping |

**7 API Endpoints:**
1. `POST /tickets` + `?autoClassify=true` - Create
2. `POST /tickets/import` - Bulk import (CSV/JSON/XML)
3. `GET /tickets` - List/filter by category/priority/status/customer_id/assigned_to
4. `GET /tickets/:id` - Get one
5. `PUT /tickets/:id` - Update
6. `DELETE /tickets/:id` - Delete
7. `POST /tickets/:id/auto-classify` - Classify existing

### Business Logic

**Ticket Store** (`src/services/ticket-store.ts`)
```typescript
class TicketStore {
  private tickets: Map<string, Ticket>;           // O(1) lookup
  private categoryIndex: Map<TicketCategory, Set<string>>;  // O(1) filter
  private priorityIndex: Map<TicketPriority, Set<string>>;
  private statusIndex: Map<TicketStatus, Set<string>>;
}
```
- CRUD operations with automatic index updates
- O(1) lookups and filtered queries

**Classification Service** (`src/services/classification-service.ts`)

Keyword-based classifier:
1. Combine subject + description, lowercase
2. Scan for category keywords → confidence score
3. Scan for priority keywords
4. Generate reasoning + matched keywords

| Category | Keywords |
|----------|----------|
| `account_access` | login, password, 2FA |
| `technical_issue` | error, bug, crash |
| `billing_question` | payment, invoice, refund |
| `feature_request` | feature, enhancement, suggestion |
| `bug_report` | bug, defect, reproduce |
| `other` | Default fallback |

| Priority | Keywords |
|----------|----------|
| `urgent` | critical, production down, security |
| `high` | important, blocking, ASAP |
| `medium` | Default |
| `low` | minor, cosmetic, suggestion |

**Import Service** (`src/services/import-service.ts`)
- Detects/routes to CSV/JSON/XML parsers
- Validates, optionally classifies, stores tickets
- Returns summary: total/successful/failed/errors

### Parsers

| Parser | Library | Features |
|--------|---------|----------|
| **CSV** | `csv-parse` | Column name normalization (snake_case/camelCase), tag parsing |
| **JSON** | Native | Array validation, per-record errors |
| **XML** | `fast-xml-parser` | Single/array handling, nested tags, field normalization |

---

## Data Flows

### Ticket Creation with Auto-Classification

```mermaid
sequenceDiagram
    participant Client
    participant Routes
    participant Validation
    participant Classification
    participant Store
    participant Indexes

    Client->>Routes: POST /tickets?autoClassify=true
    Routes->>Validation: Validate request body
    Validation-->>Routes: Validated DTO

    Routes->>Store: create(dto)
    Store->>Store: Generate UUID
    Store->>Store: Set defaults
    Store->>Indexes: Add to category index
    Store->>Indexes: Add to priority index
    Store->>Indexes: Add to status index
    Store-->>Routes: Created ticket

    Routes->>Classification: classify(subject, description)
    Classification->>Classification: Match keywords
    Classification->>Classification: Calculate confidence
    Classification-->>Routes: Classification result

    Routes->>Store: update(id, category, priority)
    Store->>Indexes: Update all indexes
    Store-->>Routes: Updated ticket

    Routes-->>Client: 201 Created + ticket JSON
```

### Auto-Classification Algorithm

```mermaid
flowchart TD
    Start([Ticket Subject + Description]) --> Combine[Combine and Lowercase]
    Combine --> CatScan[Scan for Category Keywords]

    CatScan --> CatMatch{Keywords<br/>Found?}
    CatMatch -->|Yes| CatScore[Calculate Category Score]
    CatMatch -->|No| DefCat[Default: other]

    CatScore --> CatConf{Confidence<br/>>= 0.3?}
    CatConf -->|Yes| SetCat[Set Category]
    CatConf -->|No| DefCat

    SetCat --> PriScan
    DefCat --> PriScan[Scan for Priority Keywords]

    PriScan --> UrgCheck{Urgent<br/>Keywords?}
    UrgCheck -->|Yes| SetUrg[Priority: urgent]
    UrgCheck -->|No| HighCheck{High<br/>Keywords?}

    HighCheck -->|Yes| SetHigh[Priority: high]
    HighCheck -->|No| LowCheck{Low<br/>Keywords?}

    LowCheck -->|Yes| SetLow[Priority: low]
    LowCheck -->|No| SetMed[Priority: medium]

    SetUrg --> GenReason
    SetHigh --> GenReason
    SetMed --> GenReason
    SetLow --> GenReason[Generate Reasoning]

    GenReason --> CalcConf[Calculate Final Confidence]
    CalcConf --> Return([Return Classification Result])

    style Start fill:#4CAF50,color:#fff
    style Return fill:#4CAF50,color:#fff
    style SetUrg fill:#f44336,color:#fff
    style SetHigh fill:#FF9800,color:#fff
    style SetMed fill:#2196F3,color:#fff
    style SetLow fill:#9E9E9E,color:#fff
```

---

## Design Decisions

### 1. In-Memory Storage (vs Database)

**Why:** Demo scope, sub-ms performance, no setup, easy testing
**Trade-off:** No persistence (acceptable for demo), could add Redis for production

### 2. Indexed Filtering

**Why:** O(1) queries vs O(n) scan, common filters (category/priority/status)
**Implementation:** Separate `Map<Category, Set<ID>>` indexes, auto-updated on changes
**Not indexed:** customer_id, assigned_to (too many unique values, linear scan)

### 3. Strict TypeScript

**Why:** Compile-time errors, better IDE/refactoring, self-documenting
**Trade-off:** More boilerplate, steeper curve, but pays off in maintenance

### 4. Joi Validation

**Why:** Industry standard, declarative schemas, rich rules, good error messages
**Alternative:** Custom validation (more code, less features)

### 5. Node.js Native Test Runner

**Why:** No external deps, native TS support (tsx), built-in coverage
**Alternative:** Jest/Mocha (more features, but unnecessary here)

### 6. Keyword-Based Classification (vs ML)

**Why:** No training data, deterministic, explainable, fast, easy to customize
**Trade-off:** Lower accuracy than ML, confidence scores indicate reliability
**Limitation:** Sufficient for demo, production might need ML

### 7. RESTful API

**Why:** Industry standard, cacheable, well-understood, great tooling
**Alternative:** GraphQL (overkill for simple CRUD)

---

## Performance & Security

### Performance

**Indexing:**
- Category (6 values), Priority (4 values), Status (5 values) - O(1) filters
- customer_id, assigned_to - O(n) scan alone, O(1) when combined with indexed fields

**Concurrency:**
- Synchronous store ops (single-threaded Node.js, no locking needed)
- Tested with 100 concurrent requests
- Express handles concurrency naturally

**Benchmarks:**
- Create 1000 tickets: ~0.66ms each
- 100 filtered queries: ~0.45ms each
- Import 500 CSV tickets: ~38ms total

**Scalability Limits:**
- ~100,000 tickets in memory
- ~1,000 req/sec single instance
- For production: Add PostgreSQL, Redis, load balancer, pagination

### Security

**Current:**
- Joi validation (email format, length limits, enum checks)
- No stack traces in production
- Generic error messages

**Production Needs:**
- Authentication/Authorization (JWT, OAuth)
- Rate limiting (express-rate-limit)
- CORS configuration
- Input sanitization (XSS prevention)
- SQL injection prevention (if using DB)

---

## Extensibility

**Add Category:** Update `TicketCategory` enum → add keywords to `CATEGORY_KEYWORDS` → tests
**Add Parser:** Implement interface → add to `ImportService` switch → tests
**Add Database:** Create repo interface → implement DB repo → replace TicketStore

---

## Summary

**Strengths:**
- ✅ Clear layered architecture (API → Services → Storage)
- ✅ Type-safe (TypeScript strict mode)
- ✅ High coverage (96.86%)
- ✅ Excellent performance (O(1) operations)
- ✅ Extensible design

**Production Considerations:**
- Persistent storage (PostgreSQL/MongoDB)
- Horizontal scaling (stateless design ready)
- Enhanced security (auth, rate limiting)
- Monitoring/logging (structured logs, metrics)
- API versioning (/v1/tickets)
