# Homework 1: Banking Transactions API

**Student**: H. Bondarenko | **Date**: Jan 25 2025 | **AI Tools**: Claude Code, GitHub Copilot

## Overview

REST API for banking transactions built with Node.js/Express.js demonstrating AI-assisted development.

**Features**: Core API (Task 1) | Validation (Task 2) | Filtering (Task 3) | CSV Export (Task 4C)

## Architecture

```
src/
├── index.js              # Express entry point
├── routes/               # Transaction & account endpoints
├── models/               # Transaction model & storage
├── validators/           # Input validation
└── utils/                # Helpers (CSV, formatting)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transactions` | Create transaction |
| GET | `/transactions` | List transactions (?accountId, ?type, ?from, ?to) |
| GET | `/transactions/:id` | Get by ID |
| GET | `/transactions/export?format=csv` | Export CSV |
| GET | `/accounts/:accountId/balance` | Get balance |

## Transaction Model

```json
{
  "id": "uuid", "fromAccount": "ACC-XXXXX", "toAccount": "ACC-XXXXX",
  "amount": 100.50, "currency": "USD", "type": "transfer",
  "timestamp": "2024-01-15T10:30:00.000Z", "status": "completed"
}
```

**Validation**: Amount (positive, max 2 decimals) | Account (ACC-XXXXX) | Currency (ISO 4217) | Type (deposit/withdrawal/transfer)

## Quick Start

```bash
npm install && npm start
# Or: ./demo/run.sh
# Tests: ./demo/test.sh
# Sample requests: ./demo/requests.sh
```

API available at `http://localhost:3000`

## AI Contribution

See [AI-CONTRIBUTIONS.md](./AI-CONTRIBUTIONS.md) for detailed AI tool usage documentation.
