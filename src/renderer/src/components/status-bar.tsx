import { Settings, Github } from "lucide-react";
import { Button } from "./ui/button";

interface StatusBarProps {
  onSettingsClick: () => void;
}

export function StatusBar({ onSettingsClick }: StatusBarProps) {
  return (
    <div className="drag-region flex h-10 items-center justify-between border-b px-4 shrink-0">
      <span className="pl-16 text-xs font-semibold">Agent Trace</span>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSettingsClick}
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void window.electronAPI.openExternal("https://github.com/dvlin-dev/agent-trace")}
          title="GitHub"
        >
          <Github className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
