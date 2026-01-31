# BE-STG13-021 Brainstorm: Quota Management

**Date:** 2026-01-30
**Status:** Agreed - Ready to implement

---

## Problem Statement

Control platform cost and support safe degradation with a stable client contract for quota enforcement.

---

## Agreed Decisions

### 1. Unified Error Contract

**All quota errors → HTTP 429 with `code: "QUOTA_EXCEEDED"`**

```json
{
  "code": "QUOTA_EXCEEDED",
  "message": "...",
  "requestId": "req_xxx",
  "details": {
    "quotaName": "max_tasks_per_day" | "max_active_tasks" | "max_asset_uploads" | "max_asset_bytes",
    "current": 50,
    "limit": 50,
    "resetAt": "2026-01-31T00:00:00Z"  // null for non-resetting quotas
  },
  "legacyCode": "DAILY_QUOTA_EXCEEDED"  // backward compatibility
}
```

**Legacy code mapping:**
| quotaName | legacyCode |
|-----------|------------|
| `max_tasks_per_day` | `DAILY_QUOTA_EXCEEDED` |
| `max_active_tasks` | `CONCURRENCY_LIMIT_EXCEEDED` |
| `max_asset_uploads` | `ASSET_UPLOAD_LIMIT_EXCEEDED` |
| `max_asset_bytes` | `ASSET_STORAGE_LIMIT_EXCEEDED` |

---

### 2. Asset Upload Quotas

**New limits:**
- `MAX_ASSET_UPLOAD_COUNT` (default: 100 per user)
- `MAX_ASSET_TOTAL_BYTES` (default: 500MB = 524288000 bytes)

**Implementation:**
- Check before `POST /api/upload-urls`
- Query `user_assets` table for count and total size
- Return 429 `QUOTA_EXCEEDED` if exceeded

---

### 3. Capabilities Flags

**Add to `/api/capabilities`:**

```json
{
  "features": {
    "quotaEnforced": true,
    "assetUploadEnabled": true,
    ...
  },
  "limits": {
    "maxTasksPerDay": 50,
    "maxActiveTasksPerUser": 3,
    "maxAssetUploads": 100,
    "maxAssetTotalBytes": 524288000
  }
}
```

---

### 4. Degradation Rule (Fail-Closed)

**Document in code:**

```python
# DEGRADATION RULE (BE-STG13-021):
# If quota config/store is missing or misconfigured:
# - Cost-risk endpoints (task create, asset upload): FAIL CLOSED (reject)
# - Read-only endpoints: ALLOW (no cost impact)
#
# This prevents runaway costs if quota system is misconfigured.
```

**Behavior:**
| Scenario | Task Create | Asset Upload | Task List |
|----------|-------------|--------------|-----------|
| Quota DB unavailable | ❌ Reject | ❌ Reject | ✅ Allow |
| Config missing | ❌ Reject (use defaults) | ❌ Reject | ✅ Allow |
| Normal operation | Check quota | Check quota | ✅ Allow |

---

## Implementation Plan

### Files to Modify

| File | Changes |
|------|---------|
| `services/quota.py` | Add asset quota functions, unified `QuotaError` |
| `services/capabilities.py` | Add `quotaEnforced`, `assetUploadEnabled`, asset limits |
| `routers/video_tasks.py` | Update error response format |
| `routers/assets.py` | Add asset quota check |
| `services/error_response.py` | Add `quota_exceeded_response()` helper |

### New Functions

```python
# quota.py
def check_asset_upload_quota(user_id: str) -> QuotaCheckResult:
    """Check max_asset_uploads and max_asset_bytes."""

def quota_exceeded_response(
    quota_name: str,
    current: int,
    limit: int,
    reset_at: datetime | None,
    request_id: str,
) -> JSONResponse:
    """Unified 429 response for all quota types."""
```

---

## Acceptance Criteria

| Criteria | Test |
|----------|------|
| Daily limit → 429 QUOTA_EXCEEDED | Create until limit, verify response |
| Active limit → 429 QUOTA_EXCEEDED | Parallel create, verify blocking |
| Asset upload limit → 429 | Upload until limit |
| `/api/capabilities` | Verify all flags + limits |
| Fail-closed | Simulate DB error → reject creates |

---

## Evidence Package Requirements

1. **Postman:** Task create until limit → 429 with all required fields
2. **Postman:** Parallel create → active limit hit
3. **Postman:** `/api/capabilities` with all flags
4. **Logs:** Quota decision line with requestId

---

## Env Vars

```bash
MAX_TASKS_PER_DAY_PER_USER=50
MAX_CONCURRENT_TASKS_PER_USER=3
MAX_ASSET_UPLOAD_COUNT=100
MAX_ASSET_TOTAL_BYTES=524288000
```

