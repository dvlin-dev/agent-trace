export function EmptyState() {
  return (
    <div className="flex items-center justify-center gap-1.5 p-6">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-30" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
      </span>
      <span className="text-[11px] text-muted-foreground">
        Waiting for first request...
      </span>
    </div>
  );
}
