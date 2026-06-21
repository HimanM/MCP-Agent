# Feature 03: Pay Link Card

## Goal

Upgrade the checkout completion experience so successful order placement produces a visible payment-link or order-summary card instead of only plain chat text.

## Checklist

- [x] Review candidate pay-link and order-summary implementations
- [x] Confirm current `checkout` tool result shape from the MCP
- [x] Add structured order payload support to backend tool-result events
- [x] Add a dedicated pay-link or order-summary card component
- [x] Surface price lock / payment guidance clearly in the UI
- [x] Preserve the existing cart and checkout drawer flow
- [x] Verify behavior for success and incomplete-checkout cases
- [x] Run backend tests relevant to order payload parsing
- [x] Run `npm run lint`
- [x] Run `npm run build`
- [x] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/kavi-kapruka/components/checkout/PayLinkCard.tsx`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/components/OrderSummary.js`
- Success card parsing is verified with a representative `checkout` tool-result test instead of placing a real Kapruka order.
- Live browser verification used `http://localhost:3000` with a Playwright fallback because the in-app Browser tool was not callable in this thread.
- Incomplete checkout browser check: "Place my order now" stayed text-only and did not render a payment card.
