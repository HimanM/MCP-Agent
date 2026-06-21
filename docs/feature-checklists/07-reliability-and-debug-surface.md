# Feature 07: Reliability And Debug Surface

## Goal

Finish the candidate-inspired hardening work: predictable small-model defaults, provider fallback, and a minimal MCP debug surface for easier iteration and demos.

## Checklist

- [ ] Review candidate MCP route and rate-limiting/debug patterns
- [ ] Confirm which reliability work is already shipped versus still missing
- [ ] Add or refine a minimal MCP debug route if still valuable
- [ ] Add lightweight request hardening only where it helps the demo app
- [ ] Keep the solution small and avoid unnecessary platform complexity
- [ ] Verify provider fallback behavior against live or simulated failures
- [ ] Run backend tests relevant to provider selection and fallback
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/app/api/mcp/route.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/rate-limiter.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/mcp/client.js`
