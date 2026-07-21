import { afterEach, describe, expect, it, vi } from "vitest";

const authConfigState = vi.hoisted(() => ({ configured: true }));

vi.mock("./auth-config", () => ({
  isClientIdConfigured: () => authConfigState.configured,
}));

import type { DeviceSession } from "./device-session-store";
import { computeState } from "./panel-state";
import type { AuthToken } from "./token-store";

function token(): AuthToken {
  return { access_token: "tok", token_type: "bearer", scope: "repo", obtainedAt: 1 };
}

function session(): DeviceSession {
  return { userCode: "ABCD-1234", verificationUri: "https://github.com/login/device" };
}

afterEach(() => {
  authConfigState.configured = true;
});

describe("computeState", () => {
  it("is signed-in when a token is present, regardless of a stale device session", () => {
    expect(computeState(token(), session())).toEqual({ kind: "signed-in" });
  });

  it("is device (with the session's code) when no token but a device session exists", () => {
    expect(computeState(null, session())).toEqual({
      kind: "device",
      userCode: "ABCD-1234",
      verificationUri: "https://github.com/login/device",
    });
  });

  it("is signed-out when there is no token or session and client_id is configured", () => {
    expect(computeState(null, null)).toEqual({ kind: "signed-out" });
  });

  it("is not-configured when there is no token or session and client_id is unset", () => {
    authConfigState.configured = false;
    expect(computeState(null, null)).toEqual({ kind: "not-configured" });
  });
});
