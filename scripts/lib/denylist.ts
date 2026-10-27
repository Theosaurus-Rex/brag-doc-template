import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Issue } from "./types";

export const DENYLIST_FILE = "private/denylist.txt";

export function parseDenylist(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export function loadDenylist(root: string): string[] | null {
  const path = join(root, DENYLIST_FILE);
  return existsSync(path) ? parseDenylist(readFileSync(path, "utf8")) : null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPattern = (t: string, flags: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escape(t).replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}])`, flags);

const patternFor = (t: string) => buildPattern(t, "iu");

export function findDenylistHits(terms: string[], files: { path: string; text: string }[]): Issue[] {
  const issues: Issue[] = [];
  for (const { path, text } of files) {
    for (const term of terms) {
      const lines = new Set<number>();
      for (const m of text.matchAll(buildPattern(term, "giu"))) {
        lines.add(text.slice(0, m.index).split("\n").length);
      }
      for (const line of lines) {
        issues.push({ level: "error", file: path, message: `line ${line} contains denylisted term "${term}"` });
      }
    }
  }
  return issues;
}

export function listScannableFiles(root: string): string[] {
  const res = Bun.spawnSync(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root });
  if (res.exitCode !== 0) throw new Error(`git ls-files failed in ${root}: ${res.stderr.toString()}`);
  return res.stdout.toString().split("\0").filter(Boolean);
}

export function scanRepo(root: string, terms: string[]): Issue[] {
  if (terms.length === 0) return [];
  const files: { path: string; text: string }[] = [];
  const issues: Issue[] = [];
  for (const path of listScannableFiles(root)) {
    for (const term of terms) {
      if (patternFor(term).test(path)) {
        issues.push({ level: "error", file: path, message: `path contains denylisted term "${term}"` });
      }
    }
    const abs = join(root, path);
    if (!existsSync(abs)) continue;
    const buf = readFileSync(abs);
    if (buf.includes(0)) continue;
    files.push({ path, text: buf.toString("utf8") });
  }
  return [...issues, ...findDenylistHits(terms, files)];
}
