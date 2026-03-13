export const IPC = {
  GET_SETTINGS: "app:get-settings",
  SAVE_SETTINGS: "app:save-settings",
  TOGGLE_LISTENING: "app:toggle-listening",
  GET_PROXY_STATUS: "app:get-proxy-status",
  LIST_SESSIONS: "app:list-sessions",
  GET_SESSION_REQUESTS: "app:get-session-requests",
  GET_REQUEST_DETAIL: "app:get-request-detail",
  CLEAR_DATA: "app:clear-data",
  SEARCH: "app:search",
  // main → renderer push events
  CAPTURE_UPDATED: "proxy:capture-updated",
  PROXY_ERROR: "proxy:error",
} as const;
