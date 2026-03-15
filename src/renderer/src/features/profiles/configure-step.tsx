import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { ProviderMeta } from "./constants";
import { ProviderBadge } from "./components/provider-badge";
import { DataFlowDiagram } from "./components/data-flow-diagram";
import { ShellBlock } from "./components/shell-block";
import { StepDots } from "./components/step-dots";

interface ConfigureStepProps {
  provider: ProviderMeta;
  upstreamUrl: string;
  localPort: number;
  onUpstreamUrlChange: (url: string) => void;
  onLocalPortChange: (port: number) => void;
  onBack: () => void;
  onStart: () => void;
  onManual: () => void;
  isCreating: boolean;
}

export function ConfigureStep({
  provider,
  upstreamUrl,
  localPort,
  onUpstreamUrlChange,
  onLocalPortChange,
  onBack,
  onStart,
  onManual,
  isCreating,
}: ConfigureStepProps) {
  const [copied, setCopied] = useState(false);

  const localAddress = `http://127.0.0.1:${localPort}`;
  const exportCmd = `export ${provider.envVar}=${localAddress}`;

  function copyAddress() {
    navigator.clipboard.writeText(localAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-lg">
        <StepDots current={1} />

        {/* Provider header */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ProviderBadge
              providerId={provider.id}
              className="w-[22px] h-[22px] text-[9px]"
            />
            <span className="text-sm font-semibold">{provider.label}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Configure how traffic flows through Agent Trace
          </div>
        </div>

        {/* Data flow diagram */}
        <div className="flex justify-center mb-5">
          <DataFlowDiagram
            clientName={provider.clientName}
            localPort={localPort}
            upstreamUrl={upstreamUrl || provider.defaultUrl}
          />
        </div>

        {/* Section 1: Upstream URL */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-accent-brand text-white text-[10px] font-bold">
              1
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Upstream API URL
            </span>
          </div>
          <Input
            value={upstreamUrl}
            onChange={(e) => onUpstreamUrlChange(e.target.value)}
            placeholder={provider.defaultUrl}
            className="font-mono text-xs h-9"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Where should Agent Trace forward requests? Change this if you use a custom endpoint or proxy.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2.5 my-5 text-[11px] text-muted-foreground/40">
          <div className="flex-1 h-px bg-border" />
          <span>Agent Trace will listen on</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Section 2: Local address */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-accent-brand text-white text-[10px] font-bold">
              2
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your local listener
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              value={localAddress}
              readOnly
              className="font-mono text-xs h-9 text-muted-foreground flex-1"
            />
            <button
              className="shrink-0 flex items-center gap-1.5 h-9 px-3 border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground text-[11px] font-medium transition-colors"
              onClick={copyAddress}
            >
              {copied ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              Copy
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Point your agent client here instead of the upstream URL.
          </p>
        </div>

        {/* Shell block */}
        <div className="mb-6">
          <ShellBlock label="Run in your terminal" code={exportCmd} />
        </div>

        {/* Advanced port */}
        <details className="mb-6 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-[11px]">
            Advanced: change local port
          </summary>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Port:</span>
            <Input
              type="number"
              min={1}
              max={65535}
              value={localPort}
              onChange={(e) => onLocalPortChange(Number(e.target.value) || provider.defaultPort)}
              className="w-20 font-mono text-xs h-8"
            />
          </div>
        </details>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <Button onClick={onStart} disabled={isCreating}>
            {isCreating ? "Starting..." : "Start Listening"}
          </Button>
        </div>

        <div className="text-center mt-3">
          <button
            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            onClick={onManual}
          >
            Advanced: manual configuration
          </button>
        </div>
      </div>
    </div>
  );
}
