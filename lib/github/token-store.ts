import { browser } from "wxt/browser";

const STORAGE_KEY = "ggraph:auth:token";

export interface AuthToken {
  access_token: string;
  token_type: string;
  scope: string;
  obtainedAt: number;
}

function isAuthToken(value: unknown): value is AuthToken {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.access_token === "string" &&
    typeof entry.token_type === "string" &&
    typeof entry.scope === "string" &&
    typeof entry.obtainedAt === "number"
  );
}

export async function getToken(): Promise<AuthToken | null> {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];
    if (value === undefined) return null;
    if (!isAuthToken(value)) {
      await browser.storage.local.remove(STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export async function storeToken(token: AuthToken): Promise<boolean> {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: token });
    return true;
  } catch {
    return false;
  }
}

export async function clearToken(): Promise<void> {
  try {
    await browser.storage.local.remove(STORAGE_KEY);
  } catch {
    // best-effort; a failed clear must never throw into the caller
  }
}
