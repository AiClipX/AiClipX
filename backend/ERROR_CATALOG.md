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

### Rate Limiting

| Code | HTTP | When | Example |
|------|------|------|---------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Exceeded 5 req/min on POST |

**Sample Response (429):**
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Retry after 60 seconds",
  "requestId": "req_rate1",
  "details": {}
}
```

---

### Server Errors

| Code | HTTP | When | Example |
|------|------|------|---------|
| `INTERNAL_ERROR` | 500 | Unexpected server error | Database connection failed |

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
