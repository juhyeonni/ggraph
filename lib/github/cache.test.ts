import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  throwOnSet: 0,
}));

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | null) => {
          if (keys === null || keys === undefined) {
            return Object.fromEntries(state.store);
          }
          return state.store.has(keys) ? { [keys]: state.store.get(keys) } : {};
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          if (state.throwOnSet > 0) {
            state.throwOnSet--;
            throw new Error("QUOTA_BYTES_PER_ITEM quota exceeded");
          }
          for (const [key, value] of Object.entries(items)) state.store.set(key, value);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) state.store.delete(key);
        }),
      },
    },
  },
}));

import type { CacheEntry } from "./cache";
import { DEFAULT_TTL_MS, getCacheEntry, isFresh, setCacheEntry } from "./cache";

function entry(lastAccessed: number, fetchedAt = lastAccessed): CacheEntry {
  return { commits: [], fetchedAt, lastAccessed };
}

function keyFor(ref: string): string {
  return `ggraph:cache:o/r@${ref}`;
}

beforeEach(() => {
  state.store.clear();
  state.throwOnSet = 0;
  vi.clearAllMocks();
});

describe("isFresh", () => {
  it("is fresh within the ttl", () => {
    expect(isFresh(entry(Date.now()))).toBe(true);
  });

  it("is stale past the ttl", () => {
    expect(isFresh(entry(0, Date.now() - DEFAULT_TTL_MS - 1000))).toBe(false);
  });

  it("honours a custom ttl", () => {
    expect(isFresh(entry(0, Date.now() - 5000), 1000)).toBe(false);
    expect(isFresh(entry(0, Date.now() - 500), 1000)).toBe(true);
  });
});

describe("getCacheEntry", () => {
  it("returns null for a missing entry", async () => {
    expect(await getCacheEntry("o", "r", "main")).toBeNull();
  });

  it("returns a valid entry regardless of freshness", async () => {
    const stale = entry(1, Date.now() - DEFAULT_TTL_MS - 1000);
    state.store.set(keyFor("main"), stale);
    const result = await getCacheEntry("o", "r", "main");
    expect(result).toEqual(stale);
  });

  it("bumps lastAccessed on read", async () => {
    state.store.set(keyFor("main"), entry(1));
    await getCacheEntry("o", "r", "main");
    await new Promise((resolve) => setTimeout(resolve));
    const stored = state.store.get(keyFor("main")) as CacheEntry;
    expect(stored.lastAccessed).toBeGreaterThan(1);
  });

  it("discards and removes a corrupt entry", async () => {
    state.store.set(keyFor("main"), { garbage: true });
    expect(await getCacheEntry("o", "r", "main")).toBeNull();
    expect(state.store.has(keyFor("main"))).toBe(false);
  });
});

describe("setCacheEntry", () => {
  it("stores an entry with fetch and access timestamps", async () => {
    await setCacheEntry("o", "r", "main", []);
    const stored = state.store.get(keyFor("main")) as CacheEntry;
    expect(stored.commits).toEqual([]);
    expect(typeof stored.fetchedAt).toBe("number");
    expect(typeof stored.lastAccessed).toBe("number");
  });

  it("evicts the least-recently-accessed entry over the cap", async () => {
    for (let i = 0; i < 20; i++) {
      state.store.set(keyFor(`r${i}`), entry(100 + i));
    }
    await setCacheEntry("o", "r", "new", []);
    expect(state.store.size).toBe(20);
    expect(state.store.has(keyFor("r0"))).toBe(false);
    expect(state.store.has(keyFor("new"))).toBe(true);
  });

  it("evicts aggressively and retries once when the quota is exceeded", async () => {
    for (let i = 0; i < 20; i++) {
      state.store.set(keyFor(`r${i}`), entry(100 + i));
    }
    state.throwOnSet = 1;
    await expect(setCacheEntry("o", "r", "new", [])).resolves.toBeUndefined();
    expect(state.store.has(keyFor("new"))).toBe(true);
  });

  it("never throws when writes keep failing", async () => {
    state.throwOnSet = 99;
    await expect(setCacheEntry("o", "r", "main", [])).resolves.toBeUndefined();
  });
});
