# Feature 03: Pay Link Card

## Goal

Upgrade the checkout completion experience so successful order placement produces a visible payment-link or order-summary card instead of only plain chat text.

## Checklist

- [ ] Review candidate pay-link and order-summary implementations
- [ ] Confirm current `checkout` tool result shape from the MCP
- [ ] Add structured order payload support to backend tool-result events
- [ ] Add a dedicated pay-link or order-summary card component
- [ ] Surface price lock / payment guidance clearly in the UI
- [ ] Preserve the existing cart and checkout drawer flow
- [ ] Verify behavior for success and incomplete-checkout cases
- [ ] Run backend tests relevant to order payload parsing
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Verify the flow in a live browser session
- [ ] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/kavi-kapruka/components/checkout/PayLinkCard.tsx`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/components/OrderSummary.js`
