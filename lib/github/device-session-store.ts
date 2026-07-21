import { browser } from "wxt/browser";

const STORAGE_KEY = "ggraph:auth:device-session";

// Ephemeral device-flow state (bolt 006): lets a reopened popup show the
// in-progress user code/link instead of a fresh sign-in prompt, without a
// new message round-trip to the background worker.
export interface DeviceSession {
  userCode: string;
  verificationUri: string;
}

function isDeviceSession(value: unknown): value is DeviceSession {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.userCode === "string" && typeof entry.verificationUri === "string";
}

export async function getDeviceSession(): Promise<DeviceSession | null> {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];
    if (value === undefined) return null;
    if (!isDeviceSession(value)) {
      await browser.storage.local.remove(STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export async function setDeviceSession(session: DeviceSession): Promise<void> {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: session });
  } catch {
    // best-effort; a popup reopened mid-poll simply won't see the in-progress code
  }
}

export async function clearDeviceSession(): Promise<void> {
  try {
    await browser.storage.local.remove(STORAGE_KEY);
  } catch {
    // best-effort; a failed clear must never throw into the caller
  }
}
