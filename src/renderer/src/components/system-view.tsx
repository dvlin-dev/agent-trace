import { useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { MarkdownRenderer } from "./ui/markdown-renderer";
import { Copy, Check } from "lucide-react";
import type { NormalizedBlock } from "../../../shared/contracts";
import { useTraceStore } from "../stores/trace-store";

const EMPTY_INSTRUCTIONS: NormalizedBlock[] = [];

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
      className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm transition-colors"
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function SystemView() {
  const instructions = useTraceStore(
    (state) => state.trace?.instructions ?? EMPTY_INSTRUCTIONS,
  );
  const rawMode = useTraceStore((state) => state.rawMode);

  const text = instructions
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (!text) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No system instructions
      </div>
    );
  }

  const copyText = rawMode ? JSON.stringify(instructions, null, 2) : text;

  if (rawMode) {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={copyText} />
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-all overflow-auto">
              {JSON.stringify(instructions, null, 2)}
            </pre>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-6 max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-4 overflow-visible relative group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={copyText} />
          </div>
          <MarkdownRenderer content={text} />
        </div>
      </div>
    </ScrollArea>
  );
}
