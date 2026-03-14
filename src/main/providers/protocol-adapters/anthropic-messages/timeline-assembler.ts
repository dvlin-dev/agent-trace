import type { NormalizedExchange, SessionTimeline, TimelineAssembler } from "../../../../shared/contracts";
import { annotateTimeline } from "../shared/annotate-blocks";

function buildSnapshotTimeline(exchanges: NormalizedExchange[]): SessionTimeline {
  const last = exchanges[exchanges.length - 1];
  if (!last) {
    return { messages: [] };
  }

  return {
    messages: annotateTimeline([
      ...last.request.inputMessages,
      ...last.response.outputMessages,
    ]),
  };
}

export const anthropicTimelineAssembler: TimelineAssembler = {
  build(exchanges) {
    return buildSnapshotTimeline(exchanges);
  },
};
