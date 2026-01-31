# BE-STG13-024: Frontend Contract Pack

**Date:** 2026-01-31
**Status:** Agreed - Ready for Implementation

## Problem Statement

FE developers need to integrate without guessing field names or edge cases. Currently:
- No centralized contract documentation
- Error responses documented only in code
- No ready-to-run examples for quick validation

## Agreed Solution

### Structure

```
docs/
└── contracts/
    ├── README.md                    # Overview + field glossary
    ├── templates-api.md             # Templates API contract
    ├── error-responses.md           # All error codes + examples
    └── examples/
        ├── templates-list.json      # List response with nextCursor
        ├── templates-detail.json    # Single template response
        ├── error-not-found.json     # 404
        ├── error-forbidden.json     # 403
        ├── error-validation.json    # 422
        ├── error-bad-request.json   # 400
        ├── error-unauthorized.json  # 401
        ├── error-rate-limited.json  # 429
        ├── error-quota-exceeded.json# 429 (quota variant)
        ├── error-degraded.json      # 503
        └── error-conflict.json      # 409

backend/
└── postman/
    ├── AiClipX-Contract-Pack.postman_collection.json
    └── AiClipX-Staging.postman_environment.json
```

### Error Codes Included

| Code | HTTP | Description |
|------|------|-------------|
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `FORBIDDEN` | 403 | User lacks permission |
| `VALIDATION_ERROR` | 422 | Invalid request payload |
| `BAD_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Missing/invalid auth token |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 429 | Daily/concurrent task limit |
| `SERVICE_UNAVAILABLE` | 503 | Feature degraded/disabled |
| `TEMPLATES_DISABLED` | 503 | Templates feature off |
| `IDEMPOTENCY_KEY_CONFLICT` | 409 | Key reused with different payload |

### Postman Collection Contents

**Templates API:**
1. List templates (locale=en)
2. List templates (locale=ko)
3. List templates (locale=zh)
4. Get template detail
5. Get template - NOT_FOUND (forced error)

**Environment Variables:**
- `baseUrl`: https://aiclipx-iam2.onrender.com
- `token`: (placeholder for JWT)

### Scope

**Phase 1 (This Task):** Templates API only
**Phase 2 (Future):** Extend to Video Tasks API

## Implementation Steps

1. Create `docs/contracts/` directory structure
2. Write `README.md` with field glossary
3. Write `templates-api.md` with full contract
4. Write `error-responses.md` with all codes
5. Create JSON example files from actual staging responses
6. Create Postman collection with 5 requests
7. Create Postman environment template
8. Run collection, capture screenshot
9. Commit and push

## Evidence Package Requirements

Single message containing:
- Link to `docs/contracts/` in repo
- Postman collection file path
- Screenshot: Postman run (all green + one 404 showing requestId)

## Success Criteria

- [ ] FE can read contract docs and understand all fields
- [ ] FE can import Postman collection and run immediately
- [ ] All error codes have documented examples
- [ ] No field naming surprises for FE integration

## Next Steps

After implementation:
1. Share with FE team for review
2. Get confirmation on field names
3. Extend to Video Tasks API if needed
