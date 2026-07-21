import { browser } from "wxt/browser";
import type { DeviceCodeResult } from "../lib/github/device-flow";
import { pollForToken, requestDeviceCode } from "../lib/github/device-flow";
import { clearDeviceSession, setDeviceSession } from "../lib/github/device-session-store";
import { storeToken } from "../lib/github/token-store";
import { log } from "../lib/log";

// Message contract for popup (bolt 006) to trigger/cancel sign-in. Signed-in
// state itself needs no message — any surface reads it directly via
// `getToken()` against chrome.storage.local, same as the existing cache.
export type AuthRequest = { type: "auth/start" } | { type: "auth/cancel" };

function isAuthRequest(value: unknown): value is AuthRequest {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as Record<string, unknown>).type;
  return type === "auth/start" || type === "auth/cancel";
}

export default defineBackground(() => {
  let generation = 0;

  const startSignIn = async (): Promise<DeviceCodeResult> => {
    const gen = ++generation;
    const result = await requestDeviceCode();
    if (!result.ok) return result;

    // Persisted (not just held in this closure) so a popup reopened mid-poll
    // can read the in-progress code via getDeviceSession() (bolt 006).
    await setDeviceSession({
      userCode: result.session.userCode,
      verificationUri: result.session.verificationUri,
    });

    void pollForToken(result.session, { isCancelled: () => gen !== generation }).then(
      async (outcome) => {
        if (gen !== generation) return; // superseded: a newer session owns the stored state now
        if (outcome.ok) {
          const stored = await storeToken(outcome.token);
          if (!stored) log.error("failed to persist auth token");
        }
        await clearDeviceSession();
      },
    );
    return result;
  };

  // Uses the classic sendResponse + `return true` idiom (not "return a
  // Promise") — the one pattern that works whether `wxt/browser` resolves to
  // the raw Chrome callback API or the Firefox/webextension-polyfill API.
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isAuthRequest(message)) return false;
    if (message.type === "auth/cancel") {
      generation++;
      void clearDeviceSession();
      sendResponse({ ok: true });
      return false;
    }
    startSignIn().then(sendResponse);
    return true;
  });
});
