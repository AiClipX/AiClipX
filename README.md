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