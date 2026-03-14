import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

function fixture(name: string): string {
  return readFileSync(
    resolve(
      __dirname,
      "../../../fixtures/protocols/openai-responses",
      name,
    ),
    "utf-8",
  );
}

function makeExchange(): CapturedExchange {
  return {
    exchangeId: "exchange-openai-1",
    providerId: "codex",
    profileId: "profile-codex-1",
    method: "POST",
    path: "/responses",
    requestHeaders: {
      "content-type": "application/json",
      session_id: "session-codex-1",
      "x-codex-turn-metadata":
        "{\"turn_id\":\"turn-codex-1\",\"sandbox\":\"none\"}",
    },
    requestBody: textBody(fixture("request.json"), "application/json"),
    responseHeaders: { "content-type": "text/event-stream" },
    responseBody: textBody(fixture("response.sse.txt"), "text/event-stream"),
    statusCode: 200,
    startedAt: "2026-03-13T00:00:00.000Z",
    durationMs: 180,
    requestSize: 20876,
    responseSize: 1024,
  };
}

describe("openai responses normalize", () => {
  it("normalizes a codex exchange into NormalizedExchange", () => {
    const normalized = openaiResponsesAdapter.normalize(makeExchange());

    expect(normalized.providerId).toBe("codex");
    expect(normalized.endpointKind).toBe("responses");
    expect(normalized.model).toBe("gpt-5.4");
    expect(normalized.request.instructions[0]).toEqual({
      type: "text",
      text: expect.stringContaining("You are Codex"),
    });
    expect(normalized.request.tools[0]?.name).toBe("exec_command");
    expect(normalized.request.inputMessages.at(-1)?.blocks[0]).toEqual({
      type: "text",
      text: "Reply with exactly the word probe.",
    });
    expect(normalized.response.outputMessages[0]?.role).toBe("assistant");
    expect(normalized.response.outputMessages[0]?.blocks[0]).toEqual({
      type: "text",
      text: "probe",
    });
    expect(normalized.response.usage).toEqual({
      inputTokens: 123,
      outputTokens: 1,
      reasoningTokens: 0,
    });
  });

  it("extracts reasoning_tokens from output_tokens_details", () => {
    const exchange = makeExchange();
    exchange.responseBody = textBody(
      [
        `data: {"type":"response.completed","response":{"id":"resp_1","status":"completed","model":"o3","output":[{"id":"msg_1","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"answer"}]}],"usage":{"input_tokens":100,"output_tokens":50,"output_tokens_details":{"reasoning_tokens":30},"total_tokens":150}}}`,
        "data: [DONE]",
        "",
      ].join("\n"),
      "text/event-stream",
    );
    const normalized = openaiResponsesAdapter.normalize(exchange);
    expect(normalized.response.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      reasoningTokens: 30,
    });
  });

  it("parses reasoning output items with summary array", () => {
    const exchange = makeExchange();
    exchange.responseBody = textBody(
      [
        `data: {"type":"response.completed","response":{"id":"resp_1","status":"completed","model":"o3","output":[{"id":"rs_1","type":"reasoning","summary":[{"type":"summary_text","text":"Thinking about the problem."},{"type":"summary_text","text":"Considering options."}]},{"id":"msg_1","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"done"}]}],"usage":{"input_tokens":10,"output_tokens":5,"output_tokens_details":{"reasoning_tokens":20},"total_tokens":15}}}`,
        "data: [DONE]",
        "",
      ].join("\n"),
      "text/event-stream",
    );
    const normalized = openaiResponsesAdapter.normalize(exchange);
    expect(normalized.response.outputMessages[0]).toEqual({
      role: "assistant",
      blocks: [{ type: "reasoning", text: "Thinking about the problem.\nConsidering options." }],
    });
    expect(normalized.response.outputMessages[1]?.blocks[0]).toEqual({
      type: "text",
      text: "done",
    });
  });

  it("captures reasoning summary text from SSE delta events", () => {
    const exchange = makeExchange();
    exchange.responseBody = textBody(
      [
        `data: {"type":"response.output_item.added","output_index":0,"item":{"id":"rs_1","type":"reasoning"}}`,
        `data: {"type":"response.reasoning_summary_text.delta","output_index":0,"summary_index":0,"delta":"Thinking"}`,
        `data: {"type":"response.reasoning_summary_text.delta","output_index":0,"summary_index":0,"delta":" hard."}`,
        `data: {"type":"response.reasoning_summary_text.done","output_index":0,"summary_index":0,"text":"Thinking hard."}`,
        `data: {"type":"response.output_item.done","output_index":0,"item":{"id":"rs_1","type":"reasoning","summary":[{"type":"summary_text","text":"Thinking hard."}]}}`,
        `data: {"type":"response.completed","response":{"id":"resp_1","status":"completed","output":[{"id":"rs_1","type":"reasoning","summary":[{"type":"summary_text","text":"Thinking hard."}]}],"usage":{"input_tokens":5,"output_tokens":3,"output_tokens_details":{"reasoning_tokens":10},"total_tokens":8}}}`,
        "data: [DONE]",
        "",
      ].join("\n"),
      "text/event-stream",
    );
    const normalized = openaiResponsesAdapter.normalize(exchange);
    expect(normalized.response.outputMessages[0]).toEqual({
      role: "assistant",
      blocks: [{ type: "reasoning", text: "Thinking hard." }],
    });
  });
});
