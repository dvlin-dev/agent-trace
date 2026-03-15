interface DataFlowDiagramProps {
  clientName: string;
  localPort: number;
  upstreamUrl: string;
}

export function DataFlowDiagram({ clientName, localPort, upstreamUrl }: DataFlowDiagramProps) {
  // Strip protocol for display
  const upstreamDisplay = upstreamUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return (
    <div className="flex items-stretch w-full max-w-[500px] text-[11px]">
      {/* Client node */}
      <div className="flex-1 border border-border bg-card p-2.5 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5">
          Your Client
        </div>
        <div className="font-mono text-[11px] text-foreground break-all">
          {clientName}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-center w-8 shrink-0 text-muted-foreground/40 text-base">
        →
      </div>

      {/* Agent Trace node (highlighted) */}
      <div className="flex-1 border border-accent-brand bg-accent-brand-muted p-2.5 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-brand/60 mb-0.5">
          Agent Trace
        </div>
        <div className="font-mono text-[11px] text-accent-brand break-all">
          127.0.0.1:{localPort}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-center w-8 shrink-0 text-muted-foreground/40 text-base">
        →
      </div>

      {/* Upstream node */}
      <div className="flex-1 border border-border bg-card p-2.5 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5">
          Upstream API
        </div>
        <div className="font-mono text-[11px] text-foreground break-all">
          {upstreamDisplay}
        </div>
      </div>
    </div>
  );
}
