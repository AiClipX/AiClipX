# AiClipX API Contract Pack

Frontend integration guide with exact field names, response shapes, and ready-to-run examples.

## Quick Start

1. Import Postman collection from `backend/postman/`
2. Set environment variables (baseUrl, token)
3. Run collection to verify integration

## API Base URLs

| Environment | URL |
|-------------|-----|
| Staging | `https://aiclipx-iam2.onrender.com` |
| Production | `https://api.aiclipx.app` |

## Common Headers

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | `Bearer {jwt_token}` (*except public endpoints) |
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | No | Prevents duplicate task creation |
| `X-Request-Id` | No | Client correlation ID (server generates if missing) |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Correlation ID for debugging |
| `X-AiClipX-Api-Version` | Current API version |
| `X-Registry-Version` | Template registry version (templates API only) |

## Field Glossary

### Common Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `vt_8bf12c0c`, `product-showcase`) |
| `createdAt` | ISO8601 | Creation timestamp |
| `updatedAt` | ISO8601 | Last update timestamp |

### Pagination

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of items |
| `nextCursor` | string\|null | Opaque cursor for next page, `null` if no more pages |

### Error Response

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code (e.g., `NOT_FOUND`) |
| `message` | string | Human-readable message |
| `requestId` | string | Correlation ID for support |
| `details` | object | Additional context (optional) |

## Available Contracts

- [Templates API](./templates-api.md) - Template catalog endpoints
- [Error Responses](./error-responses.md) - All error codes and examples

## Examples

See `examples/` directory for JSON response samples:

- `templates-list.json` - List with pagination
- `templates-detail.json` - Single template
- `error-*.json` - Various error responses

## Postman Collection

Location: `backend/postman/`

Files:
- `AiClipX-Contract-Pack.postman_collection.json` - API requests
- `AiClipX-Staging.postman_environment.json` - Environment template

### Setup

1. Import both files into Postman
2. Select "AiClipX Staging" environment
3. Set `token` variable if testing authenticated endpoints
4. Run collection
