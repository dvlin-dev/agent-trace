import { useEffect } from "react";
import { toast } from "sonner";
import { getElectronAPI } from "../lib/electron-api";
import { useSessionStore } from "../stores/session-store";
import { useTraceStore } from "../stores/trace-store";
import { useProfileStore } from "../stores/profile-store";

export function useProxyEvents() {
  const upsertSession = useSessionStore((s) => s.upsertSession);
  const resetSessions = useSessionStore((s) => s.reset);
  const loadTrace = useTraceStore((state) => state.loadTrace);
  const setStatuses = useProfileStore((state) => state.setStatuses);
  const setProfiles = useProfileStore((state) => state.setProfiles);

  useEffect(() => {
    const api = getElectronAPI();

    const unsubCapture = api.onTraceCaptured((payload) => {
      upsertSession(payload.updatedSession);
      const selectedSessionId = useSessionStore.getState().selectedSessionId;
      if (payload.updatedSession.sessionId === selectedSessionId) {
        void loadTrace(payload.updatedSession.sessionId);
      }
    });
    const unsubReset = api.onTraceReset(() => {
      resetSessions();
    });

    const unsubProfileStatus = api.onProfileStatusChanged((payload) => {
      setStatuses(payload.statuses);
    });

    const unsubProfilesChanged = api.onProfilesChanged((payload) => {
      setProfiles(payload.profiles);
    });

    const unsubError = api.onProxyError((error) => {
      toast.error("Proxy Error", { description: error });
    });

    return () => {
      unsubCapture();
      unsubReset();
      unsubProfileStatus();
      unsubProfilesChanged();
      unsubError();
    };
  }, [loadTrace, resetSessions, setStatuses, setProfiles, upsertSession]);
}
