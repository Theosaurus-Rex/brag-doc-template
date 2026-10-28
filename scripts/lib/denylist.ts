import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Issue } from "./types";

export const DENYLIST_FILE = "private/denylist.txt";
export const CLIENTS_FILE = "private/clients.yaml";
const SCISSORS = "# ------------------------ >8 ------------------------";

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

export function loadTerms(root: string): { terms: string[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const terms = [...(loadDenylist(root) ?? [])];
  const path = join(root, CLIENTS_FILE);
  if (existsSync(path)) {
    let data: unknown;
    try {
      data = parse(readFileSync(path, "utf8"));
    } catch (e) {
      issues.push({ level: "error", file: CLIENTS_FILE, message: `invalid YAML: ${(e as Error).message.split("\n")[0]}` });
    }
    if (data !== null && data !== undefined) {
      if (typeof data !== "object" || Array.isArray(data)) {
        issues.push({ level: "error", file: CLIENTS_FILE, message: "must be a map of project slug to client name" });
      } else {
        for (const v of Object.values(data)) if (typeof v === "string" && v.trim()) terms.push(v.trim());
      }
    }
  }
  const seen = new Set<string>();
  const unique = terms.filter((t) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { terms: unique, issues };
}

export function hasRealContent(root: string): boolean {
  const dir = join(root, "roles");
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory() && e.name !== "example-co");
}

export function noTermsIssue(root: string): Issue {
  if (hasRealContent(root)) {
    return {
      level: "error",
      file: DENYLIST_FILE,
      message: `no terms in ${DENYLIST_FILE} or ${CLIENTS_FILE}, so nothing is protected`,
    };
  }
  return {
    level: "warning",
    file: DENYLIST_FILE,
    message: existsSync(join(root, DENYLIST_FILE))
      ? "has no terms, so the leak check was skipped"
      : "not found, so the leak check was skipped",
  };
}

export function checkMessage(text: string, terms: string[]): Issue[] {
  let scissored = false;
  const kept = text.split("\n").map((line) => {
    if (line.startsWith(SCISSORS)) scissored = true;
    return scissored || line.startsWith("#") ? "" : line;
  });
  return findDenylistHits(terms, [{ path: "commit message", text: kept.join("\n") }]);
}

const git = (root: string, args: string[], input?: Buffer) => {
  const res = Bun.spawnSync(["git", "-c", "core.quotepath=off", ...args], { cwd: root, stdin: input });
  if (res.exitCode !== 0) throw new Error(`git ${args[0]} failed in ${root}: ${res.stderr.toString()}`);
  return res.stdout;
};

export function scanHistory(root: string, terms: string[]): Issue[] {
  if (terms.length === 0) return [];
  if (!git(root, ["rev-list", "--all"]).toString().trim()) return [];
  const issues: Issue[] = [];

  const messages = git(root, ["log", "--all", "--format=%H%x1f%B%x1e"]).toString().split("\x1e");
  for (const rec of messages) {
    const [sha, body] = rec.replace(/^\n/, "").split("\x1f");
    if (!sha || body === undefined) continue;
    issues.push(...findDenylistHits(terms, [{ path: `commit ${sha.slice(0, 7)}`, text: body }]));
  }

  const tokens = git(root, ["log", "--all", "-m", "--no-renames", "--raw", "-z", "--no-abbrev", "--format=%x01%H"])
    .toString()
    .split("\0");
  const blobs = new Map<string, { short: string; path: string }>();
  const paths = new Set<string>();
  let short = "";
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].replace(/^\n/, "");
    if (tok.startsWith("\x01")) {
      short = tok.slice(1, 8);
    } else if (tok.startsWith(":")) {
      const [, , , newSha, status] = tok.slice(1).split(" ");
      const path = tokens[++i];
      if (status === "D") continue;
      paths.add(`${short}:${path}`);
      if (!blobs.has(newSha)) blobs.set(newSha, { short, path });
    }
  }

  const seenPaths = new Set<string>();
  for (const key of paths) {
    const path = key.slice(8);
    if (seenPaths.has(path)) continue;
    seenPaths.add(path);
    for (const term of terms) {
      if (patternFor(term).test(path)) {
        issues.push({ level: "error", file: key, message: `path contains denylisted term "${term}"` });
      }
    }
  }

  const shas = [...blobs.keys()];
  const out = git(root, ["cat-file", "--batch"], Buffer.from(shas.join("\n") + "\n"));
  let pos = 0;
  for (const sha of shas) {
    const nl = out.indexOf(10, pos);
    const [, type, size] = out.subarray(pos, nl).toString().split(" ");
    const len = Number(size);
    const start = nl + 1;
    pos = start + len + 1;
    if (type !== "blob") continue;
    const buf = out.subarray(start, start + len);
    if (buf.includes(0)) continue;
    const { short: s, path } = blobs.get(sha)!;
    issues.push(...findDenylistHits(terms, [{ path: `${s}:${path}`, text: buf.toString("utf8") }]));
  }
  return issues;
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
