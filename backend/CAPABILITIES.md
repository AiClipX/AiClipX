# AiClipX Platform Capabilities

> BE-STG13-009: API versioning, capability flags, and safe degradation

## API Version

All API responses include the version header:

```
X-AiClipX-Api-Version: 1
```

**Versioning policy:**
- Major version increments on breaking changes
- Minor/patch changes don't affect version number
- FE should check version and warn if unexpected

## Client Version Tracking

FE can send client version for debugging:

```
X-AiClipX-Client-Version: web-1.2.0
```

This is logged server-side for correlation.

---

## Capabilities Endpoint

**GET /api/capabilities** (Public - no auth required)

### Response Schema

```json
{
  "apiVersion": 1,
  "features": {
    "authRequired": true,
    "engineRunwayEnabled": true,
    "engineMockEnabled": true,
    "signedUrlEnabled": true,
    "cancelEnabled": true
  },
  "limits": {
    "maxActiveTasksPerUser": 3,
    "maxTitleLength": 500,
    "maxPromptLength": 2000
  }
}
```

### Feature Flags

| Flag | Type | Description |
|------|------|-------------|
| `authRequired` | bool | Whether auth is required for protected endpoints |
| `engineRunwayEnabled` | bool | Runway video engine available |
| `engineMockEnabled` | bool | Mock engine available (dev/testing) |
| `signedUrlEnabled` | bool | Video URLs are signed (time-limited) |
| `cancelEnabled` | bool | Task cancellation available |

### Limits

| Limit | Type | Description |
|-------|------|-------------|
| `maxActiveTasksPerUser` | int | Max concurrent queued/processing tasks |
| `maxTitleLength` | int | Max characters for task title |
| `maxPromptLength` | int | Max characters for prompt |

---

## Safe Degradation Rules

### When Runway is Disabled

**Trigger:** `RUNWAY_API_KEY` env var missing or empty

**Behavior:**
- `engineRunwayEnabled` = `false` in capabilities
- `POST /api/video-tasks` with `engine=runway` returns:

```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Runway engine is temporarily unavailable. Please try again later or use mock engine.",
  "requestId": "req_xxx",
  "details": {
    "feature": "engineRunway",
    "suggestion": "Use engine=mock for testing"
  }
}
```

**HTTP Status:** 503

### When Mock is Disabled

**Trigger:** `ENABLE_MOCK_ENGINE=false` env var

**Behavior:**
- `engineMockEnabled` = `false` in capabilities
- FE should hide mock option

---

## Frontend Integration

### Check Capabilities on App Load

```typescript
async function loadCapabilities() {
  const caps = await fetch('/api/capabilities').then(r => r.json());

  // Store in app state
  setCapabilities(caps);

  // Adapt UI
  if (!caps.features.engineRunwayEnabled) {
    hideRunwayEngineOption();
    showBanner("Runway engine temporarily unavailable");
  }

  // Set limits
  setMaxTasks(caps.limits.maxActiveTasksPerUser);
}
```

### Handle 503 Gracefully

```typescript
async function createTask(data: TaskInput) {
  try {
    const res = await api.post('/video-tasks', data);
    return res.data;
  } catch (error) {
    if (error.response?.data?.code === 'SERVICE_UNAVAILABLE') {
      const { message, details } = error.response.data;

      // Show user-friendly message
      showToast(message);

      // Offer alternative if available
      if (details?.suggestion) {
        showSuggestion(details.suggestion);
      }

      // Refresh capabilities (feature may have been disabled)
      await loadCapabilities();
    }
    throw error;
  }
}
```

### Version Mismatch Warning

```typescript
const expectedApiVersion = 1;

async function checkApiVersion() {
  const res = await fetch('/api/capabilities');
  const version = res.headers.get('X-AiClipX-Api-Version');

  if (version && parseInt(version) > expectedApiVersion) {
    showBanner("A new API version is available. Please refresh the page.");
  }
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RUNWAY_API_KEY` | (required) | Runway API key. If missing, runway disabled |
| `ENABLE_MOCK_ENGINE` | `true` | Enable mock engine for testing |

---

## Deployment Scenarios

### Production (Full Features)

```env
RUNWAY_API_KEY=key_xxx
ENABLE_MOCK_ENGINE=false
```

Capabilities:
- `engineRunwayEnabled`: true
- `engineMockEnabled`: false

### Staging (All Features)

```env
RUNWAY_API_KEY=key_xxx
ENABLE_MOCK_ENGINE=true
```

Capabilities:
- `engineRunwayEnabled`: true
- `engineMockEnabled`: true

### Development (Mock Only)

```env
# RUNWAY_API_KEY not set
ENABLE_MOCK_ENGINE=true
```

Capabilities:
- `engineRunwayEnabled`: false
- `engineMockEnabled`: true

### Emergency Degradation

If Runway has outage, remove API key:

```env
RUNWAY_API_KEY=
```

Result: All runway requests get 503 with clear message.
