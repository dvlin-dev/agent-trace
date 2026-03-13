import { useAppStore } from "../stores/app-store";

export function ProxyInstructions() {
  const { proxyAddress } = useAppStore();

  if (!proxyAddress) return null;

  return (
    <div className="rounded-md border bg-muted/50 p-4 text-sm space-y-2">
      <p className="font-medium">Connect Claude Code</p>
      <p className="text-muted-foreground">
        Set your Claude Code to use this proxy address:
      </p>
      <code className="block rounded bg-background px-3 py-2 font-mono text-xs">
        {proxyAddress}
      </code>
    </div>
  );
}
