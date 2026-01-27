# AiClipX Webhook Events

> BE-STG13-010: Push notifications for task lifecycle events

## Configuration

Set these environment variables to enable webhooks:

```env
WEBHOOK_URL=https://your-endpoint.com/webhook
WEBHOOK_SECRET=your-secret-key-min-32-chars
```

**Both are required.** If either is missing, webhooks are disabled silently.

---

## Events

| Event Type | Trigger | Payload Includes |
|------------|---------|------------------|
| `video_task.created` | Task created | Basic task info |
| `video_task.processing_started` | Status → processing | Basic task info |
| `video_task.completed` | Status → completed | Task + `videoUrl` |
| `video_task.failed` | Status → failed | Task + `errorCode` + `errorMessage` |
| `video_task.cancelled` | Status → cancelled | Basic task info |

---

## Payload Schema

```json
{
  "eventId": "evt_abc123def456789",
  "eventType": "video_task.completed",
  "occurredAt": "2026-01-26T10:00:00.000000+00:00",
  "requestId": "req_xyz789",
  "task": {
    "id": "vt_abc123",
    "status": "completed",
    "title": "My awesome video",
    "engine": "runway",
    "createdAt": "2026-01-26T09:55:00.000000+00:00",
    "videoUrl": "https://signed-url...",
    "errorCode": null,
    "errorMessage": null
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Unique event identifier (`evt_` prefix) |
| `eventType` | string | Event type (see Events table) |
| `occurredAt` | ISO8601 | When the event occurred |
| `requestId` | string | Original request ID for correlation |
| `task.id` | string | Video task ID (`vt_` prefix) |
| `task.status` | string | Current task status |
| `task.title` | string | Task title |
| `task.engine` | string | Engine used (`mock` or `runway`) |
| `task.createdAt` | ISO8601 | Task creation timestamp |
| `task.videoUrl` | string? | Signed video URL (completed only) |
| `task.errorCode` | string? | Error code (failed only) |
| `task.errorMessage` | string? | User-safe error message (failed only) |

---

## Security

### HMAC Signature

All webhook requests include a signature header:

```
X-AiClipX-Signature: sha256=<hex_digest>
```

**Verification (Python):**

```python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    # signature format: "sha256=<hex>"
    received = signature.replace("sha256=", "")

    return hmac.compare_digest(expected, received)

# Usage
payload = request.body  # raw bytes
signature = request.headers.get("X-AiClipX-Signature")
is_valid = verify_signature(payload, signature, WEBHOOK_SECRET)
```

**Verification (Node.js):**

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const received = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(received)
  );
}
```

### Additional Headers

| Header | Description |
|--------|-------------|
| `X-AiClipX-Signature` | HMAC-SHA256 signature |
| `X-AiClipX-Event` | Event type |
| `X-Request-Id` | Request ID for correlation |
| `Content-Type` | `application/json` |

---

## Retry Strategy

| Attempt | Delay Before |
|---------|--------------|
| 1 | 0s (immediate) |
| 2 | 1s |
| 3 | 5s |

**Total:** 3 attempts, then give up.

**Retry conditions:**
- Non-2xx HTTP response
- Connection timeout (5s)
- Network error

**Success:** Any 2xx response stops retries.

---

## Best Practices

### 1. Respond Quickly

Return `200 OK` immediately, process asynchronously:

```python
@app.post("/webhook")
async def handle_webhook(request: Request):
    # Verify signature first
    if not verify_signature(...):
        return Response(status_code=401)

    # Queue for async processing
    background_tasks.add_task(process_event, request.json())

    # Return immediately
    return Response(status_code=200)
```

### 2. Idempotency

Use `eventId` to deduplicate:

```python
if event_already_processed(payload["eventId"]):
    return Response(status_code=200)  # Already handled
```

### 3. Handle All Event Types

```python
handlers = {
    "video_task.created": handle_created,
    "video_task.processing_started": handle_processing,
    "video_task.completed": handle_completed,
    "video_task.failed": handle_failed,
    "video_task.cancelled": handle_cancelled,
}

handler = handlers.get(payload["eventType"])
if handler:
    handler(payload)
```

---

## Testing

### Using webhook.site

1. Go to https://webhook.site
2. Copy your unique URL
3. Set `WEBHOOK_URL` to that URL
4. Create a task and watch events arrive

### Using curl to simulate

```bash
# Generate signature
SECRET="your-secret"
PAYLOAD='{"eventId":"evt_test","eventType":"video_task.completed",...}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Send request
curl -X POST https://your-endpoint.com/webhook \
  -H "Content-Type: application/json" \
  -H "X-AiClipX-Signature: sha256=$SIGNATURE" \
  -H "X-AiClipX-Event: video_task.completed" \
  -d "$PAYLOAD"
```

---

## Error Codes (for failed events)

| Code | Description |
|------|-------------|
| `RUNWAY_ERROR` | Runway API error |
| `STORAGE_ERROR` | Failed to upload video |
| `PROCESSING_ERROR` | Generic processing error |
| `TIMEOUT` | Processing timed out |
| `NETWORK_ERROR` | Network connectivity issue |

---

## Logging

Webhook delivery is logged (no secrets):

```
[req_abc123] Webhook video_task.completed attempt 1: status=200
[req_abc123] Webhook video_task.completed attempt 1: timeout
[req_abc123] Webhook video_task.completed attempt 2: status=500
[req_abc123] Webhook video_task.completed delivery failed after 3 attempts
```
