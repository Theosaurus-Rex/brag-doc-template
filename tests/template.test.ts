import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { check } from "../scripts/lib/pipeline";
import { listScannableFiles } from "../scripts/lib/denylist";
import { makeTree } from "./helpers";

const ROOT = join(import.meta.dir, "..");

describe("template repo", () => {
  test.skipIf(existsSync(join(ROOT, "private/denylist.txt")))(
    "repo content passes check with only the missing-denylist warning",
    () => {
      expect(check(ROOT).issues).toEqual([
        { level: "warning", file: "private/denylist.txt", message: "not found, so the leak check was skipped" },
      ]);
    },
  );

  test("example private files exist", () => {
    const files = listScannableFiles(ROOT);
    for (const f of ["clients.example.yaml", "denylist.example.txt", "sources.example.yaml"]) {
      expect(files).toContain(`examples/private/${f}`);
    }
  });

  test("copied example private files raise no errors", () => {
    const root = makeTree({}, { git: true });
    mkdirSync(join(root, "private"), { recursive: true });
    for (const [from, to] of [
      ["clients.example.yaml", "clients.yaml"],
      ["denylist.example.txt", "denylist.txt"],
      ["sources.example.yaml", "sources.yaml"],
    ]) {
      cpSync(join(ROOT, "examples/private", from), join(root, "private", to));
    }
    expect(check(root).issues.filter((i) => i.level === "error")).toEqual([]);
  });
});
