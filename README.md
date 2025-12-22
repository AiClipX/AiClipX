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

---

## Mock Video List (Frontend-only Trial)

This section was implemented as part of the 3-day frontend evaluation.

### Scope
- Frontend-only implementation
- Uses **static mock data**
- No backend calls
- No authentication or permission logic

### Implemented Features
- Mock video list UI
- Video card layout with thumbnail placeholder
- Simple search filter (client-side)
- Responsive layout using Tailwind CSS
- Clean component structure

### Page
- `/mock-videos` – Mock Video Library page

### Notes
- The implementation focuses on code readability, component separation, and UI clarity.
- Mock data is stored locally and can be easily replaced with real API data in the future.

