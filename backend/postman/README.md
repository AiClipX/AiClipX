# AiClipX API Regression Collection

BE-STG12-012: Postman collection for API regression testing.

## Files

| File | Description |
|------|-------------|
| `aiclipx-api.postman_collection.json` | Postman collection with 8 requests |
| `aiclipx-api.postman_environment.json` | Environment template (no secrets) |

## Test Coverage

| # | Request | Expected | Tests |
|---|---------|----------|-------|
| 1 | Login | 200 | access_token saved |
| 2 | Get Me | 200 | user info present |
| 3 | Create Task | 201 | task_id saved, status=queued |
| 4 | List Tasks | 200 | data array |
| 5 | List (Pagination) | 200 | limit=2, nextCursor |
| 6 | Get Task Detail | 200 | matches created task |
| 7 | Unauthorized | 401 | error envelope |
| 8 | Invalid Cursor | 400 | error envelope |

## Usage

### Postman UI

1. Import `aiclipx-api.postman_collection.json`
2. Import `aiclipx-api.postman_environment.json`
3. Set environment variables:
   - `email`: your test email
   - `password`: your test password
4. Run collection (Collection Runner)

### Newman CLI

```bash
# Install newman
npm install -g newman

# Run with inline credentials
newman run aiclipx-api.postman_collection.json \
  -e aiclipx-api.postman_environment.json \
  --env-var "email=YOUR_EMAIL" \
  --env-var "password=YOUR_PASSWORD"

# Run with reporter
newman run aiclipx-api.postman_collection.json \
  -e aiclipx-api.postman_environment.json \
  --env-var "email=YOUR_EMAIL" \
  --env-var "password=YOUR_PASSWORD" \
  --reporters cli,json \
  --reporter-json-export results.json
```

## Environment Variables

| Variable | Description | Auto-set |
|----------|-------------|----------|
| `base_url` | API base URL | No |
| `email` | Test user email | No |
| `password` | Test user password | No |
| `access_token` | JWT token | Yes (from Login) |
| `task_id` | Created task ID | Yes (from Create Task) |

## Switching Environments

Change `base_url` for different environments:

- Production: `https://api.aiclipx.app` (default)
- Staging: `https://aiclipx-iam2.onrender.com`

---

## Licensing Compliance Rules (BE-STG13-003)

AiClipX enforces the following compliance rules at the backend level:

### 1. Final Film Output Only

**Rule:** Only deliver final rendered video output. Do not expose:
- Raw user uploads
- Stock SFX/music files (independent audio)
- Intermediate stems (audio-only tracks)

**Implementation:**
- `deliveryType: "final_film_only"` is set for all completed tasks
- No endpoints return standalone audio URLs
- Raw asset identifiers are internal only

### 2. Signed URL Strategy

**Rule:** Video URLs are time-limited and expire after configurable duration.

**Implementation:**
- `videoUrl` is a signed Supabase Storage URL
- Default expiration: 24 hours (configurable via `SIGNED_URL_EXPIRY_SECONDS`)
- `videoUrlExpiresAt` field indicates when the URL expires

**Response Example:**
```json
{
  "id": "vt_abc123",
  "status": "completed",
  "videoUrl": "https://xxx.supabase.co/storage/v1/object/sign/outputs/videos/...",
  "deliveryType": "final_film_only",
  "videoUrlExpiresAt": "2026-01-22T10:30:00Z"
}
```

### 3. No Public Bucket Access

**Rule:** Direct public bucket paths are never exposed.

**Implementation:**
- All video URLs use signed tokens (`?token=xxx`)
- URLs expire and cannot be shared permanently
- Access requires valid signed token

### 4. Error Handling

All compliance-related errors follow standard envelope:
```json
{
  "code": "ERROR_CODE",
  "message": "User-safe message",
  "requestId": "req_xxx"
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SIGNED_URL_EXPIRY_SECONDS` | `86400` | URL expiration time (24h) |
| `SUPABASE_OUTPUTS_BUCKET` | `outputs` | Storage bucket name |
