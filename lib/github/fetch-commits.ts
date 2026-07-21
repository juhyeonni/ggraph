export interface Commit {
  sha: string;
  parents: string[];
  message: string;
  authorName: string;
  date: string;
}

export const DEFAULT_DEPTH = 200;
const PER_PAGE = 100;
const API_BASE = "https://api.github.com";

export type FetchCommitsError =
  | { kind: "not-found" }
  | { kind: "rate-limited"; resetAt: number }
  | { kind: "unknown" };

export type FetchCommitsResult =
  | { ok: true; commits: Commit[] }
  | { ok: false; error: FetchCommitsError };

function firstLine(text: string): string {
  const newline = text.indexOf("\n");
  return newline === -1 ? text : text.slice(0, newline);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseCommit(raw: unknown): Commit | null {
  const obj = asRecord(raw);
  if (obj === null || typeof obj.sha !== "string") return null;
  const detail = asRecord(obj.commit);
  if (detail === null) return null;
  const author = asRecord(detail.author);
  const parents: string[] = [];
  if (Array.isArray(obj.parents)) {
    for (const parent of obj.parents) {
      const sha = asRecord(parent)?.sha;
      if (typeof sha === "string") parents.push(sha);
    }
  }
  return {
    sha: obj.sha,
    parents,
    message: typeof detail.message === "string" ? firstLine(detail.message) : "",
    authorName: typeof author?.name === "string" ? author.name : "",
    date: typeof author?.date === "string" ? author.date : "",
  };
}

function toFetchError(response: Response): FetchCommitsError {
  if (response.status === 404) return { kind: "not-found" };
  if (response.status === 403 || response.status === 429) {
    const header = response.headers.get("X-RateLimit-Reset");
    const resetAt = header === null ? Number.NaN : Number(header);
    return { kind: "rate-limited", resetAt: Number.isFinite(resetAt) ? resetAt : 0 };
  }
  return { kind: "unknown" };
}

export async function fetchCommits(
  owner: string,
  repo: string,
  ref: string | undefined,
  depth = DEFAULT_DEPTH,
): Promise<FetchCommitsResult> {
  const commits: Commit[] = [];
  const pageCount = Math.ceil(depth / PER_PAGE);
  for (let page = 1; page <= pageCount; page++) {
    const url = new URL(`${API_BASE}/repos/${owner}/${repo}/commits`);
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));
    if (ref !== undefined) url.searchParams.set("sha", ref);

    let body: unknown;
    try {
      const response = await fetch(url);
      if (!response.ok) return { ok: false, error: toFetchError(response) };
      body = await response.json();
    } catch {
      return { ok: false, error: { kind: "unknown" } };
    }
    if (!Array.isArray(body)) return { ok: false, error: { kind: "unknown" } };

    for (const raw of body) {
      const commit = parseCommit(raw);
      if (commit !== null) commits.push(commit);
    }
    if (body.length < PER_PAGE) break;
  }
  return { ok: true, commits: commits.slice(0, depth) };
}
