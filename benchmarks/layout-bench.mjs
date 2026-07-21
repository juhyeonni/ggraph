// Benchmark: git-graph layout (topo sort + lane assignment) in plain JS.
// Synthetic DAG shaped like a real repo history: linear chain + merge commits.

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

// Lane assignment (gitk-style): commits arrive newest-first.
// Active lanes hold the sha each lane is waiting for.
function layout(commits) {
  const lanes = []; // lane index -> expected sha
  const out = new Array(commits.length);
  for (let row = 0; row < commits.length; row++) {
    const c = commits[row];
    let lane = lanes.indexOf(c.sha);
    if (lane === -1) { lane = lanes.indexOf(null); if (lane === -1) lane = lanes.length; }
    // this commit occupies `lane`; first parent continues the lane
    lanes[lane] = c.parents[0] ?? null;
    const edges = [];
    for (let p = 1; p < c.parents.length; p++) {
      let pl = lanes.indexOf(c.parents[p]);
      if (pl === -1) { pl = lanes.indexOf(null); if (pl === -1) pl = lanes.length; lanes[pl] = c.parents[p]; }
      edges.push(pl);
    }
    // free lanes that were waiting for this sha (other branches merged here)
    for (let l = 0; l < lanes.length; l++) if (l !== lane && lanes[l] === c.sha) lanes[l] = null;
    out[row] = { x: lane, y: row, edges };
  }
  return out;
}

function bench(n) {
  const commits = genCommits(n);
  if (global.gc) global.gc();
  const memBefore = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  const result = layout(commits);
  const t1 = performance.now();
  const memAfter = process.memoryUsage().heapUsed;
  return { n, ms: (t1 - t0).toFixed(2), heapMB: ((memAfter - memBefore) / 1048576).toFixed(2), rows: result.length };
}

for (const n of [500, 2000, 10000, 50000]) {
  // warmup + measure
  bench(n);
  console.log(bench(n));
}
