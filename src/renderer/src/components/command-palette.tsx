import { useEffect, useState, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { useSessionStore } from "../stores/session-store";
import { useAppStore } from "../stores/app-store";
import { getElectronAPI } from "../lib/electron-api";
import type { SessionSummary, RequestRecord } from "../../../shared/types";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchSessions, setSearchSessions] = useState<SessionSummary[]>([]);
  const [searchRequests, setSearchRequests] = useState<RequestRecord[]>([]);
  const selectSession = useSessionStore((s) => s.selectSession);
  const toggleListening = useAppStore((s) => s.toggleListening);
  const clearData = useSessionStore((s) => s.clearData);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setSearchSessions([]);
      setSearchRequests([]);
      return;
    }
    try {
      const api = getElectronAPI();
      const result = await api.search(value);
      setSearchSessions(result.sessions);
      setSearchRequests(result.requests);
    } catch {
      // Ignore search errors
    }
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search sessions, requests, or actions..."
        value={query}
        onValueChange={handleSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {searchSessions.length > 0 && (
          <CommandGroup heading="Sessions">
            {searchSessions.map((s) => (
              <CommandItem
                key={s.sessionId}
                onSelect={() => {
                  selectSession(s.sessionId);
                  setOpen(false);
                }}
              >
                <span className="truncate">{s.title}</span>
                {s.model && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {s.model}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searchRequests.length > 0 && (
          <CommandGroup heading="Requests">
            {searchRequests.map((r) => (
              <CommandItem
                key={r.requestId}
                onSelect={() => {
                  selectSession(r.sessionId);
                  setOpen(false);
                }}
              >
                <span className="font-mono text-xs">
                  {r.method} {r.path}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {r.statusCode}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              toggleListening();
              setOpen(false);
            }}
          >
            Toggle Listening
          </CommandItem>
          <CommandItem
            onSelect={() => {
              clearData();
              setOpen(false);
            }}
          >
            Clear Data
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
