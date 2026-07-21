import { afterEach, describe, expect, it, vi } from "vitest";

const authConfigState = vi.hoisted(() => ({ configured: true }));

vi.mock("./auth-config", () => ({
  CLIENT_ID: "test-client-id",
  OAUTH_SCOPE: "repo",
  isClientIdConfigured: () => authConfigState.configured,
}));

import type { DeviceCodeSession } from "./device-flow";
import { nextPollStep, pollForToken, pollOnce, requestDeviceCode } from "./device-flow";

function fakeResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

function mockFetch(responses: Response[]): ReturnType<typeof vi.fn> {
  const fn = vi.fn();
  for (const response of responses) fn.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

function bodyOf(fetchFn: ReturnType<typeof vi.fn>, call = 0): URLSearchParams {
  const init = fetchFn.mock.calls[call]?.[1] as RequestInit;
  return init.body as URLSearchParams;
}

afterEach(() => {
  vi.unstubAllGlobals();
  authConfigState.configured = true;
});

describe("requestDeviceCode", () => {
  it("returns a typed not-configured error and makes no request when client_id is unset", async () => {
    authConfigState.configured = false;
    const fetchFn = mockFetch([]);
    const result = await requestDeviceCode();
    expect(result).toEqual({ ok: false, error: { kind: "not-configured" } });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("POSTs client_id + scope with no client_secret and parses the session", async () => {
    const fetchFn = mockFetch([
      fakeResponse({
        device_code: "d1",
        user_code: "ABCD-1234",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5,
      }),
    ]);
    const result = await requestDeviceCode();
    expect(result).toEqual({
      ok: true,
      session: {
        deviceCode: "d1",
        userCode: "ABCD-1234",
        verificationUri: "https://github.com/login/device",
        intervalMs: 5000,
      },
    });
    const body = bodyOf(fetchFn);
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("scope")).toBe("repo");
    expect(body.get("client_secret")).toBeNull();
    expect([...body.keys()].sort()).toEqual(["client_id", "scope"]);
  });

  it("returns a typed network error on a non-ok response", async () => {
    mockFetch([fakeResponse({}, false)]);
    const result = await requestDeviceCode();
    expect(result).toEqual({ ok: false, error: { kind: "network" } });
  });

  it("returns a typed network error when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await requestDeviceCode();
    expect(result).toEqual({ ok: false, error: { kind: "network" } });
  });

  it("returns a typed malformed error when required fields are missing", async () => {
    mockFetch([fakeResponse({ device_code: "d1" })]);
    const result = await requestDeviceCode();
    expect(result).toEqual({ ok: false, error: { kind: "malformed" } });
  });
});

describe("pollOnce", () => {
  it("sends device_code + client_id + grant_type with no client_secret", async () => {
    const fetchFn = mockFetch([fakeResponse({ error: "authorization_pending" })]);
    await pollOnce("d1");
    const body = bodyOf(fetchFn);
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("device_code")).toBe("d1");
    expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:device_code");
    expect(body.get("client_secret")).toBeNull();
  });

  it("maps authorization_pending to pending", async () => {
    mockFetch([fakeResponse({ error: "authorization_pending" })]);
    expect(await pollOnce("d1")).toEqual({ kind: "pending" });
  });

  it("maps slow_down to slow_down", async () => {
    mockFetch([fakeResponse({ error: "slow_down" })]);
    expect(await pollOnce("d1")).toEqual({ kind: "slow_down" });
  });

  it("maps expired_token to expired", async () => {
    mockFetch([fakeResponse({ error: "expired_token" })]);
    expect(await pollOnce("d1")).toEqual({ kind: "expired" });
  });

  it("maps access_denied to denied", async () => {
    mockFetch([fakeResponse({ error: "access_denied" })]);
    expect(await pollOnce("d1")).toEqual({ kind: "denied" });
  });

  it("maps a success response to a token with obtainedAt", async () => {
    mockFetch([fakeResponse({ access_token: "tok", token_type: "bearer", scope: "repo" })]);
    const outcome = await pollOnce("d1");
    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.token.access_token).toBe("tok");
      expect(outcome.token.token_type).toBe("bearer");
      expect(outcome.token.scope).toBe("repo");
      expect(typeof outcome.token.obtainedAt).toBe("number");
    }
  });

  it("maps an unrecognized error to a transient error", async () => {
    mockFetch([fakeResponse({ error: "something_else" })]);
    expect(await pollOnce("d1")).toEqual({ kind: "error" });
  });

  it("maps a dropped network call to a transient error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await pollOnce("d1")).toEqual({ kind: "error" });
  });
});

