import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface ShellBlockProps {
  label: string;
  code: string;
}

export function ShellBlock({ label, code }: ShellBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="border border-border bg-[#0a0a0a] rounded-md p-3">
      {label && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
          {label}
        </div>
      )}
      <div className="flex items-center gap-2">
        <code className="text-xs text-success font-mono flex-1 min-w-0 overflow-x-auto">
          {code}
        </code>
        <button
          className="shrink-0 flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 px-2 py-1 border border-neutral-700 bg-neutral-800 rounded-sm transition-colors"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
