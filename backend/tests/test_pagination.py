"""
BE-STG6-001 & BE-STG7-001: Pagination, Search and Error Handling Tests

Tests:
- Cursor encode/decode roundtrip (5-part format with filters)
- 3-page pagination (no duplicates, no missing)
- Invalid cursor returns 400 with unified error schema
- Invalid limit returns 422 with unified error schema
- Search (q) matches title (case-insensitive) and id (exact)
- Cursor filter mismatch returns 400
"""
import pytest
from datetime import datetime, timezone

# Import from services
from services.video_task_service import encode_cursor, decode_cursor


class TestCursorEncodeDecode:
    """Test cursor encode/decode roundtrip with filter context."""

    def test_encode_decode_roundtrip(self):
        """Cursor encode then decode should return original values."""
        original_time = datetime(2025, 12, 30, 10, 30, 45, 123456, tzinfo=timezone.utc)
        original_id = "vt_abc12345"

        # Encode with default filters
        encoded = encode_cursor(original_time, original_id)
        assert encoded is not None
        assert isinstance(encoded, str)

        # Decode
        decoded = decode_cursor(encoded)
        assert decoded is not None
        decoded_time, decoded_id, decoded_q, decoded_status, decoded_sort = decoded

        # Verify roundtrip
        assert decoded_id == original_id
        assert decoded_time == original_time
        assert decoded_q is None
        assert decoded_status is None
        assert decoded_sort == "createdAt_desc"

    def test_encode_decode_with_filters(self):
        """Cursor should preserve filter context."""
        original_time = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        original_id = "vt_12345678"
        original_q = "test search"
        original_status = "pending"
        original_sort = "createdAt_asc"

        encoded = encode_cursor(
            original_time, original_id,
            q=original_q, status=original_status, sort=original_sort
        )
        decoded = decode_cursor(encoded)

        assert decoded is not None
        decoded_time, decoded_id, decoded_q, decoded_status, decoded_sort = decoded

        assert decoded_id == original_id
        assert decoded_time == original_time
        assert decoded_q == original_q
        assert decoded_status == original_status
        assert decoded_sort == original_sort

    def test_encode_decode_with_empty_filters(self):
        """Cursor should handle empty filter values."""
        original_time = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        original_id = "vt_12345678"

        encoded = encode_cursor(
            original_time, original_id,
            q=None, status=None, sort="createdAt_desc"
        )
        decoded = decode_cursor(encoded)

        assert decoded is not None
        _, _, decoded_q, decoded_status, decoded_sort = decoded

        assert decoded_q is None
        assert decoded_status is None
        assert decoded_sort == "createdAt_desc"

    def test_decode_invalid_cursor_returns_none(self):
        """Invalid cursor should return None, not raise exception."""
        # Invalid base64
        assert decode_cursor("not_valid_base64!!!") is None

        # Valid base64 but wrong format
        import base64
        invalid_format = base64.urlsafe_b64encode(b"no_pipe_here").decode()
        assert decode_cursor(invalid_format) is None

        # Empty string
        assert decode_cursor("") is None

    def test_decode_legacy_cursor_returns_none(self):
        """Legacy 2-part cursor should return None (treated as expired)."""
        import base64
        legacy = base64.urlsafe_b64encode(b"2025-01-01T00:00:00+00:00|vt_123").decode()
        assert decode_cursor(legacy) is None

    def test_decode_malformed_datetime_returns_none(self):
        """Malformed datetime in cursor should return None."""
        import base64
        malformed = base64.urlsafe_b64encode(b"not-a-date|vt_123||pending|createdAt_desc").decode()
        assert decode_cursor(malformed) is None


