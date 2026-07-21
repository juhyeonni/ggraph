// Synthetic commit DAG for the E2E fixtures — an independent copy of the
// generator pattern in benchmarks/layout-bench.mjs (that file belongs to a
// sibling bolt), producing both the GitHub REST API JSON shape
// (lib/github/fetch-commits.ts's parseCommit) and the matching commits-page
// row HTML (lib/github/selectors.ts's row/sha detection).

export interface FixtureCommit {
  sha: string;
  parents: string[];
  message: string;
  authorName: string;
  date: string;
}

const BASE_DATE_MS = Date.parse("2026-01-01T00:00:00Z");

function shaFor(index: number): string {
  return index.toString(16).padStart(40, "0");
}

// Deterministic (no randomness) so heap-budget samples are reproducible:
// a linear chain with a merge commit (second parent further back) every 7th
// commit, mirroring a real repo's mostly-linear-with-occasional-merges shape.
export function genFixtureCommits(count: number): FixtureCommit[] {
  const commits: FixtureCommit[] = [];
  for (let i = 0; i < count; i++) {
    const parents: string[] = [];
    if (i + 1 < count) parents.push(shaFor(i + 1));
    if (i % 7 === 0 && i + 10 < count) parents.push(shaFor(i + 10));
    commits.push({
      sha: shaFor(i),
      parents,
      message: `Fixture commit ${i}`,
      authorName: "Fixture Author",
      date: new Date(BASE_DATE_MS - i * 60_000).toISOString(),
    });
  }
  return commits;
}

export function toApiCommit(commit: FixtureCommit): unknown {
  return {
    sha: commit.sha,
    parents: commit.parents.map((sha) => ({ sha })),
    commit: {
      message: commit.message,
      author: { name: commit.authorName, date: commit.date },
    },
  };
}

export function toRowHtml(commit: FixtureCommit): string {
  return `<li data-testid="commit-row-item"><a href="/commit/${commit.sha}">${commit.message}</a></li>`;
}
