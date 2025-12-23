from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from models.video_task import VideoTask, VideoTaskStatus


class VideoTaskService:
    def __init__(self):
        self._tasks: List[VideoTask] = self._generate_mock_data()

    def _generate_mock_data(self) -> List[VideoTask]:
        """Generate 50 mock video tasks with varied statuses."""
        tasks = []
        base_time = datetime.utcnow()

        # Distribution: 10 pending, 10 processing, 20 completed, 10 failed
        status_config = [
            (VideoTaskStatus.pending, 10),
            (VideoTaskStatus.processing, 10),
            (VideoTaskStatus.completed, 20),
            (VideoTaskStatus.failed, 10),
        ]

        task_num = 1
        for status, count in status_config:
            for i in range(count):
                task_id = f"task_{task_num:03d}"
                created_at = base_time - timedelta(
                    days=task_num % 7,
                    hours=task_num % 24,
                    minutes=task_num * 7 % 60
                )

                video_url = None
                error_message = None

                if status == VideoTaskStatus.completed:
                    # Real playable video URLs for demo
                    demo_videos = [
                        "https://www.w3schools.com/html/mov_bbb.mp4",
                        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
                    ]
                    video_url = demo_videos[task_num % len(demo_videos)]
                elif status == VideoTaskStatus.failed:
                    error_message = f"Error: Video generation failed - timeout after 300s"

                tasks.append(VideoTask(
                    id=task_id,
                    title=f"AI Generated Video - Demo #{task_num}",
                    status=status,
                    createdAt=created_at,
                    videoUrl=video_url,
                    errorMessage=error_message,
                ))
                task_num += 1

        # Sort by createdAt descending (newest first)
        tasks.sort(key=lambda t: t.createdAt, reverse=True)
        return tasks

    def get_tasks(
        self,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> Tuple[List[VideoTask], Optional[str]]:
        """
        Get paginated list of video tasks.

        Args:
            limit: Number of tasks to return (1-100)
            cursor: Task ID to start after (for pagination)

        Returns:
            Tuple of (tasks list, next cursor or None)
        """
        # Find start index from cursor
        start_idx = 0
        if cursor:
            for i, task in enumerate(self._tasks):
                if task.id == cursor:
                    start_idx = i + 1
                    break

        # Slice data
        end_idx = start_idx + limit
        page = self._tasks[start_idx:end_idx]

        # Calculate next cursor
        next_cursor = None
        if end_idx < len(self._tasks) and page:
            next_cursor = page[-1].id

        return page, next_cursor

    def get_task_by_id(self, task_id: str) -> Optional[VideoTask]:
        """Get a single video task by ID."""
        for task in self._tasks:
            if task.id == task_id:
                return task
        return None


# Singleton instance
video_task_service = VideoTaskService()
