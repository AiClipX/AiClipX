# AiClipX Frontend (Next.js)

**What this is**: a minimal, production-ready Next.js + Tailwind template that talks to your FastAPI backend.

## Quick Start (local)

```bash
# 1) set env
export NEXT_PUBLIC_API_URL=https://aiclipx.onrender.com   # your Render URL

# 2) install & run
npm i
npm run dev
```

## Deploy on Vercel

- Import this repo in Vercel.
- Root Directory: `./` (the default)
- Environment Variable: `NEXT_PUBLIC_API_URL = https://aiclipx.onrender.com`
- Hit **Deploy**.

### Pages

- `/` Home
- `/upload` Demo form → POST `${NEXT_PUBLIC_API_URL}/generate`

### How to Use

Once the server is running, you can access the Video List page directly at: http://localhost:3000/dashboard/test-video-list

Filter

Use the StatusFilter tab to filter videos by Draft, Processing, Completed

Selecting All shows all videos

Sort

Use the SortByDate dropdown to sort videos by Newest or Oldest

Search

Type in the search input to search by video title

The search is debounced, so results update after 400ms of inactivity

Pagination

Navigate pages using the pagination buttons at the bottom

The page updates automatically with filter, sort, or search applied

Loading State

While data is fetching, skeleton loaders will appear for video thumbnails

Empty State

If no videos match your filter/search, a friendly empty state message will display

### Stage 2:

Once the server is running, you can access the Video List page directly at: http://localhost:3000/dashboard/videos/[id]

Video Detail Added /dashboard/videos/[id] page with VideoDetailContainer including VideoPlayer, VideoMeta, VideoActions, and BackButton.
Back Navigation BackButton returns to the previous video list page with the same filter, sort, search, and page.
Video List & Pagination /dashboard/test-video-list shows video grid with thumbnail, title, status, created date, hover preview, and pagination.
Filters & Sorting Users can filter by status All
Context: VideoListContext Stores global video list state: status, sort, search, page, videos. Allows retaining state across navigation and simplifies future enhancements.
Persistent State Video list state (page, filter, sort, search) is saved in sessionStorage when navigating to detail and restored when returning.
Responsive Layout Grid layout: 2 cols (mobile), 3 cols (sm), 4 cols (md+), with hover video preview maintaining aspect-video.
Empty / Loading States Displays EmptyState when no videos, LoadingState when fetching. 3. Back Button Behavior

Clicking BackButton returns to the previous video list page.

Retains:

Page

Filter

Sort

Search

Page number is not shown in the URL (state stored in context + sessionStorage).

4. Rules / Behavior
   Action Behavior
   Filter / Sort / Search Resets page to 1 if changed.
   Pagination Max page = total pages after filter applied. If current page > max page → reset to max page.
   Hover Video Hover thumbnail → preview video autoplay muted, loop. Click → go to video detail.
5. Advantages of Context

Keeps video list state global.

BackButton can restore previous state correctly.

Easy to extend: add new filters, sorting, or search globally.

Reduces prop drilling across components.
