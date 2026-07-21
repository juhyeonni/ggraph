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
      sync: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
      },
    },
  },
}));

import { browser } from "wxt/browser";
import type { AuthToken } from "./token-store";
import { clearToken, getToken, storeToken } from "./token-store";

const KEY = "ggraph:auth:token";

function token(overrides: Partial<AuthToken> = {}): AuthToken {
  return {
    access_token: "tok",
    token_type: "bearer",
    scope: "repo",
    obtainedAt: 1000,
    ...overrides,
  };
}

beforeEach(() => {
  state.store.clear();
  state.throwOnSet = false;
  state.throwOnRemove = false;
  vi.clearAllMocks();
});

describe("getToken", () => {
  it("returns null when nothing is stored", async () => {
    expect(await getToken()).toBeNull();
  });

  it("round-trips a stored token", async () => {
    await storeToken(token());
    expect(await getToken()).toEqual(token());
  });

  it("survives a simulated restart (a fresh read still sees the persisted value)", async () => {
    await storeToken(token({ access_token: "restart-tok" }));
    expect(await getToken()).toEqual(token({ access_token: "restart-tok" }));
  });

  it("discards and removes a corrupt entry", async () => {
    state.store.set(KEY, { garbage: true });
    expect(await getToken()).toBeNull();
    expect(state.store.has(KEY)).toBe(false);
  });

  it("returns null if the underlying read throws", async () => {
    vi.mocked(browser.storage.local.get).mockRejectedValueOnce(new Error("boom"));
    expect(await getToken()).toBeNull();
  });
});

describe("storeToken", () => {
  it("stores the token under the ggraph:auth: prefix", async () => {
    await storeToken(token());
    expect(state.store.has(KEY)).toBe(true);
    expect(state.store.get(KEY)).toEqual(token());
  });

  it("never touches chrome.storage.sync", async () => {
    await storeToken(token());
    await getToken();
    await clearToken();
    expect(browser.storage.sync.get).not.toHaveBeenCalled();
    expect(browser.storage.sync.set).not.toHaveBeenCalled();
    expect(browser.storage.sync.remove).not.toHaveBeenCalled();
  });

  it("fails soft and returns false when the write throws, leaving no partial state", async () => {
    state.throwOnSet = true;
    expect(await storeToken(token())).toBe(false);
    expect(state.store.has(KEY)).toBe(false);
  });
});

describe("clearToken", () => {
  it("removes the stored token", async () => {
    await storeToken(token());
    await clearToken();
    expect(await getToken()).toBeNull();
  });

  it("never throws even when the underlying remove fails", async () => {
    state.throwOnRemove = true;
    await expect(clearToken()).resolves.toBeUndefined();
  });
});
