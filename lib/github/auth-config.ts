// Public OAuth App client_id (not a secret — the Device Authorization Grant
// needs no client_secret). Registered at https://github.com/settings/developers
// with Device Flow enabled.
export const CLIENT_ID = "Ov23li6hmEk6I0SCjOix";

export const OAUTH_SCOPE = "repo";

export function isClientIdConfigured(): boolean {
  return CLIENT_ID.length > 0 && !CLIENT_ID.startsWith("REPLACE_WITH_");
}
