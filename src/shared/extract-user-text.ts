import { stripXmlTags } from "./strip-xml";

/**
 * Extract real user text from message content, skipping system-reminder blocks
 * that Claude Code injects into user messages.
 */
export function extractUserText(content: unknown): string {
  if (typeof content === "string") {
    // Skip strings that are entirely system-reminder content
    if (content.startsWith("<system-reminder>")) return "";
    if (content.startsWith("<system-")) return "";
    const cleaned = stripXmlTags(content).trim();
    return cleaned;
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      if (typeof block === "string") {
        if (block.startsWith("<system-reminder>")) continue;
        if (block.startsWith("<system-")) continue;
        const cleaned = stripXmlTags(block).trim();
        if (cleaned.length > 0) return cleaned;
        continue;
      }
      if (typeof block === "object" && block !== null && block.type === "text") {
        const text: string = block.text ?? "";
        // Skip blocks that are system-reminder injections
        if (text.startsWith("<system-reminder>")) continue;
        if (text.startsWith("<system-")) continue;
        const cleaned = stripXmlTags(text).trim();
        if (cleaned.length > 0) return cleaned;
      }
    }
  }

  return "";
}
