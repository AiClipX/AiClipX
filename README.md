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
