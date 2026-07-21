// Public OAuth App client_id (not a secret — the Device Authorization Grant
// needs no client_secret). A real value requires a maintainer to register a
// GitHub OAuth App at https://github.com/settings/developers and replace
// this placeholder before release. Do not put a real client_id here without
// that registration step.
export const CLIENT_ID = "REPLACE_WITH_GITHUB_OAUTH_CLIENT_ID";

export const OAUTH_SCOPE = "repo";

export function isClientIdConfigured(): boolean {
  return CLIENT_ID.length > 0 && !CLIENT_ID.startsWith("REPLACE_WITH_");
}
