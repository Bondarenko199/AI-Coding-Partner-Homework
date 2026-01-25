# How to Run

## Prerequisites

- Node.js 20.x+ (`node --version`)
- npm (`npm --version`)

## Installation & Start

```bash
cd homework-1
npm install
npm start
# Or use: ./demo/run.sh
```

Server runs at `http://localhost:3000`

## Verify

```bash
curl http://localhost:3000/health
# Returns: {"status":"ok","timestamp":"..."}
```

## Testing

```bash
# Run test suite
npm test
# Or: ./demo/test.sh

# Sample API requests (server must be running)
./demo/requests.sh

# VS Code REST Client
# Open demo/sample-requests.http and click "Send Request"
```

## Configuration

```bash
# Custom port
PORT=8080 npm start

# Development mode (auto-restart)
npm run dev
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `PORT=3001 npm start` |
| Module not found | `npm install` |
| Permission denied | `chmod +x demo/*.sh` |
