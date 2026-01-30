# BE-STG13-020 Brainstorm: Metrics Snapshot Endpoint

**Date:** 2026-01-30
**Status:** Agreed - Ready to implement

---

## Problem Statement

Make the system auditable and operable with fast diagnosis of:
- Task counts by status
- Latency percentiles (p50/p95)
- Top error codes
- All with requestId correlation

---

## Agreed Solution: DB-Based Aggregation

### New Endpoint

**`GET /api/admin/metrics-snapshot`**

**Auth:** `X-Admin-Secret` header

**Query params:**
- `minutes` (default: 60) - Time window

**Response:**
```json
{
  "window": {
    "minutes": 60,
    "from": "2026-01-30T09:00:00Z",
    "to": "2026-01-30T10:00:00Z"
  },
  "requestId": "req_xxx",
  "tasks": {
    "created": 100,
    "completed": 80,
    "failed": 5,
    "cancelled": 2,
    "processing": 3,
    "queued": 10
  },
  "latency": {
    "timeToProcessingMs": {
      "p50": 5000,
      "p95": 12000,
      "avg": 6500,
      "samples": 80
    },
    "timeToCompleteMs": {
      "p50": 25000,
      "p95": 45000,
      "avg": 28000,
      "samples": 80
    }
  },
  "topErrors": [
    {"code": "INVALID_PROMPT", "count": 3},
    {"code": "ENGINE_TIMEOUT", "count": 2}
  ]
}
```

---

## Implementation Plan

### 1. Add to `backend/routers/admin.py`

```python
@router.get("/metrics-snapshot")
async def metrics_snapshot(
    request: Request,
    x_admin_secret: str = Header(default="", alias="X-Admin-Secret"),
    minutes: int = Query(default=60, ge=1, le=1440),
):
    # Verify admin secret
    # Query DB for stats within time window
    # Calculate percentiles
    # Return response
```

### 2. Helper Functions

```python
def _get_task_counts(minutes: int) -> Dict[str, int]:
    """Count tasks by status within time window."""

def _get_latency_percentiles(minutes: int) -> Dict:
    """Calculate p50/p95/avg from completed tasks."""

def _get_top_errors(minutes: int, limit: int = 5) -> List[Dict]:
    """Get top error codes by count."""
```

### 3. Percentile Calculation

Query completed tasks with `processing_at` and `completed_at`:
```python
# time_to_processing = processing_at - created_at
# time_to_complete = completed_at - processing_at

# Sort latencies, calculate percentiles:
# p50 = latencies[len/2]
# p95 = latencies[int(len*0.95)]
```

### 4. Top Errors

Query failed tasks, extract error patterns from `error_message`:
```sql
SELECT error_message, COUNT(*) as count
FROM video_tasks
WHERE status = 'failed' AND updated_at >= cutoff
GROUP BY error_message
ORDER BY count DESC
LIMIT 5
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/routers/admin.py` | Add `/metrics-snapshot` endpoint |
| `backend/services/metrics.py` | (Optional) Add auth metrics if needed later |

---

## Acceptance Criteria

| Criteria | Validation |
|----------|------------|
| Endpoint returns correct task counts | Create tasks, check response |
| Latency percentiles calculated | Verify p50/p95 values |
| Top errors listed | Trigger failures, check list |
| Protected by X-Admin-Secret | 401 without header |
| requestId in response | Check response |

---

## Evidence Package Requirements

1. **curl/Postman:** `/admin/metrics-snapshot` response
2. **Log snippets:** `[METRICS]` lines with requestId
3. **(Optional)** Before/after creating tasks

---

## Out of Scope

- Auth signin/signout counters (Supabase handles this)
- JSON format logs (current key=value format sufficient)
- In-memory counters (DB is source of truth)

---

## Next Steps

1. Implement `_get_latency_percentiles()` helper
2. Implement `_get_top_errors()` helper
3. Add `/metrics-snapshot` endpoint
4. Test and create evidence

