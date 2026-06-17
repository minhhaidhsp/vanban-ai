import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";

const SIZE_MAP: Record<string, string> = {
  "text-xs": "text-sm",
  "text-sm": "text-base",
};

// Lines matching these are skipped entirely
const SKIP_PATTERNS: RegExp[] = [
  /font-mono/,            // monospace / code textarea
  /rounded-full.*py-0/,   // pill badge with tight vertical padding
  /py-0.*rounded-full/,   // same, reversed order
  /<t[dh][\s\/>]/,       // table cell elements
  /<table[\s\/>]/,       // table element
];

const TARGET_DIRS = [
  "frontend/app/dashboard",
  "frontend/components/dashboard",
  "frontend/components/editor",
];

function walkFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) {
        result.push(...walkFiles(full));
      } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
        result.push(full);
      }
    } catch {}
  }
  return result;
}

// Single-pass replacement to avoid double-bumping (text-xs→text-sm→text-base)
const PATTERN = /\b(text-xs|text-sm)\b/g;
function bumpLine(line: string): string {
  return line.replace(PATTERN, (match) => SIZE_MAP[match] ?? match);
}

let totalFiles = 0;
let totalLines = 0;
const changedFiles: string[] = [];

for (const targetDir of TARGET_DIRS) {
  const files = walkFiles(targetDir);
  for (const file of files) {
    const original = readFileSync(file, "utf-8");
    const lines = original.split("\n");
    let changed = false;

    const newLines = lines.map((line) => {
      if (SKIP_PATTERNS.some((p) => p.test(line))) return line;
      const bumped = bumpLine(line);
      if (bumped !== line) {
        changed = true;
        totalLines++;
      }
      return bumped;
    });

    if (changed) {
      writeFileSync(file, newLines.join("\n"), "utf-8");
      totalFiles++;
      changedFiles.push(file);
    }
  }
}

console.log("Changed files:");
changedFiles.forEach((f) => console.log(" -", f));
console.log(`\nTotal: ${totalFiles} files, ~${totalLines} lines changed`);
