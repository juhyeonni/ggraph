// Bundle-size budget check: gzips every shipped JS file from the production
// build (roadmap budget: shipped JS gzip <= 100KB). Node built-ins only
// (fs, path, zlib) -- no new dependency.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUILD_DIR = "./.output/chrome-mv3";
const BUDGET_KB = 100;

function findJsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...findJsFiles(full));
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

if (!existsSync(BUILD_DIR)) {
  throw new Error(`${BUILD_DIR} not found -- run \`pnpm build\` first.`);
}

const files = findJsFiles(BUILD_DIR);
let totalBytes = 0;
for (const file of files) {
  const gzipBytes = gzipSync(readFileSync(file)).length;
  totalBytes += gzipBytes;
  console.log({ file, gzipKB: (gzipBytes / 1024).toFixed(2) });
}

const totalKB = totalBytes / 1024;
const pass = totalKB <= BUDGET_KB;
console.log({ totalGzipKB: totalKB.toFixed(2), budgetKB: BUDGET_KB, status: pass ? "PASS" : "FAIL" });
if (!pass) process.exitCode = 1;
