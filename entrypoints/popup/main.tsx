import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { browser } from "wxt/browser";
import { isClientIdConfigured } from "../../lib/github/auth-config";
import type { DeviceCodeResult } from "../../lib/github/device-flow";
import { getDeviceSession } from "../../lib/github/device-session-store";
import { DEFAULT_DEPTH } from "../../lib/github/fetch-commits";
import { computeState, type PanelState } from "../../lib/github/panel-state";
import { getSettings, setCommitDepth } from "../../lib/github/settings-store";
import { clearToken, getToken } from "../../lib/github/token-store";
import type { AuthRequest } from "../background";

async function requestSignIn(): Promise<DeviceCodeResult> {
  const message: AuthRequest = { type: "auth/start" };
  return browser.runtime.sendMessage<AuthRequest, DeviceCodeResult>(message);
}

async function requestCancel(): Promise<void> {
  const message: AuthRequest = { type: "auth/cancel" };
  await browser.runtime.sendMessage<AuthRequest, { ok: boolean }>(message);
}

function AuthSection(props: {
  state: PanelState;
  onSignIn: () => void;
  onCancel: () => void;
  onSignOut: () => void;
}) {
  const { state } = props;
  if (state.kind === "loading") return <p>loading…</p>;
  if (state.kind === "not-configured") return <p>GitHub sign-in isn't configured yet.</p>;
  if (state.kind === "signed-out") {
    return (
      <button type="button" onClick={props.onSignIn}>
        Sign in with GitHub
      </button>
    );
  }
  if (state.kind === "starting") return <p>Starting sign-in…</p>;
  if (state.kind === "device") {
    return (
      <div>
        <p>
          Enter code <strong>{state.userCode}</strong> at{" "}
          <a href={state.verificationUri} target="_blank" rel="noreferrer">
            {state.verificationUri}
          </a>
        </p>
        <button type="button" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div>
        <p>Couldn't start sign-in. Try again.</p>
        <button type="button" onClick={props.onSignIn}>
          Sign in with GitHub
        </button>
      </div>
    );
  }
  return (
    <div>
      <p>Signed in</p>
      <button type="button" onClick={props.onSignOut}>
        Sign out
      </button>
    </div>
  );
}

function App() {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [depthInput, setDepthInput] = useState(String(DEFAULT_DEPTH));

  const refresh = async (): Promise<void> => {
    const [token, deviceSession, settings] = await Promise.all([
      getToken(),
      getDeviceSession(),
      getSettings(),
    ]);
    setState(computeState(token, deviceSession));
    setDepthInput(String(settings.commitDepth));
  };

  useEffect(() => {
    void refresh();
    const onChanged = (_changes: unknown, areaName: string): void => {
      if (areaName === "local") void refresh();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  const onSignIn = async (): Promise<void> => {
    setState({ kind: "starting" });
    const result = await requestSignIn();
    if (!result.ok) {
      setState(
        result.error.kind === "not-configured" ? { kind: "not-configured" } : { kind: "error" },
      );
      return;
    }
    setState({
      kind: "device",
      userCode: result.session.userCode,
      verificationUri: result.session.verificationUri,
    });
  };

  const onCancel = async (): Promise<void> => {
    await requestCancel();
    setState(isClientIdConfigured() ? { kind: "signed-out" } : { kind: "not-configured" });
  };

  const onSignOut = async (): Promise<void> => {
    await Promise.all([clearToken(), requestCancel()]);
    setState(isClientIdConfigured() ? { kind: "signed-out" } : { kind: "not-configured" });
  };

  const onDepthBlur = async (): Promise<void> => {
    await setCommitDepth(Number(depthInput));
    const settings = await getSettings();
    setDepthInput(String(settings.commitDepth));
  };

  return (
    <div style={{ width: 260, padding: 12, fontFamily: "sans-serif", fontSize: 13 }}>
      <h1 style={{ fontSize: 14, margin: "0 0 8px" }}>ggraph</h1>
      <AuthSection state={state} onSignIn={onSignIn} onCancel={onCancel} onSignOut={onSignOut} />
      <label style={{ display: "block", marginTop: 12 }}>
        Commit depth
        <input
          type="number"
          min={1}
          max={2000}
          value={depthInput}
          onInput={(event) => setDepthInput((event.target as HTMLInputElement).value)}
          onBlur={onDepthBlur}
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </label>
    </div>
  );
}

render(<App />, document.body);
