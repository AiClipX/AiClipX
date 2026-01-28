# AiClipX API Error Catalog

> BE-STG13-005: Production-ready error handling with traceable requestId

## Error Response Schema

All API errors return a consistent JSON structure:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "requestId": "req_abc12345",
  "details": {}
}
```

**Headers:**
- `X-Request-Id`: Same as `requestId` in body (for FE correlation)

---

## Error Codes Reference

### Authentication & Authorization

| Code | HTTP | When | Example |
|------|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing/invalid/expired JWT token | No `Authorization` header |
| `FORBIDDEN` | 403 | User doesn't own the requested resource | Accessing another user's task |

**Sample Response (401):**
```json
{
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid token",
  "requestId": "req_a1b2c3d4",
  "details": {}
}
```

---

### Resource Errors

| Code | HTTP | When | Example |
|------|------|------|---------|
| `NOT_FOUND` | 404 | Resource doesn't exist | `GET /api/video-tasks/vt_nonexistent` |

**Sample Response (404):**
```json
{
  "code": "NOT_FOUND",
  "message": "Video task not found",
  "requestId": "req_x1y2z3",
  "details": {"taskId": "vt_nonexistent"}
}
```

---

### Validation Errors

| Code | HTTP | When | Example |
|------|------|------|---------|
| `VALIDATION_ERROR` | 422 | Request body fails schema validation | Missing `title` field |
| `INVALID_CURSOR` | 400 | Pagination cursor is malformed | Corrupted base64 cursor |
| `CURSOR_FILTER_MISMATCH` | 400 | Cursor created with different filters | Changed `status` filter mid-pagination |

**Sample Response (422):**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "body.title: Field required",
  "requestId": "req_val123",
  "details": {
    "errors": [
      {"loc": ["body", "title"], "msg": "Field required", "type": "missing"}
    ]
  }
}
```

---

### Conflict Errors

| Code | HTTP | When | Example |
|------|------|------|---------|
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | Same Idempotency-Key with different payload | Retry with modified body |
| `ILLEGAL_STATE_TRANSITION` | 409 | Invalid FSM status change | `completed` → `processing` |

**Sample Response (409 - Idempotency):**
```json
{
  "code": "IDEMPOTENCY_KEY_CONFLICT",
  "message": "Idempotency-Key already used with different payload",
  "requestId": "req_idemp1",
  "details": {"idempotencyKey": "my-key-123..."}
}
```

**Sample Response (409 - FSM):**
```json
{
  "code": "ILLEGAL_STATE_TRANSITION",
  "message": "Cannot transition from completed to processing",
  "requestId": "req_fsm1",
  "details": {"currentStatus": "completed", "requestedStatus": "processing"}
}
```

---

### Rate Limiting & Concurrency

| Code | HTTP | When | Example |
|------|------|------|---------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests per IP | Exceeded 10 req/min on POST |
| `CONCURRENCY_LIMIT_EXCEEDED` | 429 | Too many active tasks per user | User has 3 queued/processing tasks |

**Sample Response (429 - Rate Limit):**
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. 10 per 1 minute",
  "requestId": "req_rate1",
  "details": {}
}
```

**Sample Response (429 - Concurrency):**
```json
{
  "code": "CONCURRENCY_LIMIT_EXCEEDED",
  "message": "Maximum 3 concurrent tasks allowed. Wait for existing tasks to complete.",
  "requestId": "req_conc1",
  "details": {"activeCount": 3, "limit": 3}
}
```

---

## Input Validation Limits (BE-STG13-007)

### POST /api/video-tasks

| Field | Type | Limit | Required |
|-------|------|-------|----------|
| `title` | string | 1-500 characters | Yes |
| `prompt` | string | 1-2000 characters | Yes |
| `sourceImageUrl` | string | max 2000 characters | No (required for `engine=runway`) |
| `engine` | enum | `mock` or `runway` | No (default: `mock`) |
| `params.durationSec` | int | 1-60 | No (default: 4) |
| `params.ratio` | enum | `16:9`, `9:16`, `1:1`, `4:3` | No (default: `16:9`) |

**Validation Error Examples:**
```json
// Missing required field
{"code": "VALIDATION_ERROR", "message": "body.title: Field required"}

