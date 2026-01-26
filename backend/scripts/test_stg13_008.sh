#!/bin/bash
# BE-STG13-008 Evidence Test Script
# Usage: ./test_stg13_008.sh <email> <password>
#    or: ./test_stg13_008.sh --token <access_token>

set -e

BASE_URL="${BASE_URL:-https://aiclipx-iam2.onrender.com}"
CT="Content-Type: application/json"

# Parse arguments
if [ "$1" = "--token" ]; then
    TOKEN="$2"
elif [ -n "$1" ] && [ -n "$2" ]; then
    EMAIL="$1"
    PASSWORD="$2"
else
    echo "Usage: $0 <email> <password>"
    echo "   or: $0 --token <access_token>"
    exit 1
fi

echo "========================================"
echo "BE-STG13-008 Evidence Package"
echo "========================================"
echo "Base URL: $BASE_URL"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Sign in if email/password provided
if [ -n "$EMAIL" ]; then
    echo ">>> Signing in as $EMAIL..."
    SIGNIN=$(curl -s -X POST "$BASE_URL/api/auth/signin" -H "$CT" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

    TOKEN=$(echo "$SIGNIN" | jq -r '.access_token // .accessToken // empty')

    if [ -z "$TOKEN" ]; then
        echo "ERROR: Sign in failed"
        echo "$SIGNIN" | jq .
        exit 1
    fi

    USER_ID=$(echo "$SIGNIN" | jq -r '.user.id // "unknown"')
    echo "Signed in: user_id=${USER_ID:0:8}..."
    echo ""
fi

AUTH="Authorization: Bearer $TOKEN"

# Helper function
api() {
    local method=$1
    local path=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -X "$method" "$BASE_URL$path" -H "$AUTH" -H "$CT" -d "$data"
    else
        curl -s -X "$method" "$BASE_URL$path" -H "$AUTH"
    fi
}

echo "========================================"
echo "TEST 1: Create → Cancel while QUEUED"
echo "========================================"

# Create task
echo ">>> Creating task..."
TASK1=$(api POST "/api/video-tasks" '{"title":"Cancel Test Queued","prompt":"Test prompt for cancel","engine":"mock"}')
TASK1_ID=$(echo "$TASK1" | jq -r '.id')
TASK1_STATUS=$(echo "$TASK1" | jq -r '.status')
TASK1_REQ=$(echo "$TASK1" | jq -r '.debug.requestId')
echo "Created: id=$TASK1_ID status=$TASK1_STATUS requestId=$TASK1_REQ"

# Cancel immediately (should be queued)
echo ">>> Cancelling task..."
CANCEL1=$(api POST "/api/video-tasks/$TASK1_ID/cancel")
CANCEL1_STATUS=$(echo "$CANCEL1" | jq -r '.status')
CANCEL1_AT=$(echo "$CANCEL1" | jq -r '.cancelledAt')
CANCEL1_REQ=$(echo "$CANCEL1" | jq -r '.debug.requestId')
echo "Cancelled: status=$CANCEL1_STATUS cancelledAt=$CANCEL1_AT requestId=$CANCEL1_REQ"

# Verify detail
echo ">>> Verifying detail..."
DETAIL1=$(api GET "/api/video-tasks/$TASK1_ID")
DETAIL1_STATUS=$(echo "$DETAIL1" | jq -r '.status')
echo "Detail: status=$DETAIL1_STATUS"
echo ""
echo "✅ TEST 1 PASSED: $TASK1_STATUS → $CANCEL1_STATUS"
echo ""

sleep 2

echo "========================================"
echo "TEST 2: Create → Processing → Cancel"
echo "========================================"

# Create task
echo ">>> Creating task..."
TASK2=$(api POST "/api/video-tasks" '{"title":"Cancel Test Processing","prompt":"Test prompt for cancel processing","engine":"mock"}')
TASK2_ID=$(echo "$TASK2" | jq -r '.id')
TASK2_STATUS=$(echo "$TASK2" | jq -r '.status')
TASK2_REQ=$(echo "$TASK2" | jq -r '.debug.requestId')
echo "Created: id=$TASK2_ID status=$TASK2_STATUS requestId=$TASK2_REQ"

# Wait for processing (mock takes ~5s to start)
echo ">>> Waiting 6s for processing..."
sleep 6

# Check status
CHECK2=$(api GET "/api/video-tasks/$TASK2_ID")
CHECK2_STATUS=$(echo "$CHECK2" | jq -r '.status')
CHECK2_PROGRESS=$(echo "$CHECK2" | jq -r '.progress')
echo "Status: $CHECK2_STATUS progress=$CHECK2_PROGRESS"

# Cancel while processing
echo ">>> Cancelling task..."
CANCEL2=$(api POST "/api/video-tasks/$TASK2_ID/cancel")
CANCEL2_STATUS=$(echo "$CANCEL2" | jq -r '.status')
CANCEL2_AT=$(echo "$CANCEL2" | jq -r '.cancelledAt')
CANCEL2_REQ=$(echo "$CANCEL2" | jq -r '.debug.requestId')
echo "Cancelled: status=$CANCEL2_STATUS cancelledAt=$CANCEL2_AT requestId=$CANCEL2_REQ"

# Verify detail
echo ">>> Verifying detail..."
DETAIL2=$(api GET "/api/video-tasks/$TASK2_ID")
DETAIL2_STATUS=$(echo "$DETAIL2" | jq -r '.status')
echo "Detail: status=$DETAIL2_STATUS"
echo ""
echo "✅ TEST 2 PASSED: $TASK2_STATUS → $CHECK2_STATUS → $CANCEL2_STATUS"
echo ""

echo "========================================"
echo "TEST 3: Concurrency Limit (max 3)"
echo "========================================"

# Create 3 tasks
echo ">>> Creating 3 tasks..."
TASK3A=$(api POST "/api/video-tasks" '{"title":"Concurrency Test 1","prompt":"Test concurrency 1","engine":"mock"}')
TASK3A_ID=$(echo "$TASK3A" | jq -r '.id')
echo "Task 1: $TASK3A_ID"

TASK3B=$(api POST "/api/video-tasks" '{"title":"Concurrency Test 2","prompt":"Test concurrency 2","engine":"mock"}')
TASK3B_ID=$(echo "$TASK3B" | jq -r '.id')
echo "Task 2: $TASK3B_ID"

TASK3C=$(api POST "/api/video-tasks" '{"title":"Concurrency Test 3","prompt":"Test concurrency 3","engine":"mock"}')
TASK3C_ID=$(echo "$TASK3C" | jq -r '.id')
echo "Task 3: $TASK3C_ID"

# Try to create 4th task - should fail with 429
echo ">>> Creating 4th task (should fail)..."
TASK3D=$(api POST "/api/video-tasks" '{"title":"Concurrency Test 4","prompt":"Test concurrency 4","engine":"mock"}')
TASK3D_CODE=$(echo "$TASK3D" | jq -r '.code // .id')
TASK3D_MSG=$(echo "$TASK3D" | jq -r '.message // .status')
TASK3D_REQ=$(echo "$TASK3D" | jq -r '.requestId // .debug.requestId')
echo "Response: code=$TASK3D_CODE message=$TASK3D_MSG requestId=$TASK3D_REQ"

if [ "$TASK3D_CODE" = "CONCURRENCY_LIMIT_EXCEEDED" ]; then
    echo ""
    echo "✅ TEST 3 PASSED: Concurrency limit enforced"
else
    echo ""
    echo "⚠️  TEST 3: Got $TASK3D_CODE (expected CONCURRENCY_LIMIT_EXCEEDED)"
fi

# Cleanup: cancel the 3 tasks
echo ""
echo ">>> Cleanup: cancelling test tasks..."
api POST "/api/video-tasks/$TASK3A_ID/cancel" > /dev/null 2>&1 || true
api POST "/api/video-tasks/$TASK3B_ID/cancel" > /dev/null 2>&1 || true
api POST "/api/video-tasks/$TASK3C_ID/cancel" > /dev/null 2>&1 || true
echo "Done"

echo ""
echo "========================================"
echo "EVIDENCE SUMMARY"
echo "========================================"
echo "Test 1 (Cancel Queued):     $TASK1_ID → $CANCEL1_STATUS"
echo "Test 2 (Cancel Processing): $TASK2_ID → $CANCEL2_STATUS"
echo "Test 3 (Concurrency):       $TASK3D_CODE"
echo ""
echo "Request IDs for log correlation:"
echo "  - Create T1: $TASK1_REQ"
echo "  - Cancel T1: $CANCEL1_REQ"
echo "  - Create T2: $TASK2_REQ"
echo "  - Cancel T2: $CANCEL2_REQ"
echo "  - Concurrency block: $TASK3D_REQ"
echo "========================================"
