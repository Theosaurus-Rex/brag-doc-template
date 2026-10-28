import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check } from "../scripts/lib/pipeline";
import { makeTree } from "./helpers";

const REPO = join(import.meta.dir, "..");
const GUILD = "roles/acme/achievements/2024-05-started-guild.md";

const tree = (overrides: Record<string, string | null> = {}) =>
  makeTree({ ".gitignore": "private/\nbuild/\n", ...overrides }, { git: true });

describe("check", () => {
  test("clean tree with real content and no terms is an error", () => {
    const { issues } = check(tree());
    expect(issues).toEqual([
      {
        level: "error",
        file: "private/denylist.txt",
        message: "no terms in private/denylist.txt or private/clients.yaml, so nothing is protected",
      },
    ]);
  });

  test("denylisted term in content is an error", () => {
    const root = tree({
      "private/denylist.txt": "Globex\n",
      [GUILD]: "---\ndate: 2024-05\nheadline: Started a guild at Globex\ntags: [leadership]\n---\n",
    });
    expect(check(root).issues).toEqual([
      { level: "error", file: GUILD, message: 'line 3 contains denylisted term "Globex"' },
    ]);
  });
});

describe("check terms", () => {
  const warn = (message: string) => ({ level: "warning" as const, file: "private/denylist.txt", message });

  test("clients.yaml value is caught in a tracked file with no denylist", () => {
    const root = tree({
      "private/clients.yaml": "portal: Globex\n",
      [GUILD]: "---\ndate: 2024-05\nheadline: Started a guild at Globex\ntags: [leadership]\n---\n",
    });
    expect(check(root).issues).toEqual([
      { level: "error", file: GUILD, message: 'line 3 contains denylisted term "Globex"' },
    ]);
  });

  test("malformed clients.yaml is an error", () => {
    const { issues } = check(tree({ "private/clients.yaml": "a: [unclosed\n", "private/denylist.txt": "Globex\n" }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "error", file: "private/clients.yaml" });
  });

  test("only example-co with no terms is a warning", () => {
    const only = { "roles/acme": null, "roles/oldco": null, "roles/example-co/role.md": null };
    const root = makeTree({ ".gitignore": "private/\n", ...only }, { git: true });
    expect(check(root).issues.filter((i) => i.file === "private/denylist.txt")).toEqual([
      warn("not found, so the leak check was skipped"),
    ]);
  });

  test("empty denylist with no real content warns that it has no terms", () => {
    const root = makeTree({ "roles/acme": null, "roles/oldco": null, "private/denylist.txt": "# none\n" }, { git: true });
    expect(check(root).issues.filter((i) => i.file === "private/denylist.txt")).toEqual([
      warn("has no terms, so the leak check was skipped"),
    ]);
  });
});

describe("cli", () => {
  test("works from another working directory via CAREER_ROOT", () => {
    const root = tree({ "private/denylist.txt": "Globex\n" });
    const res = Bun.spawnSync(["bun", join(REPO, "scripts/cli.ts"), "check"], {
      cwd: mkdtempSync(join(tmpdir(), "elsewhere-")),
      env: { ...process.env, CAREER_ROOT: root },
    });
    expect(res.exitCode).toBe(0);
    expect(res.stdout.toString()).toContain("check passed");
  });

  test("check-message exits 1 on a hit and 0 when clean", () => {
    const root = tree({ "private/denylist.txt": "Globex\n" });
    const msg = (text: string) => {
      const file = join(root, "MSG");
      writeFileSync(file, text);
      return Bun.spawnSync(["bun", join(REPO, "scripts/cli.ts"), "check-message", file], {
        env: { ...process.env, CAREER_ROOT: root },
      });
    };
    const bad = msg("feat: for Globex\n");
    expect(bad.exitCode).toBe(1);
    expect(bad.stdout.toString()).toContain("commit message");
    expect(msg("feat: for a retailer\n").exitCode).toBe(0);
  });

  test("exits 1 on errors", () => {
    const root = tree({ [GUILD]: "---\ndate: 2024-05\nheadline: G\ntags: [vibes]\n---\n" });
    const res = Bun.spawnSync(["bun", join(REPO, "scripts/cli.ts"), "check"], {
      env: { ...process.env, CAREER_ROOT: root },
    });
    expect(res.exitCode).toBe(1);
    expect(res.stdout.toString() + res.stderr.toString()).toContain('unknown tag "vibes"');
  });
});
