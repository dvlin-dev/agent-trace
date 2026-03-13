export interface ParsedClaudeRequest {
  model: string | null;
  system:
    | Array<{ type: string; text: string; cache_control?: unknown }>
    | string
    | null;
  tools:
    | Array<{ name: string; description: string; input_schema: unknown }>
    | null;
  messages: Array<{ role: string; content: unknown }> | null;
  maxTokens: number | null;
  stream: boolean;
}

export function parseClaudeRequest(
  body: string | null,
): ParsedClaudeRequest | null {
  if (!body) return null;

  try {
    const parsed = JSON.parse(body);

    return {
      model: typeof parsed.model === "string" ? parsed.model : null,
      system: parsed.system ?? null,
      tools: Array.isArray(parsed.tools) ? parsed.tools : null,
      messages: Array.isArray(parsed.messages) ? parsed.messages : null,
      maxTokens:
        typeof parsed.max_tokens === "number" ? parsed.max_tokens : null,
      stream: parsed.stream === true,
    };
  } catch {
    return null;
  }
}

export interface ParsedClaudeResponse {
  role: string;
  content: Array<{ type: string; [key: string]: unknown }>;
  model: string | null;
  stopReason: string | null;
}

export function parseClaudeResponse(
  body: string | null,
): ParsedClaudeResponse | null {
  if (!body) return null;

  try {
    const parsed = JSON.parse(body);

    // Standard non-streaming response
    if (parsed.content && parsed.role === "assistant") {
      return {
        role: "assistant",
        content: Array.isArray(parsed.content) ? parsed.content : [],
        model: parsed.model ?? null,
        stopReason: parsed.stop_reason ?? null,
      };
    }

    // SSE streaming: body is newline-separated events
    // Look for content_block_delta and content_block_start events
    if (typeof body === "string" && body.includes("event:")) {
      const blocks: Array<{ type: string; [key: string]: unknown }> = [];
      const blockMap = new Map<number, { type: string; [key: string]: unknown }>();

      for (const line of body.split("\n")) {
        if (!line.startsWith("data:")) continue;
        try {
          const event = JSON.parse(line.slice(5).trim());

          if (event.type === "content_block_start" && event.content_block) {
            blockMap.set(event.index, { ...event.content_block });
          }

          if (event.type === "content_block_delta" && event.delta) {
            const existing = blockMap.get(event.index);
            if (existing && event.delta.type === "text_delta") {
              existing.text = ((existing.text as string) ?? "") + (event.delta.text ?? "");
            } else if (existing && event.delta.type === "thinking_delta") {
              existing.thinking = ((existing.thinking as string) ?? "") + (event.delta.thinking ?? "");
            } else if (existing && event.delta.type === "input_json_delta") {
              existing._rawInput = ((existing._rawInput as string) ?? "") + (event.delta.partial_json ?? "");
            }
          }

          if (event.type === "message_start" && event.message?.content) {
            for (const block of event.message.content) {
              blocks.push(block);
            }
          }
        } catch {
          // skip non-JSON data lines
        }
      }

      // Convert blockMap to array
      for (const [, block] of [...blockMap.entries()].sort((a, b) => a[0] - b[0])) {
        // Parse accumulated raw JSON input for tool_use blocks
        if (block.type === "tool_use" && block._rawInput) {
          try {
            block.input = JSON.parse(block._rawInput as string);
          } catch {
            block.input = block._rawInput;
          }
          delete block._rawInput;
        }
        // Move thinking field to text for display
        if (block.type === "thinking" && block.thinking) {
          block.text = block.thinking;
          delete block.thinking;
        }
        blocks.push(block);
      }

      if (blocks.length > 0) {
        return {
          role: "assistant",
          content: blocks,
          model: null,
          stopReason: null,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
