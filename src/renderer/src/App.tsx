import { useEffect } from "react";
import { useAppStore } from "./stores/app-store";
import { SetupPage } from "./pages/setup-page";
import { WorkspacePage } from "./pages/workspace-page";

function LoadingSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

export default function App() {
  const { initialized, settings, initialize } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) return <LoadingSkeleton />;
  if (!settings?.targetUrl) return <SetupPage />;
  return <WorkspacePage />;
}
