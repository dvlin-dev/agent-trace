import { describe, expect, it } from "vitest";
import {
  deriveTitleFromExchange,
  hasMeaningfulSessionTitle,
} from "../../../../src/main/providers/protocol-adapters/shared/derive-title";
import type { NormalizedExchange } from "../../../../src/shared/contracts";

function makeExchange(
  inputMessages: NormalizedExchange["request"]["inputMessages"],
): NormalizedExchange {
  return {
    exchangeId: "exchange-1",
    providerId: "anthropic",
    profileId: "profile-1",
    endpointKind: "messages",
    model: "claude-opus-4-6",
    request: {
      instructions: [],
      tools: [],
      inputMessages,
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

describe("deriveTitleFromExchange", () => {
  it("skips system reminder blocks and uses the first substantive user text block", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            {
              type: "text",
              text: "<system-reminder>\nSessionStart:startup hook success\n</system-reminder>",
            },
            {
              type: "text",
              text: "<system-reminder>\nThe following skills are available.\n</system-reminder>",
            },
            {
              type: "text",
              text: "我最新的一次改动中，把侧边栏那个 title 的解析改了一下",
            },
          ],
        },
      ]),
      "Anthropic Session",
    );

    expect(title).toBe("我最新的一次改动中，把侧边栏那个 title 的解析改了一下");
  });

  it("falls back to a later substantive line in the same text block", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            {
              type: "text",
              text: "SessionStart:startup hook success\nFix the sidebar title parser",
            },
          ],
        },
      ]),
      "Anthropic Session",
    );

    expect(title).toBe("Fix the sidebar title parser");
  });

  it("falls back to the model when every user text block is reminder noise", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            {
              type: "text",
              text: "<system-reminder>\nSessionStart:startup hook success\n</system-reminder>",
            },
          ],
        },
      ]),
      "Anthropic Session",
    );

    expect(title).toBe("claude-opus-4-6");
  });

  it("treats model and reminder-derived strings as non-meaningful titles", () => {
    expect(hasMeaningfulSessionTitle("claude-opus-4-6", "claude-opus-4-6")).toBe(false);
    expect(
      hasMeaningfulSessionTitle(
        "<system-reminder>\nSessionStart:startup hook success\n</system-reminder>",
        "claude-opus-4-6",
      ),
    ).toBe(false);
    expect(hasMeaningfulSessionTitle("Fix the sidebar title parser", "claude-opus-4-6")).toBe(
      true,
    );
  });

  it("accepts short CJK messages as meaningful titles", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            {
              type: "text",
              text: "<system-reminder>\nSessionStart:startup hook success\n</system-reminder>",
            },
            { type: "text", text: "我爱你" },
          ],
        },
      ]),
      "Anthropic Session",
    );
    expect(title).toBe("我爱你");
  });

  it("treats CJK titles as meaningful in hasMeaningfulSessionTitle", () => {
    expect(hasMeaningfulSessionTitle("我爱你", "claude-opus-4-6")).toBe(true);
    expect(hasMeaningfulSessionTitle("你好", "claude-opus-4-6")).toBe(true);
  });

  it("skips local-command-caveat blocks", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            { type: "text", text: "<local-command-caveat>Caveat: The messages below...</local-command-caveat>" },
            { type: "text", text: "<command-name>/clear</command-name>" },
            { type: "text", text: "<local-command-stdout></local-command-stdout>" },
            { type: "text", text: "nihao ma" },
          ],
        },
      ]),
      "Anthropic Session",
    );
    expect(title).toBe("nihao ma");
  });

  it("skips [SUGGESTION MODE:] blocks", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            { type: "text", text: "[SUGGESTION MODE: Suggest what the user might naturally type next]" },
          ],
        },
      ]),
      "Anthropic Session",
    );
    expect(title).toBe("claude-opus-4-6");
  });

  it("skips Codex environment/permissions wrappers", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            { type: "text", text: "<permissions instructions>\nFilesystem sandboxing...\n</permissions instructions>" },
            { type: "text", text: "<environment_context>\n<cwd>/tmp</cwd>\n</environment_context>" },
            { type: "text", text: "你好世界" },
          ],
        },
      ]),
      "Codex Session",
    );
    expect(title).toBe("你好世界");
  });

  it("skips entire AGENTS.md block including sub-headings like ## Skills", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            {
              type: "text",
              text: "# AGENTS.md instructions for /Users/bowling\n\n<INSTRUCTIONS>\n## Skills\nA skill is a set of local instructions...",
            },
            { type: "text", text: "<environment_context>\n<cwd>/Users/bowling</cwd>\n</environment_context>" },
            { type: "text", text: "你好吗" },
          ],
        },
      ]),
      "Codex Session",
    );
    expect(title).toBe("你好吗");
  });

  it("skips # AGENTS.md instruction headers", () => {
    const title = deriveTitleFromExchange(
      makeExchange([
        {
          role: "user",
          blocks: [
            { type: "text", text: "# AGENTS.md instructions for /Users/bowling\n\n<INSTRUCTIONS>\n..." },
            { type: "text", text: "Build a REST API" },
          ],
        },
      ]),
      "Codex Session",
    );
    expect(title).toBe("Build a REST API");
  });
});
