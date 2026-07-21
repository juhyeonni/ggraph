export interface MergeSource {
  branch: string;
  prNumber: number | null;
}

const PR_MERGE = /^Merge pull request #(\d+) from (.+)$/;
const BRANCH_MERGE = /^Merge branch '([^']+)'/;

// Pure parsing of GitHub's own generated merge-commit message formats — kept
// separate from any tooltip/DOM wiring so it's directly unit-testable, same
// pattern as lib/github/degrade.ts. Hand-written merge messages are expected
// to fall through to null (the badge simply omits the branch/PR line).
export function parseMergeSource(message: string): MergeSource | null {
  const line = message.split("\n")[0] ?? "";

  const prMatch = PR_MERGE.exec(line);
  if (prMatch !== null) {
    const [, prNumber, branch] = prMatch;
    return { branch: branch ?? "", prNumber: Number.parseInt(prNumber ?? "", 10) };
  }

  const branchMatch = BRANCH_MERGE.exec(line);
  if (branchMatch !== null) {
    return { branch: branchMatch[1] ?? "", prNumber: null };
  }

  return null;
}
