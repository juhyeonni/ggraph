import { CLIENT_ID, isClientIdConfigured, OAUTH_SCOPE } from "./auth-config";
import type { AuthToken } from "./token-store";

const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
const SLOW_DOWN_INCREMENT_MS = 5000;

export interface DeviceCodeSession {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalMs: number;
}

export type DeviceCodeError =
  | { kind: "not-configured" }
  | { kind: "network" }
  | { kind: "malformed" };

export type DeviceCodeResult =
  | { ok: true; session: DeviceCodeSession }
  | { ok: false; error: DeviceCodeError };

export type PollOutcome =
  | { kind: "pending" }
  | { kind: "slow_down" }
  | { kind: "success"; token: AuthToken }
  | { kind: "expired" }
  | { kind: "denied" }
  | { kind: "error" };

export type DeviceFlowResult =
  | { ok: true; token: AuthToken }
  | { ok: false; error: "expired" | "denied" | "cancelled" };

export type PollStep =
  | { action: "wait"; intervalMs: number }
  | { action: "stop"; result: DeviceFlowResult };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseDeviceCodeResponse(raw: unknown): DeviceCodeSession | null {
  const obj = asRecord(raw);
  if (obj === null) return null;
  if (
    typeof obj.device_code !== "string" ||
    typeof obj.user_code !== "string" ||
    typeof obj.verification_uri !== "string" ||
    typeof obj.interval !== "number"
  ) {
    return null;
  }
  return {
    deviceCode: obj.device_code,
    userCode: obj.user_code,
    verificationUri: obj.verification_uri,
    intervalMs: obj.interval * 1000,
  };
}

export async function requestDeviceCode(): Promise<DeviceCodeResult> {
  if (!isClientIdConfigured()) return { ok: false, error: { kind: "not-configured" } };
  let body: unknown;
  try {
    const response = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ client_id: CLIENT_ID, scope: OAUTH_SCOPE }),
    });
    if (!response.ok) return { ok: false, error: { kind: "network" } };
    body = await response.json();
  } catch {
    return { ok: false, error: { kind: "network" } };
  }
  const session = parseDeviceCodeResponse(body);
  if (session === null) return { ok: false, error: { kind: "malformed" } };
  return { ok: true, session };
}

function parseTokenResponse(raw: unknown): PollOutcome {
  const obj = asRecord(raw);
  if (obj === null) return { kind: "error" };
  if (typeof obj.error === "string") {
    switch (obj.error) {
      case "authorization_pending":
        return { kind: "pending" };
      case "slow_down":
        return { kind: "slow_down" };
      case "expired_token":
        return { kind: "expired" };
      case "access_denied":
        return { kind: "denied" };
      default:
        return { kind: "error" };
    }
  }
  if (
    typeof obj.access_token !== "string" ||
    typeof obj.token_type !== "string" ||
    typeof obj.scope !== "string"
  ) {
    return { kind: "error" };
  }
  return {
    kind: "success",
    token: {
      access_token: obj.access_token,
      token_type: obj.token_type,
      scope: obj.scope,
      obtainedAt: Date.now(),
    },
  };
}

export async function pollOnce(deviceCode: string): Promise<PollOutcome> {
  let body: unknown;
  try {
    const response = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: GRANT_TYPE,
      }),
    });
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  return parseTokenResponse(body);
}

export function nextPollStep(outcome: PollOutcome, currentIntervalMs: number): PollStep {
  switch (outcome.kind) {
    case "success":
      return { action: "stop", result: { ok: true, token: outcome.token } };
    case "expired":
      return { action: "stop", result: { ok: false, error: "expired" } };
    case "denied":
      return { action: "stop", result: { ok: false, error: "denied" } };
    case "slow_down":
      return { action: "wait", intervalMs: currentIntervalMs + SLOW_DOWN_INCREMENT_MS };
    case "pending":
    case "error":
      return { action: "wait", intervalMs: currentIntervalMs };
  }
}

export interface PollForTokenOptions {
  sleep?: (ms: number) => Promise<void>;
  isCancelled?: () => boolean;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ponytail: schedules via plain setTimeout inside the MV3 service worker;
// Chrome may terminate an idle worker before a long wait fires, silently
// ending a session mid-poll. Story 002 already treats a mid-poll reload as
// acceptable (user restarts sign-in), so this is left as-is. Upgrade path if
// that proves too flaky: a periodic keepalive call, or chrome.alarms
// (minute-granularity, needs its own workaround for sub-minute intervals).
export async function pollForToken(
  session: DeviceCodeSession,
  options: PollForTokenOptions = {},
): Promise<DeviceFlowResult> {
  const sleep = options.sleep ?? defaultSleep;
  const isCancelled = options.isCancelled ?? ((): boolean => false);
  let intervalMs = session.intervalMs;
  while (true) {
    if (isCancelled()) return { ok: false, error: "cancelled" };
    await sleep(intervalMs);
    if (isCancelled()) return { ok: false, error: "cancelled" };
    const outcome = await pollOnce(session.deviceCode);
    if (isCancelled()) return { ok: false, error: "cancelled" };
    const step = nextPollStep(outcome, intervalMs);
    if (step.action === "stop") return step.result;
    intervalMs = step.intervalMs;
  }
}
