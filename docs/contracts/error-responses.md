# Error Responses Contract

All API errors follow a consistent envelope format.

## Error Envelope

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "requestId": "req_abc12345",
  "details": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code (use for programmatic handling) |
| `message` | string | Human-readable message (safe to display to users) |
| `requestId` | string | Correlation ID for debugging/support |
| `details` | object | Additional context (varies by error type) |

**Important:** Always check `code` field for error handling, not HTTP status or `message`.

---

## Error Codes Reference

### Authentication Errors (401)

#### UNAUTHORIZED

Missing or invalid authentication token.

```json
{
  "code": "UNAUTHORIZED",
  "message": "Invalid token: Signature verification failed",
  "requestId": "req_abc12345",
  "details": {}
}
```

**FE Action:** Redirect to login page, clear stored tokens.

---

### Authorization Errors (403)

#### FORBIDDEN

User lacks permission to access resource.

```json
{
  "code": "FORBIDDEN",
  "message": "You do not have permission to access this task",
  "requestId": "req_abc12345",
  "details": {
    "taskId": "vt_xyz789"
  }
}
```

**FE Action:** Show permission denied message, don't retry.

---

### Not Found Errors (404)

#### NOT_FOUND

Requested resource doesn't exist.

```json
{
  "code": "NOT_FOUND",
  "message": "Video task not found",
  "requestId": "req_abc12345",
  "details": {
    "taskId": "vt_nonexistent"
  }
}
```

#### TEMPLATE_NOT_FOUND

Template ID doesn't exist.

```json
{
  "code": "TEMPLATE_NOT_FOUND",
  "message": "Template 'nonexistent' not found",
  "requestId": "req_abc12345",
  "details": {}
}
```

**FE Action:** Show not found message, redirect to list.

---

### Validation Errors (400/422)

#### BAD_REQUEST

Malformed request (invalid JSON, missing body).

```json
{
  "code": "BAD_REQUEST",
  "message": "Invalid JSON in request body",
  "requestId": "req_abc12345",
  "details": {}
}
```

#### VALIDATION_ERROR

Request payload fails validation.

```json
{
  "code": "VALIDATION_ERROR",
  "message": "body.title: Field required",
  "requestId": "req_abc12345",
  "details": {
    "errors": [
      {
        "loc": ["body", "title"],
        "msg": "Field required",
        "type": "missing"
      }
    ]
  }
}
```

**FE Action:** Highlight invalid fields, show validation messages.

---

### Conflict Errors (409)

#### IDEMPOTENCY_KEY_CONFLICT

Same idempotency key used with different payload.

```json
{
  "code": "IDEMPOTENCY_KEY_CONFLICT",
  "message": "Idempotency-Key already used with different payload",
  "requestId": "req_abc12345",
  "details": {
    "idempotencyKey": "key-prefix..."
  }
}
```

**FE Action:** Generate new idempotency key and retry.

#### ILLEGAL_STATE_TRANSITION

Invalid status transition (e.g., completed → processing).

```json
{
  "code": "ILLEGAL_STATE_TRANSITION",
  "message": "Cannot transition from completed to processing",
  "requestId": "req_abc12345",
  "details": {
    "currentStatus": "completed",
    "requestedStatus": "processing"
  }
}
```

**FE Action:** Refresh task status, update UI.

---

### Rate Limit Errors (429)

#### RATE_LIMIT_EXCEEDED

Too many requests in time window.

```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Rate limit: 10 per 1 minute",
  "requestId": "req_abc12345",
  "details": {}
}
```

**FE Action:** Show rate limit message, implement backoff.

#### QUOTA_EXCEEDED

Daily or concurrent task limit reached.

```json
{
  "code": "QUOTA_EXCEEDED",
  "message": "Daily task limit reached (50/50)",
  "requestId": "req_abc12345",
  "details": {
    "quotaName": "daily_tasks",
    "current": 50,
    "limit": 50,
    "resetsAt": "2026-02-01T00:00:00Z"
  }
}
```

**FE Action:** Show quota status, display reset time.

---

### Service Errors (503)

#### SERVICE_UNAVAILABLE

Feature or engine temporarily unavailable.

```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Runway engine is temporarily unavailable",
  "requestId": "req_abc12345",
  "details": {
    "feature": "engineRunway",
    "suggestion": "Use engine=mock for testing"
  }
}
```

#### TEMPLATES_DISABLED

Templates feature is disabled.

```json
{
  "code": "TEMPLATES_DISABLED",
  "message": "Template catalog is currently disabled",
  "requestId": "req_abc12345",
  "details": {}
}
```

#### SSE_EVENTS_DISABLED

Real-time events feature is disabled.

```json
{
  "code": "SSE_EVENTS_DISABLED",
  "message": "Real-time events are currently disabled",
  "requestId": "req_abc12345",
  "details": {}
}
```

**FE Action:** Show degradation notice, offer alternatives.

---

### Internal Errors (500)

#### INTERNAL_ERROR

Unexpected server error.

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req_abc12345",
  "details": {}
}
```

**FE Action:** Show generic error, include `requestId` for support.

---

## Error Handling Best Practices

### 1. Always Use `code` Field

```typescript
if (error.code === 'UNAUTHORIZED') {
  redirectToLogin();
} else if (error.code === 'QUOTA_EXCEEDED') {
  showQuotaDialog(error.details);
}
```

### 2. Log `requestId` for Support

```typescript
console.error(`API Error [${error.requestId}]: ${error.code}`);
```

### 3. Handle Degradation Gracefully

```typescript
// Templates list returns empty array when disabled
if (response.data.length === 0) {
  showEmptyState('Templates temporarily unavailable');
}
```

### 4. Implement Retry with Backoff

```typescript
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  await sleep(retryDelay * Math.pow(2, attempt));
  return retry();
}
```
