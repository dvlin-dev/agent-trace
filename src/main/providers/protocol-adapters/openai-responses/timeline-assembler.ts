import type {
  NormalizedExchange,
  NormalizedMessage,
  SessionTimeline,
  TimelineAssembler,
} from "../../../../shared/contracts";
import { annotateTimeline } from "../shared/annotate-blocks";

function fingerprint(message: NormalizedMessage): string {
  return JSON.stringify(message);
}

export const openaiResponsesTimelineAssembler: TimelineAssembler = {
  build(exchanges: NormalizedExchange[]): SessionTimeline {
    const messages: NormalizedMessage[] = [];
    const seen = new Set<string>();

    for (const exchange of exchanges) {
      // Codex sends full conversation history in `input` each turn.
      // Deduplicate all input messages (not just system) to avoid repeats.
      for (const message of exchange.request.inputMessages) {
        const key = fingerprint(message);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        messages.push(message);
      }

      for (const message of exchange.response.outputMessages) {
        seen.add(fingerprint(message));
        messages.push(message);
      }
    }

    return { messages: annotateTimeline(messages) };
  },
};
