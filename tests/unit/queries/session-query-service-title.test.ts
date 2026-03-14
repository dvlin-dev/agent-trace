import { describe, expect, it } from "vitest";
import { createProviderCatalog } from "../../../src/main/providers/provider-catalog";
import { anthropicMessagesAdapter } from "../../../src/main/providers/protocol-adapters/anthropic-messages";
import { SessionQueryService } from "../../../src/main/queries/session-query-service";
import type {
  ExchangeRow,
} from "../../../src/main/storage/exchange-repository";
import type {
  SessionRepository,
  SessionRow,
} from "../../../src/main/storage/session-repository";
import type {
  NormalizedExchange,
  ProtocolAdapter,
} from "../../../src/shared/contracts";

function makeNormalizedExchange(
  textBlocks: string[],
  model = "claude-opus-4-6",
): NormalizedExchange {
  return {
    exchangeId: "exchange-1",
    providerId: "anthropic",
    profileId: "profile-1",
    endpointKind: "messages",
    model,
    request: {
      instructions: [],
      tools: [],
      inputMessages: [
        {
          role: "user",
          blocks: textBlocks.map((text) => ({ type: "text" as const, text })),
        },
      ],
      meta: {},
    },
    response: {
      outputMessages: [],
      stopReason: null,
      usage: null,
      error: null,
      meta: {},
    },
  };
}

function makeSessionRow(title: string): SessionRow {
  return {
    session_id: "session-1",
    provider_id: "anthropic",
    profile_id: "profile-1",
    external_hint: "hint-1",
    title,
    model: "claude-opus-4-6",
    started_at: "2026-03-14T00:00:00.000Z",
    updated_at: "2026-03-14T00:00:01.000Z",
    exchange_count: 1,
    matcher_state_json: "{}",
  };
}

function makeExchangeRow(normalized: NormalizedExchange): ExchangeRow {
  return {
    exchange_id: normalized.exchangeId,
    session_id: "session-1",
    provider_id: "anthropic",
    profile_id: "profile-1",
    method: "POST",
    path: "/v1/messages",
    started_at: "2026-03-14T00:00:00.000Z",
    duration_ms: 10,
    status_code: 200,
    request_size: 100,
    response_size: 80,
    raw_request_headers_json: "{}",
    raw_request_body: null,
    raw_response_headers_json: "{}",
    raw_response_body: null,
    normalized_json: JSON.stringify(normalized),
    inspector_json: "{\"sections\":[]}",
  };
}

describe("SessionQueryService title fallback", () => {
  it("re-derives display titles from normalized exchanges when the stored title is fallback noise", () => {
    const sessionRow = makeSessionRow("claude-opus-4-6");
    const normalized = makeNormalizedExchange([
      "<system-reminder>\nSessionStart:startup hook success\n</system-reminder>",
      "Fix the sidebar title parser",
    ]);

    const sessionRepository = {
      getById: () => sessionRow,
      listSessions: () => [sessionRow],
    } as Pick<SessionRepository, "getById" | "listSessions"> as SessionRepository;

    const exchangeRepository = {
      listBySessionId: () => [makeExchangeRow(normalized)],
    } as {
      listBySessionId(sessionId: string): ExchangeRow[];
    };

    const service = new SessionQueryService(
      sessionRepository,
      exchangeRepository as never,
      createProviderCatalog(),
      new Map<string, ProtocolAdapter>([
        ["anthropic-messages", anthropicMessagesAdapter],
      ]),
    );

    expect(service.listSessions()[0]?.title).toBe("Fix the sidebar title parser");
    expect(service.getSessionTrace("session-1").title).toBe("Fix the sidebar title parser");
  });
});
