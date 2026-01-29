# BE-STG13-016 Evidence Package

## Goal
Prevent accidental duplicate creates and make "retry-safe" behavior production-grade.

## Server
- URL: https://aiclipx-iam2.onrender.com
- Timestamp: 2026-01-29T04:27:41Z
- Idempotency-Key: `final-1769660861`

---

## Test Results

### TEST 1: Create with Idempotency-Key → 201

**Request:**
```
POST /api/video-tasks
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
  Idempotency-Key: final-1769660861
Body:
  {"title": "BE-STG13-016 Evidence", "prompt": "Idempotency test", "engine": "mock"}
```

**Response (HTTP 201):**
```json
{
    "id": "vt_4e80c173",
    "title": "BE-STG13-016 Evidence",
    "prompt": "Idempotency test",
    "status": "queued",
    "createdAt": "2026-01-29T04:27:42.686556Z",
    "deliveryType": "final_film_only",
    "debug": {
        "requestId": "req_a1f9985a"
    }
}
```

**Result:** ✅ PASS - Task created with ID `vt_4e80c173`

---

### TEST 2: Replay Same Key, Same Payload → 201 (Same Task ID)

**Request:**
```
POST /api/video-tasks
Headers:
  Idempotency-Key: final-1769660861 (SAME)
Body: (SAME as Test 1)
```

**Response (HTTP 201):**
```json
{
    "id": "vt_4e80c173",
    "title": "BE-STG13-016 Evidence",
    "status": "queued",
    "debug": {
        "requestId": "req_67d36ac5"
    }
}
```

**Result:** ✅ PASS - Returns **SAME Task ID** (`vt_4e80c173`)
- No duplicate task created
- Idempotency HIT - cached response returned

---

### TEST 3: Same Key, Different Payload → 409 Conflict

**Request:**
```
POST /api/video-tasks
Headers:
  Idempotency-Key: final-1769660861 (SAME)
Body:
  {"title": "DIFFERENT TITLE", ...} (DIFFERENT payload)
```

**Response (HTTP 409):**
```json
{
    "code": "IDEMPOTENCY_KEY_CONFLICT",
    "message": "Idempotency-Key already used with different payload",
    "requestId": "req_2fc6dfe5",
    "details": {
        "idempotencyKey": "final-1769660861..."
    }
}
```

**Result:** ✅ PASS - Payload mismatch correctly rejected with `requestId`

---

## Log Evidence (Expected Format)

```
[IDEMP] CHECK user=793ccc64... key=final-17...
[IDEMP] MISS user=793ccc64... key=final-17...
[IDEMP] STORE START user=793ccc64... key=final-17... task=vt_4e80c173
[IDEMP] STORED user=793ccc64... key=final-17... → task=vt_4e80c173 (TTL=24h)

[IDEMP] CHECK user=793ccc64... key=final-17...
[IDEMP] HIT user=793ccc64... key=final-17... → task=vt_4e80c173

[IDEMP] CHECK user=793ccc64... key=final-17...
[IDEMP] CONFLICT user=793ccc64... key=final-17... payload mismatch
```

---

## Summary

| Test | HTTP | Result |
|------|------|--------|
| 1. Create with key | 201 | ✅ Task created |
| 2. Replay same key | 201 | ✅ Same ID returned |
| 3. Different payload | 409 | ✅ IDEMPOTENCY_KEY_CONFLICT |

**ALL TESTS PASSED** ✅

---

## Implementation Notes

### Fix Applied (BE-STG13-016)
- Moved idempotency check **BEFORE** concurrency check in `video_tasks.py`
- Ensures retry-safe behavior: replay returns same task even if concurrency limit reached
- Commit: `7c93d46` on branch `be-stg13`

### Key Files
- `backend/routers/video_tasks.py` - Idempotency check order fix
- `backend/services/idempotency.py` - Idempotency service
- `backend/migrations/20250120_idempotency_keys.sql` - Database schema

### Configuration
- TTL: 24 hours (configurable via `IDEMPOTENCY_TTL_HOURS` env var)
- Storage: PostgreSQL `idempotency_keys` table with RLS
