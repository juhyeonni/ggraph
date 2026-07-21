import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  throwOnSet: false,
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
          state.store.delete(key);
        }),
      },
    },
  },
}));

import { browser } from "wxt/browser";
import { DEFAULT_DEPTH } from "./fetch-commits";
import { clampDepth, getSettings, setCommitDepth } from "./settings-store";

const KEY = "ggraph:settings";

beforeEach(() => {
  state.store.clear();
  state.throwOnSet = false;
  vi.clearAllMocks();
});

describe("clampDepth", () => {
  it("passes a value inside the bounds through unchanged", () => {
    expect(clampDepth(500)).toBe(500);
  });

  it("clamps a zero or negative value up to the minimum", () => {
    expect(clampDepth(0)).toBe(1);
    expect(clampDepth(-50)).toBe(1);
  });

  it("clamps an absurdly large value down to the maximum", () => {
    expect(clampDepth(1_000_000)).toBe(2000);
  });

  it("rounds a non-integer value", () => {
    expect(clampDepth(199.6)).toBe(200);
  });

  it("falls back to DEFAULT_DEPTH for non-finite input", () => {
    expect(clampDepth(Number.NaN)).toBe(DEFAULT_DEPTH);
    expect(clampDepth(Number.POSITIVE_INFINITY)).toBe(DEFAULT_DEPTH);
  });

  it("accepts the exact boundary values", () => {
    expect(clampDepth(1)).toBe(1);
    expect(clampDepth(2000)).toBe(2000);
  });
});

describe("getSettings", () => {
  it("returns DEFAULT_DEPTH when nothing is stored", async () => {
    expect(await getSettings()).toEqual({ commitDepth: DEFAULT_DEPTH });
  });

  it("round-trips a stored custom depth", async () => {
    await setCommitDepth(500);
    expect(await getSettings()).toEqual({ commitDepth: 500 });
  });

  it("falls back to DEFAULT_DEPTH for a corrupt entry, never throwing", async () => {
    state.store.set(KEY, { garbage: true });
    await expect(getSettings()).resolves.toEqual({ commitDepth: DEFAULT_DEPTH });
  });

  it("re-clamps a stored value that is out of range (e.g. edited outside the app)", async () => {
    state.store.set(KEY, { commitDepth: 999_999 });
    expect(await getSettings()).toEqual({ commitDepth: 2000 });
  });

  it("returns DEFAULT_DEPTH if the underlying read throws", async () => {
    vi.mocked(browser.storage.local.get).mockRejectedValueOnce(new Error("boom"));
    expect(await getSettings()).toEqual({ commitDepth: DEFAULT_DEPTH });
  });
});

describe("setCommitDepth", () => {
  it("stores a clamped value under the settings key", async () => {
    await setCommitDepth(-5);
    expect(state.store.get(KEY)).toEqual({ commitDepth: 1 });
  });

  it("returns true on a successful write", async () => {
    expect(await setCommitDepth(200)).toBe(true);
  });

  it("fails soft and returns false when the write throws", async () => {
    state.throwOnSet = true;
    expect(await setCommitDepth(200)).toBe(false);
  });
});
