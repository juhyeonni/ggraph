import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  throwOnSet: false,
  throwOnRemove: false,
}));

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (key: string) => {
          return state.store.has(key) ? { [key]: state.store.get(key) } : {};
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          if (state.throwOnSet) throw new Error("QUOTA_BYTES_PER_ITEM quota exceeded");
          for (const [key, value] of Object.entries(items)) state.store.set(key, value);
        }),
        remove: vi.fn(async (key: string) => {
          if (state.throwOnRemove) throw new Error("remove failed");
          state.store.delete(key);
        }),
      },
    },
  },
}));

import { browser } from "wxt/browser";
import type { DeviceSession } from "./device-session-store";
import { clearDeviceSession, getDeviceSession, setDeviceSession } from "./device-session-store";

const KEY = "ggraph:auth:device-session";

function session(overrides: Partial<DeviceSession> = {}): DeviceSession {
  return {
    userCode: "ABCD-1234",
    verificationUri: "https://github.com/login/device",
    ...overrides,
  };
}

beforeEach(() => {
  state.store.clear();
  state.throwOnSet = false;
  state.throwOnRemove = false;
  vi.clearAllMocks();
});

describe("getDeviceSession", () => {
  it("returns null when nothing is stored", async () => {
    expect(await getDeviceSession()).toBeNull();
  });

  it("round-trips a stored session", async () => {
    await setDeviceSession(session());
    expect(await getDeviceSession()).toEqual(session());
  });

  it("discards and removes a corrupt entry", async () => {
    state.store.set(KEY, { garbage: true });
    expect(await getDeviceSession()).toBeNull();
    expect(state.store.has(KEY)).toBe(false);
  });

  it("returns null if the underlying read throws", async () => {
    vi.mocked(browser.storage.local.get).mockRejectedValueOnce(new Error("boom"));
    expect(await getDeviceSession()).toBeNull();
  });
});

describe("setDeviceSession", () => {
  it("stores the session under the device-session key", async () => {
    await setDeviceSession(session({ userCode: "WXYZ-9999" }));
    expect(state.store.get(KEY)).toEqual(session({ userCode: "WXYZ-9999" }));
  });

  it("never throws when the write fails", async () => {
    state.throwOnSet = true;
    await expect(setDeviceSession(session())).resolves.toBeUndefined();
  });
});

describe("clearDeviceSession", () => {
  it("removes the stored session", async () => {
    await setDeviceSession(session());
    await clearDeviceSession();
    expect(await getDeviceSession()).toBeNull();
  });

  it("never throws even when the underlying remove fails", async () => {
    state.throwOnRemove = true;
    await expect(clearDeviceSession()).resolves.toBeUndefined();
  });
});
