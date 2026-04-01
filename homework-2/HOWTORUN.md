# How to Run the Ticket Management System

This guide provides step-by-step instructions to set up, run, and test the Ticket Management System.

## Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Comes with Node.js
- **Git**: For cloning the repository
- **Terminal/Command Line**: Bash, Zsh, or PowerShell

## Quick Start (Recommended)

The easiest way to get started is using the automated demo scripts. These handle all setup automatically.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd homework-2
```

### Step 2: Start the Server

```bash
cd demo
./run.sh
```

This script will automatically:
1. ✓ Check and install dependencies if needed
2. ✓ Build the project if needed
3. ✓ Start the server on `http://localhost:3000`
4. ✓ Keep running until you press Ctrl+C

**That's it!** The server is now running and ready to handle requests.

### Step 3: Try the API Demonstrations (Optional)

To see the API in action with automated demos:

**Terminal 1** - Start the server (if not already running):
```bash
cd demo
./run.sh
```

**Terminal 2** - Run the API demos:
```bash
cd demo
./demo.sh
```

The demo script will automatically:
1. Verify the server is running
2. Create sample tickets
3. Import bulk data from CSV/JSON/XML
4. Demonstrate auto-classification
5. Show filtering and querying
6. Display results for each operation

### Using HTTP Request Files

If you have the REST Client extension (VS Code) or similar tools:

1. Open `demo/test-requests.http`
2. Click "Send Request" on any request
3. View the response in the editor

---

## Manual Installation (Alternative)

If you prefer to run commands manually instead of using the demo scripts:

### Step 1: Clone the Repository (if needed)

```bash
git clone <repository-url>
cd homework-2
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages:
- `express` - Web framework
- `joi` - Validation library
- `csv-parse` - CSV parsing
- `fast-xml-parser` - XML parsing
- `uuid` - Unique ID generation
- TypeScript and development tools

### Step 3: Build the Project

The project is written in TypeScript and needs to be compiled to JavaScript:

```bash
npm run build
```

This creates the `dist/` directory with compiled JavaScript files.

### Step 4: Run the Application

#### Development Mode (with hot reload)

```bash
npm run dev
```

The server will start on `http://localhost:3000` with automatic reloading when you change source files.

#### Production Mode

```bash
npm start
```

This runs the compiled JavaScript from the `dist/` directory.

#### Custom Port

If port 3000 is already in use:

```bash
PORT=3001 npm run dev
```

or

```bash
PORT=3001 npm start
```

### Step 5: Verify the Server is Running

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

Expected output:
- 56 tests across 8 test suites
- All tests should pass

### Run Tests with Coverage

```bash
npm run test:coverage
```

This generates a coverage report. Expected coverage:
- Line coverage: >95%
- Branch coverage: >84%
- Function coverage: >95%

### Watch Mode (for development)

```bash
npm run test:watch
```

Tests will re-run automatically when you modify source files.

---

## Manual API Testing

### Create a Single Ticket

```bash
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "C001",
    "customer_email": "john.doe@example.com",
    "customer_name": "John Doe",
    "subject": "Cannot login to my account",
    "description": "I forgot my password and cannot access my account. This is urgent.",
    "metadata": {
      "source": "web_form",
      "device_type": "desktop"
    }
  }'
```

### Create a Ticket with Auto-Classification

```bash
curl -X POST "http://localhost:3000/tickets?autoClassify=true" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "C002",
    "customer_email": "jane@example.com",
    "customer_name": "Jane Smith",
    "subject": "Application crashes on startup",
    "description": "The app crashes immediately when I try to open it. Error code 500.",
    "metadata": {
      "source": "email",
      "device_type": "mobile"
    }
  }'
```

### List All Tickets

```bash
curl http://localhost:3000/tickets
```

### Filter Tickets by Category

```bash
curl "http://localhost:3000/tickets?category=account_access"
```

### Import Bulk Data from CSV

```bash
curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: application/json" \
  -d '{
    "content": "customer_id,customer_email,customer_name,subject,description,source,device_type\nC100,user@example.com,Test User,Login issue,Cannot access account,web_form,desktop",
    "fileType": "csv",
    "autoClassify": true
  }'
```

---

## Lint the Code

Check code quality:

```bash
npm run lint
```

Auto-fix linting issues:

```bash
npm run lint:fix
```

---

## Common Issues and Troubleshooting

### Port Already in Use

**Problem**: Error `EADDRINUSE: address already in use :::3000`

**Solution**: Use a different port:
```bash
PORT=3001 npm run dev
# or with the demo script:
PORT=3001 ./demo/run.sh
```

### Module Not Found

**Problem**: `Cannot find module` errors

**Solution**: Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Compilation Errors

**Problem**: Build fails with TypeScript errors

**Solution**: Check TypeScript version and rebuild:
```bash
npm run build
```

### Test Coverage Permission Issues

**Problem**: `EPERM` or permission errors when running coverage

**Solution**: Set a writable temp directory:
```bash
TMPDIR=./.tmp npm run test:coverage
```

### Tests Failing

**Problem**: Some tests fail unexpectedly

**Solution**:
1. Ensure the server is NOT running (tests start their own server)
2. Clear any test databases/state
3. Run tests individually to isolate issues

### Demo Script Issues

**Problem**: `./run.sh` shows "Permission denied"

**Solution**: Make the script executable:
```bash
chmod +x demo/run.sh demo/demo.sh
```

---

## Project Structure Reference

```
homework-2/
├── src/                    # TypeScript source files
│   ├── app.ts             # Express app configuration
│   ├── server.ts          # Server entry point
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   ├── models/            # Data models and validation
│   └── middleware/        # Express middleware
├── tests/                  # Test suites
│   ├── *.test.ts          # Test files
│   ├── helpers/           # Test utilities
│   └── fixtures/          # Test data
├── dist/                   # Compiled JavaScript (generated)
├── fixtures/               # Sample data files
├── docs/                   # Documentation
├── demo/                   # Demo scripts and examples
│   ├── run.sh            # Start the server
│   ├── demo.sh           # API demonstrations
│   └── test-requests.http # HTTP request collection
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

---

## API Documentation

For detailed API reference with all endpoints, request/response formats, and examples, see:
- `docs/API_REFERENCE.md`

For architecture details and system design, see:
- `docs/ARCHITECTURE.md`

For comprehensive testing guide, see:
- `docs/TESTING_GUIDE.md`

---

## Next Steps

1. **Start with the Quick Start** - Use `demo/run.sh` to get running immediately
2. **Try the demos** - Run `demo/demo.sh` to see all features in action
3. **Explore the API** - Use `demo/test-requests.http` with REST Client
4. **Read the docs** - Check `docs/API_REFERENCE.md` for detailed endpoint information
5. **Run the tests** - Execute `npm test` to verify everything works
6. **Review the code** - Examine the test suite to understand expected behavior

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the main README.md
- Check the documentation in `docs/`
- Examine test files for usage examples