// Title too long
{"code": "VALIDATION_ERROR", "message": "body.title: String should have at most 500 characters"}

// Prompt too long
{"code": "VALIDATION_ERROR", "message": "body.prompt: String should have at most 2000 characters"}

// Invalid engine
{"code": "VALIDATION_ERROR", "message": "body.engine: Input should be 'runway' or 'mock'"}
```

### GET /api/video-tasks

| Parameter | Type | Limit | Default |
|-----------|------|-------|---------|
| `limit` | int | 1-100 | 20 |
| `q` | string | max 100 characters | - |
| `status` | enum | `pending\|queued\|processing\|completed\|failed\|cancelled` | - |
| `sort` | enum | `createdAt_desc\|createdAt_asc` | `createdAt_desc` |
| `cursor` | string | valid base64 cursor | - |

---

## Rate Limits (BE-STG13-007)

| Endpoint | Limit | Scope |
|----------|-------|-------|
| `POST /api/video-tasks` | 10/minute | Per IP |
| `POST /api/auth/signin` | 10/minute | Per IP |
| `POST /api/tts` | 30/minute | Per IP |
| Other endpoints | 100/minute | Per IP |

**Notes:**
- Rate limits are per client IP (respects `X-Forwarded-For` header)
- Exceeding limit returns `429 RATE_LIMIT_EXCEEDED`
- Wait until the minute resets before retrying

---

## Concurrency Limits (BE-STG13-008)

| Resource | Limit | Scope |
|----------|-------|-------|
| Active video tasks | 3 | Per user |

**Notes:**
- Active = tasks in `queued` or `processing` status
- Exceeding limit returns `429 CONCURRENCY_LIMIT_EXCEEDED`
- Use `POST /api/video-tasks/{id}/cancel` to free up slots
- Cancelled/completed/failed tasks don't count against limit

---

### Server Errors

| Code | HTTP | When | Example |
|------|------|------|---------|
| `SERVICE_UNAVAILABLE` | 503 | Feature temporarily disabled | Runway engine unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error | Database connection failed |

**Sample Response (503 - Feature Disabled):**
```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Runway engine is temporarily unavailable. Please try again later or use mock engine.",
  "requestId": "req_svc503",
  "details": {"feature": "engineRunway", "suggestion": "Use engine=mock for testing"}
}
```

**Sample Response (500):**
```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req_err500",
  "details": {}
}
```

---

## Frontend Integration

### Displaying Errors

```typescript
// Example FE error handler
function handleApiError(error: ApiError) {
  // Always show requestId for support tickets
  console.error(`[${error.requestId}] ${error.code}: ${error.message}`);

  switch (error.code) {
    case 'UNAUTHORIZED':
      redirectToLogin();
      break;
    case 'FORBIDDEN':
      showToast('You do not have permission to access this resource');
      break;
    case 'VALIDATION_ERROR':
      showFormErrors(error.details.errors);
      break;
    case 'RATE_LIMIT_EXCEEDED':
      showToast('Too many requests. Please wait a moment.');
      break;
    default:
      showToast(`Error: ${error.message} (ref: ${error.requestId})`);
  }
}
```

### Request ID Correlation

The `requestId` can be:
1. **Client-generated**: Pass `X-Request-Id` header → server echoes it back
2. **Server-generated**: If no header provided → server creates `req_xxxx`

```typescript
// Client-side request ID for tracing
const requestId = `fe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
fetch('/api/video-tasks', {
  headers: {
    'X-Request-Id': requestId,
    'Authorization': `Bearer ${token}`
  }
});
```

---

## Log Format

Server logs include requestId for correlation:

```
[req_abc123] POST /api/video-tasks → 201 | 150ms | user=793ccc64... origin=https://app.aiclipx.app
[req_xyz789] ERROR VALIDATION_ERROR: body.title: Field required | user=- origin=-
[req_idemp01] [IDEMP] CONFLICT user=793ccc64... key=my-key... payload mismatch
```

**Note:** Sensitive data (tokens, passwords) are never logged.
