#!/usr/bin/env python3
"""
BE-BLOCK-01: Clean Data Script
Deletes all video tasks for a fresh start.
"""

import argparse
import requests
import time
import sys

DEFAULT_BASE_URL = "http://localhost:8000"


def get_all_task_ids(base_url: str) -> list:
    """Fetch all task IDs using pagination."""
    all_ids = []
    cursor = None

    while True:
        url = f"{base_url}/api/video-tasks?limit=100"
        if cursor:
            url += f"&cursor={cursor}"

        response = requests.get(url)
        if response.status_code != 200:
            print(f"[ERROR] Failed to fetch tasks: {response.status_code}")
            break

        data = response.json()
        for task in data["data"]:
            all_ids.append(task["id"])

        cursor = data.get("nextCursor")
        if not cursor:
            break

    return all_ids


def delete_task(base_url: str, task_id: str) -> bool:
    """Delete a single task."""
    try:
        response = requests.delete(f"{base_url}/api/video-tasks/{task_id}")
        return response.status_code == 204
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(description="Clean all video tasks")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted")
    parser.add_argument("-y", "--yes", action="store_true", help="Skip confirmation")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("=" * 50)
    print("BE-BLOCK-01 Data Cleaner")
    print(f"Target: {base_url}")
    print("=" * 50)
    print()

    # Fetch all tasks
    print("[CLEAN] Fetching all tasks...")
    task_ids = get_all_task_ids(base_url)

    if not task_ids:
        print("[CLEAN] No tasks found. Nothing to delete.")
        return

    print(f"[CLEAN] Found {len(task_ids)} tasks")
    print()

    if args.dry_run:
        print("[DRY RUN] Would delete:")
        for task_id in task_ids[:10]:
            print(f"  - {task_id}")
        if len(task_ids) > 10:
            print(f"  ... and {len(task_ids) - 10} more")
        return

    # Confirmation
    if not args.yes:
        print(f"WARNING: This will DELETE {len(task_ids)} tasks permanently!")
        confirm = input("Type 'yes' to confirm: ")
        if confirm.lower() != "yes":
            print("[CLEAN] Aborted.")
            return

    print()
    print(f"[CLEAN] Deleting {len(task_ids)} tasks...")

    start_time = time.time()
    deleted = 0
    failed = 0

    for i, task_id in enumerate(task_ids, 1):
        if delete_task(base_url, task_id):
            deleted += 1
            print(f"[{i:3d}/{len(task_ids)}] \u2713 Deleted {task_id}")
        else:
            failed += 1
            print(f"[{i:3d}/{len(task_ids)}] \u2717 Failed {task_id}")

    elapsed = time.time() - start_time

    print()
    print("=" * 50)
    print(f"[CLEAN] Done! Deleted {deleted}/{len(task_ids)} in {elapsed:.1f}s")
    if failed > 0:
        print(f"[CLEAN] Failed: {failed}")
    print("=" * 50)


if __name__ == "__main__":
    main()
