import { Badge } from "./ui/badge";
import type { SessionSummary } from "../../../shared/types";
import { cn } from "../lib/utils";
import { stripXmlTags } from "../../../shared/strip-xml";

interface SessionItemProps {
  session: SessionSummary;
  isSelected: boolean;
  onClick: () => void;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionItem({ session, isSelected, onClick }: SessionItemProps) {
  return (
    <button
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-md transition-colors duration-150",
        "hover:bg-accent",
        isSelected && "bg-accent",
      )}
      onClick={onClick}
    >
      <p className="text-sm font-medium truncate">{stripXmlTags(session.title)}</p>
      <div className="flex items-center gap-2 mt-1">
        {session.model && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {session.model}
          </Badge>
        )}
        <span className="text-[11px] text-muted-foreground">
          {session.requestCount} req · {formatTimeAgo(session.updatedAt)}
        </span>
      </div>
    </button>
  );
}
