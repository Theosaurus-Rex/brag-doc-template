import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findDenylistHits, listScannableFiles, parseDenylist, scanRepo } from "../scripts/lib/denylist";

const hits = (terms: string[], text: string) => findDenylistHits(terms, [{ path: "a.md", text }]);

describe("parseDenylist", () => {
  test("ignores blanks and # comments, trims", () => {
    expect(parseDenylist("# clients\nGlobex\n\n  Initech  \n")).toEqual(["Globex", "Initech"]);
  });
});

describe("findDenylistHits", () => {
  test("case-insensitive with file, line and term", () => {
    expect(hits(["Globex"], "intro\nworked at globex corp")).toEqual([
      { level: "error", file: "a.md", message: 'line 2 contains denylisted term "Globex"' },
    ]);
  });

  test("regex characters match literally", () => {
    expect(hits(["AT&T"], "Built for AT&T.")).toHaveLength(1);
    expect(hits(["C++ Corp"], "at C++ Corp today")).toHaveLength(1);
    expect(hits(["Foo.Bar"], "FooxBar")).toHaveLength(0);
  });

  test("matches across line breaks and repeated whitespace", () => {
    const a = hits(["Big Bank"], "for Big\nBank");
    expect(a).toHaveLength(1);
    expect(a[0].message).toBe('line 1 contains denylisted term "Big Bank"');
    expect(hits(["Big Bank"], "Big   Bank")).toHaveLength(1);
  });

  test("whole words only", () => {
    expect(hits(["Ace"], "Acme and Grace")).toHaveLength(0);
    expect(hits(["Ace"], "Ace's portal")).toHaveLength(1);
  });
});

describe("repo scanning", () => {
  function repo() {
    const root = mkdtempSync(join(tmpdir(), "deny-"));
    Bun.spawnSync(["git", "init", "-q"], { cwd: root });
    writeFileSync(join(root, ".gitignore"), "private/\nbuild/\n");
    writeFileSync(join(root, "a.md"), "Globex project");
    mkdirSync(join(root, "private"));
    writeFileSync(join(root, "private/denylist.txt"), "Globex");
    mkdirSync(join(root, "build"));
    writeFileSync(join(root, "build/x.json"), "Globex");
    writeFileSync(join(root, "bin.dat"), Buffer.from([0x47, 0x6c, 0x00, 0x62]));
    return root;
  }

  test("lists untracked files but not ignored ones", () => {
    expect(listScannableFiles(repo()).sort()).toEqual([".gitignore", "a.md", "bin.dat"]);
  });

  test("scanRepo finds hits and skips binary files", () => {
    expect(scanRepo(repo(), ["Globex"]).map((i) => i.file)).toEqual(["a.md"]);
  });

  test("scanRepo flags denylisted terms in file paths", () => {
    const root = repo();
    const rel = "roles/x/projects/globex-portal/project.md";
    mkdirSync(join(root, "roles/x/projects/globex-portal"), { recursive: true });
    writeFileSync(join(root, rel), "harmless");
    expect(scanRepo(root, ["Globex"]).filter((i) => i.file === rel)).toEqual([
      { level: "error", file: rel, message: 'path contains denylisted term "Globex"' },
    ]);
  });
});
