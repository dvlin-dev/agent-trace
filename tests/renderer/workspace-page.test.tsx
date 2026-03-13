import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionSidebar } from "../../src/renderer/src/components/session-sidebar";
import { EmptyState } from "../../src/renderer/src/components/empty-state";
import { SessionItem } from "../../src/renderer/src/components/session-item";
import { useSessionStore } from "../../src/renderer/src/stores/session-store";
import { stripXmlTags } from "../../src/shared/strip-xml";
import type { SessionSummary } from "../../src/shared/types";

// Mock the electron API
vi.mock("../../src/renderer/src/lib/electron-api", () => ({
  getElectronAPI: () => ({
    listSessions: vi.fn().mockResolvedValue([]),
    getProxyStatus: vi.fn().mockResolvedValue({ isRunning: false }),
  }),
}));

describe("EmptyState", () => {
  it("displays no sessions message", () => {
    render(<EmptyState />);
    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
    expect(
      screen.getByText(/start listening to capture/i),
    ).toBeInTheDocument();
  });
});

describe("SessionItem", () => {
  const mockSession: SessionSummary = {
    sessionId: "s1",
    title: "Fix authentication bug",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requestCount: 5,
    model: "claude-opus-4-6",
  };

  it("displays session title", () => {
    render(
      <SessionItem
        session={mockSession}
        isSelected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Fix authentication bug")).toBeInTheDocument();
  });

  it("displays model badge", () => {
    render(
      <SessionItem
        session={mockSession}
        isSelected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("claude-opus-4-6")).toBeInTheDocument();
  });

  it("displays request count", () => {
    render(
      <SessionItem
        session={mockSession}
        isSelected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText(/5 req/)).toBeInTheDocument();
  });
});

describe("SessionSidebar", () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      selectedSessionId: null,
      searchQuery: "",
    });
  });

  it("renders search input", () => {
    render(<SessionSidebar />);
    expect(
      screen.getByPlaceholderText("Search sessions..."),
    ).toBeInTheDocument();
  });

  it("shows empty state when no sessions", () => {
    render(<SessionSidebar />);
    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
  });

  it("renders sessions from store", () => {
    useSessionStore.setState({
      sessions: [
        {
          sessionId: "s1",
          title: "Test session",
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          requestCount: 3,
          model: "claude-opus-4-6",
        },
      ],
    });

    render(<SessionSidebar />);
    expect(screen.getByText("Test session")).toBeInTheDocument();
  });
});

describe("stripXmlTags", () => {
  it("strips XML tags from text", () => {
    expect(stripXmlTags("<system-reminder>Hello world</system-reminder>")).toBe("Hello world");
  });

  it("strips nested tags", () => {
    expect(stripXmlTags("<a><b>text</b></a>")).toBe("text");
  });

  it("strips self-closing tags", () => {
    expect(stripXmlTags("before <br/> after")).toBe("before  after");
  });

  it("returns plain text unchanged", () => {
    expect(stripXmlTags("no tags here")).toBe("no tags here");
  });

  it("trims whitespace after stripping", () => {
    expect(stripXmlTags("  <tag>hello</tag>  ")).toBe("hello");
  });

  it("SessionItem strips XML tags from title", () => {
    const session: SessionSummary = {
      sessionId: "s2",
      title: "<system-reminder>Fix the bug</system-reminder>",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requestCount: 1,
      model: null,
    };

    render(
      <SessionItem session={session} isSelected={false} onClick={() => {}} />,
    );
    expect(screen.getByText("Fix the bug")).toBeInTheDocument();
    expect(screen.queryByText(/<system-reminder>/)).not.toBeInTheDocument();
  });
});
