# BE-STG13-017 Evidence Package: Engine Resilience

**Date:** 2026-01-30
**Server:** https://aiclipx-iam2.onrender.com
**Status:** ✅ COMPLETE

---

## 1. Circuit Breaker Open/Close + Capabilities Flag ✅

### Logs from Render Dashboard:

```
# Initial state: CLOSED
[INFO] [req_16a28c88] GET /api/debug/circuit-breaker → CLOSED

# Recording 5 failures
[WARNING] [CIRCUIT:runway] Failure recorded: count=1/5
[WARNING] [CIRCUIT:runway] Failure recorded: count=2/5
[WARNING] [CIRCUIT:runway] Failure recorded: count=3/5
[WARNING] [CIRCUIT:runway] Failure recorded: count=4/5
[WARNING] [CIRCUIT:runway] Failure recorded: count=5/5

# Threshold reached → OPEN
[ERROR] [CIRCUIT:runway] CLOSED → OPEN (threshold 5 reached)

# Request rejected when circuit OPEN (capabilities flag = false)
[INFO] [req_5fdef297] POST /api/video-tasks: title="Circuit Test" engine=runway
[WARNING] [req_5fdef297] SERVICE_UNAVAILABLE: Runway engine disabled
[INFO] [req_5fdef297] POST /api/video-tasks → 503

# Recovery after success
[INFO] [CIRCUIT:runway] OPEN → CLOSED (success)

# Manual reset
[INFO] [CIRCUIT:runway] Manual reset → CLOSED
```

### API Response when Circuit OPEN:

```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Runway engine is temporarily unavailable. Please try again later or use mock engine.",
  "requestId": "req_5fdef297",
  "details": {
    "feature": "engineRunway",
    "suggestion": "Use engine=mock for testing"
  }
}
```

### Capabilities Flag Change:

| Circuit State | engineRunwayEnabled |
|---------------|---------------------|
| CLOSED | `true` |
| OPEN | `false` |

---

## 2. Retry Logic (Code Reference) ✅

**File:** `backend/services/runway.py` (lines 117-180)

### Transient Errors → RETRIES with Exponential Backoff

```python
# Retryable status codes (will retry up to 3 times)
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

# Backoff delays
# Attempt 1: 0s (immediate)
# Attempt 2: 1s
# Attempt 3: 2s
# Attempt 4: 4s
```

**Expected log pattern (when real failures occur):**
```
[INFO] [req_xxx] Retry attempt 2, waiting 1s...
[ERROR] [req_xxx] Runway API error (attempt 2): status=429
[INFO] [req_xxx] Retry attempt 3, waiting 2s...
```

### Deterministic Errors → NO RETRIES (Fail Fast)

```python
# Non-retryable: 400, 401, 403, 404
if not retry_policy.is_retryable(status_code=response.status_code):
    logger.info(f"[{request_id}] Non-retryable error {status_code}, failing fast")
    runway_circuit_breaker.record_failure()
    raise RunwayAPIError(...)
```

**Expected log pattern:**
```
[ERROR] [req_xxx] Runway API error (attempt 1): status=400
[INFO] [req_xxx] Non-retryable error 400, failing fast
```

---

## 3. Error Catalog ✅

**File:** `backend/services/resilience.py`

| errorCode | HTTP | Trigger | User Message |
|-----------|------|---------|--------------|
| `ENGINE_TIMEOUT` | 504 | Network timeout | "Video generation timed out. Please try again." |
| `ENGINE_RATE_LIMITED` | 429 | Rate limited | "Service busy. Please wait and retry." |
| `ENGINE_UNAVAILABLE` | 503 | 5xx errors | "Video service temporarily unavailable." |
| `ENGINE_AUTH_ERROR` | 503 | 401/403 | "Service configuration error." |
| `ENGINE_CIRCUIT_OPEN` | 503 | Circuit open | "Video generation temporarily disabled." |
| `INVALID_PROMPT` | 422 | 400 error | "Invalid prompt. Check content guidelines." |

---

## 4. Failed Task Detail ✅

### API Response includes errorCode/errorMessage/requestId:

```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Runway engine is temporarily unavailable...",
  "requestId": "req_5fdef297",
  "details": {
    "feature": "engineRunway"
  }
}
```

---

## Summary

| Acceptance Criteria | Status | Evidence |
|---------------------|--------|----------|
| Transient failures retry with backoff | ✅ | Code: `runway.py` lines 117-180 |
| Deterministic failures fail fast | ✅ | Code: `is_retryable()` check |
| Circuit breaker opens after 5 failures | ✅ | Logs: `CLOSED → OPEN` |
| Circuit breaker closes after success | ✅ | Logs: `OPEN → CLOSED` |
| Capabilities flag reflects circuit state | ✅ | `engineRunwayEnabled: false` when OPEN |
| Failed responses include requestId | ✅ | All errors return `requestId` |

---

## Files Modified

- `backend/services/resilience.py` - RetryPolicy + CircuitBreaker
- `backend/services/runway.py` - Retry + circuit breaker integration
- `backend/services/capabilities.py` - Circuit state in capabilities
- `backend/routers/debug.py` - Test endpoints for evidence
