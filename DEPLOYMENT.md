# Deployment Guide

This project has two services:

- `backend`: FastAPI service that handles chat, cart, MCP calls, and Redis-backed session state
- `frontend`: Next.js app that serves the UI and talks to the backend API

The recommended setup for local development is Docker Compose. For production, run the backend and frontend as separate services behind a reverse proxy, with Redis as managed infrastructure or a dedicated container.

## Prerequisites

- Python 3.12+
- Node.js 22+
- Docker and Docker Compose
- A valid LLM API key for at least one provider:
  - `GEMINI_API_KEY`
  - `GROQ_API_KEY`
  - `OPENROUTER_API_KEY`
- Redis access

## Environment Variables

Create a `.env` file at the repository root for the backend.

```env
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=
OPENROUTER_API_KEY=
REDIS_URL=redis://localhost:6379/0
MCP_SERVER_URL=https://mcp.kapruka.com/mcp
SESSION_TTL_SECONDS=3600
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

For the frontend, set `NEXT_PUBLIC_API_URL` to the backend base URL.

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_API_URL=http://127.0.0.1:8000
```

## Local Development

### Option 1: Docker Compose

This is the easiest way to run everything together.

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Redis: `localhost:6379`

The compose file already:

- builds both apps from their Dockerfiles
- starts Redis
- injects `REDIS_URL=redis://mcp-agent-redis:6379` into the backend container

If you want the frontend to talk to a different backend URL, set:

```bash
set NEXT_PUBLIC_API_URL=http://your-backend-host:8000
```

### Option 2: Run Backend and Frontend Separately

#### Backend

Install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend reads `.env` from the repository root and supports these defaults:

- MCP server: `https://mcp.kapruka.com/mcp`
- Redis: `redis://localhost:6379/0`
- CORS: `http://localhost:3000,http://127.0.0.1:3000`

#### Frontend

Install dependencies:

```bash
cd frontend
npm install
```

Start the dev server:

```bash
npm run dev
```

By default, the frontend expects the backend at `http://127.0.0.1:8000`.

## Production Deployment

## Backend Production

Build and run the backend container:

```bash
cd backend
docker build -t mcp-agent-backend .
docker run -p 8000:8000 --env-file ../.env mcp-agent-backend
```

Make sure production values are set in `.env` or your container platform:

- `REDIS_URL` points to your production Redis instance
- `CORS_ORIGINS` includes the production frontend domain
- one LLM provider key is present

If you are not using Docker, the backend can also run with:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Frontend Production

Build the frontend image:

```bash
cd frontend
docker build --build-arg NEXT_PUBLIC_API_URL=https://your-backend.example.com -t mcp-agent-frontend .
```

Run it:

```bash
docker run -p 3000:3000 mcp-agent-frontend
```

If you are deploying without Docker:

```bash
cd frontend
npm ci
npm run build
npm run start
```

Set `NEXT_PUBLIC_API_URL` to the public backend URL before building.

## Recommended Production Topology

Use this layout:

- `frontend` on a public domain, for example `https://shop.example.com`
- `backend` on a private or protected API domain, for example `https://api.example.com`
- `redis` on a managed service or private network

Typical proxy responsibilities:

- terminate TLS
- route frontend traffic to Next.js
- route `/api/*` and WebSocket traffic to the backend if needed
- allow CORS only from the frontend domain

## Verification

After deployment, verify these endpoints:

- `GET /api/meta`
- `GET /api/cart/{sessionId}`
- `POST /api/chat`

Good signs:

- the frontend loads without API errors
- `/api/meta` returns provider and MCP status
- chat responses stream correctly
- cart updates persist across refreshes

## Notes

- The backend is configured to look for `.env` and `.env.local` at the repository root.
- Do not commit secret files such as `.env` or `frontend/.env.local`.
- The frontend uses `NEXT_PUBLIC_API_URL` at build time, so update it before building production assets.
