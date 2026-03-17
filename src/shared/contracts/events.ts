import type { SessionListItemVM } from "./view-models";
import type { ConnectionProfile } from "./profile";

export interface TraceCapturedEvent {
  updatedSession: SessionListItemVM;
  updatedExchangeId: string;
}

export interface ProfileStatusChangedEvent {
  statuses: Record<string, { isRunning: boolean; port: number | null }>;
}

export interface ProfilesChangedEvent {
  profiles: ConnectionProfile[];
}

export interface TraceResetEvent {
  clearedAt: string;
}
