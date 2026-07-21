import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCommits } from "./fetch-commits";

interface FakeResponseInit {
  ok?: boolean;
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

function fakeResponse(init: FakeResponseInit): Response {
  const headers = init.headers ?? {};
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => init.body,
  } as unknown as Response;
}

function rawCommit(sha: string, parents: string[]): unknown {
  return {
    sha,
    parents: parents.map((p) => ({ sha: p })),
    commit: {
      message: `${sha} subject\n\nbody line`,
      author: { name: "Ada", date: "2026-01-01T00:00:00Z" },
    },
  };
}

function page(size: number, prefix: string): unknown[] {
  return Array.from({ length: size }, (_, i) => rawCommit(`${prefix}${i}`, []));
}

function mockFetch(responses: Response[]): ReturnType<typeof vi.fn> {
  const fn = vi.fn();
  for (const response of responses) fn.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCommits", () => {
  it("stops after one page when it is not full and sends no sha for a default ref", async () => {
    const fetchFn = mockFetch([fakeResponse({ body: page(42, "c") })]);
    const result = await fetchCommits("owner", "repo", undefined);
    expect(result).toEqual({ ok: true, commits: expect.any(Array) });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const url = fetchFn.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("sha")).toBeNull();
    expect(url.searchParams.get("per_page")).toBe("100");
    if (result.ok && "commits" in result) expect(result.commits).toHaveLength(42);
  });

  it("fetches a second page and caps the result at the requested depth", async () => {
    const fetchFn = mockFetch([
      fakeResponse({ body: page(100, "a") }),
      fakeResponse({ body: page(100, "b") }),
    ]);
    const result = await fetchCommits("owner", "repo", "main", 150);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const url = fetchFn.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("sha")).toBe("main");
    if (result.ok && "commits" in result) expect(result.commits).toHaveLength(150);
  });

  it("parses the subject line, author, date and parents", async () => {
    mockFetch([fakeResponse({ body: [rawCommit("s1", ["p1", "p2"])] })]);
    const result = await fetchCommits("owner", "repo", "main");
    expect(result.ok).toBe(true);
    if (result.ok && "commits" in result) {
      expect(result.commits[0]).toEqual({
        sha: "s1",
        parents: ["p1", "p2"],
        message: "s1 subject",
        authorName: "Ada",
        date: "2026-01-01T00:00:00Z",
      });
    }
  });

  it("skips malformed entries but keeps valid ones", async () => {
    mockFetch([fakeResponse({ body: [rawCommit("ok", []), { nope: true }, 42, null] })]);
    const result = await fetchCommits("owner", "repo", "main");
    if (result.ok && "commits" in result) {
      expect(result.commits).toHaveLength(1);
      expect(result.commits[0]?.sha).toBe("ok");
    }
  });

  it("returns a typed not-found error on 404", async () => {
    mockFetch([fakeResponse({ ok: false, status: 404 })]);
    const result = await fetchCommits("owner", "repo", "main");
    expect(result).toEqual({ ok: false, error: { kind: "not-found" } });
  });

  it("returns a rate-limited error with the reset time on 403", async () => {
    mockFetch([
      fakeResponse({ ok: false, status: 403, headers: { "X-RateLimit-Reset": "1750000000" } }),
    ]);
    const result = await fetchCommits("owner", "repo", "main");
    expect(result).toEqual({ ok: false, error: { kind: "rate-limited", resetAt: 1750000000 } });
  });

  it("treats a 429 as rate-limited and defaults reset to 0 without a header", async () => {
    mockFetch([fakeResponse({ ok: false, status: 429 })]);
    const result = await fetchCommits("owner", "repo", "main");
    expect(result).toEqual({ ok: false, error: { kind: "rate-limited", resetAt: 0 } });
  });

  it("returns an unknown error when the network throws", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fn);
    const result = await fetchCommits("owner", "repo", "main");
    expect(result).toEqual({ ok: false, error: { kind: "unknown" } });
  });

  it("returns an unknown error when the body is not an array", async () => {
    mockFetch([fakeResponse({ body: { message: "Not Found" } })]);
    const result = await fetchCommits("owner", "repo", "main");
    expect(result).toEqual({ ok: false, error: { kind: "unknown" } });
  });

  it("sends an Authorization header when a token is provided", async () => {
    const fetchFn = mockFetch([fakeResponse({ body: page(1, "a") })]);
    await fetchCommits("owner", "repo", "main", undefined, "tok123");
    const init = fetchFn.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok123");
  });

  it("sends no headers at all when no token is provided (unauthenticated path unchanged)", async () => {
    const fetchFn = mockFetch([fakeResponse({ body: page(1, "a") })]);
    await fetchCommits("owner", "repo", "main");
    expect(fetchFn.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("returns a typed unauthorized error on 401", async () => {
    mockFetch([fakeResponse({ ok: false, status: 401 })]);
    const result = await fetchCommits("owner", "repo", "main", undefined, "tok123");
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });

  it("sends If-None-Match only when both a token and an etag are present", async () => {
    const fetchFn = mockFetch([fakeResponse({ body: page(1, "a") })]);
    await fetchCommits("owner", "repo", "main", undefined, "tok123", '"cached-etag"');
    const init = fetchFn.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["If-None-Match"]).toBe('"cached-etag"');
  });

  it("never sends If-None-Match without a token, even if an etag is passed", async () => {
    const fetchFn = mockFetch([fakeResponse({ body: page(1, "a") })]);
    await fetchCommits("owner", "repo", "main", undefined, undefined, '"cached-etag"');
    expect(fetchFn.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("treats a 304 on page one as a not-modified cache hit, without parsing a body", async () => {
    const fetchFn = mockFetch([fakeResponse({ ok: false, status: 304 })]);
    const result = await fetchCommits("owner", "repo", "main", undefined, "tok123", '"stale"');
    expect(result).toEqual({ ok: true, notModified: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("captures the response ETag on a 200 and returns it on the result", async () => {
    mockFetch([fakeResponse({ body: page(1, "a"), headers: { ETag: '"new-etag"' } })]);
    const result = await fetchCommits("owner", "repo", "main", undefined, "tok123");
    if (result.ok && "commits" in result) expect(result.etag).toBe('"new-etag"');
    else throw new Error("expected the commits outcome, not a cache hit");
  });
});
