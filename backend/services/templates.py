# -*- coding: utf-8 -*-
"""
BE-STG13-014: Template catalog service.

Provides server-side template management with:
- JSON-based storage (loaded at startup)
- In-memory caching with ETag generation
- Multi-language support (regionPack)
- Tag/search filtering
"""

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
DEFAULT_LANG = "en"
SUPPORTED_LANGS = {"en", "ko", "zh"}


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
        self._etag: str = ""
        self._registry_version: int = 0
        self._loaded: bool = False

    def load(self) -> None:
        """Load templates from JSON file into memory."""
        if not TEMPLATES_FILE.exists():
            logger.warning(f"Templates file not found: {TEMPLATES_FILE}")
            self._templates = {}
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

    def _localize_template(self, template: Dict[str, Any], lang: str) -> Dict[str, Any]:
        """
        Apply regionPack localization to template.

        Falls back to default language if requested lang not available.
        """
        result = template.copy()
        region_pack = template.get("regionPack", {})

        # Get localized content, fallback to default lang, then to base
        localized = region_pack.get(lang) or region_pack.get(DEFAULT_LANG) or {}

        # Override name and description with localized versions
        if localized.get("name"):
            result["name"] = localized["name"]
        if localized.get("description"):
            result["description"] = localized["description"]

        return result

    def list_templates(
        self,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        lang: str = DEFAULT_LANG,
        include_disabled: bool = False,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List templates with optional filtering.

        Args:
            tag: Filter by tag (exact match)
            search: Search in name/description (case-insensitive)
            lang: Language code for localization
            include_disabled: Include disabled templates

        Returns:
            Tuple of (templates list, total count)
        """
        self._ensure_loaded()

        # Normalize language
        if lang not in SUPPORTED_LANGS:
            lang = DEFAULT_LANG

        results = []
        for template in self._templates.values():
            # Skip disabled unless explicitly requested
            if not include_disabled and not template.get("enabled", True):
                continue

            # Filter by tag
            if tag and tag not in template.get("tags", []):
                continue

            # Search in name/description
            if search:
                search_lower = search.lower()
                name = template.get("name", "").lower()
                desc = template.get("description", "").lower()

                # Also search in regionPack
                region_pack = template.get("regionPack", {})
                localized = region_pack.get(lang, {})
                loc_name = localized.get("name", "").lower()
                loc_desc = localized.get("description", "").lower()

                if not any([
                    search_lower in name,
                    search_lower in desc,
                    search_lower in loc_name,
                    search_lower in loc_desc,
                ]):
                    continue

            # Localize and add to results
            localized_template = self._localize_template(template, lang)
            results.append(localized_template)

        # Sort by name
        results.sort(key=lambda t: t.get("name", ""))

        return results, len(results)

    def get_template(
        self,
        template_id: str,
        lang: str = DEFAULT_LANG,
    ) -> Dict[str, Any]:
        """
        Get single template by ID.

        Args:
            template_id: Template ID
            lang: Language code for localization

        Returns:
            Template dict with localized content

        Raises:
            TemplateNotFoundError: If template not found
        """
        self._ensure_loaded()

        template = self._templates.get(template_id)
        if not template:
            raise TemplateNotFoundError(f"Template '{template_id}' not found")

        # Normalize language
        if lang not in SUPPORTED_LANGS:
            lang = DEFAULT_LANG

        return self._localize_template(template, lang)

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
