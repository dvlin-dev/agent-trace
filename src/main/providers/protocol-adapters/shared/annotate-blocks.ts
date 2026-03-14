import type {
  ContextType,
  NormalizedMessage,
  NormalizedMessageBlock,
} from "../../../../shared/contracts";
import {
  SYSTEM_REMINDER_RE,
  HOOK_OUTPUT_RE,
  HOOK_INLINE_RES,
  SKILLS_LIST_RE,
  CLAUDE_MD_RE,
  COMMAND_CONTEXT_RE,
  AGENT_CONTEXT_RE,
  SUGGESTION_MODE_RE,
} from "./context-patterns";

/**
 * Classify a text block's content to determine if it is injected context.
 * Priority chain: system-reminder → sub-classify → hook-output → command-context
 *   → agent-context → suggestion-mode → hook-inline → not injected.
 */
export function classifyTextBlock(text: string): {
  injected: boolean;
  contextType: ContextType | null;
} {
  const trimmed = text.trim();

  // System reminder wrapper — sub-classify its content
  if (SYSTEM_REMINDER_RE.test(trimmed)) {
    if (SKILLS_LIST_RE.test(trimmed)) {
      return { injected: true, contextType: "skills-list" };
    }
    if (CLAUDE_MD_RE.test(trimmed)) {
      return { injected: true, contextType: "claude-md" };
    }
    return { injected: true, contextType: "system-reminder" };
  }

  // Hook output wrapper
  if (HOOK_OUTPUT_RE.test(trimmed)) {
    return { injected: true, contextType: "hook-output" };
  }

  // Local command context (caveat, command-name, stdout)
  if (COMMAND_CONTEXT_RE.test(trimmed)) {
    return { injected: true, contextType: "command-context" };
  }

  // Codex/agent environment wrappers
  if (AGENT_CONTEXT_RE.test(trimmed)) {
    return { injected: true, contextType: "agent-context" };
  }

  // Suggestion mode prompt injection
  if (SUGGESTION_MODE_RE.test(trimmed)) {
    return { injected: true, contextType: "suggestion-mode" };
  }

  // Inline hook patterns (not wrapped)
  if (HOOK_INLINE_RES.some((re) => re.test(trimmed))) {
    return { injected: true, contextType: "hook-output" };
  }

  return { injected: false, contextType: null };
}

function blockCharCount(block: NormalizedMessageBlock): number {
  if (block.type === "text" || block.type === "reasoning") {
    return block.text.length;
  }
  if (block.type === "tool-call") {
    return JSON.stringify(block.input).length;
  }
  if (block.type === "tool-result") {
    return typeof block.content === "string"
      ? block.content.length
      : JSON.stringify(block.content).length;
  }
  return 0;
}

/** Annotate a single block with meta information. */
export function annotateBlock(block: NormalizedMessageBlock): NormalizedMessageBlock {
  const charCount = blockCharCount(block);

  if (block.type === "text") {
    const { injected, contextType } = classifyTextBlock(block.text);
    return { ...block, meta: { injected, contextType, charCount } };
  }

  // Non-text blocks are never injected context
  return { ...block, meta: { injected: false, contextType: null, charCount } };
}

/** Annotate all blocks in a message. */
export function annotateMessage(msg: NormalizedMessage): NormalizedMessage {
  return {
    ...msg,
    blocks: msg.blocks.map(annotateBlock),
  };
}

/** Annotate all messages in a timeline. Pure, stateless. */
export function annotateTimeline(messages: NormalizedMessage[]): NormalizedMessage[] {
  return messages.map(annotateMessage);
}
