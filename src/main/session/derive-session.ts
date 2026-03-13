import { createHash } from "node:crypto";

export interface SessionCandidate {
  sessionId: string;
  systemHash: string | null;
  lastMessages: unknown[] | null;
  lastUpdated: number; // timestamp ms
  path: string;
}

/**
 * Hash system prompt for session matching.
 * Skips blocks that look like billing/metadata headers (not part of the real prompt).
 */
export function hashSystemPrompt(system: unknown): string | null {
  if (!system) return null;

  let text: string;
  if (typeof system === "string") {
    text = system;
  } else if (Array.isArray(system)) {
    text = system
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "text" in item) {
          const t = (item as { text: string }).text;
          // Skip billing/metadata headers that change every request
          if (t.startsWith("x-anthropic-") || t.startsWith("X-Anthropic-")) {
            return "";
          }
          return t;
        }
        return JSON.stringify(item);
      })
      .join("");
  } else {
    return null;
  }

  if (text.length === 0) return null;

  // Use first 1000 chars of the stable content
  const input = text.slice(0, 1000);
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * Extract plain text from message content.
 * Normalizes both string content and array content to the same representation.
 * e.g. "hi" and [{type:"text", text:"hi", cache_control:...}] both become "hi"
 */
function extractContentText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (typeof block === "object" && block !== null) {
          const b = block as Record<string, unknown>;
          if (b.type === "text" || b.type === "thinking") return String(b.text ?? "");
          if (b.type === "tool_use") return `[tool_use:${b.name}:${b.id ?? ""}]`;
          if (b.type === "tool_result") return `[tool_result:${b.tool_use_id ?? ""}]`;
          return `[${b.type ?? "unknown"}]`;
        }
        return String(block);
      })
      .join("|");
  }

  return JSON.stringify(content);
}

/**
 * Normalized message fingerprint for comparison.
 * Ignores cache_control, handles string↔array content format changes.
 */
function messageFingerprint(msg: unknown): string {
  if (typeof msg !== "object" || msg === null) return JSON.stringify(msg);

  const m = msg as Record<string, unknown>;
  const role = m.role ?? "";
  return `${role}::${extractContentText(m.content)}`;
}

export function isMessageSuperSet(
  existingMessages: unknown[],
  newMessages: unknown[],
): boolean {
  if (
    !Array.isArray(existingMessages) ||
    !Array.isArray(newMessages) ||
    existingMessages.length === 0 ||
    newMessages.length <= existingMessages.length
  ) {
    return false;
  }

  // Check if newMessages starts with all of existingMessages (lenient comparison)
  for (let i = 0; i < existingMessages.length; i++) {
    if (messageFingerprint(existingMessages[i]) !== messageFingerprint(newMessages[i])) {
      return false;
    }
  }
  return true;
}

export function deriveSessionKey(
  body: string | null,
  candidates: SessionCandidate[],
  _requestTimestamp: number,
  _requestPath: string,
): string | null {
  if (!body) return null;

  let parsed: { system?: unknown; messages?: unknown[] };
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  const messages = Array.isArray(parsed.messages) ? parsed.messages : null;

  // Strategy 1: System hash match + message superset (strongest signal)
  // Both conditions required — same system prompt AND messages are a continuation.
  const sysHash = hashSystemPrompt(parsed.system);
  if (sysHash && messages) {
    const hashMatches = candidates.filter((c) => c.systemHash === sysHash);
    for (const candidate of hashMatches) {
      if (
        candidate.lastMessages &&
        isMessageSuperSet(candidate.lastMessages, messages)
      ) {
        return candidate.sessionId;
      }
    }
    // System hash match but only 1 message (first turn) — check if candidate
    // also had only 1 message (i.e. no conversation built yet). Otherwise
    // a brand-new conversation in the same project would merge with an
    // existing one.
    if (messages.length === 1) {
      const fresh = hashMatches.filter(
        (c) => !c.lastMessages || c.lastMessages.length === 0,
      );
      if (fresh.length === 1) {
        return fresh[0].sessionId;
      }
    }
  }

  // Strategy 2: Message superset only (handles dynamic system prompts)
  if (messages) {
    for (const candidate of candidates) {
      if (
        candidate.lastMessages &&
        isMessageSuperSet(candidate.lastMessages, messages)
      ) {
        return candidate.sessionId;
      }
    }
  }

  return null; // New session needed
}
