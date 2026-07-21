import { type FixtureCommit, toRowHtml } from "./gen-commits";

// Reproduces just enough of github.com/{owner}/{repo}/commits's DOM shape for
// lib/github/selectors.ts to find its injection point: rows matching
// `[data-testid="commit-row-item"]`, each containing an `a[href*="/commit/"]`.
export function commitsPageHtml(commits: FixtureCommit[]): string {
  const rows = commits.map(toRowHtml).join("\n");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>ggraph e2e fixture: commits</title></head>
<body>
<ul>
${rows}
</ul>
</body>
</html>`;
}
