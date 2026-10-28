import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderReview, typstAvailable } from "../scripts/lib/review";

const ROOT = resolve(import.meta.dir, "..");
const FIXTURE = join(import.meta.dir, "fixtures/review.yaml");
const fixtureText = () => readFileSync(FIXTURE, "utf8");

function inBuild(name: string, content: string) {
  const dir = join(ROOT, "build/test-review-cases");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, name);
  writeFileSync(file, content);
  return file;
}

describe.skipIf(!typstAvailable())("renderReview with typst", () => {
  const dir = join(ROOT, "build/test-review");
  const yaml = join(dir, "review.yaml");
  mkdirSync(dir, { recursive: true });
  cpSync(FIXTURE, yaml);
  const result = renderReview(ROOT, yaml);

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

  test("an unknown level is an error and nothing is compiled", () => {
    const file = inBuild(
      "bad-level.yaml",
      fixtureText().replace('level: "L4 stretch"', 'level: "L5"'),
    );
    const { issues, pdf } = renderReview(ROOT, file);
    expect(pdf).toBeUndefined();
    expect(issues).toEqual([
      { level: "error", file, field: "themes.1.examples.0.shows.0.level", message: '"L5" is not in levels' },
    ]);
    expect(existsSync(file.replace(".yaml", ".pdf"))).toBe(false);
  });

  test("a schema error carries its field", () => {
    const file = inBuild("no-period.yaml", fixtureText().replace(/^period:.*\n/m, ""));
    const { issues, pdf } = renderReview(ROOT, file);
    expect(pdf).toBeUndefined();
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "error", field: "period" });
  });

  test("invalid YAML syntax is one error", () => {
    const file = inBuild("broken.yaml", "name: [unclosed\nrole: x: y\n");
    const { issues } = renderReview(ROOT, file);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.level).toBe("error");
    rmSync(join(ROOT, "build/test-review-cases"), { recursive: true, force: true });
  });
});

test("a non-YAML extension is an error", () => {
  const file = inBuild("review.md", "# x\n");
  const { issues } = renderReview(ROOT, file);
  expect(issues).toHaveLength(1);
  expect(issues[0]!.message).toBe("review file must be YAML (.yaml)");
});

test("missing file is an error", () => {
  expect(renderReview(ROOT, "nope.yaml").issues).toEqual([{ level: "error", file: "nope.yaml", message: "file not found" }]);
});

test("file outside the repo is an error", () => {
  const outside = join(tmpdir(), "review-outside.yaml");
  writeFileSync(outside, "name: x\n");
  const { issues } = renderReview(ROOT, outside);
  expect(issues).toHaveLength(1);
  expect(issues[0]!.message).toContain("inside the repo");
});

test("cli review without a file exits 1 with usage", () => {
  const r = Bun.spawnSync(["bun", "scripts/cli.ts", "review"], { cwd: ROOT });
  expect(r.exitCode).toBe(1);
  expect(r.stderr.toString()).toContain("usage: bun run review <file>");
});
