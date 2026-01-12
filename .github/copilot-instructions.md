# AI Coding Agent Instructions for AiClipX

## Project Overview
AiClipX is a video task management platform with the following key features:
- **Task Creation**: Users can create video generation tasks with specific parameters.
- **Task Tracking**: Users can track the status of tasks (e.g., queued, processing, completed, failed).
- **Task Listing**: Users can view a paginated list of tasks with search and filter capabilities.

The frontend is built with Next.js and Tailwind CSS, while the backend provides RESTful APIs for task management. Authentication is handled via Supabase.

## Key Files and Directories
- **API Integration**:
  - `components/video/services/videoService.ts`: Contains functions for interacting with the video task APIs.
- **UI Components**:
  - `components/video/list`: Components for the task list page.
  - `components/video/detail`: Components for the task detail page.
- **Authentication**:
  - Supabase integration for obtaining JWT tokens.
- **Environment Variables**:
  - `.env`: Stores API base URLs (e.g., `NEXT_PUBLIC_API_VIDEO`).

## Developer Workflows
### 1. Creating a Video Task
- **API**: `POST /api/video-tasks`
- **Frontend Flow**:
  1. Display a form with fields: `title`, `prompt`, `engine`, and `params`.
  2. On submission, disable the submit button and call the API.
  3. Navigate to the detail page upon success.

### 2. Tracking Task Status
- **API**: `GET /api/video-tasks/{id}`
- **Frontend Flow**:
  1. Poll the API until the task status is `completed` or `failed`.
  2. Render transitions: `queued → processing → completed/failed`.
  3. For `completed`, display the video preview. For `failed`, show the error message.

### 3. Listing Video Tasks
- **API**: `GET /api/video-tasks`
- **Frontend Flow**:
  1. Fetch tasks with pagination, search, and filter parameters.
  2. Display tasks in a list with clickable rows to navigate to the detail page.

## Project-Specific Conventions
- **State Management**:
  - Use React Context for global state (e.g., video list state).
  - Store transient states (e.g., pagination) in `sessionStorage`.
- **Error Handling**:
  - Display toasts for API errors.
  - Log inconsistent backend data to the console and show fallback UI.
- **UI Behavior**:
  - Reset pagination to page 1 when filters or search terms change.
  - Autoplay video previews on hover (muted, looped).

## Integration Points
- **Authentication**:
  - Use Supabase to fetch the JWT token:
    ```javascript
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    ```
  - Attach the token to all API requests:
    ```javascript
    Authorization: `Bearer ${token}`
    ```
- **Environment Variables**:
  - Use `NEXT_PUBLIC_API_VIDEO` for API calls.
  - Avoid hardcoding URLs.

## Testing and Debugging
- **CORS**:
  - Ensure the backend allows your origin (e.g., `http://localhost:3000`).
  - Use the deployed frontend domain for testing if CORS issues arise.
- **Repro Steps**:
  - Clear browser session.
  - Log all API requests and responses for debugging.

## Examples
### Creating a Task
```javascript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_VIDEO}/api/video-tasks`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'My Video',
    prompt: 'A cat playing piano',
    engine: 'runway',
    params: { durationSec: 5, ratio: '16:9' },
  }),
});
```

### Polling Task Status
```javascript
const pollTaskStatus = async (taskId) => {
  let status = 'queued';
  while (status === 'queued' || status === 'processing') {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_VIDEO}/api/video-tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    status = data.status;
    if (status === 'completed') {
      console.log('Video URL:', data.videoUrl);
    } else if (status === 'failed') {
      console.error('Error:', data.errorMessage);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};
```