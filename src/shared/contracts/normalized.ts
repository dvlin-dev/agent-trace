import type { ProviderId } from "./provider";

export type ContextType =
  | "system-reminder"
  | "hook-output"
  | "skills-list"
  | "claude-md"
  | "command-context"
  | "agent-context"
  | "suggestion-mode";

export interface BlockMeta {
  injected: boolean;
  contextType: ContextType | null;
  charCount: number;
}

export interface NormalizedTool {
  name: string;
  description: string | null;
  inputSchema: unknown;
}

export interface NormalizedUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
}

export interface NormalizedError {
  code: string | null;
  message: string;
}

export type NormalizedBlock =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "unknown"; rawType: string; payload: unknown };

export type NormalizedMessageBlock =
  | { type: "text"; text: string; meta?: BlockMeta }
  | { type: "reasoning"; text: string; meta?: BlockMeta }
  | { type: "tool-call"; name: string; input: unknown; callId?: string; meta?: BlockMeta }
  | { type: "tool-result"; content: unknown; callId?: string; isError?: boolean; meta?: BlockMeta }
  | { type: "unknown"; rawType: string; payload: unknown; meta?: BlockMeta };

export interface NormalizedMessage {
  role: "system" | "user" | "assistant" | "tool" | "unknown";
  blocks: NormalizedMessageBlock[];
}

export type EndpointKind = "messages" | "responses";

export interface NormalizedExchange {
  exchangeId: string;
  providerId: ProviderId;
  profileId: string;
  endpointKind: EndpointKind;
  model: string | null;
  request: {
    instructions: NormalizedBlock[];
    tools: NormalizedTool[];
    inputMessages: NormalizedMessage[];
    meta: Record<string, unknown>;
  };
  response: {
    outputMessages: NormalizedMessage[];
    stopReason: string | null;
    usage: NormalizedUsage | null;
    error: NormalizedError | null;
    meta: Record<string, unknown>;
  };
}
