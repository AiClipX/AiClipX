# BE-STG13-018 Brainstorm: Quotas, Metrics & Admin Health

**Date:** 2026-01-30
**Status:** Agreed - Ready to implement

---

## Problem Statement

Control cost and enable fast operations troubleshooting with minimal tooling:
- Prevent abuse via per-user daily quotas
- Enable debugging with structured metrics
- Provide admin visibility into system health

---

## Agreed Solution

### 1. Per-User Daily Quota

**Config:**
```python
MAX_TASKS_PER_DAY_PER_USER = int(os.getenv("MAX_TASKS_PER_DAY_PER_USER", "50"))
```

**Check in `create_video_task`:**
```python
daily_count = count_tasks_created_today(user_id)
if daily_count >= MAX_TASKS_PER_DAY_PER_USER:
    return 429 DAILY_QUOTA_EXCEEDED
```

**Error Response (429):**
```json
{
  "code": "DAILY_QUOTA_EXCEEDED",
  "message": "Daily task limit reached. Resets at midnight UTC.",
  "requestId": "req_xxx",
  "details": {
    "used": 50,
    "limit": 50,
    "resetsAt": "2026-01-31T00:00:00Z"
  }
}
```

**Reset:** 00:00 UTC daily

---

### 2. Lightweight Metrics (Log-based)

**Prefix:** `[METRICS]`

**Events to emit:**

| Event | Log Pattern |
|-------|-------------|
| Task created | `[METRICS] task.created user=xxx engine=runway request_id=req_xxx` |
| Task queued | `[METRICS] task.queued task_id=vt_xxx user=xxx` |
| Task completed | `[METRICS] task.completed task_id=vt_xxx user=xxx latency_ms=30000` |
| Task failed | `[METRICS] task.failed task_id=vt_xxx user=xxx error_code=INVALID_PROMPT` |
| Task cancelled | `[METRICS] task.cancelled task_id=vt_xxx user=xxx` |
| Quota exceeded | `[METRICS] quota.exceeded user=xxx type=daily used=50 limit=50` |

**Benefits:**
- Queryable via Render logs (grep `[METRICS]`)
- No external service needed
- Correlatable via `request_id` / `task_id`

---

### 3. Admin Health Endpoint

**Endpoint:** `GET /api/admin/health`

**Auth:** `X-Admin-Secret` header (env: `ADMIN_SECRET`)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T12:00:00Z",
  "build": {
    "version": "1.0.0",
    "commit": "abc123def",
    "deployedAt": "2026-01-30T00:00:00Z"
  },
  "engines": {
    "runway": {
      "available": true,
      "circuitState": "CLOSED",
      "failureCount": 0
    },
    "mock": {
      "available": true
    }
  },
  "stats": {
    "last1h": {
      "created": 100,
      "completed": 80,
      "failed": 5,
      "cancelled": 2
    },
    "activeNow": {
      "queued": 10,
      "processing": 5
    }
  }
}
```

**Stats source:** Query DB on demand (no in-memory counters)

**Build info source:** Env vars `BUILD_VERSION`, `BUILD_COMMIT`, `BUILD_DEPLOYED_AT`

---

## Implementation Plan

### Files to Create

**1. `backend/services/quota.py`** (~40 lines)
```python
# count_tasks_created_today(user_id) -> int
# check_daily_quota(user_id) -> (bool, int, int)  # (exceeded, used, limit)
# get_quota_reset_time() -> datetime
```

**2. `backend/services/metrics.py`** (~30 lines)
```python
# emit_metric(event, **kwargs) -> None
# Logs with [METRICS] prefix
```

**3. `backend/routers/admin.py`** (~80 lines)
```python
# GET /api/admin/health
# Auth via X-Admin-Secret header
```

### Files to Modify

**4. `backend/routers/video_tasks.py`**
- Add daily quota check before task creation
- Emit metrics on task creation

**5. `backend/services/video_task_service.py`**
- Emit metrics on status changes (completed, failed, cancelled)

**6. `backend/main.py`**
- Register admin router

**7. `backend/services/capabilities.py`**
- Add `maxTasksPerDay` to capabilities response

---

## Error Codes

| Code | HTTP | Trigger |
|------|------|---------|
| `DAILY_QUOTA_EXCEEDED` | 429 | User exceeded daily task limit |
| `ADMIN_UNAUTHORIZED` | 401 | Missing/invalid X-Admin-Secret |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_TASKS_PER_DAY_PER_USER` | `50` | Daily task quota per user |
| `ADMIN_SECRET` | (required) | Secret for admin endpoints |
| `BUILD_VERSION` | `"dev"` | App version (set by CI/CD) |
| `BUILD_COMMIT` | `"unknown"` | Git commit hash |
| `BUILD_DEPLOYED_AT` | (auto) | Deploy timestamp |

---

## Acceptance Criteria

| Criteria | Validation |
|----------|------------|
| Quota exceeded returns 429 + `DAILY_QUOTA_EXCEEDED` | Postman test |
| Health endpoint protected by secret | 401 without header |
| Health returns circuit breaker state | Check `engines.runway.circuitState` |
| Metrics emitted in logs | grep `[METRICS]` in Render |
| All errors include `requestId` | Check response |

---

## Evidence Package Requirements

1. **Postman screenshot:** Quota exceeded (429 + requestId)
2. **Postman screenshot:** Admin health response (masked secret)
3. **Log snippets:** `[METRICS]` lines with task lifecycle

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| DB query on every health call | Cache stats for 30s if needed |
| Admin secret leaked | Use strong secret, rotate periodically |
| Quota bypass via multiple accounts | Out of scope (fraud detection) |

---

## Next Steps

1. Implement `quota.py`
2. Implement `metrics.py`
3. Implement `admin.py` router
4. Modify `video_tasks.py` for quota check
5. Add metrics emission points
6. Test & create evidence package
