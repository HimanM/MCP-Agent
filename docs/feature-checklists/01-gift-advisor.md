# Feature 01: Gift Advisor

## Goal

Ship a guided gift-finder flow inspired by the candidate repos, but reuse the existing chat, product cards, and cart UI instead of adding a new agent stack.

## Checklist

- [x] Review candidate implementations for gift-advisor UX and prompt strategy
- [x] Pick a ponytail implementation that fits the current architecture
- [x] Add a per-feature Gift Advisor checklist file
- [x] Add a guided Gift Advisor modal to the frontend
- [x] Add visible entry points from the landing state and active chat state
- [x] Build a stable composed prompt from advisor selections
- [x] Verify product results still render as cards and cart actions still work
- [x] Run lint
- [x] Run production build
- [x] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/kavi-kapruka/components/gift/GiftAdvisor.tsx`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/agents/gift-agent.js`
- ponytail: keep this frontend-only for iteration 1; use the existing chat toolchain before adding a dedicated gift backend.
- Browser verification note: the live repo `.env` currently allows `http://localhost:3000`, so verification used `localhost` rather than `127.0.0.1`.