describe("nextPollStep", () => {
  it("keeps waiting at the same interval on pending", () => {
    expect(nextPollStep({ kind: "pending" }, 5000)).toEqual({ action: "wait", intervalMs: 5000 });
  });

  it("keeps waiting at the same interval on a transient error", () => {
    expect(nextPollStep({ kind: "error" }, 5000)).toEqual({ action: "wait", intervalMs: 5000 });
  });

  it("adds 5s on slow_down", () => {
    expect(nextPollStep({ kind: "slow_down" }, 5000)).toEqual({
      action: "wait",
      intervalMs: 10000,
    });
  });

  it("stops with the token on success", () => {
    const token = { access_token: "t", token_type: "bearer", scope: "repo", obtainedAt: 1 };
    expect(nextPollStep({ kind: "success", token }, 5000)).toEqual({
      action: "stop",
      result: { ok: true, token },
    });
  });

  it("stops with an expired error", () => {
    expect(nextPollStep({ kind: "expired" }, 5000)).toEqual({
      action: "stop",
      result: { ok: false, error: "expired" },
    });
  });

  it("stops with a denied error", () => {
    expect(nextPollStep({ kind: "denied" }, 5000)).toEqual({
      action: "stop",
      result: { ok: false, error: "denied" },
    });
  });
});

describe("pollForToken", () => {
  function session(intervalMs = 5000): DeviceCodeSession {
    return { deviceCode: "d1", userCode: "u", verificationUri: "v", intervalMs };
  }

  it("stops immediately when already cancelled, without sleeping or fetching", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchFn = mockFetch([]);
    const result = await pollForToken(session(), { sleep, isCancelled: () => true });
    expect(result).toEqual({ ok: false, error: "cancelled" });
    expect(sleep).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("never polls faster than the interval, backs off on slow_down, and resolves on success", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    mockFetch([
      fakeResponse({ error: "authorization_pending" }),
      fakeResponse({ error: "slow_down" }),
      fakeResponse({ access_token: "tok", token_type: "bearer", scope: "repo" }),
    ]);
    const result = await pollForToken(session(5000), { sleep });
    expect(result).toEqual({ ok: true, token: expect.objectContaining({ access_token: "tok" }) });
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([5000, 5000, 10000]);
  });

  it("stops on expired_token after waiting the full interval", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    mockFetch([fakeResponse({ error: "expired_token" })]);
    const result = await pollForToken(session(7000), { sleep });
    expect(result).toEqual({ ok: false, error: "expired" });
    expect(sleep).toHaveBeenCalledWith(7000);
  });

  it("stops on access_denied", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    mockFetch([fakeResponse({ error: "access_denied" })]);
    const result = await pollForToken(session(), { sleep });
    expect(result).toEqual({ ok: false, error: "denied" });
  });

  it("does not act on further queued responses once cancelled", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchFn = mockFetch([
      fakeResponse({ error: "authorization_pending" }),
      fakeResponse({ access_token: "tok", token_type: "bearer", scope: "repo" }),
    ]);
    let calls = 0;
    const result = await pollForToken(session(), {
      sleep,
      isCancelled: () => {
        calls++;
        return calls > 2;
      },
    });
    expect(result).toEqual({ ok: false, error: "cancelled" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
