import { useEffect, useMemo } from "react";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { SessionItem } from "./session-item";
import { EmptyState } from "./empty-state";
import { useSessionStore } from "../stores/session-store";

export function SessionSidebar() {
  const {
    sessions,
    selectedSessionId,
    searchQuery,
    loadSessions,
    selectSession,
    setSearchQuery,
  } = useSessionStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filtered = useMemo(() => {
    if (!searchQuery) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.model && s.model.toLowerCase().includes(q)),
    );
  }, [sessions, searchQuery]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Input
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0.5 px-2 pb-2">
            {filtered.map((session) => (
              <SessionItem
                key={session.sessionId}
                session={session}
                isSelected={session.sessionId === selectedSessionId}
                onClick={() => selectSession(session.sessionId)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
