import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useSessionStore } from "../stores/session-store";
import { useRequestStore } from "../stores/request-store";
import { parseClaudeRequest } from "../lib/parse-claude-body";
import { Code, PanelRight } from "lucide-react";
import { cn } from "../lib/utils";
import { stripXmlTags } from "../../../shared/strip-xml";

export function ConversationHeader() {
  const sessions = useSessionStore((s) => s.sessions);
  const selectedSessionId = useSessionStore((s) => s.selectedSessionId);
  const { requests, rawMode, inspectorOpen, toggleRawMode, toggleInspector } =
    useRequestStore();

  const session = sessions.find((s) => s.sessionId === selectedSessionId);
  const lastRequest = requests[requests.length - 1];
  const parsed = lastRequest ? parseClaudeRequest(lastRequest.requestBody) : null;
  const model = parsed?.model ?? session?.model ?? null;
  const title = session ? stripXmlTags(session.title) : "Conversation";

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2 shrink-0">
      <h2 className="text-sm font-medium truncate flex-1">{title}</h2>
      {model && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
          {model}
        </Badge>
      )}
      <Button
        variant={rawMode ? "default" : "ghost"}
        size="sm"
        className="h-7 text-xs gap-1 shrink-0"
        onClick={toggleRawMode}
      >
        <Code className="h-3 w-3" />
        Raw
      </Button>
      <Button
        variant={inspectorOpen ? "default" : "ghost"}
        size="sm"
        className={cn("h-7 text-xs gap-1 shrink-0")}
        onClick={toggleInspector}
      >
        <PanelRight className="h-3 w-3" />
        Inspector
      </Button>
    </div>
  );
}
