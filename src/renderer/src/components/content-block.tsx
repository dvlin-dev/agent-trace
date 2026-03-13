import { useState } from "react";
import { cn } from "../lib/utils";
import { ChevronRight } from "lucide-react";

interface ContentBlockProps {
  block: {
    type: string;
    text?: string;
    name?: string;
    input?: unknown;
    content?: unknown;
    id?: string;
  };
}

export function ContentBlock({ block }: ContentBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (block.type === "text") {
    const text = block.text ?? "";
    const isLong = text.length > 200;

    return (
      <div className="text-sm whitespace-pre-wrap">
        {isLong && !expanded ? (
          <>
            {text.slice(0, 200)}...
            <button
              className="ml-1 text-xs text-primary hover:underline"
              onClick={() => setExpanded(true)}
            >
              Show more
            </button>
          </>
        ) : (
          text
        )}
        {isLong && expanded && (
          <button
            className="ml-1 text-xs text-primary hover:underline"
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        )}
      </div>
    );
  }

  if (block.type === "thinking") {
    return (
      <div
        className={cn(
          "rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800",
          "cursor-pointer",
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
          />
          Thinking
        </div>
        {expanded && (
          <div className="px-3 pb-2 text-sm whitespace-pre-wrap text-purple-900 dark:text-purple-200">
            {block.text}
          </div>
        )}
      </div>
    );
  }

  if (block.type === "tool_use") {
    return (
      <div
        className="rounded-md border-l-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
          />
          {block.name ?? "tool_use"}
        </div>
        {expanded && (
          <pre className="px-3 pb-2 text-xs overflow-auto">
            {JSON.stringify(block.input, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  if (block.type === "tool_result") {
    const content =
      typeof block.content === "string"
        ? block.content
        : JSON.stringify(block.content, null, 2);
    const isLong = content.length > 200;

    return (
      <div
        className="rounded-md border-l-2 border-green-500 bg-green-50 dark:bg-green-950/20 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300">
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
          />
          Result
        </div>
        {expanded && (
          <pre className="px-3 pb-2 text-xs overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
        {!expanded && isLong && (
          <div className="px-3 pb-1.5 text-xs text-muted-foreground truncate">
            {content.slice(0, 100)}...
          </div>
        )}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div className="text-sm text-muted-foreground">
      [{block.type}] {JSON.stringify(block)}
    </div>
  );
}
