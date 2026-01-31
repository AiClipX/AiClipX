# BE-STG13-017 Brainstorm: Engine Resilience

**Date:** 2026-01-29
**Status:** Agreed - Option A (Minimal)

---

## Problem Statement

Make engine execution resilient and predictable under external failures. Currently:
- No retry on transient errors
- No circuit breaker for cascading failures
- No standardized error codes for failures

---

## Requirements

1. **Retry Policy:** Retry transient errors (network, 429, 5xx) with backoff
2. **No Retry:** Deterministic errors (400, 401, 403) fail fast
3. **Timeouts:** Per-call (30s) + overall task (15 min)
4. **Circuit Breaker:** Disable engine after N consecutive failures
5. **Error Catalog:** Stable errorCode + user-safe message + requestId

---

## Agreed Solution: Option A (Minimal)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    video_task_service                    │
│                           │                              │
│                           ▼                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │              resilience.py                       │    │
│  │  ┌─────────────┐    ┌──────────────────┐        │    │
│  │  │ RetryPolicy │    │ CircuitBreaker   │        │    │
│  │  │ - 3 retries │    │ - 5 failures     │        │    │
│  │  │ - exp backoff│   │ - 60s cooldown   │        │    │
│  │  └─────────────┘    └──────────────────┘        │    │
│  └─────────────────────────────────────────────────┘    │
│                           │                              │
│                           ▼                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  runway.py                       │    │
│  │  - HTTP calls wrapped with retry                 │    │
│  │  - Circuit breaker check before call             │    │
│  └─────────────────────────────────────────────────┘    │
│                           │                              │
│                           ▼                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │              capabilities.py                     │    │
│  │  - engineRunwayEnabled = API_KEY && !circuit_open│    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Retry Policy

| Error Type | Retry? | Examples |
|------------|--------|----------|
| Network | Yes | `httpx.RequestError`, timeout |
| 429 | Yes | Rate limited |
| 5xx | Yes | 500, 502, 503, 504 |
| 400 | No | Invalid prompt |
| 401/403 | No | Auth error |
| 404 | No | Not found |

**Backoff Strategy:**
```
Attempt 1: immediate
Attempt 2: 1s delay
Attempt 3: 2s delay
Attempt 4: 4s delay
Max retries: 3
```

### Circuit Breaker

| Parameter | Value |
|-----------|-------|
| Failure threshold | 5 consecutive |
| Window | 60 seconds |
| Cooldown (OPEN duration) | 60 seconds |
| Half-open test calls | 1 |

**States:**
- `CLOSED`: Normal operation
- `OPEN`: All calls rejected, engine disabled
- `HALF_OPEN`: Testing recovery with single call

### Error Catalog

| Scenario | errorCode | HTTP | User Message |
|----------|-----------|------|--------------|
| Network timeout | `ENGINE_TIMEOUT` | 504 | "Video generation timed out. Please try again." |
| Rate limited (429) | `ENGINE_RATE_LIMITED` | 429 | "Service busy. Please wait and retry." |
| Server error (5xx) | `ENGINE_UNAVAILABLE` | 503 | "Video service temporarily unavailable." |
| Invalid prompt (400) | `INVALID_PROMPT` | 422 | "Invalid prompt. Check content guidelines." |
| Auth error (401/403) | `ENGINE_AUTH_ERROR` | 503 | "Service configuration error." |
| Circuit open | `ENGINE_CIRCUIT_OPEN` | 503 | "Video generation temporarily disabled." |
| Task timeout (15min) | `TASK_TIMEOUT` | 504 | "Task exceeded maximum processing time." |

---

## Implementation Plan

### Files to Create

**1. `backend/services/resilience.py`** (~80 lines)
```python
# RetryPolicy class
# - is_retryable(error, status_code) -> bool
# - get_delay(attempt) -> float
# - max_attempts = 4

# CircuitBreaker class (in-memory singleton)
# - state: CLOSED | OPEN | HALF_OPEN
# - failure_count: int
# - last_failure_time: datetime
# - record_success()
# - record_failure()
# - is_open() -> bool
# - can_attempt() -> bool
```

### Files to Modify

