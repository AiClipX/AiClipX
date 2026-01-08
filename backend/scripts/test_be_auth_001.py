#!/usr/bin/env python3
"""
BE-AUTH-001: Authentication & User Isolation Test Suite

Tests all Acceptance Criteria:
A) Auth required - 401 without token
B) User isolation - User A can't see User B's tasks
C) RLS verification (manual - check Supabase dashboard)
D) Regression - runway flow works with auth

Usage:
    python scripts/test_be_auth_001.py
    python scripts/test_be_auth_001.py --base-url http://localhost:8000
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from dotenv import load_dotenv
import jwt
import requests

# Load .env from parent directory
load_dotenv()
load_dotenv("../.env")

# Configuration
DEFAULT_BASE_URL = "http://localhost:8000"

# Get JWT secret from environment (same as auth.py)
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()
if JWT_SECRET.startswith('"') and JWT_SECRET.endswith('"'):
    JWT_SECRET = JWT_SECRET[1:-1]  # Remove quotes if present

if not JWT_SECRET:
    JWT_SECRET = "local-test-secret-do-not-use-in-production"
    print("[WARN] Using LOCAL_DEV test secret")

# Test users
USER_A_ID = "11111111-1111-1111-1111-111111111111"
USER_A_EMAIL = "user-a@test.com"
USER_B_ID = "22222222-2222-2222-2222-222222222222"
USER_B_EMAIL = "user-b@test.com"

# Test results
passed = 0
failed = 0
results = []


def generate_jwt(user_id: str, email: str) -> str:
    """Generate a valid test JWT using the configured secret."""
    now = datetime.now(timezone.utc)
    payload = {
        "aud": "authenticated",
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "iat": int(now.timestamp()),
        "sub": user_id,
        "email": email,
        "role": "authenticated",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def log_result(test_id: str, name: str, success: bool, detail: str = ""):
    """Log test result."""
    global passed, failed
    status = "✓ PASS" if success else "✗ FAIL"
    if success:
        passed += 1
    else:
        failed += 1

    print(f"[{test_id}] {name.ljust(50, '.')} {status} {detail}")
    results.append({"test": test_id, "name": name, "passed": success, "detail": detail})


def test_auth_required_no_token(base_url: str) -> bool:
    """Test A.1: POST without token returns 401."""
    resp = requests.post(
        f"{base_url}/api/video-tasks",
        json={"title": "Test", "prompt": "Test prompt"},
    )
    success = resp.status_code == 401
    log_result("A.1", "POST /api/video-tasks without token → 401", success, f"(got {resp.status_code})")
    return success


def test_auth_required_list_no_token(base_url: str) -> bool:
    """Test A.2: GET list without token returns 401."""
    resp = requests.get(f"{base_url}/api/video-tasks")
    success = resp.status_code == 401
    log_result("A.2", "GET /api/video-tasks without token → 401", success, f"(got {resp.status_code})")
    return success


def test_auth_required_detail_no_token(base_url: str) -> bool:
    """Test A.3: GET detail without token returns 401."""
    resp = requests.get(f"{base_url}/api/video-tasks/vt_test123")
    success = resp.status_code == 401
    log_result("A.3", "GET /api/video-tasks/{{id}} without token → 401", success, f"(got {resp.status_code})")
    return success


def test_auth_required_invalid_token(base_url: str) -> bool:
    """Test A.4: Request with invalid token returns 401."""
    resp = requests.get(
        f"{base_url}/api/video-tasks",
        headers={"Authorization": "Bearer invalid.token.here"}
    )
    success = resp.status_code == 401
    log_result("A.4", "GET with invalid token → 401", success, f"(got {resp.status_code})")
    return success


def test_user_a_create_task(base_url: str, token_a: str) -> Tuple[bool, Optional[str]]:
    """Test B.1: User A creates a task."""
    resp = requests.post(
        f"{base_url}/api/video-tasks",
        json={
            "title": "User A Task - BE-AUTH-001 Test",
            "prompt": "Test prompt for user isolation",
            "engine": "mock"
        },
        headers={"Authorization": f"Bearer {token_a}"}
    )

    if resp.status_code != 201:
        log_result("B.1", "User A creates task → 201", False, f"(got {resp.status_code})")
        return False, None

    data = resp.json()
    task_id = data.get("id")
    status = data.get("status")

    success = task_id is not None and status == "queued"
    log_result("B.1", "User A creates task → 201", success, f"(id={task_id}, status={status})")
    return success, task_id


def test_user_a_list_shows_task(base_url: str, token_a: str, task_id: str) -> bool:
    """Test B.2: User A's list shows the created task."""
    resp = requests.get(
        f"{base_url}/api/video-tasks",
        headers={"Authorization": f"Bearer {token_a}"}
    )

    if resp.status_code != 200:
        log_result("B.2", "User A list shows own task", False, f"(got {resp.status_code})")
        return False

    data = resp.json()
    task_ids = [t["id"] for t in data.get("data", [])]
    success = task_id in task_ids

    log_result("B.2", "User A list shows own task", success, f"(found={task_id in task_ids})")
    return success


