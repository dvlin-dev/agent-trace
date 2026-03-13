import { useEffect, useRef } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { MessageBlock } from "./message-block";
import { useRequestStore } from "../stores/request-store";
import { parseClaudeRequest, parseClaudeResponse } from "../lib/parse-claude-body";

interface ConversationMessage {
  role: string;
  content: unknown;
}

export function ConversationView() {
  const requests = useRequestStore((s) => s.requests);
  const rawMode = useRequestStore((s) => s.rawMode);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build the full conversation from the last request (which contains the full message history)
  // plus the response
  const lastRequest = requests[requests.length - 1];
  const parsed = lastRequest ? parseClaudeRequest(lastRequest.requestBody) : null;
  const messages: ConversationMessage[] = parsed?.messages ? [...parsed.messages] : [];

  // Append the assistant's response from the last request
  if (lastRequest) {
    const response = parseClaudeResponse(lastRequest.responseBody);
    if (response) {
      messages.push({ role: response.role, content: response.content });
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (requests.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No requests in this session
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No messages to display
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4 max-w-3xl mx-auto">
        {messages.map((msg, i) => (
          <MessageBlock key={i} message={msg} rawMode={rawMode} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
