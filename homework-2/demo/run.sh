#!/bin/bash

# Ticket Management System - Start Script
# This script starts the application server

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Ticket Management System${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Navigate to project root (one level up from demo/)
cd "$(dirname "$0")/.."

# Check if npm packages are installed
echo -e "${YELLOW}Checking npm dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Running npm install...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}\n"
elif [ "package.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}package.json is newer than node_modules. Running npm install...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies updated${NC}\n"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}\n"
fi

# Check if dist/ exists or needs rebuild
if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
    echo -e "${YELLOW}Building project...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}\n"
else
    echo -e "${GREEN}✓ Project already built${NC}\n"
fi

# Start the server
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Server${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "${GREEN}Server will start on http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}\n"
echo -e "Health endpoint: ${GREEN}http://localhost:3000/health${NC}"
echo -e "API docs: ${GREEN}docs/API_REFERENCE.md${NC}\n"

# Start the server (this will keep running)
npm start
