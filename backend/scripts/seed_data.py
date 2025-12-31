#!/usr/bin/env python3
"""
BE-BLOCK-01: Seed Data Script
Creates 15 tasks with various statuses for regression testing.
"""

import argparse
import requests
import time
import sys

DEFAULT_BASE_URL = "http://localhost:8000"

# Task definitions: (title, prompt, engine, target_status, videoUrl, errorMessage)
SEED_TASKS = [
    # Queued tasks (3)
    ("Queued Task 1", "A beautiful sunrise over mountains", "runway", "queued", None, None),
    ("Queued Task 2", "Ocean waves crashing on rocks", "runway", "queued", None, None),
    ("Queued Task 3", "Forest path in autumn", "runway", "queued", None, None),

    # Processing tasks (3)
    ("Processing Task 1", "City skyline at night", "runway", "processing", None, None),
    ("Processing Task 2", "Desert dunes at sunset", "runway", "processing", None, None),
    ("Processing Task 3", "Northern lights dancing", "runway", "processing", None, None),

    # Completed tasks (5) - for filter/search testing
    ("Completed Sunset Video", "Golden sunset over the ocean", "runway", "completed",
     "https://cdn.example.com/videos/sunset.mp4", None),
    ("Completed Mountain View", "Snow-capped mountain peaks", "runway", "completed",
     "https://cdn.example.com/videos/mountain.mp4", None),
    ("Completed City Tour", "Aerial view of downtown", "runway", "completed",
     "https://cdn.example.com/videos/city.mp4", None),
    ("Completed Nature Walk", "Peaceful garden walkthrough", "runway", "completed",
     "https://cdn.example.com/videos/nature.mp4", None),
    ("Completed Beach Scene", "Tropical beach paradise", "runway", "completed",
     "https://cdn.example.com/videos/beach.mp4", None),

    # Failed tasks (4) - for error state testing
    ("Failed Task 1", "Complex animation failed", "runway", "failed", None, "GPU memory exceeded"),
    ("Failed Task 2", "Invalid prompt detected", "runway", "failed", None, "Content policy violation"),
    ("Failed Task 3", "Timeout during rendering", "runway", "failed", None, "Processing timeout after 300s"),
    ("Failed Task 4", "Network error occurred", "runway", "failed", None, "External API unavailable"),
]


def create_task(base_url: str, title: str, prompt: str, engine: str) -> dict:
    """Create a new task via POST."""
    response = requests.post(
        f"{base_url}/api/video-tasks",
        json={"title": title, "prompt": prompt, "engine": engine},
        headers={"Content-Type": "application/json"}
    )
    response.raise_for_status()
    return response.json()


def update_status(base_url: str, task_id: str, status: str,
                  progress: int = None, video_url: str = None, error_message: str = None) -> dict:
    """Update task status via PATCH."""
    payload = {"status": status}
    if progress is not None:
        payload["progress"] = progress
    if video_url:
        payload["videoUrl"] = video_url
    if error_message:
        payload["errorMessage"] = error_message

    response = requests.patch(
        f"{base_url}/api/video-tasks/{task_id}/status",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    response.raise_for_status()
    return response.json()


def seed_task(base_url: str, title: str, prompt: str, engine: str,
              target_status: str, video_url: str, error_message: str) -> str:
    """Create and transition a task to target status."""
    # Step 1: Create task (starts as 'queued')
    task = create_task(base_url, title, prompt, engine)
    task_id = task["id"]

    if target_status == "queued":
        return task_id

    # Step 2: Transition to processing if needed
    if target_status in ["processing", "completed"]:
        update_status(base_url, task_id, "processing", progress=50)

    # Step 3: Transition to final status
    if target_status == "completed":
        update_status(base_url, task_id, "completed", progress=100, video_url=video_url)
    elif target_status == "failed":
        update_status(base_url, task_id, "failed", error_message=error_message)

    return task_id


def main():
    parser = argparse.ArgumentParser(description="Seed test data for BE-BLOCK-01")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be created")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print("=" * 50)
    print("BE-BLOCK-01 Data Seeder")
    print(f"Target: {base_url}")
    print("=" * 50)
    print()

    if args.dry_run:
        print("[DRY RUN] Would create:")
        for title, prompt, engine, status, _, _ in SEED_TASKS:
            print(f"  - {title} ({status})")
        print(f"\nTotal: {len(SEED_TASKS)} tasks")
        return

    print(f"[SEED] Creating {len(SEED_TASKS)} tasks...")
    print()

    created_ids = []
    start_time = time.time()

    for i, (title, prompt, engine, status, video_url, error_msg) in enumerate(SEED_TASKS, 1):
        try:
            task_id = seed_task(base_url, title, prompt, engine, status, video_url, error_msg)
            created_ids.append(task_id)
            print(f"[{i:2d}/{len(SEED_TASKS)}] \u2713 {task_id} ({status:10s}) - {title}")
        except requests.RequestException as e:
            print(f"[{i:2d}/{len(SEED_TASKS)}] \u2717 FAILED - {title}: {e}")
            sys.exit(1)

    elapsed = time.time() - start_time

    print()
    print("=" * 50)
    print(f"[SEED] Done! {len(created_ids)} tasks created in {elapsed:.1f}s")
    print("=" * 50)

    # Summary by status
    status_counts = {}
    for _, _, _, status, _, _ in SEED_TASKS:
        status_counts[status] = status_counts.get(status, 0) + 1

    print("\nStatus breakdown:")
    for status, count in sorted(status_counts.items()):
        print(f"  - {status}: {count}")


if __name__ == "__main__":
    main()
