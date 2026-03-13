import type { RequestRecord } from "../../shared/types";
import {
  deriveSessionKey,
  hashSystemPrompt,
  type SessionCandidate,
} from "./derive-session";
import { extractUserText } from "../../shared/extract-user-text";

export class SessionManager {
  /** Primary: metadata session key → our sessionId */
  private metadataMap = new Map<string, string>();

  /** Fallback: content-based candidates for clients without metadata */
  private candidates: SessionCandidate[] = [];

  assignSession(record: RequestRecord): string {
    // Strategy 1: Use metadata.user_id from request body (Claude Code sends this)
    const metaKey = this.extractMetadataSessionKey(record.requestBody);
    if (metaKey) {
      const existing = this.metadataMap.get(metaKey);
      if (existing) return existing;

      const sessionId = crypto.randomUUID();
      this.metadataMap.set(metaKey, sessionId);
      return sessionId;
    }

    // Fallback: content-based matching for clients without metadata
    const requestTimestamp = new Date(record.timestamp).getTime();

    const existingId = deriveSessionKey(
      record.requestBody,
      this.candidates,
      requestTimestamp,
      record.path,
    );

    if (existingId) {
      const candidate = this.candidates.find(
        (c) => c.sessionId === existingId,
      );
      if (candidate) {
        candidate.lastUpdated = requestTimestamp;
        candidate.lastMessages = this.extractMessages(record.requestBody);
      }
      return existingId;
    }

    // Create new session
    const sessionId = crypto.randomUUID();
    const sysHash = this.extractSystemHash(record.requestBody);

    this.candidates.push({
      sessionId,
      systemHash: sysHash,
      lastMessages: this.extractMessages(record.requestBody),
      lastUpdated: requestTimestamp,
      path: record.path,
    });

    return sessionId;
  }

  generateTitle(record: RequestRecord): string {
    try {
      if (record.requestBody) {
        const body = JSON.parse(record.requestBody);
        if (Array.isArray(body.messages)) {
          for (const msg of body.messages) {
            if (msg.role !== "user") continue;
            const text = extractUserText(msg.content);
            if (text.length > 0) {
              return text.slice(0, 50);
            }
          }
        }
      }
    } catch {
      // ignore
    }
    const model = record.model ?? "unknown";
    return `${model} @ ${record.timestamp}`;
  }

  /**
   * Extract session key from metadata.user_id.
   * Claude Code sends: "user_<hash>_account__session_<uuid>"
   * We extract the session UUID after "_session_" as the stable identifier.
   * Falls back to the full user_id if the format doesn't match.
   */
  private extractMetadataSessionKey(body: string | null): string | null {
    if (!body) return null;
    try {
      const parsed = JSON.parse(body);
      const userId = parsed.metadata?.user_id;
      if (typeof userId === "string" && userId.length > 0) {
        const sessionIdx = userId.indexOf("_session_");
        if (sessionIdx !== -1) {
          return userId.slice(sessionIdx + "_session_".length);
        }
        return userId;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private extractSystemHash(body: string | null): string | null {
    if (!body) return null;
    try {
      const parsed = JSON.parse(body);
      return hashSystemPrompt(parsed.system);
    } catch {
      return null;
    }
  }

  private extractMessages(body: string | null): unknown[] | null {
    if (!body) return null;
    try {
      const parsed = JSON.parse(body);
      return Array.isArray(parsed.messages) ? parsed.messages : null;
    } catch {
      return null;
    }
  }
}
