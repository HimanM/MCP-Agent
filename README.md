<p align="center">
  <img src="./frontend/public/kapruka-mark.png" alt="Kapruka AI logo" width="164" />
</p>

<h1 align="center">Kapruka AI Shopping Assistant</h1>

<p align="center">
  Challenge submission for the <a href="https://www.kapruka.com/contactUs/agentChallenge.html">Kapruka Agent Challenge</a>.
</p>

<p align="center">
  <a href="https://github.com/HimanM">GitHub</a> ·
  <a href="https://www.linkedin.com/in/HimanM">LinkedIn</a>
</p>

<p align="center">
  <img src="./docs/assets/architecture-overview.svg" alt="Kapruka AI architecture overview" width="960" />
</p>

## What this is

This is an MCP-powered shopping assistant for Kapruka.

> [!WARNING]
> The current demo uses the free `google/gemma-4-31b-it` route, so responses can feel slow at times. Please do not mind the latency too much during evaluation.

It lets a shopper:

- search products in natural language
- browse categories and deals without leaving the app flow
- use a guided gift advisor
- track orders in a dedicated flow
- add products to cart and save checkout details
- continue short-lived sessions after refresh
- use voice input and spoken replies

## Architecture

- `frontend/`
  - Next.js app for chat, category browsing, deals, cart, checkout, and voice controls
- `backend/`
  - FastAPI API for prompt assembly, provider routing, MCP orchestration, rate limiting, cart/session state, STT, and TTS
- `docs/`
  - deployment notes, prompts, and support docs

## Technology choices

| Technology | What it does here | Why it helps |
| --- | --- | --- |
| Next.js + React | Main web app UI | Fast iteration, SSR where useful, simple deployment to Vercel |
| Tailwind CSS | Styling system | Lets us move quickly while keeping the UI consistent |
| FastAPI | Backend API layer | Clean async routes for chat, cart, STT, TTS, and tracking |
| Redis | Session and cart state | Keeps short-lived chat context and cart state outside the browser |
| OpenRouter | LLM gateway | Gives one integration point for Gemma and fallback model control |
| `google/gemma-4-31b-it` | Main reasoning model | Strong multilingual quality for this use case without jumping to a much more expensive model |
| Kapruka MCP | Tool layer | Gives structured access to categories, catalog, deals, and tracking |
| ElevenLabs | Spoken output | Better voice quality than browser-native TTS when configured |
| Groq or OpenRouter STT | Speech-to-text | Lets the mic flow become normal chat input |

## Why Gemma 4 31B

We chose `google/gemma-4-31b-it` as the main model because it fit this challenge unusually well.

- It is a highly capable open-weight model from Google DeepMind.
- It can be self-hosted elsewhere, but for this challenge we route it through OpenRouter because deployment is web-first and Vercel-friendly.
- In practice it handled English, Singlish, Tanglish, Sinhala-leaning romanized text, and Tamil-leaning romanized text more naturally than several pricier options we tried.
- It gave us a good balance of warmth, instruction-following, and cost efficiency for a shopping assistant that expects many short conversations instead of a few giant ones.
- This demo currently uses the free version, which is slower than paid inference, but it kept the challenge build cost-efficient.

## Local development

### Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### App URLs

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`

## Environment

- local development reads from the repo root `.env`
- deployment-friendly placeholders live in `.env.example`

## Verification

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd backend && python -m pytest
```

## Competition scope

This repository is built for a competition submission, not as a production-complete commerce platform.

If this were going to production, we would still need more work around:

- authentication and user identity
- stronger abuse protection and budget controls
- prompt/version management with evaluation loops
- better observability and conversation tracing
- durable order-safe persistence beyond short-session convenience storage
- more rigorous multilingual voice QA
- analytics, consent, privacy, and compliance reviews
