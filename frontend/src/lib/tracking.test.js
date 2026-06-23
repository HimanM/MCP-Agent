const assert = require("node:assert/strict");

function normalizeStatus(status) {
  return status.trim().toLowerCase();
}

function describeTrackingStatus(status) {
  const normalized = normalizeStatus(status);
  if (!normalized) {
    return {
      summary: "We have the latest order snapshot, but Kapruka did not return a clear delivery state yet.",
      nextStep: "If the order number is correct, check again a bit later for a fuller update.",
    };
  }
  if (normalized.includes("deliver")) {
    return {
      summary: "This order has been completed and should already be with the recipient.",
      nextStep: "If the recipient still has not received it, contact support with the order number.",
    };
  }
  if (normalized.includes("ship") || normalized.includes("transit")) {
    return {
      summary: "The order is already moving through delivery and is on the way.",
      nextStep: "Best move now is to wait for the next scan unless the delivery window is already missed.",
    };
  }
  if (normalized.includes("process") || normalized.includes("pending")) {
    return {
      summary: "Kapruka has the order, but it is still being prepared before dispatch.",
      nextStep: "No action needed yet. Check again if it stays in this state longer than expected.",
    };
  }
  if (normalized.includes("cancel")) {
    return {
      summary: "This order looks cancelled and is no longer moving toward delivery.",
      nextStep: "Contact support or place a fresh order if you still need the item.",
    };
  }
  return {
    summary: "This is the latest delivery state returned by Kapruka.",
    nextStep: "Use the timeline below for the newest movement and check again later if needed.",
  };
}

function getTrackingSupportGuidance(tracking) {
  const normalized = normalizeStatus(tracking.status);

  if (normalized.includes("deliver")) {
    return {
      support: "If the recipient still cannot find the order, contact Kapruka support and share the order number plus delivery address.",
      expectation: "The next expected step should be recipient confirmation rather than another delivery scan.",
      editNote: "Order edits are not supported in the current assistant flow once an order is already moving or completed.",
    };
  }

  if (normalized.includes("ship") || normalized.includes("transit")) {
    return {
      support: "If this stays unchanged past the expected delivery window, contact Kapruka support with the order number for a manual check.",
      expectation: "The next likely update is another delivery scan or a delivered status.",
      editNote: "The current assistant can track this order, but it cannot edit an in-transit order yet.",
    };
  }

  if (normalized.includes("process") || normalized.includes("pending")) {
    return {
      support: "If it remains in this state much longer than expected, contact Kapruka support before the delivery date slips.",
      expectation: "The next likely update is dispatch or a fresh timeline event from the warehouse.",
      editNote: "The current assistant does not support editing placed orders yet, so treat this as a tracking-only step.",
    };
  }

  if (normalized.includes("cancel")) {
    return {
      support: "If the cancellation was unexpected, contact Kapruka support before placing a replacement order.",
      expectation: "The next step is usually support clarification or a fresh order, not more tracking movement.",
      editNote: "The assistant cannot reopen or edit a cancelled order through the current MCP flow.",
    };
  }

  return {
    support: "If the status looks stuck or unclear, contact Kapruka support with the order number for a manual update.",
    expectation: "The next likely step is another timeline scan once Kapruka updates the order.",
    editNote: "Order editing is not supported in the current assistant flow yet.",
  };
}

assert.match(describeTrackingStatus("Delivered").summary, /completed/i);
assert.match(describeTrackingStatus("Shipped").summary, /on the way/i);
assert.match(describeTrackingStatus("Processing").summary, /being prepared/i);
assert.match(describeTrackingStatus("Cancelled").nextStep, /contact support/i);
assert.match(getTrackingSupportGuidance({ status: "Shipped" }).support, /expected delivery window/i);
assert.match(getTrackingSupportGuidance({ status: "Processing" }).expectation, /dispatch/i);
assert.match(getTrackingSupportGuidance({ status: "Delivered" }).editNote, /not supported/i);

console.log("tracking.test.js ok");
