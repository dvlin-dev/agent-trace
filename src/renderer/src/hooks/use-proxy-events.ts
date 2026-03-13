import { useEffect } from "react";
import { toast } from "sonner";
import { getElectronAPI } from "../lib/electron-api";
import { useSessionStore } from "../stores/session-store";

export function useProxyEvents() {
  const updateSessions = useSessionStore((s) => s.updateSessions);

  useEffect(() => {
    const api = getElectronAPI();

    const unsubCapture = api.onCaptureUpdated((sessions) => {
      updateSessions(sessions);
    });

    const unsubError = api.onProxyError((error) => {
      toast.error("Proxy Error", { description: error });
    });

    return () => {
      unsubCapture();
      unsubError();
    };
  }, [updateSessions]);
}
