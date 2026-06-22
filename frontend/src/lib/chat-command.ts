export type ChatCommand = { type: "status" };

export function parseChatCommand(input: string): ChatCommand | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === "/status") {
    return { type: "status" };
  }
  return null;
}
