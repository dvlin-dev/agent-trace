import { describe, expect, it } from "vitest";
import { openaiResponsesAdapter } from "../../../../src/main/providers/protocol-adapters/openai-responses";
import type { CapturedExchange } from "../../../../src/shared/contracts";

function textBody(text: string, contentType: string) {
  return {
    bytes: Buffer.from(text, "utf-8"),
    contentType,
    contentEncoding: null,
  };
}

function makeExchange(
  prompt: string,
  responseText: string,
  turnId: string,
): CapturedExchange {
  return {
    exchangeId: `exchange-${turnId}`,
    providerId: "codex",
    profileId: "profile-codex-1",
    method: "POST",
    path: "/responses",
    requestHeaders: {
      "content-type": "application/json",
      session_id: "session-codex-1",
      "x-codex-turn-metadata": `{\"turn_id\":\"${turnId}\",\"sandbox\":\"none\"}`,
    },
    requestBody: textBody(
      JSON.stringify({
        model: "gpt-5.4",
        instructions: "You are Codex.",
        input: [
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: prompt }],
          },
        ],
        tools: [],
        stream: true,
        store: false,
      }),
      "application/json",
    ),
    responseHeaders: { "content-type": "text/event-stream" },
    responseBody: textBody(
      `data: {"type":"response.completed","response":{"id":"resp_${turnId}","status":"completed","output":[{"id":"msg_${turnId}","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"${responseText}"}]}]}}\n\ndata: [DONE]\n`,
      "text/event-stream",
    ),
    statusCode: 200,
    startedAt: "2026-03-13T00:00:00.000Z",
    durationMs: 180,
    requestSize: 300,
    responseSize: 120,
  };
}

function makeExchangeWithHistory(
  history: Array<{ role: string; text: string }>,
  responseText: string,
  turnId: string,
): CapturedExchange {
  const input = history.map((msg) => ({
    type: msg.role === "assistant" ? "message" : "message",
    role: msg.role,
    content: [{ type: msg.role === "assistant" ? "output_text" : "input_text", text: msg.text }],
  }));
  return {
    exchangeId: `exchange-${turnId}`,
    providerId: "codex",
    profileId: "profile-codex-1",
    method: "POST",
    path: "/responses",
    requestHeaders: {
      "content-type": "application/json",
      session_id: "session-codex-1",
    },
    requestBody: textBody(
      JSON.stringify({
        model: "gpt-5.4",
        instructions: "You are Codex.",
        input,
        tools: [],
        stream: true,
      }),
      "application/json",
    ),
    responseHeaders: { "content-type": "text/event-stream" },
    responseBody: textBody(
      `data: {"type":"response.completed","response":{"id":"resp_${turnId}","status":"completed","output":[{"id":"msg_${turnId}","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"${responseText}"}]}]}}\n\ndata: [DONE]\n`,
      "text/event-stream",
    ),
    statusCode: 200,
    startedAt: "2026-03-13T00:00:00.000Z",
    durationMs: 180,
    requestSize: 300,
    responseSize: 120,
  };
}

describe("openai responses timeline assembler", () => {
  it("assembles an incremental codex timeline across exchanges", () => {
    const first = openaiResponsesAdapter.normalize(
      makeExchange("First prompt", "first answer", "turn-1"),
    );
    const second = openaiResponsesAdapter.normalize(
      makeExchange("Second prompt", "second answer", "turn-2"),
    );

    const timeline = openaiResponsesAdapter.timelineAssembler.build([
      first,
      second,
    ]);

    expect(timeline.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(timeline.messages.at(-1)?.blocks[0]).toMatchObject({
      type: "text",
      text: "second answer",
    });
  });

  it("deduplicates messages when Codex resends full history", () => {
    // Turn 1: user sends "Hello"
    const first = openaiResponsesAdapter.normalize(
      makeExchangeWithHistory(
        [{ role: "user", text: "Hello" }],
        "Hi there!",
        "turn-1",
      ),
    );
    // Turn 2: Codex resends full history + new user message
    const second = openaiResponsesAdapter.normalize(
      makeExchangeWithHistory(
        [
          { role: "user", text: "Hello" },
          { role: "assistant", text: "Hi there!" },
          { role: "user", text: "How are you?" },
        ],
        "I'm great!",
        "turn-2",
      ),
    );

    const timeline = openaiResponsesAdapter.timelineAssembler.build([
      first,
      second,
    ]);

    // Should be 4 messages, NOT 6 (no duplicates)
    expect(timeline.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(timeline.messages[0]?.blocks[0]).toMatchObject({ text: "Hello" });
    expect(timeline.messages[1]?.blocks[0]).toMatchObject({ text: "Hi there!" });
    expect(timeline.messages[2]?.blocks[0]).toMatchObject({ text: "How are you?" });
    expect(timeline.messages[3]?.blocks[0]).toMatchObject({ text: "I'm great!" });
  });

  it("deduplicates developer/system messages across turns", () => {
    // Both turns include the same developer message in input
    const first = openaiResponsesAdapter.normalize(
      makeExchangeWithHistory(
        [
          { role: "developer", text: "System prompt here." },
          { role: "user", text: "Prompt 1" },
        ],
        "Answer 1",
        "turn-1",
      ),
    );
    const second = openaiResponsesAdapter.normalize(
      makeExchangeWithHistory(
        [
          { role: "developer", text: "System prompt here." },
          { role: "user", text: "Prompt 1" },
          { role: "assistant", text: "Answer 1" },
          { role: "user", text: "Prompt 2" },
        ],
        "Answer 2",
        "turn-2",
      ),
    );

    const timeline = openaiResponsesAdapter.timelineAssembler.build([first, second]);

    const systemMessages = timeline.messages.filter((m) => m.role === "system");
    expect(systemMessages).toHaveLength(1);
    expect(timeline.messages.map((m) => m.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
  });
});
