// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { findCommitRowEls, getRowSha, isCommitsPage, parseCommitsPath } from "./selectors";

describe("parseCommitsPath", () => {
  it("parses a plain commits URL", () => {
    expect(parseCommitsPath("/facebook/react/commits")).toEqual({
      owner: "facebook",
      repo: "react",
      ref: undefined,
      filePath: undefined,
    });
  });

  it("accepts a trailing slash", () => {
    expect(parseCommitsPath("/facebook/react/commits/")?.repo).toBe("react");
  });

  it("parses a ref", () => {
    expect(parseCommitsPath("/facebook/react/commits/main")).toEqual({
      owner: "facebook",
      repo: "react",
      ref: "main",
      filePath: undefined,
    });
  });

  it("parses file-history URLs into ref plus filePath", () => {
    expect(parseCommitsPath("/facebook/react/commits/main/src/index.js")).toEqual({
      owner: "facebook",
      repo: "react",
      ref: "main",
      filePath: "src/index.js",
    });
  });

  it("treats slashy refs as ref plus filePath (known limitation)", () => {
    expect(parseCommitsPath("/o/r/commits/feature/x")).toEqual({
      owner: "o",
      repo: "r",
      ref: "feature",
      filePath: "x",
    });
  });

  it("returns null for non-commits URLs", () => {
    expect(parseCommitsPath("/facebook/react")).toBeNull();
    expect(parseCommitsPath("/facebook/react/pulls")).toBeNull();
    expect(parseCommitsPath("/facebook/react/commitsfoo")).toBeNull();
    expect(parseCommitsPath("/")).toBeNull();
    expect(parseCommitsPath("")).toBeNull();
  });
});

describe("isCommitsPage", () => {
  it("is true for /commits and /commits/{ref}", () => {
    expect(isCommitsPage("/o/r/commits")).toBe(true);
    expect(isCommitsPage("/o/r/commits/main")).toBe(true);
  });

  it("is false for file-history and non-commits URLs", () => {
    expect(isCommitsPage("/o/r/commits/main/src/app.ts")).toBe(false);
    expect(isCommitsPage("/o/r/pulls")).toBe(false);
    expect(isCommitsPage("/o/r")).toBe(false);
  });
});

describe("findCommitRowEls", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("finds rows across date groups in document order", () => {
    document.body.innerHTML = `
      <section data-testid="commit-group">
        <h3>Jul 20, 2026</h3>
        <div data-testid="commit-row-item">a</div>
        <div data-testid="commit-row-item">b</div>
      </section>
      <section data-testid="commit-group">
        <h3>Jul 19, 2026</h3>
        <div data-testid="commit-row-item">c</div>
      </section>
    `;
    const rows = findCommitRowEls();
    expect(rows.map((row) => row.textContent)).toEqual(["a", "b", "c"]);
  });

  it("falls back to legacy commit-list markup", () => {
    document.body.innerHTML = `
      <ul>
        <li class="js-commits-list-item">a</li>
        <li class="js-commits-list-item">b</li>
      </ul>
    `;
    expect(findCommitRowEls()).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", () => {
    document.body.innerHTML = "<main><p>not a commits page</p></main>";
    expect(findCommitRowEls()).toEqual([]);
  });

  it("never throws, even when the DOM query itself throws", () => {
    const evil = {
      querySelectorAll: () => {
        throw new Error("boom");
      },
    } as unknown as ParentNode;
    expect(findCommitRowEls(evil)).toEqual([]);
  });
});

describe("getRowSha", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function row(html: string): HTMLElement {
    const el = document.createElement("div");
    el.innerHTML = html;
    return el;
  }

  it("extracts the sha from a commit link", () => {
    const el = row('<a href="/facebook/react/commit/abc1234def5678">msg</a>');
    expect(getRowSha(el)).toBe("abc1234def5678");
  });

  it("ignores non-commit links and finds the commit one", () => {
    const el = row(
      '<a href="/facebook/react/tree/main">tree</a>' +
        '<a href="/facebook/react/commit/deadbeef0">sha</a>',
    );
    expect(getRowSha(el)).toBe("deadbeef0");
  });

  it("returns null when no commit link is present", () => {
    expect(getRowSha(row('<a href="/facebook/react/tree/main">tree</a>'))).toBeNull();
    expect(getRowSha(row("<span>no links</span>"))).toBeNull();
  });

  it("never throws when the query itself throws", () => {
    const evil = {
      querySelectorAll: () => {
        throw new Error("boom");
      },
    } as unknown as ParentNode;
    expect(getRowSha(evil)).toBeNull();
  });
});
