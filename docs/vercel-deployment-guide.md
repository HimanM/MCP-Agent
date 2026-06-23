# Vercel Deployment Guide

This repo can deploy as one Vercel project named `kapruka-mcp-agent` using Vercel Services.

Important:

1. Vercel Services is currently in private beta according to Vercel's docs.
2. If your team does not have Services access yet, use two separate Vercel projects instead.

Team:

1. `himanm's projects`

Project:

1. `kapruka-mcp-agent`

Deployment URL:

1. Frontend: `https://kapruka-mcp-agent.vercel.app`
2. Backend service prefix: `https://kapruka-mcp-agent.vercel.app/backend`

## Why this setup

1. It avoids inventing separate frontend and backend project names.
2. It gives both apps one stable domain.
3. It matches Vercel Services, which supports a Next.js frontend and Python backend in one project under different path prefixes.
4. It lets the frontend proxy to the backend using a deterministic `/backend` base URL.

Source:
[Vercel Services](https://vercel.com/docs/services)
[Vercel Project Configuration](https://vercel.com/docs/project-configuration/vercel-json)
[Vercel Domains](https://vercel.com/docs/domains/working-with-domains)

## Layout

1. `frontend/` stays the Next.js app at `/`
2. `backend/` becomes the FastAPI service at `/backend`

## Required Vercel settings

1. Import the GitHub repo into Vercel
2. Set the project name to `kapruka-mcp-agent`
3. Set the framework to `Services`
4. Keep `vercel.json` at the repo root

## Custom domains

You cannot reliably assign custom domains inside `vercel.json`.

Use Vercel Project Settings or the Domains section instead.

Notes:

1. `vercel.json` controls build and routing behavior.
2. Vercel's docs say custom domain assignment should be done in Project Settings instead of config.
3. Once your Cloudflare DNS points at Vercel correctly, attach the custom domain in the Vercel dashboard.

## Environment variables

Use the same environment set across the project:

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=google/gemma-4-31b-it:free
OPENROUTER_FAST_MODEL=google/gemma-4-31b-it:free
OPENROUTER_REASONING_MODEL=google/gemma-4-31b-it:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=https://kapruka-mcp-agent.vercel.app
OPENROUTER_APP_NAME=Kapruka Shopper

REDIS_URL=redis://default:...@host:port
MCP_SERVER_URL=https://mcp.kapruka.com/mcp
SESSION_TTL_SECONDS=3600
CORS_ORIGINS=https://kapruka-mcp-agent.vercel.app

RATE_LIMIT_REQUESTS_PER_WINDOW=20
RATE_LIMIT_WINDOW_SECONDS=60

BACKEND_API_URL=https://kapruka-mcp-agent.vercel.app/backend
NEXT_PUBLIC_API_URL=https://kapruka-mcp-agent.vercel.app/backend
NEXT_PUBLIC_ENABLE_CART_WS=0
```

Notes:

1. `BACKEND_API_URL` is used by the frontend server-side proxy routes.
2. `NEXT_PUBLIC_API_URL` is used by browser-side helpers.
3. `NEXT_PUBLIC_ENABLE_CART_WS=0` disables websocket attempts on Vercel and falls back to polling.
4. Since the backend sits behind `/backend`, both API URL vars should include that suffix.

## Rate limiting

The backend rate-limits `/api/chat` by IP.

Defaults:

1. 20 requests
2. per 60 seconds

Files:

1. [backend/rate_limit.py](/D:/Projects/MCP%20Agent/backend/rate_limit.py)
2. [backend/routes/chat.py](/D:/Projects/MCP%20Agent/backend/routes/chat.py)
3. [backend/config.py](/D:/Projects/MCP%20Agent/backend/config.py)

Redis is preferred for production because Vercel instances are not guaranteed to share memory.

## Deploy flow

1. Push to GitHub
2. Import repo into the Vercel team `himanm's projects`
3. Name the project `kapruka-mcp-agent`
4. Add the environment variables from the root `.env`
5. Deploy

## Smoke test

1. Open `https://kapruka-mcp-agent.vercel.app`
2. Send a chat message
3. Load categories
4. Load offers
5. Add to cart
6. Confirm cart still refreshes with polling
7. Hit chat repeatedly and confirm `429` after the configured limit
