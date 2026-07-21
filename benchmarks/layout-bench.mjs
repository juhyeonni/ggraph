// Benchmark: git-graph layout (topo sort + lane assignment).
// Synthetic DAG shaped like a real repo history: linear chain + merge commits.
// Runs the real layout core (Node >= 23.6 strips types natively).

import { computeLayout } from "../lib/layout/compute-layout.ts";

function genCommits(n, mergeRatio = 0.3) {
  const commits = [];
  for (let i = 0; i < n; i++) {
    const sha = i.toString(16).padStart(40, "0");
    const parents = [];
    if (i + 1 < n) parents.push((i + 1).toString(16).padStart(40, "0"));
    // ~30% merge commits with a second parent further back
    if (i + 2 < n && Math.random() < mergeRatio) {
      const back = i + 2 + Math.floor(Math.random() * Math.min(50, n - i - 2));
      if (back < n) parents.push(back.toString(16).padStart(40, "0"));
    }
    commits.push({ sha, parents });
  }
  return commits; // newest-first, like the GitHub API
}

function bench(n) {
  const commits = genCommits(n);
  if (global.gc) global.gc();
  const memBefore = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  const result = computeLayout(commits);
  const t1 = performance.now();
  const memAfter = process.memoryUsage().heapUsed;
  return { n, ms: (t1 - t0).toFixed(2), heapMB: ((memAfter - memBefore) / 1048576).toFixed(2), rows: result.rows.length };
}

for (const n of [500, 2000, 10000, 50000]) {
  // warmup + measure
  bench(n);
  console.log(bench(n));
}
