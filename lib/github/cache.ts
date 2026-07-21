import { browser } from "wxt/browser";
import type { Commit } from "./fetch-commits";

export interface CacheEntry {
  commits: Commit[];
  fetchedAt: number;
  lastAccessed: number;
  etag?: string;
}

export const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 20;
const KEY_PREFIX = "ggraph:cache:";

function cacheKey(owner: string, repo: string, ref: string | undefined): string {
  return `${KEY_PREFIX}${owner}/${repo}@${ref ?? ""}`;
}

export function isFresh(entry: CacheEntry, ttlMs = DEFAULT_TTL_MS): boolean {
  return Date.now() - entry.fetchedAt < ttlMs;
}

function isCacheEntry(value: unknown): value is CacheEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    Array.isArray(entry.commits) &&
    typeof entry.fetchedAt === "number" &&
    typeof entry.lastAccessed === "number"
  );
}

export async function getCacheEntry(
  owner: string,
  repo: string,
  ref: string | undefined,
): Promise<CacheEntry | null> {
  const key = cacheKey(owner, repo, ref);
  try {
    const stored = await browser.storage.local.get(key);
    const value = stored[key];
    if (value === undefined) return null;
    if (!isCacheEntry(value)) {
      await browser.storage.local.remove(key);
      return null;
    }
    browser.storage.local.set({ [key]: { ...value, lastAccessed: Date.now() } }).catch(() => {});
    return value;
  } catch {
    return null;
  }
}

async function evictExcess(maxEntries: number): Promise<void> {
  const all = await browser.storage.local.get(null);
  const cacheKeys = Object.keys(all).filter((key) => key.startsWith(KEY_PREFIX));
  if (cacheKeys.length <= maxEntries) return;
  const byAge = cacheKeys
    .map((key) => {
      const value: unknown = all[key];
      return { key, lastAccessed: isCacheEntry(value) ? value.lastAccessed : 0 };
    })
    .sort((a, b) => a.lastAccessed - b.lastAccessed);
  const excess = byAge.slice(0, cacheKeys.length - maxEntries).map((item) => item.key);
  await browser.storage.local.remove(excess);
}

export async function setCacheEntry(
  owner: string,
  repo: string,
  ref: string | undefined,
  commits: Commit[],
  etag?: string,
): Promise<void> {
  const key = cacheKey(owner, repo, ref);
  const now = Date.now();
  const entry: CacheEntry = { commits, fetchedAt: now, lastAccessed: now, etag };
  try {
    await browser.storage.local.set({ [key]: entry });
    await evictExcess(MAX_CACHE_ENTRIES);
  } catch {
    try {
      await evictExcess(Math.floor(MAX_CACHE_ENTRIES / 2));
      await browser.storage.local.set({ [key]: entry });
    } catch {
      // cache is best-effort; a failed write must never break the page
    }
  }
}
