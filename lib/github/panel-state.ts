import { isClientIdConfigured } from "./auth-config";
import type { DeviceSession } from "./device-session-store";
import type { AuthToken } from "./token-store";

export type PanelState =
  | { kind: "loading" }
  | { kind: "not-configured" }
  | { kind: "signed-out" }
  | { kind: "starting" }
  | { kind: "device"; userCode: string; verificationUri: string }
  | { kind: "error" }
  | { kind: "signed-in" };

// Pure state-model logic for the settings panel (bolt 006), kept out of
// entrypoints/popup/main.tsx so it's directly unit-testable — the panel
// module itself renders on import and has no test harness in this repo
// (same reasoning as lib/github/degrade.ts for commits.content.ts).
export function computeState(
  token: AuthToken | null,
  deviceSession: DeviceSession | null,
): PanelState {
  if (token !== null) return { kind: "signed-in" };
  if (deviceSession !== null) return { kind: "device", ...deviceSession };
  return isClientIdConfigured() ? { kind: "signed-out" } : { kind: "not-configured" };
}
