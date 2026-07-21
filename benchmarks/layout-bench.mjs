// Benchmark: git-graph layout (topo sort + lane assignment) and combined
// layout+draw timing. Synthetic DAG shaped like a real repo history: linear
// chain + merge commits. Runs the real layout/draw code (Node >= 23.6 strips
// types natively).

import { computeLayout } from "../lib/layout/compute-layout.ts";
import { drawGraph } from "../lib/draw/draw.ts";

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

// --- Combined layout+draw timing (roadmap budget: <100ms for >=500 commits) ---
//
// drawGraph() expects an HTMLCanvasElement-shaped object and reads
// `window.devicePixelRatio`. Neither exists in headless Node, so both are
// stubbed minimally: a no-op 2D context (every drawing call is a no-op) and
// a bare `window` global. This times drawGraph's real control flow (edge/row
// iteration, path-building calls, color lookups) but NOT actual canvas
// rasterization/GPU work, since there is no real canvas in headless Node.
const ROW_HEIGHT = 20;
const DRAW_BUDGET_MS = 100;

globalThis.window = { devicePixelRatio: 1 };

function makeCanvasStub(height) {
  const ctx = {
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    clearRect() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    stroke() {},
    fill() {},
    arc() {},
    setTransform() {},
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
  };
  return {
    width: 0,
    height: 0,
    clientWidth: 800,
    clientHeight: height,
    getContext: () => ctx,
  };
}

function benchLayoutDraw(n) {
  const commits = genCommits(n);
  const canvas = makeCanvasStub(n * ROW_HEIGHT);
  if (global.gc) global.gc();
  const t0 = performance.now();
  const layout = computeLayout(commits);
  const rowCenters = layout.rows.map((_, i) => i * ROW_HEIGHT + ROW_HEIGHT / 2);
  drawGraph(canvas, layout, rowCenters, {
    theme: "light",
    visibleTop: 0,
    visibleBottom: n * ROW_HEIGHT,
  });
  const t1 = performance.now();
  return { n, ms: t1 - t0 };
}

console.log("\nlayout+draw combined (headless canvas stub, JS work only):");
for (const n of [500, 2000]) {
  benchLayoutDraw(n); // warmup
  const { ms } = benchLayoutDraw(n);
  const pass = ms < DRAW_BUDGET_MS;
  console.log({ n, ms: ms.toFixed(2), budgetMs: DRAW_BUDGET_MS, status: pass ? "PASS" : "FAIL" });
  if (!pass) process.exitCode = 1;
}
