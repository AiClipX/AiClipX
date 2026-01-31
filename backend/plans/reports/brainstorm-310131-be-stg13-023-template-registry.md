# BE-STG13-023 Brainstorm: Template Registry Management

**Date:** 2026-01-31
**Status:** Agreed - Ready to implement

---

## Problem Statement

Templates need to be managed as a versioned, auditable, and stable dataset with runtime toggle capability without requiring redeployment.

---

## Agreed Solution: Option C (Hybrid)

**JSON as source of truth + DB override table for runtime toggles**

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Request                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              TemplateService (in-memory)                │
│  ┌─────────────────────────────────────────────────────┐│
│  │  1. Load from templates.json (git-versioned)        ││
│  │  2. Apply overrides from template_overrides (DB)    ││
│  │  3. Serve filtered/localized templates              ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────┐      ┌─────────────────────┐
│ templates.json  │      │  template_overrides │
│ (git, readonly) │      │  (DB, runtime)      │
└─────────────────┘      └─────────────────────┘
```

---

## Implementation Details

### 1. Database Migration

```sql
-- BE-STG13-023: Template overrides for runtime toggle
CREATE TABLE template_overrides (
    template_id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT  -- admin identifier or "system"
);

-- Index for quick lookup
CREATE INDEX idx_template_overrides_updated_at ON template_overrides(updated_at DESC);
```

### 2. TemplateService Updates

```python
# services/templates.py

class TemplateService:
    def load(self) -> None:
        """Load templates from JSON + apply DB overrides."""
        self._load_from_json()
        self._apply_overrides()
        logger.info(
            f"Templates loaded: {len(self._templates)} templates, "
            f"registry v{self._registry_version}"
        )

    def _load_overrides(self) -> Dict[str, dict]:
        """Load overrides from DB."""
        try:
            client = get_service_client()
            response = client.table("template_overrides").select("*").execute()
            return {row["template_id"]: row for row in (response.data or [])}
        except Exception as e:
            logger.warning(f"Failed to load template overrides: {e}")
            return {}

    def _apply_overrides(self) -> None:
        """Apply DB overrides to loaded templates."""
        overrides = self._load_overrides()
        for template_id, override in overrides.items():
            if template_id in self._templates:
                self._templates[template_id]["enabled"] = override["enabled"]
                logger.debug(f"Override applied: {template_id} enabled={override['enabled']}")

    def reload(self) -> None:
        """Force reload templates (for admin use)."""
        self._loaded = False
        self.load()

    def set_enabled(self, template_id: str, enabled: bool, updated_by: str) -> bool:
        """Toggle template enabled status via DB override."""
        if template_id not in self._templates:
            return False

        client = get_service_client()
        client.table("template_overrides").upsert({
            "template_id": template_id,
            "enabled": enabled,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": updated_by,
        }).execute()

        # Invalidate cache
        self.reload()
        return True
```

### 3. Admin Endpoints

```python
# routers/admin.py (add to existing)

@router.post("/templates/{template_id}/toggle")
async def toggle_template(
    request: Request,
    template_id: str,
    enabled: bool = Query(..., description="Enable or disable template"),
):
    """
    Toggle template enabled status.

    Requires X-Admin-Secret header.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    if not template_service.template_exists(template_id):
        return error_response(
            status_code=404,
            code="TEMPLATE_NOT_FOUND",
            message=f"Template '{template_id}' not found",
            request_id=request_id,
        )

    success = template_service.set_enabled(
        template_id=template_id,
        enabled=enabled,
        updated_by="admin",  # or extract from header/token
    )

    logger.info(f"[{request_id}] Template {template_id} toggled: enabled={enabled}")

    return {
        "templateId": template_id,
        "enabled": enabled,
        "message": f"Template {'enabled' if enabled else 'disabled'} successfully",
    }


@router.post("/templates/reload")
async def reload_templates(request: Request):
    """
    Force reload templates from source.

    Requires X-Admin-Secret header.
    """
    request_id = getattr(request.state, "request_id", "unknown")

    template_service.reload()

    logger.info(f"[{request_id}] Templates reloaded by admin")

    return {
        "message": "Templates reloaded",
        "count": len(template_service.get_template_ids()),
        "registryVersion": template_service.registry_version,
    }
```

### 4. API Response Updates

Add `registryVersion` to list response header:

```python
# routers/templates.py

@router.get("")
async def list_templates(...):
    # ... existing code ...

    # Add registry version header
    response.headers["X-Registry-Version"] = str(template_service.registry_version)

    return {"data": templates, "nextCursor": next_cursor}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `services/templates.py` | Add `_load_overrides()`, `_apply_overrides()`, `reload()`, `set_enabled()` |
| `routers/admin.py` | Add `/templates/{id}/toggle`, `/templates/reload` |
| `routers/templates.py` | Add `X-Registry-Version` header |
| **NEW** migration | Create `template_overrides` table |

---

## Decisions Summary

| Decision | Choice |
|----------|--------|
| Source of truth | `templates.json` (git-versioned) |
| Runtime toggle | DB `template_overrides` table |
| Admin auth | `X-Admin-Secret` header (existing pattern) |
| Audit fields | `updated_at`, `updated_by` (string) |
| Cache strategy | No TTL; invalidate on admin action |
| Override scope | Only `enabled` field (minimal) |

---

## Acceptance Criteria

| Criteria | Implementation |
|----------|----------------|
| Stable version fields | `version` per template + `registryVersion` global + `X-Registry-Version` header |
| Disable without breaking FE | `POST /admin/templates/{id}/toggle?enabled=false` |
| No schema drift | Same `TemplateResponse` model for list/detail |

---

## Evidence Package Requirements

1. **Data source screenshot:**
   - `templates.json` showing `version` + `enabled`
   - `template_overrides` table (can be empty initially)

2. **Postman screenshots:**
   - `GET /api/templates` → shows 5 templates
   - `POST /admin/templates/viral-hook/toggle?enabled=false`
   - `GET /api/templates` → shows 4 templates (viral-hook gone)

3. **Log snippet:**
   ```
   Templates loaded: 5 templates, registry v1
   [req_xxx] Template viral-hook toggled: enabled=false
   Templates loaded: 5 templates, registry v1
   ```

---

## Next Steps

1. Create Supabase migration for `template_overrides` table
2. Update `services/templates.py` with override logic
3. Add admin endpoints to `routers/admin.py`
4. Add `X-Registry-Version` header to templates router
5. Test toggle flow end-to-end
6. Collect evidence package

