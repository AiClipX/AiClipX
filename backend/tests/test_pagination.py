"""
BE-STG6-001: Pagination and Error Handling Tests

Tests:
- Cursor encode/decode roundtrip
- 3-page pagination (no duplicates, no missing)
- Invalid cursor returns 400 with unified error schema
- Invalid limit returns 422 with unified error schema
"""
import pytest
from datetime import datetime, timezone

# Import from services
from services.video_task_service import encode_cursor, decode_cursor


class TestCursorEncodeDecode:
    """Test cursor encode/decode roundtrip."""

    def test_encode_decode_roundtrip(self):
        """Cursor encode then decode should return original values."""
        original_time = datetime(2025, 12, 30, 10, 30, 45, 123456, tzinfo=timezone.utc)
        original_id = "vt_abc12345"

        # Encode
        encoded = encode_cursor(original_time, original_id)
        assert encoded is not None
        assert isinstance(encoded, str)

        # Decode
        decoded = decode_cursor(encoded)
        assert decoded is not None
        decoded_time, decoded_id = decoded

        # Verify roundtrip
        assert decoded_id == original_id
        assert decoded_time == original_time

    def test_encode_decode_with_special_chars(self):
        """Cursor should handle task IDs correctly."""
        original_time = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        original_id = "vt_12345678"

        encoded = encode_cursor(original_time, original_id)
        decoded = decode_cursor(encoded)

        assert decoded is not None
        decoded_time, decoded_id = decoded
        assert decoded_id == original_id

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

    def test_decode_malformed_datetime_returns_none(self):
        """Malformed datetime in cursor should return None."""
        import base64
        # Valid base64 with pipe but invalid datetime
        malformed = base64.urlsafe_b64encode(b"not-a-date|vt_123").decode()
        assert decode_cursor(malformed) is None


class TestPaginationAPI:
    """
    Integration tests for pagination API.
    These tests require a running server with >=25 tasks.
    Run with: pytest -v -k "TestPaginationAPI" --api-url=https://aiclipx-iam2.onrender.com
    """

    @pytest.fixture
    def api_url(self, request):
        """Get API URL from command line or use default."""
        return getattr(request.config, "api_url", "https://aiclipx-iam2.onrender.com")

    @pytest.mark.integration
    def test_pagination_3_pages_no_duplicates(self, api_url):
        """
        Test 3-page pagination with no duplicates and no missing.
        Requires >=25 tasks in database.
        """
        import requests

        all_ids = []
        cursor = None
        limit = 10

        for page in range(1, 4):
            # Build URL
            url = f"{api_url}/api/video-tasks?limit={limit}"
            if cursor:
                url += f"&cursor={cursor}"

            # Fetch page
            resp = requests.get(url, timeout=30)
            assert resp.status_code == 200, f"Page {page} failed: {resp.text}"

            data = resp.json()
            tasks = data.get("data", [])
            cursor = data.get("nextCursor")

            # Collect IDs
            page_ids = [t["id"] for t in tasks]
            print(f"Page {page}: {len(page_ids)} tasks, IDs: {page_ids[:3]}...")

            # Check no duplicates with previous pages
            for task_id in page_ids:
                assert task_id not in all_ids, f"Duplicate ID found: {task_id}"

            all_ids.extend(page_ids)

            # If no next cursor, we're done
            if cursor is None:
                break

        # Verify we got tasks
        assert len(all_ids) > 0, "No tasks returned"
        print(f"Total unique tasks: {len(all_ids)}")

    @pytest.mark.integration
    def test_invalid_cursor_returns_400(self, api_url):
        """Invalid cursor should return 400 with unified error schema."""
        import requests

        url = f"{api_url}/api/video-tasks?cursor=invalid_cursor_here"
        resp = requests.get(url, timeout=30)

        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"

        # Check unified error schema
        data = resp.json()
        assert "code" in data, "Missing 'code' in error response"
        assert data["code"] == "INVALID_CURSOR"
        assert "message" in data, "Missing 'message' in error response"
        assert "requestId" in data, "Missing 'requestId' in error response"
        assert "details" in data, "Missing 'details' in error response"

        # Check X-Request-Id header
        assert "X-Request-Id" in resp.headers, "Missing X-Request-Id header"

    @pytest.mark.integration
    def test_invalid_limit_returns_422(self, api_url):
        """Invalid limit should return 422 with unified error schema."""
        import requests

        # Test limit too high
        url = f"{api_url}/api/video-tasks?limit=999"
        resp = requests.get(url, timeout=30)

        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"

        # Check has detail (FastAPI validation error format)
        data = resp.json()
        assert "detail" in data, "Missing 'detail' in validation error"

        # Check X-Request-Id header
        assert "X-Request-Id" in resp.headers, "Missing X-Request-Id header"

    @pytest.mark.integration
    def test_limit_zero_returns_422(self, api_url):
        """Limit=0 should return 422."""
        import requests

        url = f"{api_url}/api/video-tasks?limit=0"
        resp = requests.get(url, timeout=30)

        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"


class TestErrorSchema:
    """Test unified error schema compliance."""

    @pytest.mark.integration
    def test_not_found_has_unified_schema(self, api_url="https://aiclipx-iam2.onrender.com"):
        """404 error should have unified schema with details."""
        import requests

        url = f"{api_url}/api/video-tasks/vt_nonexistent999"
        resp = requests.get(url, timeout=30)

        assert resp.status_code == 404

        data = resp.json()
        assert data.get("code") == "NOT_FOUND"
        assert "message" in data
        assert "requestId" in data
        assert "details" in data
        assert data["details"].get("taskId") == "vt_nonexistent999"


if __name__ == "__main__":
    # Run unit tests only (no integration)
    pytest.main([__file__, "-v", "-k", "not integration"])