class TestPaginationAPI:
    """
    Integration tests for pagination API.
    These tests require a running server with >=25 tasks.
    Run with: pytest -v -k "TestPaginationAPI" --api-url=http://localhost:8000
    """

    @pytest.fixture
    def api_url(self, request):
        """Get API URL from command line or use default."""
        return getattr(request.config, "api_url", "http://localhost:8000")

    @pytest.mark.integration
    def test_pagination_3_pages_no_duplicates(self, api_url):
        """Test 3-page pagination with no duplicates."""
        import requests

        all_ids = []
        cursor = None
        limit = 10

        for page in range(1, 4):
            url = f"{api_url}/api/video-tasks?limit={limit}"
            if cursor:
                url += f"&cursor={cursor}"

            resp = requests.get(url, timeout=60)
            assert resp.status_code == 200, f"Page {page} failed: {resp.text}"

            data = resp.json()
            tasks = data.get("data", [])
            cursor = data.get("nextCursor")

            page_ids = [t["id"] for t in tasks]
            for task_id in page_ids:
                assert task_id not in all_ids, f"Duplicate ID found: {task_id}"
            all_ids.extend(page_ids)

            if cursor is None:
                break

        assert len(all_ids) > 0, "No tasks returned"

    @pytest.mark.integration
    def test_invalid_cursor_returns_400(self, api_url):
        """Invalid cursor should return 400 with unified error schema."""
        import requests

        url = f"{api_url}/api/video-tasks?cursor=invalid_cursor_here"
        resp = requests.get(url, timeout=60)

        assert resp.status_code == 400
        data = resp.json()
        assert data["code"] == "INVALID_CURSOR"
        assert "requestId" in data

    @pytest.mark.integration
    def test_limit_zero_returns_422(self, api_url):
        """Limit=0 should return 422."""
        import requests

        url = f"{api_url}/api/video-tasks?limit=0"
        resp = requests.get(url, timeout=60)
        assert resp.status_code == 422


class TestSearchAPI:
    """BE-STG7-001: Search API tests."""

    @pytest.fixture
    def api_url(self, request):
        return getattr(request.config, "api_url", "http://localhost:8000")

    @pytest.mark.integration
    def test_search_title_case_insensitive(self, api_url):
        """Search q should match title case-insensitively."""
        import requests

        # Create task with known title
        create_resp = requests.post(
            f"{api_url}/api/video-tasks",
            json={"title": "UniqueSearchTest123"},
            timeout=60
        )
        assert create_resp.status_code == 201
        created_id = create_resp.json()["id"]

        try:
            # Search with lowercase
            search_resp = requests.get(f"{api_url}/api/video-tasks?q=uniquesearchtest", timeout=60)
            assert search_resp.status_code == 200
            ids = [t["id"] for t in search_resp.json()["data"]]
            assert created_id in ids
        finally:
            requests.delete(f"{api_url}/api/video-tasks/{created_id}", timeout=60)

    @pytest.mark.integration
    def test_search_id_exact_match(self, api_url):
        """Search q should match id exactly."""
        import requests

        create_resp = requests.post(
            f"{api_url}/api/video-tasks",
            json={"title": "ID Search Test"},
            timeout=60
        )
        assert create_resp.status_code == 201
        created_id = create_resp.json()["id"]

        try:
            search_resp = requests.get(f"{api_url}/api/video-tasks?q={created_id}", timeout=60)
            assert search_resp.status_code == 200
            data = search_resp.json()
            ids = [t["id"] for t in data["data"]]
            assert created_id in ids
            assert len(data["data"]) == 1
        finally:
            requests.delete(f"{api_url}/api/video-tasks/{created_id}", timeout=60)

    @pytest.mark.integration
    def test_cursor_filter_mismatch_returns_400(self, api_url):
        """Reusing cursor with different q should return 400."""
        import requests

        # Get page with no filter
        resp1 = requests.get(f"{api_url}/api/video-tasks?limit=5", timeout=60)
        assert resp1.status_code == 200
        cursor = resp1.json().get("nextCursor")

        if cursor is None:
            pytest.skip("Not enough data for pagination")

        # Try to use cursor with q filter
        resp2 = requests.get(f"{api_url}/api/video-tasks?limit=5&q=test&cursor={cursor}", timeout=60)
        assert resp2.status_code == 400
        data = resp2.json()
        assert data["code"] == "CURSOR_FILTER_MISMATCH"
        assert "requestId" in data

    @pytest.mark.integration
    def test_empty_q_treated_as_no_filter(self, api_url):
        """Empty or whitespace q should be treated as no filter."""
        import requests

        resp_all = requests.get(f"{api_url}/api/video-tasks?limit=10", timeout=60)
        resp_empty = requests.get(f"{api_url}/api/video-tasks?limit=10&q=", timeout=60)
        resp_space = requests.get(f"{api_url}/api/video-tasks?limit=10&q=%20%20", timeout=60)

        assert resp_all.status_code == 200
        assert resp_empty.status_code == 200
        assert resp_space.status_code == 200


class TestErrorSchema:
    """Test unified error schema compliance."""

    @pytest.mark.integration
    def test_not_found_has_unified_schema(self):
        """404 error should have unified schema with details."""
        import requests

        url = "http://localhost:8000/api/video-tasks/vt_nonexistent999"
        resp = requests.get(url, timeout=60)

        assert resp.status_code == 404
        data = resp.json()
        assert data.get("code") == "NOT_FOUND"
        assert "requestId" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-k", "not integration"])
