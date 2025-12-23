# Stage 3 – Minimal API Contract (Video Tasks)

Base URL: (TBD by backend after deployment)

## 1) List Video Tasks
GET /api/video-tasks

Response (200)
{
  "data": [
    {
      "id": "task_001",
      "title": "AI Generated Video – Product Demo",
      "status": "processing",
      "createdAt": "2025-12-20T10:12:00Z",
      "videoUrl": null,
      "errorMessage": null
    }
  ],
  "nextCursor": "task_003"
}

Rules:
- nextCursor: string | null

## 2) Get Task Detail
GET /api/video-tasks/{id}

Response (200)
{
  "id": "task_001",
  "title": "AI Generated Video – Product Demo",
  "status": "processing",
  "createdAt": "2025-12-20T10:12:00Z",
  "videoUrl": null,
  "errorMessage": null
}

## 3) Status enum
pending | processing | completed | failed

## 4) Field constraints
- videoUrl MUST be non-null when status=completed; SHOULD be null otherwise
- errorMessage MUST be non-null when status=failed; SHOULD be null otherwise
