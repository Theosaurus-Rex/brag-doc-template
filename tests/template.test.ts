import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { check } from "../scripts/lib/pipeline";
import { listScannableFiles, parseDenylist } from "../scripts/lib/denylist";

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

  test("example denylist has no live terms", () => {
    const text = readFileSync(join(ROOT, "examples/private/denylist.example.txt"), "utf8");
    expect(parseDenylist(text)).toEqual([]);
  });
});
