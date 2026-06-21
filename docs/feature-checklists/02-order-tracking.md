# Feature 02: Order Tracking

## Goal

Add order-tracking capability inspired by the candidate repos, including a friendly prompt flow, MCP-backed tracking tool support, and a dedicated tracking status card in chat.

## Checklist

- [x] Review candidate tracking implementations and card layouts
- [x] Pick the smallest tracking flow that fits the current architecture
- [x] Add backend `track_order` tool wrapper around `kapruka_track_order`
- [x] Add structured tracking payload support to tool-result events
- [x] Add tracking card component in the frontend
- [x] Add clear entry points from quick actions or common prompts
- [x] Handle the no-order-number case with a helpful assistant response
- [x] Verify tracking render logic with a representative response shape
- [x] Run backend tests relevant to provider/tool behavior
- [x] Run `npm run lint`
- [x] Run `npm run build`
- [x] Verify the flow in a live browser session
- [x] Commit, push branch, and open draft PR

## Notes

- Candidate reference: `tmp_compare/kavi-kapruka/components/checkout/TrackOrderCard.tsx`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/components/TrackingCard.js`
- Candidate reference: `tmp_compare/Kapruka-Ai-Shopping-Agent/lib/agents/tracking-agent.js`
- Browser verification used `http://localhost:3000` through a Playwright fallback because the in-app Browser tool was not callable in this thread.
- Live browser checks covered:
  - Missing-order-number flow: "I want to track my order" returns a direct request for the Kapruka order number.
  - Tool path flow: "Track order 12345678" executes the tracking path and returns a graceful not-found response.
- Follow-up UI polish added empty-state hero buttons for tracking and category browsing.
- Structured tracking payload normalization is covered by backend unit tests with a representative JSON response shape.
