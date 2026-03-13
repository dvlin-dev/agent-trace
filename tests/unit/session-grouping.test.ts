import { describe, it, expect } from "vitest";
import { SessionManager } from "../../src/main/session/session-manager";
import type { RequestRecord } from "../../src/shared/types";

function makeRecord(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    requestId: `req-${Math.random().toString(36).slice(2)}`,
    sessionId: "",
    method: "POST",
    path: "/v1/messages",
    timestamp: new Date().toISOString(),
    duration: 1000,
    model: "claude-opus-4-6",
    requestHeaders: {},
    requestBody: JSON.stringify({
      model: "claude-opus-4-6",
      system: "You are a helpful assistant.",
      messages: [{ role: "user", content: "Hello" }],
    }),
    responseHeaders: null,
    responseBody: null,
    statusCode: 200,
    requestSize: 100,
    responseSize: null,
    ...overrides,
  };
}

describe("SessionManager", () => {
  it("assigns same session for same system prompt", () => {
    const mgr = new SessionManager();

    const r1 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are a coding assistant.",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are a coding assistant.",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!" },
          { role: "user", content: "Help me" },
        ],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s1).toBe(s2);
  });

  it("assigns different sessions for different system prompts", () => {
    const mgr = new SessionManager();

    const r1 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are a coding assistant.",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are a math tutor.",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s1).not.toBe(s2);
  });

  it("groups by message superset relationship", () => {
    const mgr = new SessionManager();

    const msgs1 = [{ role: "user", content: "Hello" }];
    const msgs2 = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi!" },
      { role: "user", content: "More" },
    ];

    const r1 = makeRecord({
      requestBody: JSON.stringify({ messages: msgs1 }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({ messages: msgs2 }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s1).toBe(s2);
  });

  it("separates two conversations with same system prompt but different messages", () => {
    const mgr = new SessionManager();

    // Session A: multi-turn conversation
    const r1 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are Claude Code. Dir: /project",
        messages: [{ role: "user", content: "fix the bug" }],
      }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are Claude Code. Dir: /project",
        messages: [
          { role: "user", content: "fix the bug" },
          { role: "assistant", content: "Done!" },
          { role: "user", content: "add tests" },
        ],
      }),
    });

    // Session B: new conversation in same project directory
    const r3 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are Claude Code. Dir: /project",
        messages: [{ role: "user", content: "refactor auth module" }],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    const s3 = mgr.assignSession(r3);

    expect(s2).toBe(s1); // same conversation
    expect(s3).not.toBe(s1); // different conversation
  });

  it("separates unrelated conversations without system prompt", () => {
    const mgr = new SessionManager();

    const r1 = makeRecord({
      requestBody: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        messages: [{ role: "user", content: "Completely different topic" }],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s1).not.toBe(s2);
  });

  it("generates title from first user message", () => {
    const mgr = new SessionManager();

    const r = makeRecord({
      requestBody: JSON.stringify({
        messages: [
          { role: "user", content: "Fix the authentication bug in login.ts" },
        ],
      }),
    });

    expect(mgr.generateTitle(r)).toBe(
      "Fix the authentication bug in login.ts",
    );
  });

  it("generates title skipping system-reminder blocks", () => {
    const mgr = new SessionManager();

    // Real Claude Code pattern: first user message has system-reminder blocks
    const r = makeRecord({
      requestBody: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "<system-reminder>\nThe following skills are available..." },
              { type: "text", text: "<system-reminder>\nAs you answer the user's questions..." },
              { type: "text", text: "Fix the bug in auth.ts" },
            ],
          },
        ],
      }),
    });

    expect(mgr.generateTitle(r)).toBe("Fix the bug in auth.ts");
  });

  it("title falls back to model @ timestamp", () => {
    const mgr = new SessionManager();

    const r = makeRecord({
      model: "claude-opus-4-6",
      timestamp: "2024-01-01T00:00:00Z",
      requestBody: JSON.stringify({ messages: [] }),
    });

    expect(mgr.generateTitle(r)).toBe(
      "claude-opus-4-6 @ 2024-01-01T00:00:00Z",
    );
  });

  it("groups when messages gain cache_control between turns", () => {
    const mgr = new SessionManager();

    // Turn 1: simple user message
    const r1 = makeRecord({
      requestBody: JSON.stringify({
        system: [
          { type: "text", text: "You are a coding assistant." },
        ],
        messages: [
          { role: "user", content: [{ type: "text", text: "Hello" }] },
        ],
      }),
    });

    // Turn 2: Claude Code adds cache_control to previous messages for prompt caching
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        system: [
          { type: "text", text: "You are a coding assistant.", cache_control: { type: "ephemeral" } },
        ],
        messages: [
          { role: "user", content: [{ type: "text", text: "Hello", cache_control: { type: "ephemeral" } }] },
          { role: "assistant", content: [{ type: "text", text: "Hi there!" }] },
          { role: "user", content: [{ type: "text", text: "Help me fix a bug" }] },
        ],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s2).toBe(s1);
  });

  it("groups when content format changes from string to array between turns", () => {
    const mgr = new SessionManager();

    // Turn 1: content as string
    const r1 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are helpful.",
        messages: [
          { role: "user", content: "Hello" },
        ],
      }),
    });

    // Turn 2: same message now has array content + cache_control
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are helpful.",
        messages: [
          { role: "user", content: [{ type: "text", text: "Hello", cache_control: { type: "ephemeral" } }] },
          { role: "assistant", content: [{ type: "text", text: "Hi!" }] },
          { role: "user", content: "How are you?" },
        ],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s2).toBe(s1);
  });

  it("groups when system prompt gains cache_control between turns", () => {
    const mgr = new SessionManager();

    const r1 = makeRecord({
      requestBody: JSON.stringify({
        system: [
          { type: "text", text: "Long system prompt here..." },
        ],
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    // Same system text but with cache_control added
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        system: [
          { type: "text", text: "Long system prompt here...", cache_control: { type: "ephemeral" } },
        ],
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
          { role: "user", content: "Next question" },
        ],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s2).toBe(s1);
  });

  it("groups when system prompt text changes between turns (dynamic context)", () => {
    const mgr = new SessionManager();

    // Turn 1: initial system prompt
    const r1 = makeRecord({
      requestBody: JSON.stringify({
        system: [
          { type: "text", text: "You are Claude Code. Current dir: /project\nFiles: a.ts, b.ts" },
        ],
        messages: [
          { role: "user", content: [{ type: "text", text: "fix the bug" }] },
        ],
      }),
    });

    // Turn 2: system prompt changed (compressed context, new file listings)
    // AND messages have cache_control added
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        system: [
          { type: "text", text: "You are Claude Code. Current dir: /project\nFiles: a.ts, b.ts, c.ts\nRecent: edited a.ts", cache_control: { type: "ephemeral" } },
        ],
        messages: [
          { role: "user", content: [{ type: "text", text: "fix the bug", cache_control: { type: "ephemeral" } }] },
          { role: "assistant", content: [{ type: "text", text: "I fixed it" }] },
          { role: "user", content: [{ type: "text", text: "now add tests" }] },
        ],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s2).toBe(s1);
  });

  it("groups when tool_use/tool_result messages differ in metadata", () => {
    const mgr = new SessionManager();

    const r1 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are helpful.",
        messages: [
          { role: "user", content: "read file.ts" },
          { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Read", input: { path: "file.ts" } }] },
        ],
      }),
    });

    // Turn 2: same messages but with cache_control
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        system: "You are helpful.",
        messages: [
          { role: "user", content: [{ type: "text", text: "read file.ts", cache_control: { type: "ephemeral" } }] },
          { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Read", input: { path: "file.ts" } }] },
          { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "file contents..." }] },
          { role: "assistant", content: [{ type: "text", text: "Here is the file" }] },
          { role: "user", content: "looks good, thanks" },
        ],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s2).toBe(s1);
  });

  it("handles array-style system prompts", () => {
    const mgr = new SessionManager();

    const system = [
      { type: "text", text: "You are a coding assistant.", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Follow best practices." },
    ];

    const r1 = makeRecord({
      requestBody: JSON.stringify({ system, messages: [{ role: "user", content: "Hi" }] }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({ system, messages: [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello!" }, { role: "user", content: "Help" }] }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s1).toBe(s2);
  });

  // --- metadata.user_id tests (Claude Code primary strategy) ---

  it("groups by metadata.user_id when present", () => {
    const mgr = new SessionManager();
    const sessionKey = "user_abc123_account__session_f734dcf6-a1a8-4ae0-929c-d081a80be471";

    const r1 = makeRecord({
      requestBody: JSON.stringify({
        model: "claude-opus-4-6",
        metadata: { user_id: sessionKey },
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        model: "claude-opus-4-6",
        metadata: { user_id: sessionKey },
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!" },
          { role: "user", content: "More" },
        ],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s1).toBe(s2);
  });

  it("separates sessions with different metadata.user_id", () => {
    const mgr = new SessionManager();

    const r1 = makeRecord({
      requestBody: JSON.stringify({
        metadata: { user_id: "user_abc_account__session_aaaa" },
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        metadata: { user_id: "user_abc_account__session_bbbb" },
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s1).not.toBe(s2);
  });

  it("metadata.user_id takes priority over content matching", () => {
    const mgr = new SessionManager();

    // Same system prompt, messages are superset, but different metadata session
    const r1 = makeRecord({
      requestBody: JSON.stringify({
        metadata: { user_id: "user_abc_account__session_aaaa" },
        system: "You are helpful.",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const r2 = makeRecord({
      requestBody: JSON.stringify({
        metadata: { user_id: "user_abc_account__session_bbbb" },
        system: "You are helpful.",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!" },
          { role: "user", content: "More" },
        ],
      }),
    });

    const s1 = mgr.assignSession(r1);
    const s2 = mgr.assignSession(r2);
    expect(s1).not.toBe(s2); // different sessions despite content match
  });
});
