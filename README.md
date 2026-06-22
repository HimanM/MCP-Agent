<p align="center">
  <img src="./frontend/public/kapruka-logo.svg" alt="Kapruka AI" width="420" />
</p>

# Kapruka AI Shopping Assistant

Challenge submission for the [Kapruka Agent Challenge](https://www.kapruka.com/contactUs/agentChallenge.html).

This project is an MCP-powered shopping assistant for Kapruka that lets users:

- search products in natural language
- browse categories and current deals
- use a guided gift advisor
- track orders without leaving the app flow
- add products to cart and manage quantities
- save checkout details and continue a shopping session
- use multilingual UI controls and voice-assisted interactions

## Stack

- Frontend: Next.js, React, Tailwind CSS
- Backend: FastAPI
- LLM routing: OpenRouter with provider fallback support in the backend
- Realtime cart sync: WebSocket support
- Session/cart storage: Redis-backed cart and context storage
- MCP integration: Kapruka MCP tools

## Project structure

```text
backend/    FastAPI routes, agent logic, cart/session handling, rate limits
frontend/   Next.js UI, chat experience, category/deals/product flows
docs/       deployment notes and supporting docs
```

## Local development

### 1. Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Open the app

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`

## Environment

Local development reads from the repo root `.env`.

Deployment-oriented example values are in `.env.example`.

## Current product behavior

- Chat session id persists for a short return window
- Chat history is restored after refresh for that same short session window
- Cart and checkout state are preserved separately through the backend session store
- Rate limiting is applied on the backend to protect model usage

## Verification

Useful commands:

```bash
cd frontend && npm run build
cd frontend && npm run lint
cd backend && python -m pytest
```

## Notes

This repository has been iterated in multiple feature branches and then merged into `master` as the challenge submission evolved.
