import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check } from "../scripts/lib/pipeline";
import { makeTree } from "./helpers";

const REPO = join(import.meta.dir, "..");
const GUILD = "roles/acme/achievements/2024-05-started-guild.md";

const tree = (overrides: Record<string, string | null> = {}) =>
  makeTree({ ".gitignore": "private/\nbuild/\n", ...overrides }, { git: true });

describe("check", () => {
  test("clean tree without a denylist gives only a warning", () => {
    const { issues } = check(tree());
    expect(issues).toEqual([
      { level: "warning", file: "private/denylist.txt", message: "not found, so the leak check was skipped" },
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

  test("exits 1 on errors", () => {
    const root = tree({ [GUILD]: "---\ndate: 2024-05\nheadline: G\ntags: [vibes]\n---\n" });
    const res = Bun.spawnSync(["bun", join(REPO, "scripts/cli.ts"), "check"], {
      env: { ...process.env, CAREER_ROOT: root },
    });
    expect(res.exitCode).toBe(1);
    expect(res.stdout.toString() + res.stderr.toString()).toContain('unknown tag "vibes"');
  });
});
