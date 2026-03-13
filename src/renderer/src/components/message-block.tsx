import { useState } from "react";
import { Badge } from "./ui/badge";
import { ContentBlock } from "./content-block";
import { cn } from "../lib/utils";
import { Copy, Check } from "lucide-react";

interface MessageBlockProps {
  message: {
    role: string;
    content: unknown;
  };
  rawMode?: boolean;
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block.type === "text") return block.text ?? "";
        if (block.type === "thinking") return block.text ?? "";
        if (block.type === "tool_use")
          return `[tool_use: ${block.name}]\n${JSON.stringify(block.input, null, 2)}`;
        if (block.type === "tool_result") {
          const c = block.content;
          return typeof c === "string" ? c : JSON.stringify(c, null, 2);
        }
        return JSON.stringify(block, null, 2);
      })
      .join("\n\n");
  }
  return JSON.stringify(content, null, 2);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function MessageBlock({ message, rawMode }: MessageBlockProps) {
  const isUser = message.role === "user";
  const copyText = rawMode
    ? JSON.stringify(message.content, null, 2)
    : extractText(message.content);

  if (rawMode) {
    return (
      <div className={cn(
        "rounded-lg p-3 space-y-2 relative group",
        isUser
          ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
          : "bg-muted/50 border border-border",
      )}>
        <div className="flex items-center justify-between">
          <Badge
            variant={isUser ? "default" : "secondary"}
            className={cn("text-[10px]", isUser && "bg-blue-600")}
          >
            {message.role.toUpperCase()}
          </Badge>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={copyText} />
          </div>
        </div>
        <pre className="text-xs font-mono whitespace-pre-wrap break-all overflow-auto">
          {JSON.stringify(message.content, null, 2)}
        </pre>
      </div>
    );
  }

  const contentBlocks = normalizeContent(message);

  return (
    <div className={cn(
      "rounded-lg p-3 space-y-2 relative group",
      isUser
        ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
        : "bg-muted/50 border border-border",
    )}>
      <div className="flex items-center justify-between">
        <Badge
          variant={isUser ? "default" : "secondary"}
          className={cn("text-[10px]", isUser && "bg-blue-600")}
        >
          {message.role.toUpperCase()}
        </Badge>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={copyText} />
        </div>
      </div>
      <div className="space-y-2 pl-1">
        {contentBlocks.map((block, i) => (
          <ContentBlock key={i} block={block} />
        ))}
      </div>
    </div>
  );
}

function normalizeContent(
  message: { role: string; content: unknown },
): Array<{ type: string; [key: string]: unknown }> {
  const { content } = message;

  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (Array.isArray(content)) {
    return content.map((block) => {
      if (typeof block === "string") return { type: "text", text: block };
      return block as { type: string; [key: string]: unknown };
    });
  }

  // tool_result messages sometimes have content as a single object
  if (message.role === "user" && typeof content === "object" && content !== null) {
    return [content as { type: string; [key: string]: unknown }];
  }

  return [{ type: "text", text: JSON.stringify(content) }];
}
