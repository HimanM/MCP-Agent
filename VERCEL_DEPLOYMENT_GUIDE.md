# Vercel Deployment Guide

This repo is easiest to deploy as two Vercel projects:

1. `frontend` as a Next.js project
2. `backend` as a FastAPI project

## Why this is the better path

1. The frontend already uses Next server routes under [frontend/src/app/api](/D:/Projects/MCP%20Agent/frontend/src/app/api), which GitHub Pages cannot run.
2. Vercel can host the Next frontend directly.
3. Vercel can host the FastAPI backend directly.
4. The backend now has a simple per-IP rate limit on `/api/chat`.

## Current deployment shape

1. Browser requests hit the frontend Vercel app.
2. Frontend Next route handlers proxy API calls to the backend Vercel app.
3. Cart websocket can be disabled in production and the frontend will poll instead.

## Project setup

### 1. Frontend project

Create a Vercel project with:

1. Root directory: `frontend`
2. Framework preset: Next.js

Set these environment variables:

1. `BACKEND_API_URL=https://your-backend-project.vercel.app`
2. `NEXT_PUBLIC_API_URL=https://your-backend-project.vercel.app`
3. `NEXT_PUBLIC_ENABLE_CART_WS=0`

Notes:

1. `BACKEND_API_URL` is used by the Next route handlers on the server.
2. `NEXT_PUBLIC_API_URL` is used by the frontend for backend metadata and websocket URL generation.
3. `NEXT_PUBLIC_ENABLE_CART_WS=0` disables websocket attempts on Vercel and uses polling instead.

### 2. Backend project

Create a second Vercel project with:

1. Root directory: `backend`
2. Framework preset: Other

The backend now exposes the FastAPI app through [backend/app.py](/D:/Projects/MCP%20Agent/backend/app.py), which is the simplest Vercel-friendly entrypoint.

Set these environment variables:

1. `CORS_ORIGINS=https://your-frontend-project.vercel.app`
2. `OPENROUTER_SITE_URL=https://your-frontend-project.vercel.app`
3. `OPENROUTER_APP_NAME=Kapruka Shopper`
4. `REDIS_URL=your-redis-url`
5. `RATE_LIMIT_REQUESTS_PER_WINDOW=20`
6. `RATE_LIMIT_WINDOW_SECONDS=60`
7. Your LLM provider keys:
   - `OPENROUTER_API_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
8. Any existing backend env vars you already use:
   - `LLM_PROVIDER`
   - `MCP_SERVER_URL`

## Redis

Use a real hosted Redis for Vercel deployments.

Why:

1. Cart/session state already uses Redis when available.
2. The rate limiter also uses Redis when available.
3. In-memory fallbacks are fine locally, but not reliable across multiple serverless instances.

## Rate limiting

The backend now rate-limits `/api/chat` by IP.

Defaults:

1. `20` requests
2. per `60` seconds

Files involved:

1. [backend/rate_limit.py](/D:/Projects/MCP%20Agent/backend/rate_limit.py)
2. [backend/routes/chat.py](/D:/Projects/MCP%20Agent/backend/routes/chat.py)
3. [backend/config.py](/D:/Projects/MCP%20Agent/backend/config.py)

If you want stricter limits later, change:

1. `RATE_LIMIT_REQUESTS_PER_WINDOW`
2. `RATE_LIMIT_WINDOW_SECONDS`

## CORS

The backend currently reads allowed origins from `CORS_ORIGINS`.

Example:

```env
CORS_ORIGINS=https://your-frontend-project.vercel.app
```

For multiple origins:

```env
CORS_ORIGINS=https://your-frontend-project.vercel.app,https://your-custom-domain.com
```

## Deploy order

1. Deploy backend first
2. Copy backend URL
3. Set frontend env vars to that backend URL
4. Deploy frontend
5. Copy frontend URL
6. Update backend `CORS_ORIGINS` and `OPENROUTER_SITE_URL` to the frontend URL
7. Redeploy backend

## Quick smoke test

After both projects are live:

1. Open the frontend URL
2. Send a chat message
3. Confirm products load
4. Confirm cart polling still updates after add/remove
5. Confirm `/status` still works for dev checks
6. Send more than 20 chat requests inside a minute and confirm the backend returns `429`

## What we intentionally did not change

1. We did not rewrite the frontend away from Next route handlers.
2. We did not force WebSocket support on Vercel because Vercel is not the right host for that.
3. We did not add a third-party rate-limit SDK because the existing Redis setup already covers this cleanly.
