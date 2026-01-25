#!/bin/bash
#
# BE-STG13-006: Newman Regression Runner
# One-command regression test for AiClipX API
#
# Usage:
#   ./run-newman.sh                           # Uses env vars
#   ./run-newman.sh user@example.com password # Uses arguments
#   EMAIL=x PASSWORD=y ./run-newman.sh        # Uses env vars
#
# Environment Variables:
#   EMAIL     - Test user email
#   PASSWORD  - Test user password
#   BASE_URL  - API base URL (default: https://aiclipx-iam2.onrender.com)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================"
echo "  AiClipX API Regression (BE-STG13-006)"
echo "========================================"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v newman &> /dev/null; then
    echo -e "${RED}ERROR: newman is not installed${NC}"
    echo ""
    echo "Install with: npm install -g newman"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ newman installed$(NC)"

# Get credentials
if [ -n "$1" ] && [ -n "$2" ]; then
    TEST_EMAIL="$1"
    TEST_PASSWORD="$2"
elif [ -n "$EMAIL" ] && [ -n "$PASSWORD" ]; then
    TEST_EMAIL="$EMAIL"
    TEST_PASSWORD="$PASSWORD"
else
    echo -e "${RED}ERROR: Missing credentials${NC}"
    echo ""
    echo "Usage:"
    echo "  ./run-newman.sh <email> <password>"
    echo "  EMAIL=x PASSWORD=y ./run-newman.sh"
    echo ""
    exit 1
fi

# Base URL (default to staging)
BASE_URL="${BASE_URL:-https://aiclipx-iam2.onrender.com}"

echo -e "${GREEN}✓ Credentials provided${NC}"
echo ""

# Show configuration
echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Email:    $TEST_EMAIL"
echo "  Password: ****"
echo ""

# Run newman
echo -e "${YELLOW}Running regression tests...${NC}"
echo ""

newman run "$SCRIPT_DIR/aiclipx-api.postman_collection.json" \
    -e "$SCRIPT_DIR/aiclipx-api.postman_environment.template.json" \
    --env-var "base_url=$BASE_URL" \
    --env-var "email=$TEST_EMAIL" \
    --env-var "password=$TEST_PASSWORD" \
    --reporters cli \
    --color on \
    --timeout-request 30000

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}========================================"
    echo "  ALL TESTS PASSED"
    echo "========================================${NC}"
else
    echo -e "${RED}========================================"
    echo "  TESTS FAILED (exit code: $EXIT_CODE)"
    echo "========================================${NC}"
fi

exit $EXIT_CODE
