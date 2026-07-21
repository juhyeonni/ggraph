import { browser } from "wxt/browser";
import { DEFAULT_DEPTH } from "./fetch-commits";

const STORAGE_KEY = "ggraph:settings";
const MIN_DEPTH = 1;
const MAX_DEPTH = 2000;

export interface Settings {
  commitDepth: number;
}

export function clampDepth(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DEPTH;
  return Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, Math.round(value)));
}

function isSettings(value: unknown): value is Settings {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as Record<string, unknown>).commitDepth === "number";
}

export async function getSettings(): Promise<Settings> {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];
    if (!isSettings(value)) return { commitDepth: DEFAULT_DEPTH };
    return { commitDepth: clampDepth(value.commitDepth) };
  } catch {
    return { commitDepth: DEFAULT_DEPTH };
  }
}

export async function setCommitDepth(depth: number): Promise<boolean> {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: { commitDepth: clampDepth(depth) } });
    return true;
  } catch {
    return false;
  }
}
