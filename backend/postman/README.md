# AiClipX API Regression Suite

BE-STG13-006: One-command regression testing for AiClipX API.

## Quick Start

```bash
# Install newman (one-time)
npm install -g newman

# Run tests
./run-newman.sh your-email@example.com your-password

# Or using environment variables
EMAIL=your-email@example.com PASSWORD=your-password ./run-newman.sh
```

**Expected time:** ~2 minutes

---

## Files

| File | Description |
|------|-------------|
| `aiclipx-api.postman_collection.json` | Collection with 18 tests |
| `aiclipx-api.postman_environment.template.json` | Environment template (no secrets) |
| `run-newman.sh` | One-command runner script |

---

## Test Coverage (18 Tests)

### 1. Auth (2 tests)
| # | Request | Expected | Validates |
|---|---------|----------|-----------|
| 01 | Login | 200 | access_token saved |
| 02 | Get Me | 200 | user object returned |

### 2. Video Tasks (8 tests)
| # | Request | Expected | Validates |
|---|---------|----------|-----------|
| 03 | Create Task | 201 | task_id saved, status=queued, deliveryType |
| 04 | List Tasks | 200 | data array with items |
| 05 | List Page 1 | 200 | max 2 items, saves nextCursor |
| 06 | List Page 2 | 200 | uses cursor, no duplicates |
| 07 | List with Filter | 200 | all items match status=completed |
| 08 | List with Search | 200 | search by title works |
| 09 | Get Task Detail | 200 | matches created task |
| 10 | Get Completed (signed URL) | 200 | videoUrl, deliveryType, videoUrlExpiresAt |

### 3. Idempotency (3 tests)
| # | Request | Expected | Validates |
|---|---------|----------|-----------|
| 11 | Create with Idempotency-Key | 201 | task created, id saved |
| 12 | Repeat Same Key | 201 | **SAME id returned** |
| 13 | Same Key Different Payload | 409 | IDEMPOTENCY_KEY_CONFLICT |

### 4. Negative Tests (5 tests)
| # | Request | Expected | Validates |
|---|---------|----------|-----------|
| 14 | Unauthorized | 401 | UNAUTHORIZED + requestId |
| 15 | Not Found | 404 | NOT_FOUND + requestId |
| 16 | Validation Error | 422 | VALIDATION_ERROR + requestId |
| 17 | Invalid Cursor | 400 | INVALID_CURSOR + requestId |
| 18 | Illegal State Transition | 409 | ILLEGAL_STATE_TRANSITION + requestId |

---

## Usage

### Option 1: Newman CLI (Recommended)

```bash
# Run with script
./run-newman.sh your-email@example.com your-password

# Run with environment variables
EMAIL=test@example.com PASSWORD=secret ./run-newman.sh

# Run against production
BASE_URL=https://api.aiclipx.app ./run-newman.sh email password

# Run manually with newman
newman run aiclipx-api.postman_collection.json \
  -e aiclipx-api.postman_environment.template.json \
  --env-var "email=YOUR_EMAIL" \
  --env-var "password=YOUR_PASSWORD"
```

### Option 2: Postman UI

1. Import `aiclipx-api.postman_collection.json`
2. Import `aiclipx-api.postman_environment.template.json`
3. Edit environment: set `email` and `password`
4. Run Collection (Collection Runner)

---

## Environment Variables

| Variable | Description | Auto-set |
|----------|-------------|----------|
| `base_url` | API base URL | No (default: staging) |
| `email` | Test user email | No |
| `password` | Test user password | No |
| `access_token` | JWT token | Yes (from Login) |
| `task_id` | Created task ID | Yes (from Create Task) |
| `next_cursor` | Pagination cursor | Yes (from List Page 1) |
| `idempotency_key` | Generated key | Yes (from test 11) |
| `idempotent_task_id` | Task for idempotency test | Yes (from test 11) |

---

## Switching Environments

Change `base_url` for different environments:

| Environment | URL |
|-------------|-----|
| Staging | `https://aiclipx-iam2.onrender.com` (default) |
| Production | `https://api.aiclipx.app` |

---

## Troubleshooting

### "newman is not installed"
```bash
npm install -g newman
```

### "Login failed (401)"
- Check email/password are correct
- Ensure user exists in Supabase Auth

### "Idempotency test failed"
- Ensure `idempotency_keys` table exists in Supabase
- Check RLS is disabled: `ALTER TABLE idempotency_keys DISABLE ROW LEVEL SECURITY;`

### "Page 2 test skipped"
- This is OK if there are fewer than 3 tasks in the database
- The test gracefully skips when no cursor is available

### "All tasks have filtered status" fails
- Ensure there's at least 1 completed task in the database
- Wait for mock tasks to complete (~25s after creation)

### "Illegal State Transition" test uses wrong task
- This test depends on test 11-12 creating and completing a task
- Run the full collection in order

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run API Regression
  run: |
    npm install -g newman
    cd backend/postman
    ./run-newman.sh ${{ secrets.TEST_EMAIL }} ${{ secrets.TEST_PASSWORD }}
```

### Shell Script

```bash
#!/bin/bash
cd backend/postman
./run-newman.sh "$TEST_EMAIL" "$TEST_PASSWORD"
if [ $? -ne 0 ]; then
  echo "Regression failed!"
  exit 1
fi
```

---

## Compliance Notes (BE-STG13-003)

The test suite validates:

1. **Final Film Output Only**
   - `deliveryType: "final_film_only"` present on all tasks

2. **Signed URL Strategy**
   - `videoUrl` present on completed tasks
   - `videoUrlExpiresAt` field exists

3. **Error Envelope**
   - All errors include `requestId`
   - All errors include `code`
   - `X-Request-Id` header present

---

## Expected Output

```
AiClipX API Regression (STG13)
==============================

→ 1. Auth
  → 01. Login
    ✓ Status 200
    ✓ Has access_token
    ✓ Has user info

→ 2. Video Tasks
  → 03. Create Task
    ✓ Status 201
    ✓ Has task id
    ✓ Status is queued
    ✓ Has deliveryType
    ✓ Has X-Request-Id header

...

→ 3. Idempotency
  → 12. Repeat Same Key (same id)
    ✓ Status 201
    ✓ Returns SAME task id (idempotency works)

...

========================================
  ALL TESTS PASSED
========================================
```
