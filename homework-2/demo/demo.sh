#!/bin/bash

# Ticket Management System - API Demo Script
# This script demonstrates the main features of the API
# Prerequisites: Server must be running (use ./run.sh in another terminal)

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Ticket Management System - API Demo${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
if ! curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: Server is not running on ${API_URL}${NC}"
    echo -e "${YELLOW}Please start the server first in another terminal:${NC}"
    echo -e "  ${GREEN}cd demo && ./run.sh${NC}\n"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Demo 1: Create a single ticket
echo -e "${BLUE}Demo 1: Creating a single ticket${NC}"
echo -e "${YELLOW}Creating ticket for login issue...${NC}"
TICKET1=$(curl -s -X POST "${API_URL}/tickets" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "DEMO001",
    "customer_email": "demo.user@example.com",
    "customer_name": "Demo User",
    "subject": "Cannot login to my account",
    "description": "I forgot my password and cannot access my account. This is urgent and blocking my work.",
    "metadata": {
      "source": "web_form",
      "device_type": "desktop"
    }
  }')
TICKET1_ID=$(echo "$TICKET1" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓ Ticket created with ID: ${TICKET1_ID}${NC}"
echo "$TICKET1" | head -c 200
echo -e "...\n"

# Demo 2: Create ticket with auto-classification
echo -e "${BLUE}Demo 2: Creating ticket with auto-classification${NC}"
echo -e "${YELLOW}Creating ticket with critical bug...${NC}"
TICKET2=$(curl -s -X POST "${API_URL}/tickets?autoClassify=true" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "DEMO002",
    "customer_email": "critical@example.com",
    "customer_name": "Critical User",
    "subject": "Application crashes on startup",
    "description": "The application crashes immediately when I try to open it. Error code 500. Production is down and users cannot access the system.",
    "metadata": {
      "source": "email",
      "device_type": "mobile"
    }
  }')
TICKET2_ID=$(echo "$TICKET2" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓ Ticket created and auto-classified${NC}"
echo "$TICKET2" | grep -E '"category"|"priority"|"confidence"' | head -5
echo ""

# Demo 3: Auto-classify existing ticket
echo -e "${BLUE}Demo 3: Auto-classifying existing ticket${NC}"
echo -e "${YELLOW}Classifying ticket ${TICKET1_ID}...${NC}"
CLASSIFICATION=$(curl -s -X POST "${API_URL}/tickets/${TICKET1_ID}/auto-classify")
echo -e "${GREEN}✓ Classification complete${NC}"
echo "$CLASSIFICATION" | grep -E '"category"|"priority"|"confidence"|"reasoning"' | head -8
echo ""

# Demo 4: Import CSV data
echo -e "${BLUE}Demo 4: Bulk import from CSV${NC}"
echo -e "${YELLOW}Importing tickets from CSV format...${NC}"
CSV_IMPORT=$(curl -s -X POST "${API_URL}/tickets/import" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "customer_id,customer_email,customer_name,subject,description,source,device_type\nCSV001,user1@example.com,Alice Johnson,Billing question,Need refund for duplicate charge,email,desktop\nCSV002,user2@example.com,Bob Smith,Feature request,Add dark mode to application,web_form,mobile\nCSV003,user3@example.com,Carol White,Bug report,Search returns wrong results with steps to reproduce,api,tablet",
    "fileType": "csv",
    "autoClassify": true
  }')
echo -e "${GREEN}✓ CSV import complete${NC}"
echo "$CSV_IMPORT" | grep -E '"total"|"successful"|"failed"'
echo ""

# Demo 5: Import JSON data
echo -e "${BLUE}Demo 5: Bulk import from JSON${NC}"
echo -e "${YELLOW}Importing tickets from JSON format...${NC}"
JSON_IMPORT=$(curl -s -X POST "${API_URL}/tickets/import" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "[{\"customer_id\":\"JSON001\",\"customer_email\":\"json1@example.com\",\"customer_name\":\"David Lee\",\"subject\":\"Cannot access account\",\"description\":\"2FA not working, cannot login\",\"metadata\":{\"source\":\"chat\",\"device_type\":\"mobile\"}},{\"customer_id\":\"JSON002\",\"customer_email\":\"json2@example.com\",\"customer_name\":\"Emma Davis\",\"subject\":\"Performance issue\",\"description\":\"Dashboard loads very slowly, takes over 30 seconds\",\"metadata\":{\"source\":\"web_form\",\"device_type\":\"desktop\"}}]",
    "fileType": "json",
    "autoClassify": true
  }')
echo -e "${GREEN}✓ JSON import complete${NC}"
echo "$JSON_IMPORT" | grep -E '"total"|"successful"|"failed"'
echo ""

# Demo 6: Import XML data
echo -e "${BLUE}Demo 6: Bulk import from XML${NC}"
echo -e "${YELLOW}Importing tickets from XML format...${NC}"
XML_IMPORT=$(curl -s -X POST "${API_URL}/tickets/import" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<?xml version=\"1.0\"?><tickets><ticket><customer_id>XML001</customer_id><customer_email>xml1@example.com</customer_email><customer_name>Frank Miller</customer_name><subject>Security concern</subject><description>Suspicious login attempt from unknown location</description><metadata><source>email</source><device_type>desktop</device_type></metadata></ticket></tickets>",
    "fileType": "xml",
    "autoClassify": true
  }')
echo -e "${GREEN}✓ XML import complete${NC}"
echo "$XML_IMPORT" | grep -E '"total"|"successful"|"failed"'
echo ""

# Demo 7: List all tickets
echo -e "${BLUE}Demo 7: Listing all tickets${NC}"
ALL_TICKETS=$(curl -s "${API_URL}/tickets")
TICKET_COUNT=$(echo "$ALL_TICKETS" | grep -o '"id"' | wc -l | tr -d ' ')
echo -e "${GREEN}✓ Found ${TICKET_COUNT} tickets${NC}\n"

# Demo 8: Filter by category
echo -e "${BLUE}Demo 8: Filtering tickets by category${NC}"
echo -e "${YELLOW}Fetching account_access tickets...${NC}"
FILTERED=$(curl -s "${API_URL}/tickets?category=account_access")
FILTERED_COUNT=$(echo "$FILTERED" | grep -o '"id"' | wc -l | tr -d ' ')
echo -e "${GREEN}✓ Found ${FILTERED_COUNT} account_access tickets${NC}\n"

# Demo 9: Filter by priority
echo -e "${BLUE}Demo 9: Filtering tickets by priority${NC}"
echo -e "${YELLOW}Fetching urgent tickets...${NC}"
URGENT=$(curl -s "${API_URL}/tickets?priority=urgent")
URGENT_COUNT=$(echo "$URGENT" | grep -o '"id"' | wc -l | tr -d ' ')
echo -e "${GREEN}✓ Found ${URGENT_COUNT} urgent tickets${NC}\n"

# Demo 10: Update a ticket
echo -e "${BLUE}Demo 10: Updating a ticket${NC}"
echo -e "${YELLOW}Updating ticket ${TICKET1_ID} status to in_progress...${NC}"
UPDATED=$(curl -s -X PUT "${API_URL}/tickets/${TICKET1_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "assigned_to": "support-agent-42"
  }')
echo -e "${GREEN}✓ Ticket updated${NC}"
echo "$UPDATED" | grep -E '"status"|"assigned_to"'
echo ""

# Demo 11: Get specific ticket
echo -e "${BLUE}Demo 11: Fetching specific ticket${NC}"
echo -e "${YELLOW}Getting details for ticket ${TICKET2_ID}...${NC}"
SPECIFIC=$(curl -s "${API_URL}/tickets/${TICKET2_ID}")
echo -e "${GREEN}✓ Ticket retrieved${NC}"
echo "$SPECIFIC" | head -c 300
echo -e "...\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Demo Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}All demos executed successfully${NC}\n"
echo -e "Total tickets in system: ${TICKET_COUNT}"
echo -e "Server: ${API_URL}\n"
echo -e "For more details, see:"
echo -e "  - ${YELLOW}docs/API_REFERENCE.md${NC} - Complete API documentation"
echo -e "  - ${YELLOW}demo/test-requests.http${NC} - HTTP request examples"
echo -e "  - ${YELLOW}HOWTORUN.md${NC} - Setup and running guide\n"
