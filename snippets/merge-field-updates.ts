// Illustrates the AI/deterministic boundary from the README: the LLM extracts
// candidate field values across chat turns, but this merge is a plain
// deterministic function — no model call, no ambiguity about what "wins".

import type { ChatAgentResponse } from "./stages";

/** Merge field_updates from every assistant turn (later turns override earlier keys). */
export function mergeChatFieldUpdates(
  structuredResponses: Array<Pick<ChatAgentResponse, "field_updates"> | null | undefined>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const response of structuredResponses) {
    const updates = response?.field_updates;
    if (!updates || typeof updates !== "object") continue;
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null && value !== "") {
        merged[key] = value;
      }
    }
  }
  return merged;
}
