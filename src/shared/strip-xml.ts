/**
 * Strip XML/HTML-like tags from a string.
 * E.g. "<system-reminder>Hello</system-reminder>" → "Hello"
 */
export function stripXmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, "").trim();
}
