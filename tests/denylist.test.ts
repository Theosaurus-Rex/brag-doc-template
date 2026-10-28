import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkMessage,
  findDenylistHits,
  listScannableFiles,
  loadTerms,
  parseDenylist,
  scanHistory,
  scanRepo,
} from "../scripts/lib/denylist";
import { commitAll, makeTree } from "./helpers";

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

describe("loadTerms", () => {
  test("merges denylist and clients.yaml values, de-duplicated case-insensitively", () => {
    const root = makeTree({
      "private/denylist.txt": "Globex\nInitech\n",
      "private/clients.yaml": "portal: globex\nbilling: Umbrella Corp\nn: 3\n",
    });
    expect(loadTerms(root)).toEqual({ terms: ["Globex", "Initech", "Umbrella Corp"], issues: [] });
  });

  test("missing, empty and comment-only files contribute nothing", () => {
    expect(loadTerms(makeTree())).toEqual({ terms: [], issues: [] });
    expect(loadTerms(makeTree({ "private/clients.yaml": "# nothing yet\n" }))).toEqual({ terms: [], issues: [] });
    expect(loadTerms(makeTree({ "private/clients.yaml": "" }))).toEqual({ terms: [], issues: [] });
  });

  test("bad YAML or a non-map top level is an error", () => {
    for (const bad of ["a: [unclosed\n", "- Globex\n- Initech\n", "just text\n"]) {
      const { issues } = loadTerms(makeTree({ "private/clients.yaml": bad }));
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ level: "error", file: "private/clients.yaml" });
    }
  });
});

describe("checkMessage", () => {
  test("finds a term with its line number", () => {
    expect(checkMessage("feat: add thing\n\nfor Globex", ["Globex"])).toEqual([
      { level: "error", file: "commit message", message: 'line 3 contains denylisted term "Globex"' },
    ]);
  });

  test("ignores # lines", () => {
    expect(checkMessage("feat: add thing\n# Globex was here\n", ["Globex"])).toEqual([]);
  });

  test("ignores everything after the scissors line", () => {
    const text = "feat: add thing\n# ------------------------ >8 ------------------------\ndiff mentions Globex\n";
    expect(checkMessage(text, ["Globex"])).toEqual([]);
  });
});

describe("scanHistory", () => {
  const cleanRepo = () => {
    const root = makeTree({}, { git: true });
    commitAll(root, "chore: start");
    return root;
  };

  test("clean repo and repo with no commits give nothing", () => {
    expect(scanHistory(cleanRepo(), ["Globex"])).toEqual([]);
    expect(scanHistory(makeTree({}, { git: true }), ["Globex"])).toEqual([]);
  });

  test("finds a term in a file that was committed then deleted", () => {
    const root = cleanRepo();
    writeFileSync(join(root, "notes.md"), "worked for Globex\n");
    commitAll(root, "add notes");
    rmSync(join(root, "notes.md"));
    commitAll(root, "remove notes");
    const issues = scanHistory(root, ["Globex"]);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toMatch(/^[0-9a-f]{7}:notes\.md$/);
    expect(issues[0].message).toBe('line 1 contains denylisted term "Globex"');
  });

  test("finds a term in a commit message", () => {
    const root = cleanRepo();
    writeFileSync(join(root, "x.md"), "harmless\n");
    commitAll(root, "feat: work for Globex");
    const issues = scanHistory(root, ["Globex"]);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toMatch(/^commit [0-9a-f]{7}$/);
  });

  test("finds a term in a past file path", () => {
    const root = cleanRepo();
    writeFileSync(join(root, "globex-notes.md"), "harmless\n");
    commitAll(root, "add notes");
    rmSync(join(root, "globex-notes.md"));
    commitAll(root, "remove notes");
    const issues = scanHistory(root, ["Globex"]);
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toMatch(/^[0-9a-f]{7}:globex-notes\.md$/);
    expect(issues[0].message).toBe('path contains denylisted term "Globex"');
  });

  test("reports a blob once and skips binary blobs", () => {
    const root = cleanRepo();
    writeFileSync(join(root, "a.md"), "Globex\n");
    writeFileSync(join(root, "b.md"), "Globex\n");
    writeFileSync(join(root, "bin.dat"), Buffer.from([0x47, 0x6c, 0x6f, 0x62, 0x65, 0x78, 0x00]));
    commitAll(root, "add files");
    expect(scanHistory(root, ["Globex"])).toHaveLength(1);
  });
});
