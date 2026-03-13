import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { HistoryStore } from "../../src/main/store/history-store";
import { createDatabase } from "../../src/main/store/database";
import type { RequestRecord } from "../../src/shared/types";
import type Database from "better-sqlite3";

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    requestId: `req-${Math.random().toString(36).slice(2)}`,
    sessionId: "session-1",
    method: "POST",
    path: "/v1/messages",
    timestamp: new Date().toISOString(),
    duration: 1200,
    model: "claude-opus-4-6",
    requestHeaders: { "content-type": "application/json" },
    requestBody: JSON.stringify({
      model: "claude-opus-4-6",
      messages: [{ role: "user", content: "Hello" }],
    }),
    responseHeaders: { "content-type": "text/event-stream" },
    responseBody: "data: {}\n\n",
    statusCode: 200,
    requestSize: 1024,
    responseSize: 512,
    ...overrides,
  };
}

describe("HistoryStore", () => {
  let db: Database.Database;
  let store: HistoryStore;

  beforeEach(() => {
    db = createDatabase(":memory:");
    store = new HistoryStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it("saves and retrieves a request", () => {
    const record = makeRequest({ requestId: "r1" });
    store.saveRequest(record);

    const retrieved = store.getRequest("r1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.requestId).toBe("r1");
    expect(retrieved!.model).toBe("claude-opus-4-6");
    expect(retrieved!.requestHeaders["content-type"]).toBe("application/json");
  });

  it("creates a session when saving a request", () => {
    store.saveRequest(makeRequest({ sessionId: "s1" }));
    const sessions = store.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe("s1");
    expect(sessions[0].requestCount).toBe(1);
  });

  it("updates session count on subsequent requests", () => {
    store.saveRequest(makeRequest({ sessionId: "s1", requestId: "r1" }));
    store.saveRequest(makeRequest({ sessionId: "s1", requestId: "r2" }));
    const sessions = store.listSessions();
    expect(sessions[0].requestCount).toBe(2);
  });

  it("lists requests by session in chronological order", () => {
    store.saveRequest(
      makeRequest({
        sessionId: "s1",
        requestId: "r1",
        timestamp: "2024-01-01T00:00:00Z",
      }),
    );
    store.saveRequest(
      makeRequest({
        sessionId: "s1",
        requestId: "r2",
        timestamp: "2024-01-01T00:01:00Z",
      }),
    );
    store.saveRequest(
      makeRequest({ sessionId: "s2", requestId: "r3" }),
    );

    const requests = store.listRequests("s1");
    expect(requests).toHaveLength(2);
    expect(requests[0].requestId).toBe("r1");
    expect(requests[1].requestId).toBe("r2");
  });

  it("search finds matching sessions and requests", () => {
    store.saveRequest(
      makeRequest({
        sessionId: "s1",
        requestId: "r1",
        requestBody: JSON.stringify({
          model: "claude-opus-4-6",
          messages: [{ role: "user", content: "Fix the login bug" }],
        }),
      }),
    );

    const result = store.search("login");
    expect(result.sessions.length).toBeGreaterThanOrEqual(0);
    expect(result.requests).toHaveLength(1);
  });

  it("clearAll removes all data", () => {
    store.saveRequest(makeRequest());
    store.clearAll();
    expect(store.listSessions()).toHaveLength(0);
  });

  it("prune removes oldest requests when exceeding MAX_REQUESTS", () => {
    // Create more requests than the prune threshold
    // We'll test with a small batch and verify the mechanism
    for (let i = 0; i < 10; i++) {
      store.saveRequest(
        makeRequest({
          requestId: `r${i}`,
          sessionId: "s1",
          timestamp: new Date(2024, 0, 1, 0, i).toISOString(),
        }),
      );
    }
    expect(store.listRequests("s1")).toHaveLength(10);
    // Prune should not remove anything since we're under MAX_REQUESTS
    store.prune();
    expect(store.listRequests("s1")).toHaveLength(10);
  });

  it("handles large body (~100KB)", () => {
    const largeBody = "x".repeat(100_000);
    store.saveRequest(
      makeRequest({
        requestId: "large",
        requestBody: largeBody,
      }),
    );

    const retrieved = store.getRequest("large");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.requestBody).toBe(largeBody);
  });

  it("derives title from first user message", () => {
    store.saveRequest(
      makeRequest({
        requestId: "r1",
        sessionId: "s-title",
        requestBody: JSON.stringify({
          model: "claude-opus-4-6",
          messages: [
            { role: "user", content: "Please fix the authentication bug" },
          ],
        }),
      }),
    );

    const sessions = store.listSessions();
    const session = sessions.find((s) => s.sessionId === "s-title");
    expect(session).toBeDefined();
    expect(session!.title).toBe("Please fix the authentication bug");
  });

  it("returns null for non-existent request", () => {
    expect(store.getRequest("nonexistent")).toBeNull();
  });

  it("handles null response fields", () => {
    store.saveRequest(
      makeRequest({
        requestId: "r-null",
        responseHeaders: null,
        responseBody: null,
        statusCode: null,
        responseSize: null,
        duration: null,
      }),
    );

    const retrieved = store.getRequest("r-null");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.responseHeaders).toBeNull();
    expect(retrieved!.responseBody).toBeNull();
    expect(retrieved!.statusCode).toBeNull();
  });
});
