# Templates API Contract

Public endpoints for template catalog. No authentication required.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | List templates with filtering |
| GET | `/api/templates/{id}` | Get single template |

---

## GET /api/templates

List templates with optional filtering and pagination.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `locale` | string | `en` | Language code: `en`, `ko`, `zh` |
| `tag` | string | - | Filter by tag (e.g., `viral`, `product`) |
| `q` | string | - | Search in name/description |
| `limit` | int | 20 | Results per page (1-100) |
| `cursor` | string | - | Pagination cursor from `nextCursor` |

### Response (200 OK)

```json
{
  "data": [
    {
      "id": "product-showcase",
      "version": 1,
      "name": "Product Showcase",
      "description": "Highlight product features with dynamic visuals",
      "tags": ["product", "showcase", "commercial"],
      "enabled": true,
      "recommendedUseCase": "E-commerce listings, product launches",
      "defaults": {
        "title": "Product Showcase",
        "prompt": "Create a product showcase video for {product}...",
        "params": {
          "duration": 15,
          "style": "professional"
        }
      },
      "regionPack": {
        "en": { "name": "Product Showcase", "description": "..." },
        "ko": { "name": "제품 쇼케이스", "description": "..." },
        "zh": { "name": "产品展示", "description": "..." }
      }
    }
  ],
  "nextCursor": "aWR4OjI="
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of template objects |
| `nextCursor` | string\|null | Cursor for next page, `null` if last page |

### Template Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique template ID |
| `version` | int | Template version number |
| `name` | string | Localized display name |
| `description` | string | Localized description |
| `tags` | string[] | Categorization tags |
| `enabled` | bool | Whether template is active |
| `recommendedUseCase` | string | Suggested use cases |
| `defaults` | object | Default values for task creation |
| `defaults.title` | string | Suggested title |
| `defaults.prompt` | string | Prompt template with `{placeholders}` |
| `defaults.params` | object | Default generation parameters |
| `regionPack` | object | Localized strings by locale code |

### Errors

| Code | HTTP | When |
|------|------|------|
| - | 200 | Returns empty `data: []` if templates disabled (degradation) |

---

## GET /api/templates/{id}

Get a single template by ID.

### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Template ID (e.g., `product-showcase`) |

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `locale` | string | `en` | Language code for localized fields |

### Response (200 OK)

```json
{
  "id": "product-showcase",
  "version": 1,
  "name": "Product Showcase",
  "description": "Highlight product features with dynamic visuals",
  "tags": ["product", "showcase", "commercial"],
  "enabled": true,
  "recommendedUseCase": "E-commerce listings, product launches",
  "defaults": {
    "title": "Product Showcase",
    "prompt": "Create a product showcase video for {product}...",
    "params": {
      "duration": 15,
      "style": "professional"
    }
  },
  "regionPack": {
    "en": { "name": "Product Showcase", "description": "..." },
    "ko": { "name": "제품 쇼케이스", "description": "..." },
    "zh": { "name": "产品展示", "description": "..." }
  }
}
```

### Errors

| Code | HTTP | When |
|------|------|------|
| `TEMPLATE_NOT_FOUND` | 404 | Template ID doesn't exist |
| `TEMPLATES_DISABLED` | 503 | Templates feature is disabled |

### Error Response Example

```json
{
  "code": "TEMPLATE_NOT_FOUND",
  "message": "Template 'nonexistent' not found",
  "requestId": "req_abc12345",
  "details": {}
}
```

---

## Caching

Templates API supports HTTP caching:

| Header | Value | Description |
|--------|-------|-------------|
| `ETag` | `"{hash}"` | Template data hash |
| `Cache-Control` | `public, max-age=3600` | 1 hour cache |

Send `If-None-Match: "{etag}"` to get 304 Not Modified if unchanged.

---

## Feature Flag

Templates can be disabled via `TEMPLATES_ENABLED=false` environment variable.

When disabled:
- List returns `{ data: [], nextCursor: null }` (200)
- Detail returns `TEMPLATES_DISABLED` (503)
