# -*- coding: utf-8 -*-
"""
BE-STG13-014 + BE-STG13-022 + BE-STG13-023: Template catalog service.

Provides server-side template management with:
- JSON-based storage (loaded at startup) as source of truth
- DB override table for runtime toggles (BE-STG13-023)
- In-memory caching with ETag generation
- Multi-language support (regionPack)
- Tag/search filtering
- Pagination (cursor-based)
"""

import base64
import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Path to templates data file
TEMPLATES_FILE = Path(__file__).parent.parent / "data" / "templates.json"

# Default language fallback
DEFAULT_LOCALE = "en"
SUPPORTED_LOCALES = {"en", "ko", "zh"}

# Pagination defaults
DEFAULT_LIMIT = 20
MAX_LIMIT = 100


class TemplateNotFoundError(Exception):
    """Raised when template is not found."""
    pass


class TemplateService:
    """
    Template catalog service with in-memory caching.

    Templates are loaded from JSON file at startup and cached.
    DB overrides are applied for runtime toggle capability.
    ETag is generated from content hash for HTTP caching.
    """

    def __init__(self):
        self._templates: Dict[str, Dict[str, Any]] = {}
        self._template_order: List[str] = []  # For stable pagination
        self._etag: str = ""
        self._registry_version: int = 0
        self._loaded: bool = False
        self._overrides_applied: bool = False

    def load(self) -> None:
        """Load templates from JSON file + apply DB overrides."""
        self._load_from_json()
        self._apply_overrides()

        logger.info(
            f"Templates loaded: {len(self._templates)} templates, "
            f"registry v{self._registry_version}"
        )

    def _load_from_json(self) -> None:
        """Load templates from JSON file into memory."""
        if not TEMPLATES_FILE.exists():
            logger.warning(f"Templates file not found: {TEMPLATES_FILE}")
            self._templates = {}
            self._template_order = []
            self._etag = self._generate_etag("{}")
            self._loaded = True
            return

        try:
            content = TEMPLATES_FILE.read_text(encoding="utf-8")
            data = json.loads(content)

            self._registry_version = data.get("version", 1)
            templates_list = data.get("templates", [])

            # Index by ID for fast lookup
            self._templates = {t["id"]: t for t in templates_list}

            # Maintain stable order for pagination (sorted by name)
            sorted_templates = sorted(templates_list, key=lambda t: t.get("name", ""))
            self._template_order = [t["id"] for t in sorted_templates]

            # Generate ETag from content hash
            self._etag = self._generate_etag(content)
            self._loaded = True

        except Exception as e:
            logger.error(f"Failed to load templates from JSON: {e}")
            self._templates = {}
            self._template_order = []
            self._etag = self._generate_etag("{}")
            self._loaded = True

    def _load_overrides_from_db(self) -> Dict[str, dict]:
        """
        BE-STG13-023: Load overrides from DB.

        Returns dict of {template_id: {enabled, updated_at, updated_by}}
        """
        try:
            from services.supabase_client import get_service_client
            client = get_service_client()

            response = client.table("template_overrides").select("*").execute()
            overrides = {row["template_id"]: row for row in (response.data or [])}

            if overrides:
                logger.debug(f"Loaded {len(overrides)} template overrides from DB")

            return overrides

        except Exception as e:
            # Table might not exist yet, or DB error - just log and continue
            logger.debug(f"Template overrides not available: {e}")
            return {}

    def _apply_overrides(self) -> None:
        """
        BE-STG13-023: Apply DB overrides to loaded templates.

        Only 'enabled' field is overridden for now.
        """
        overrides = self._load_overrides_from_db()

        for template_id, override in overrides.items():
            if template_id in self._templates:
                original_enabled = self._templates[template_id].get("enabled", True)
                new_enabled = override.get("enabled", True)

                if original_enabled != new_enabled:
                    self._templates[template_id]["enabled"] = new_enabled
                    logger.info(
                        f"Template override applied: {template_id} "
                        f"enabled={new_enabled} (was {original_enabled})"
                    )

        self._overrides_applied = True

    def _generate_etag(self, content: str) -> str:
        """Generate ETag from content hash."""
        return hashlib.md5(content.encode()).hexdigest()[:16]

    def _ensure_loaded(self) -> None:
        """Ensure templates are loaded."""
        if not self._loaded:
            self.load()

    def reload(self) -> None:
        """
        BE-STG13-023: Force reload templates from source + DB overrides.

        Called after admin toggle or for ops reload.
        """
        self._loaded = False
        self._overrides_applied = False
        self.load()

    @property
    def etag(self) -> str:
        """Get current ETag for caching."""
        self._ensure_loaded()
        return self._etag

    @property
    def registry_version(self) -> int:
        """Get registry version."""
        self._ensure_loaded()
        return self._registry_version

    def _encode_cursor(self, index: int) -> str:
        """Encode pagination cursor."""
        return base64.urlsafe_b64encode(f"idx:{index}".encode()).decode()

    def _decode_cursor(self, cursor: str) -> Optional[int]:
        """Decode pagination cursor. Returns None if invalid."""
        try:
            decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
            if decoded.startswith("idx:"):
                return int(decoded[4:])
        except Exception:
            pass
        return None

    def _localize_template(self, template: Dict[str, Any], locale: str) -> Dict[str, Any]:
        """
        Apply regionPack localization to template.

        Falls back to default locale if requested locale not available.
        """
        result = template.copy()
        region_pack = template.get("regionPack", {})

        # Get localized content, fallback to default locale, then to base
        localized = region_pack.get(locale) or region_pack.get(DEFAULT_LOCALE) or {}

        # Override name and description with localized versions
        if localized.get("name"):
            result["name"] = localized["name"]
        if localized.get("description"):
            result["description"] = localized["description"]

        return result

    def list_templates(
        self,
        tag: Optional[str] = None,
        q: Optional[str] = None,
        locale: str = DEFAULT_LOCALE,
        limit: int = DEFAULT_LIMIT,
        cursor: Optional[str] = None,
        include_disabled: bool = False,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        List templates with optional filtering and pagination.

        Args:
            tag: Filter by tag (exact match)
            q: Search in name/description (case-insensitive)
            locale: Language code for localization
            limit: Max items to return (1-100)
            cursor: Pagination cursor from previous response
            include_disabled: Include disabled templates

        Returns:
            Tuple of (templates list, nextCursor or None)
        """
        self._ensure_loaded()

        # Normalize locale
        if locale not in SUPPORTED_LOCALES:
            locale = DEFAULT_LOCALE

        # Clamp limit
        limit = max(1, min(limit, MAX_LIMIT))

        # Filter templates
        filtered_ids = []
        for template_id in self._template_order:
            template = self._templates.get(template_id)
            if not template:
                continue

            # Skip disabled unless explicitly requested
            if not include_disabled and not template.get("enabled", True):
                continue

            # Filter by tag
            if tag and tag not in template.get("tags", []):
                continue

            # Search in name/description
            if q:
                q_lower = q.lower()
                name = template.get("name", "").lower()
                desc = template.get("description", "").lower()

                # Also search in regionPack
                region_pack = template.get("regionPack", {})
                localized = region_pack.get(locale, {})
                loc_name = localized.get("name", "").lower()
                loc_desc = localized.get("description", "").lower()

                if not any([
                    q_lower in name,
                    q_lower in desc,
                    q_lower in loc_name,
                    q_lower in loc_desc,
                ]):
                    continue

            filtered_ids.append(template_id)

        # Apply cursor (skip to index)
        start_index = 0
        if cursor:
            decoded_index = self._decode_cursor(cursor)
            if decoded_index is not None:
                start_index = decoded_index

        # Slice for pagination
        end_index = start_index + limit
        page_ids = filtered_ids[start_index:end_index]

        # Build result
        results = []
        for template_id in page_ids:
            template = self._templates.get(template_id)
            if template:
                localized_template = self._localize_template(template, locale)
                results.append(localized_template)

        # Generate nextCursor if there are more results
        next_cursor = None
        if end_index < len(filtered_ids):
            next_cursor = self._encode_cursor(end_index)

        return results, next_cursor

    def get_template(
        self,
        template_id: str,
        locale: str = DEFAULT_LOCALE,
    ) -> Dict[str, Any]:
        """
        Get single template by ID.

        Args:
            template_id: Template ID
            locale: Language code for localization

        Returns:
            Template dict with localized content

        Raises:
            TemplateNotFoundError: If template not found
        """
        self._ensure_loaded()

        template = self._templates.get(template_id)
        if not template:
            raise TemplateNotFoundError(f"Template '{template_id}' not found")

        # Normalize locale
        if locale not in SUPPORTED_LOCALES:
            locale = DEFAULT_LOCALE

        return self._localize_template(template, locale)

    def get_template_ids(self) -> List[str]:
        """Get list of all template IDs."""
        self._ensure_loaded()
        return list(self._templates.keys())

    def template_exists(self, template_id: str) -> bool:
        """Check if template exists (in JSON source)."""
        self._ensure_loaded()
        return template_id in self._templates

    def is_template_enabled(self, template_id: str) -> bool:
        """Check if template is currently enabled."""
        self._ensure_loaded()
        template = self._templates.get(template_id)
        if not template:
            return False
        return template.get("enabled", True)

    def set_enabled(
        self,
        template_id: str,
        enabled: bool,
        updated_by: str = "admin",
    ) -> bool:
        """
        BE-STG13-023: Toggle template enabled status via DB override.

        Args:
            template_id: Template ID to toggle
            enabled: New enabled state
            updated_by: Identifier of who made the change

        Returns:
            True if successful, False if template not found
        """
        if not self.template_exists(template_id):
            return False

        try:
            from services.supabase_client import get_service_client
            client = get_service_client()

            # Upsert override
            client.table("template_overrides").upsert({
                "template_id": template_id,
                "enabled": enabled,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": updated_by,
            }).execute()

            logger.info(
                f"Template override saved: {template_id} enabled={enabled} "
                f"by={updated_by}"
            )

            # Reload to apply changes
            self.reload()
            return True

        except Exception as e:
            logger.error(f"Failed to save template override: {e}")
            return False

    def get_override_info(self, template_id: str) -> Optional[Dict[str, Any]]:
        """
        BE-STG13-023: Get override info for a template.

        Returns None if no override exists.
        """
        try:
            from services.supabase_client import get_service_client
            client = get_service_client()

            response = (
                client.table("template_overrides")
                .select("*")
                .eq("template_id", template_id)
                .execute()
            )

            if response.data:
                return response.data[0]
            return None

        except Exception as e:
            logger.debug(f"Failed to get override info: {e}")
            return None


# Singleton instance
template_service = TemplateService()


def init_templates() -> None:
    """Initialize template service (call at startup)."""
    template_service.load()
