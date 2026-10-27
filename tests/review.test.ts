import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderReview, typstAvailable } from "../scripts/lib/review";

const ROOT = resolve(import.meta.dir, "..");
const FIXTURE = join(import.meta.dir, "fixtures/review.md");

describe.skipIf(!typstAvailable())("renderReview with typst", () => {
  const dir = join(ROOT, "build/test-review");
  const md = join(dir, "review.md");
  mkdirSync(dir, { recursive: true });
  cpSync(FIXTURE, md);
  const result = renderReview(ROOT, md);

  test("renders the fixture to a PDF next to it", () => {
    expect(result.issues).toEqual([]);
    expect(result.pdf?.endsWith("review.pdf")).toBe(true);
    expect(existsSync(result.pdf!)).toBe(true);
  });

  test.skipIf(Bun.which("pdftotext") === null)("special characters render literally", () => {
    const text = Bun.spawnSync(["pdftotext", result.pdf!, "-"]).stdout.toString().replace(/\s+/g, " ");
    expect(text).toContain("Cut costs by $5k for #team @ 100%");
    expect(text).toContain("snake_case");
    rmSync(dir, { recursive: true, force: true });
  });
});

test("missing file is an error", () => {
  expect(renderReview(ROOT, "nope.md").issues).toEqual([{ level: "error", file: "nope.md", message: "file not found" }]);
});

test("file outside the repo is an error", () => {
  const outside = join(tmpdir(), "review-outside.md");
  writeFileSync(outside, "# x\n");
  const { issues } = renderReview(ROOT, outside);
  expect(issues).toHaveLength(1);
  expect(issues[0]!.message).toContain("inside the repo");
});

test("cli review without a file exits 1 with usage", () => {
  const r = Bun.spawnSync(["bun", "scripts/cli.ts", "review"], { cwd: ROOT });
  expect(r.exitCode).toBe(1);
  expect(r.stderr.toString()).toContain("usage: bun run review <file>");
});