def test_user_b_list_not_shows_task(base_url: str, token_b: str, task_id_a: str) -> bool:
    """Test B.3: User B's list does NOT show User A's task."""
    resp = requests.get(
        f"{base_url}/api/video-tasks",
        headers={"Authorization": f"Bearer {token_b}"}
    )

    if resp.status_code != 200:
        log_result("B.3", "User B list does NOT show User A's task", False, f"(got {resp.status_code})")
        return False

    data = resp.json()
    task_ids = [t["id"] for t in data.get("data", [])]
    success = task_id_a not in task_ids

    log_result("B.3", "User B list does NOT show User A's task", success, f"(found={task_id_a in task_ids})")
    return success


def test_user_b_detail_returns_404(base_url: str, token_b: str, task_id_a: str) -> bool:
    """Test B.4: User B accessing User A's task returns 404."""
    resp = requests.get(
        f"{base_url}/api/video-tasks/{task_id_a}",
        headers={"Authorization": f"Bearer {token_b}"}
    )

    success = resp.status_code == 404

    code = ""
    if resp.status_code == 404:
        code = resp.json().get("code", "")

    log_result("B.4", "User B detail on User A's task → 404", success, f"(got {resp.status_code}, code={code})")
    return success


def test_user_a_detail_works(base_url: str, token_a: str, task_id: str) -> bool:
    """Test B.5: User A can access their own task."""
    resp = requests.get(
        f"{base_url}/api/video-tasks/{task_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )

    success = resp.status_code == 200

    log_result("B.5", "User A can access own task → 200", success, f"(got {resp.status_code})")
    return success


def test_user_b_delete_returns_404(base_url: str, token_b: str, task_id_a: str) -> bool:
    """Test B.6: User B cannot delete User A's task."""
    resp = requests.delete(
        f"{base_url}/api/video-tasks/{task_id_a}",
        headers={"Authorization": f"Bearer {token_b}"}
    )

    success = resp.status_code == 404
    log_result("B.6", "User B delete User A's task → 404", success, f"(got {resp.status_code})")
    return success


def test_mock_engine_flow(base_url: str, token_a: str) -> bool:
    """Test D: Mock engine flow works with auth."""
    # Create task
    resp = requests.post(
        f"{base_url}/api/video-tasks",
        json={
            "title": "Mock Engine Test",
            "prompt": "Testing mock engine flow",
            "engine": "mock"
        },
        headers={"Authorization": f"Bearer {token_a}"}
    )

    if resp.status_code != 201:
        log_result("D.1", "Create mock task → 201", False, f"(got {resp.status_code})")
        return False

    task_id = resp.json()["id"]
    log_result("D.1", "Create mock task → 201", True, f"(id={task_id})")

    # Wait for background processing (mock: 5s to processing, 15s to completed)
    print("       Waiting for mock engine processing (max 30s)...")

    max_wait = 30
    start = time.time()
    final_status = None
    video_url = None

    while time.time() - start < max_wait:
        resp = requests.get(
            f"{base_url}/api/video-tasks/{task_id}",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        if resp.status_code == 200:
            data = resp.json()
            final_status = data.get("status")
            video_url = data.get("videoUrl")

            if final_status == "completed":
                break

        time.sleep(2)

    success = final_status == "completed" and video_url is not None
    log_result("D.2", "Mock task completes with videoUrl", success, f"(status={final_status}, hasUrl={video_url is not None})")

    return success


def test_user_a_delete_works(base_url: str, token_a: str, task_id: str) -> bool:
    """Cleanup: User A deletes their own task."""
    resp = requests.delete(
        f"{base_url}/api/video-tasks/{task_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )

    success = resp.status_code == 204
    log_result("CLN", "User A delete own task → 204", success, f"(got {resp.status_code})")
    return success


def main():
    parser = argparse.ArgumentParser(description="BE-AUTH-001 Test Suite")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("=" * 65)
    print("BE-AUTH-001: Authentication & User Isolation Test Suite")
    print(f"Target: {base_url}")
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 65)

    # Generate test tokens
    print("\n[SETUP] Generating test JWTs...")
    token_a = generate_jwt(USER_A_ID, USER_A_EMAIL)
    token_b = generate_jwt(USER_B_ID, USER_B_EMAIL)
    print(f"  User A: {USER_A_ID[:8]}... ({USER_A_EMAIL})")
    print(f"  User B: {USER_B_ID[:8]}... ({USER_B_EMAIL})")

    # Check server is running
    print("\n[SETUP] Checking server...")
    try:
        resp = requests.get(f"{base_url}/health", timeout=5)
        if resp.status_code != 200:
            print(f"  ERROR: Server returned {resp.status_code}")
            sys.exit(1)
        print(f"  Server OK: {resp.json()}")
    except requests.exceptions.ConnectionError:
        print(f"  ERROR: Cannot connect to {base_url}")
        print("  Make sure server is running: LOCAL_DEV=true uvicorn main:app --reload")
        sys.exit(1)

    print("\n" + "=" * 65)
    print("TEST A: Auth Required (401 without token)")
    print("=" * 65)

    test_auth_required_no_token(base_url)
    test_auth_required_list_no_token(base_url)
    test_auth_required_detail_no_token(base_url)
    test_auth_required_invalid_token(base_url)

    print("\n" + "=" * 65)
    print("TEST B: User Isolation (2 users)")
    print("=" * 65)

    success, task_id_a = test_user_a_create_task(base_url, token_a)

    if task_id_a:
        test_user_a_list_shows_task(base_url, token_a, task_id_a)
        test_user_b_list_not_shows_task(base_url, token_b, task_id_a)
        test_user_b_detail_returns_404(base_url, token_b, task_id_a)
        test_user_a_detail_works(base_url, token_a, task_id_a)
        test_user_b_delete_returns_404(base_url, token_b, task_id_a)
    else:
        print("  SKIP: Cannot test isolation without created task")

    print("\n" + "=" * 65)
    print("TEST D: Regression (Mock Engine Flow with Auth)")
    print("=" * 65)

    test_mock_engine_flow(base_url, token_a)

    # Cleanup
    print("\n" + "=" * 65)
    print("CLEANUP")
    print("=" * 65)

    if task_id_a:
        test_user_a_delete_works(base_url, token_a, task_id_a)

    # Summary
    print("\n" + "=" * 65)
    total = passed + failed
    if failed == 0:
        print(f"RESULT: {passed}/{total} PASSED ✓")
        print("=" * 65)
        print("\nBE-AUTH-001 Acceptance Criteria:")
        print("  A) Auth required ..................... ✓")
        print("  B) User isolation .................... ✓")
        print("  C) RLS policies ...................... (check Supabase dashboard)")
        print("  D) Regression ........................ ✓")
    else:
        print(f"RESULT: {passed}/{total} PASSED, {failed} FAILED ✗")
        print("=" * 65)

    if args.json:
        print("\n" + json.dumps({
            "passed": passed,
            "failed": failed,
            "total": total,
            "results": results
        }, indent=2))

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
