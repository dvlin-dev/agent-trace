export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  downloadPercent: number | null;
  message: string | null;
  checkedAt: string | null;
}

export const UNSUPPORTED_AUTO_UPDATE_MESSAGE =
  "Automatic updates are only enabled for packaged macOS and Windows builds.";

export const createDefaultUpdateState = (
  currentVersion = "",
  message: string | null = null,
): UpdateState => ({
  status: "idle",
  currentVersion,
  availableVersion: null,
  downloadPercent: null,
  message,
  checkedAt: null,
});
