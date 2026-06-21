# Feature 07: Reliability And Debug Surface

## Goal

Finish the candidate-inspired hardening work: predictable small-model defaults, provider fallback, and a minimal MCP debug surface for easier iteration and demos.

## Checklist

- [x] Review candidate MCP route and rate-limiting/debug patterns
- [x] Confirm which reliability work is already shipped versus still missing
- [x] Add or refine a minimal MCP debug route if still valuable
- [x] Add lightweight request hardening only where it helps the demo app
- [x] Keep the solution small and avoid unnecessary platform complexity
- [x] Verify provider fallback behavior against live or simulated failures
- [x] Run backend tests relevant to provider selection and fallback
- [x] Run `npm run lint`
- [x] Run `npm run build`
- [x] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/app/api/mcp/route.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/rate-limiter.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/mcp/client.js`
- Existing provider fallback and small-model defaults were already shipped earlier, so this iteration only adds the missing MCP debug surface.
- The debug surface is intentionally tiny: `GET /api/mcp/debug` for tool visibility and `POST /api/mcp/debug` for explicit `kapruka_*` tool calls only.
- Lightweight hardening added:
  - only `kapruka_*` tools are allowed
  - params must be JSON-serializable
  - params payload is capped at 5 KB
- Verification evidence:
  - `python -m unittest tests.test_mcp_debug_route tests.test_provider_selection tests.test_mcp_client tests.test_chat_route`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - live route checks against local backend:
    - `GET /api/mcp/debug` responded successfully
    - invalid `POST /api/mcp/debug` with non-`kapruka_*` tool returned `400`
