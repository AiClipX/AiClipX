# -*- coding: utf-8 -*-
"""
BE-STG13-014 + BE-STG13-022: Template catalog service.

Provides server-side template management with:
- JSON-based storage (loaded at startup)
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
    ETag is generated from content hash for HTTP caching.
    """

    def __init__(self):
        self._templates: Dict[str, Dict[str, Any]] = {}
        self._template_order: List[str] = []  # For stable pagination
        self._etag: str = ""
        self._registry_version: int = 0
        self._loaded: bool = False

    def load(self) -> None:
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

            logger.info(
                f"Loaded {len(self._templates)} templates "
                f"(registry v{self._registry_version}, etag={self._etag[:8]}...)"
            )

        except Exception as e:
            logger.error(f"Failed to load templates: {e}")
            self._templates = {}
            self._template_order = []
            self._etag = self._generate_etag("{}")
            self._loaded = True

    def _generate_etag(self, content: str) -> str:
        """Generate ETag from content hash."""
        return hashlib.md5(content.encode()).hexdigest()[:16]

    def _ensure_loaded(self) -> None:
        """Ensure templates are loaded."""
        if not self._loaded:
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
        """Check if template exists."""
        self._ensure_loaded()
        return template_id in self._templates


# Singleton instance
template_service = TemplateService()


def init_templates() -> None:
    """Initialize template service (call at startup)."""
    template_service.load()
