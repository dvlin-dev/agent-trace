import { useEffect } from "react";

interface KeyboardNavigatorProps {
  children: React.ReactNode;
}

export function KeyboardNavigator({ children }: KeyboardNavigatorProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+\ to toggle sidebar (handled via CSS or state)
      if (e.key === "\\" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Sidebar toggle can be wired up if needed
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return <>{children}</>;
}
