import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { check } from "../scripts/lib/pipeline";
import { listScannableFiles } from "../scripts/lib/denylist";

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

  test("no personal or resume words in tracked files", () => {
    const words = ["res" + "ume", "ale" + "mbic", "theo" + "saurus", "\\btheo\\b"];
    const offenders: string[] = [];
    for (const file of listScannableFiles(ROOT)) {
      if (file === "tests/template.test.ts" || file === "bun.lock") continue;
      const text = readFileSync(join(ROOT, file), "utf8");
      for (const word of words) {
        if (new RegExp(word, "i").test(text)) offenders.push(`${file}: ${word}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("example private files exist", () => {
    const files = listScannableFiles(ROOT);
    for (const f of ["clients.example.yaml", "denylist.example.txt", "sources.example.yaml"]) {
      expect(files).toContain(`examples/private/${f}`);
    }
  });
});
