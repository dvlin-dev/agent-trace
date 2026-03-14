import type { NormalizedExchange } from "../../../../shared/contracts";
import { stripXmlTags } from "../../../../shared/strip-xml";
import { NOISE_PATTERNS, NOISE_WRAPPER_PATTERNS } from "./context-patterns";

const MIN_TITLE_LENGTH = 5;
const MIN_TITLE_LENGTH_CJK = 1;
const MAX_TITLE_LENGTH = 60;

/** CJK Unified Ideographs, Hiragana, Katakana, Hangul Syllables */
const CJK_RE = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uac00-\ud7af]/;

function hasCjk(text: string): boolean {
  return CJK_RE.test(text);
}

function isNoise(text: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

function cleanText(raw: string): string {
  return stripXmlTags(raw)
    .replace(/\s+/g, " ")
    .trim();
}

function isNoiseWrapper(raw: string): boolean {
  return NOISE_WRAPPER_PATTERNS.some((pattern) => pattern.test(raw.trim()));
}

function isTooShort(text: string): boolean {
  const minLength = hasCjk(text) ? MIN_TITLE_LENGTH_CJK : MIN_TITLE_LENGTH;
  return text.length < minLength;
}

function formatTitle(text: string): string {
  return text.length > MAX_TITLE_LENGTH
    ? `${text.slice(0, MAX_TITLE_LENGTH)}…`
    : text;
}

export function hasMeaningfulSessionTitle(
  title: string | null | undefined,
  model: string | null,
): boolean {
  if (!title) {
    return false;
  }

  if (isNoiseWrapper(title)) {
    return false;
  }

  const cleaned = cleanText(title);
  if (!cleaned || isTooShort(cleaned) || isNoise(cleaned)) {
    return false;
  }

  return cleaned !== model;
}

/**
 * Derive a human-readable session title from the first substantive user message.
 * Strips XML tags, skips hook/system output, and skips very short messages.
 */
export function deriveTitleFromExchange(
  normalized: NormalizedExchange,
  fallbackLabel: string,
): string {
  for (const message of normalized.request.inputMessages) {
    if (message.role !== "user") continue;

    for (const block of message.blocks) {
      if (block.type !== "text" || isNoiseWrapper(block.text)) {
        continue;
      }

      for (const chunk of block.text.split(/\r?\n+/)) {
        const text = cleanText(chunk);
        if (!text || isTooShort(text) || isNoise(text)) {
          continue;
        }

        return formatTitle(text);
      }
    }
  }

  return normalized.model ?? fallbackLabel;
}
