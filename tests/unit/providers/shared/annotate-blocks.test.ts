import { describe, expect, it } from "vitest";
import {
  classifyTextBlock,
  annotateBlock,
  annotateMessage,
  annotateTimeline,
} from "../../../../src/main/providers/protocol-adapters/shared/annotate-blocks";
import type { NormalizedMessage, NormalizedMessageBlock } from "../../../../src/shared/contracts";

describe("classifyTextBlock", () => {
  it("classifies plain text as not injected", () => {
    const result = classifyTextBlock("Fix the sidebar title parser");
    expect(result).toEqual({ injected: false, contextType: null });
  });

  it("classifies <system-reminder> as system-reminder", () => {
    const result = classifyTextBlock(
      "<system-reminder>\nAs you answer the user's questions...\n</system-reminder>",
    );
    expect(result).toEqual({ injected: true, contextType: "system-reminder" });
  });

  it("classifies system-reminder with skills content as skills-list", () => {
    const result = classifyTextBlock(
      "<system-reminder>\nThe following skills are available for use:\n- commit\n- review-pr\n</system-reminder>",
    );
    expect(result).toEqual({ injected: true, contextType: "skills-list" });
  });

  it("classifies system-reminder with CLAUDE.md as claude-md", () => {
    const result = classifyTextBlock(
      "<system-reminder>\nContents of /Users/dev/CLAUDE.md (project instructions):\n# My Project\n</system-reminder>",
    );
    expect(result).toEqual({ injected: true, contextType: "claude-md" });
  });

  it("classifies <user-prompt-submit-hook> as hook-output", () => {
    const result = classifyTextBlock(
      "<user-prompt-submit-hook>\nRunning pre-submit checks...\n</user-prompt-submit-hook>",
    );
    expect(result).toEqual({ injected: true, contextType: "hook-output" });
  });

  it("classifies SessionStart: as hook-output", () => {
    const result = classifyTextBlock("SessionStart:startup hook success");
    expect(result).toEqual({ injected: true, contextType: "hook-output" });
  });

  it("classifies hook-prefixed lines as hook-output", () => {
    const result = classifyTextBlock("hook executed successfully");
    expect(result).toEqual({ injected: true, contextType: "hook-output" });
  });

  it("classifies <command-name> as command-context", () => {
    const result = classifyTextBlock("<command-name>commit</command-name>");
    expect(result).toEqual({ injected: true, contextType: "command-context" });
  });

  it("classifies <local-command-caveat> as command-context", () => {
    const result = classifyTextBlock("<local-command-caveat>Caveat: messages below...</local-command-caveat>");
    expect(result).toEqual({ injected: true, contextType: "command-context" });
  });

  it("classifies <local-command-stdout> as command-context", () => {
    const result = classifyTextBlock("<local-command-stdout>output here</local-command-stdout>");
    expect(result).toEqual({ injected: true, contextType: "command-context" });
  });

  it("classifies <local-command (inline) as hook-output", () => {
    const result = classifyTextBlock("<local-command name='test'>");
    expect(result).toEqual({ injected: true, contextType: "hook-output" });
  });

  it("classifies <environment_context> as agent-context", () => {
    const result = classifyTextBlock("<environment_context>\n<cwd>/tmp</cwd>\n</environment_context>");
    expect(result).toEqual({ injected: true, contextType: "agent-context" });
  });

  it("classifies <permissions instructions> as agent-context", () => {
    const result = classifyTextBlock("<permissions instructions>\nFilesystem sandboxing...\n</permissions instructions>");
    expect(result).toEqual({ injected: true, contextType: "agent-context" });
  });

  it("classifies [SUGGESTION MODE:] as suggestion-mode", () => {
    const result = classifyTextBlock("[SUGGESTION MODE: Suggest what the user might type next]");
    expect(result).toEqual({ injected: true, contextType: "suggestion-mode" });
  });
});

describe("annotateBlock", () => {
  it("annotates text blocks with classification", () => {
    const block: NormalizedMessageBlock = {
      type: "text",
      text: "<system-reminder>\nHello\n</system-reminder>",
    };
    const result = annotateBlock(block);
    expect(result.meta).toEqual({
      injected: true,
      contextType: "system-reminder",
      charCount: block.text.length,
    });
  });

  it("annotates plain text blocks as not injected", () => {
    const block: NormalizedMessageBlock = {
      type: "text",
      text: "Hello world",
    };
    const result = annotateBlock(block);
    expect(result.meta).toEqual({
      injected: false,
      contextType: null,
      charCount: 11,
    });
  });

  it("annotates tool-call blocks as not injected", () => {
    const block: NormalizedMessageBlock = {
      type: "tool-call",
      name: "Read",
      input: { path: "/tmp/file.ts" },
      callId: "call-1",
    };
    const result = annotateBlock(block);
    expect(result.meta!.injected).toBe(false);
    expect(result.meta!.contextType).toBeNull();
    expect(result.meta!.charCount).toBeGreaterThan(0);
  });

  it("annotates tool-result blocks as not injected", () => {
    const block: NormalizedMessageBlock = {
      type: "tool-result",
      content: "file contents here",
      callId: "call-1",
    };
    const result = annotateBlock(block);
    expect(result.meta!.injected).toBe(false);
    expect(result.meta!.charCount).toBe(18);
  });

  it("annotates reasoning blocks as not injected", () => {
    const block: NormalizedMessageBlock = {
      type: "reasoning",
      text: "Let me think about this...",
    };
    const result = annotateBlock(block);
    expect(result.meta!.injected).toBe(false);
    expect(result.meta!.charCount).toBe(26);
  });

  it("charCount matches text length", () => {
    const text = "This is exactly 30 chars long!";
    const block: NormalizedMessageBlock = { type: "text", text };
    const result = annotateBlock(block);
    expect(result.meta!.charCount).toBe(30);
  });
});

describe("annotateMessage", () => {
  it("annotates all blocks in a message", () => {
    const msg: NormalizedMessage = {
      role: "user",
      blocks: [
        { type: "text", text: "<system-reminder>\nHello\n</system-reminder>" },
        { type: "text", text: "Fix the bug" },
      ],
    };
    const result = annotateMessage(msg);
    expect(result.blocks[0].meta!.injected).toBe(true);
    expect(result.blocks[1].meta!.injected).toBe(false);
  });
});

describe("annotateTimeline", () => {
  it("annotates all messages", () => {
    const messages: NormalizedMessage[] = [
      {
        role: "user",
        blocks: [
          { type: "text", text: "<system-reminder>\ncontext\n</system-reminder>" },
          { type: "text", text: "Do the thing" },
        ],
      },
      {
        role: "assistant",
        blocks: [
          { type: "text", text: "I'll help you with that." },
        ],
      },
    ];
    const result = annotateTimeline(messages);
    expect(result).toHaveLength(2);
    expect(result[0].blocks[0].meta!.injected).toBe(true);
    expect(result[0].blocks[0].meta!.contextType).toBe("system-reminder");
    expect(result[0].blocks[1].meta!.injected).toBe(false);
    expect(result[1].blocks[0].meta!.injected).toBe(false);
  });
});