**2. `backend/services/runway.py`**
- Import `circuit_breaker`, `retry_policy` from resilience
- Add `@with_retry` decorator or wrap calls
- Check `circuit_breaker.can_attempt()` before API calls
- Call `record_success()` / `record_failure()` after calls

**3. `backend/services/capabilities.py`**
- Import circuit_breaker
- Modify `engine_runway_enabled`:
  ```python
  @property
  def engine_runway_enabled(self) -> bool:
      from services.resilience import circuit_breaker
      has_key = bool(os.getenv("RUNWAY_API_KEY", "").strip())
      return has_key and not circuit_breaker.is_open()
  ```

**4. `backend/services/video_task_service.py`**
- Import error codes from resilience
- Map exceptions to standardized errorCode in `process_runway_task`
- Ensure failed tasks have `errorCode` + `errorMessage`

**5. `backend/models/video_task.py`** (if needed)
- Add `errorCode` field to VideoTask model

---

## Testing Strategy

### Unit Tests
- `test_retry_policy.py`: Test retry logic, backoff delays
- `test_circuit_breaker.py`: Test state transitions

### Integration Tests (Evidence Package)

**Test 1: Transient failure → retries → success**
```bash
# Simulate 2 failures then success (mock)
# Logs should show: attempt 1 fail, attempt 2 fail, attempt 3 success
```

**Test 2: Deterministic failure → no retries**
```bash
# Send invalid prompt (400 error)
# Logs should show: attempt 1 fail, NO retry, immediate failure
```

**Test 3: Circuit breaker open/close**
```bash
# Trigger 5 consecutive failures
# Check /api/capabilities → engineRunwayEnabled: false
# Wait 60s, check again → engineRunwayEnabled: true (half-open)
```

**Test 4: Failed task detail**
```bash
# Postman: GET /api/video-tasks/{failed_task_id}
# Response should include: errorCode, errorMessage, requestId
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Circuit breaker resets on restart | Acceptable for MVP; add Redis later if needed |
| Retry delays task completion | Max 3 retries = max 7s extra delay |
| Race condition on circuit state | Single-threaded Python; use lock if needed |

---

## Success Metrics

- [ ] Transient failures retry up to 3 times
- [ ] Deterministic failures fail immediately
- [ ] Circuit opens after 5 consecutive failures
- [ ] `/api/capabilities` reflects circuit state
- [ ] Failed tasks include errorCode + errorMessage + requestId
- [ ] No stuck "processing" tasks (timeout ensures failure)

---

## Next Steps

1. Create `resilience.py` with RetryPolicy + CircuitBreaker
2. Modify `runway.py` to use retry + circuit breaker
3. Update `capabilities.py` to check circuit state
4. Update `video_task_service.py` error handling
5. Test with mock failures
6. Create Evidence Package

---

## Appendix: Code Snippets

### RetryPolicy (pseudo)
```python
class RetryPolicy:
    MAX_ATTEMPTS = 4
    RETRYABLE_STATUS = {429, 500, 502, 503, 504}

    def is_retryable(self, error=None, status_code=None) -> bool:
        if isinstance(error, httpx.RequestError):
            return True
        if status_code in self.RETRYABLE_STATUS:
            return True
        return False

    def get_delay(self, attempt: int) -> float:
        # Exponential: 0, 1, 2, 4
        if attempt <= 1:
            return 0
        return 2 ** (attempt - 2)
```

### CircuitBreaker (pseudo)
```python
class CircuitBreaker:
    FAILURE_THRESHOLD = 5
    COOLDOWN_SECONDS = 60

    def __init__(self):
        self.state = "CLOSED"
        self.failure_count = 0
        self.opened_at = None

    def record_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.FAILURE_THRESHOLD:
            self.state = "OPEN"
            self.opened_at = datetime.now()

    def record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def is_open(self) -> bool:
        if self.state == "CLOSED":
            return False
        if self.state == "OPEN":
            elapsed = (datetime.now() - self.opened_at).total_seconds()
            if elapsed >= self.COOLDOWN_SECONDS:
                self.state = "HALF_OPEN"
                return False
            return True
        return False  # HALF_OPEN allows one attempt
```
