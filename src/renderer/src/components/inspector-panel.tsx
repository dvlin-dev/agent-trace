import { useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { RequestItem } from "./request-item";
import { useRequestStore } from "../stores/request-store";
import { parseClaudeRequest } from "../lib/parse-claude-body";
import { ChevronRight, X } from "lucide-react";
import { cn } from "../lib/utils";

type InspectorTab = "requests" | "system" | "tools" | "raw-request" | "raw-response";

export function InspectorPanel() {
  const { requests, selectedRequestId, selectRequest, toggleInspector } =
    useRequestStore();
  const [activeTab, setActiveTab] = useState<InspectorTab>("requests");

  // Use selected request or fall back to last request
  const activeRequest =
    requests.find((r) => r.requestId === selectedRequestId) ??
    requests[requests.length - 1] ??
    null;

  return (
    <div className="flex h-full flex-col border-l">
      <div className="flex items-center justify-between border-b px-3 py-2 shrink-0">
        <span className="text-xs font-medium">Inspector</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={toggleInspector}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b px-2 py-1.5 shrink-0 overflow-x-auto">
        {(
          [
            ["requests", `Requests (${requests.length})`],
            ["system", "System"],
            ["tools", "Tools"],
            ["raw-request", "Raw Req"],
            ["raw-response", "Raw Res"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={cn(
              "px-2 py-1 text-[11px] rounded-md whitespace-nowrap transition-colors",
              activeTab === id
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
            )}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "requests" && (
          <RequestListSection
            requests={requests}
            selectedRequestId={selectedRequestId}
            onSelect={selectRequest}
          />
        )}
        {activeTab === "system" && activeRequest && (
          <SystemSection request={activeRequest} />
        )}
        {activeTab === "tools" && activeRequest && (
          <ToolsSection request={activeRequest} />
        )}
        {activeTab === "raw-request" && activeRequest && (
          <RawSection content={activeRequest.requestBody} />
        )}
        {activeTab === "raw-response" && activeRequest && (
          <RawSection content={activeRequest.responseBody} />
        )}
      </div>
    </div>
  );
}

// --- Sub-sections ---

function RequestListSection({
  requests,
  selectedRequestId,
  onSelect,
}: {
  requests: ReturnType<typeof useRequestStore.getState>["requests"];
  selectedRequestId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-0.5 p-2">
        {requests.map((req) => (
          <RequestItem
            key={req.requestId}
            request={req}
            isSelected={req.requestId === selectedRequestId}
            onClick={() => onSelect(req.requestId)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function SystemSection({ request }: { request: { requestBody: string | null } }) {
  const parsed = parseClaudeRequest(request.requestBody);
  const system = parsed?.system;

  if (!system) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        No system prompt
      </div>
    );
  }

  if (typeof system === "string") {
    const approxTokens = Math.round(system.length / 4);
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-2">
          <Badge variant="secondary" className="text-[10px]">
            ~{approxTokens.toLocaleString()} tokens
          </Badge>
          <pre className="text-xs whitespace-pre-wrap">{system}</pre>
        </div>
      </ScrollArea>
    );
  }

  const fullText = system.map((block) => block.text).join("");
  const approxTokens = Math.round(fullText.length / 4);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        <Badge variant="secondary" className="text-[10px]">
          ~{approxTokens.toLocaleString()} tokens
        </Badge>
        {system.map((block, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {block.type}
              </Badge>
              {block.cache_control != null && (
                <Badge variant="outline" className="text-[10px] text-orange-600">
                  cached
                </Badge>
              )}
            </div>
            <pre className="text-xs whitespace-pre-wrap">{block.text}</pre>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function ToolsSection({ request }: { request: { requestBody: string | null } }) {
  const parsed = parseClaudeRequest(request.requestBody);
  const tools = parsed?.tools;

  if (!tools || tools.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        No tools defined
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-3">
        <Badge variant="secondary" className="text-[10px] mb-2">
          {tools.length} tools
        </Badge>
        {tools.map((tool, i) => (
          <ToolItem key={i} tool={tool} />
        ))}
      </div>
    </ScrollArea>
  );
}

function ToolItem({
  tool,
}: {
  tool: { name: string; description: string; input_schema: unknown };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-md border px-2 py-1.5 cursor-pointer hover:bg-accent transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <ChevronRight
          className={cn("h-3 w-3 transition-transform shrink-0", expanded && "rotate-90")}
        />
        <span className="text-xs font-medium font-mono truncate">{tool.name}</span>
      </div>
      {tool.description && (
        <p className="text-[11px] text-muted-foreground mt-0.5 pl-5 line-clamp-2">
          {tool.description}
        </p>
      )}
      {expanded && (
        <pre className="mt-1 pl-5 text-[11px] overflow-auto">
          {JSON.stringify(tool.input_schema, null, 2)}
        </pre>
      )}
    </div>
  );
}

function RawSection({ content }: { content: string | null }) {
  if (!content) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  let displayContent = content;
  try {
    displayContent = JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    // Not JSON, show as-is
  }

  return (
    <ScrollArea className="h-full">
      <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all">
        {displayContent}
      </pre>
    </ScrollArea>
  );
}
