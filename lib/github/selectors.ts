export interface CommitsPath {
  owner: string;
  repo: string;
  ref?: string;
  filePath?: string;
}

const COMMITS_PATH_RE = /^\/([^/]+)\/([^/]+)\/commits(?:\/([^/]+)(?:\/(.+))?)?\/?$/;

export function parseCommitsPath(pathname: string): CommitsPath | null {
  const match = COMMITS_PATH_RE.exec(pathname);
  if (!match) return null;
  const [, owner, repo, ref, filePath] = match;
  if (!owner || !repo) return null;
  return { owner, repo, ref, filePath };
}

// ponytail: refs containing "/" parse as ref+filePath and are skipped like file-history
// pages; distinguishing them needs the repo's ref list (available once bolt 002 fetches data).
export function isCommitsPage(pathname: string): boolean {
  const parsed = parseCommitsPath(pathname);
  return parsed !== null && parsed.filePath === undefined;
}

export function getPageTheme(): "light" | "dark" {
  try {
    const mode = document.documentElement.getAttribute("data-color-mode");
    if (mode === "dark") return "dark";
    if (mode === "light") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

const COMMIT_ROW_SELECTORS = ['[data-testid="commit-row-item"]', "li.js-commits-list-item"];

export function findCommitRowEls(root: ParentNode = document): HTMLElement[] {
  try {
    for (const selector of COMMIT_ROW_SELECTORS) {
      const els = root.querySelectorAll<HTMLElement>(selector);
      if (els.length > 0) return [...els];
    }
  } catch {
    // selector mismatch is a silent no-op by contract
  }
  return [];
}

const COMMIT_HREF_RE = /\/commit\/([0-9a-f]{7,40})/;

export function getRowSha(row: ParentNode): string | null {
  try {
    for (const anchor of row.querySelectorAll<HTMLAnchorElement>('a[href*="/commit/"]')) {
      const match = COMMIT_HREF_RE.exec(anchor.getAttribute("href") ?? "");
      if (match?.[1] !== undefined) return match[1];
    }
  } catch {
    // defensive: DOM/selector mismatch is a silent no-op by contract
  }
  return null;
}
