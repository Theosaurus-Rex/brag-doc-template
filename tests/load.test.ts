import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { loadCareer, parseSections } from "../scripts/lib/load";
import { achievementSchema } from "../scripts/lib/schema";
import { FIXTURE, makeTree } from "./helpers";

const ACH = "roles/acme/projects/portal/achievements/2024-03-cut-build-times.md";

describe("loadCareer", () => {
  test("loads the fixture tree without issues", () => {
    const { career, issues } = loadCareer(FIXTURE);
    expect(issues).toEqual([]);
    expect(career.roles.map((r) => r.employer).sort()).toEqual(["acme", "oldco"]);
    expect(career.projects.map((p) => p.id)).toEqual(["acme/portal"]);
    expect(career.achievements.map((a) => a.id).sort()).toEqual([
      "acme/2024-05-started-guild",
      "acme/portal/2023-06-shipped-billing",
      "acme/portal/2024-03-cut-build-times",
    ]);
    expect(Object.keys(career.taxonomy)).toContain("leadership");
  });

  test("parses achievement sections", () => {
    const { career } = loadCareer(FIXTURE);
    const a = career.achievements.find((x) => x.id === "acme/portal/2024-03-cut-build-times")!;
    expect(a.file).toBe(ACH);
    expect(a.project).toBe("acme/portal");
    expect(a.story).toBe("The pipeline was slow.");
    expect(a.notes).toBe("Ask about the caching numbers.");
    const guild = career.achievements.find((x) => x.id === "acme/2024-05-started-guild")!;
    expect(guild.project).toBeUndefined();
    expect(guild.story).toBe("");
  });

  test("an extended achievement schema accepts extra fields", () => {
    const root = makeTree({ [ACH]: "---\ndate: 2024-03\nheadline: x\ntags: [delivery]\nextra: hi\n---\n" });
    expect(loadCareer(root).issues).toEqual([expect.objectContaining({ file: ACH, level: "error" })]);
    const { issues } = loadCareer(root, { achievementSchema: achievementSchema.extend({ extra: z.string().optional() }) });
    expect(issues).toEqual([]);
  });

  test("a full date gives a quoted YYYY-MM error with file and field", () => {
    const root = makeTree({
      [ACH]: "---\ndate: 2024-03-01\nheadline: x\ntags: [delivery]\n---\n",
    });
    const { issues } = loadCareer(root);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "error", file: ACH, field: "date" });
    expect(issues[0].message).toContain("YYYY-MM");
  });

  test("a bare year gives a quoted YYYY-MM error", () => {
    const root = makeTree({
      "roles/oldco/role.md": "---\nemployer: Old Co\ntitle: Engineer\nstart: 2018\nend: 2022-02\n---\n",
    });
    const { issues } = loadCareer(root);
    expect(issues[0]).toMatchObject({ file: "roles/oldco/role.md", field: "start" });
    expect(issues[0].message).toContain("YYYY-MM");
  });

  test("unknown front matter key is an error", () => {
    const root = makeTree({
      "roles/acme/projects/portal/project.md":
        "---\nclient: a retailer\nname: P\nstart: 2023-02\nend: 2024-06\nrole: Lead\nclientName: Secret\n---\n",
    });
    const { issues } = loadCareer(root);
    expect(issues[0].file).toBe("roles/acme/projects/portal/project.md");
    expect(issues[0].message).toContain("clientName");
  });

  test("missing role.md and taxonomy.yaml are errors", () => {
    const root = makeTree({ "roles/oldco/role.md": null, "taxonomy.yaml": null });
    const files = loadCareer(root).issues.map((i) => i.file).sort();
    expect(files).toEqual(["roles/oldco/role.md", "taxonomy.yaml"]);
  });
});

describe("parseSections", () => {
  test("headings are case-insensitive and unknown sections are ignored", () => {
    const s = parseSections("## STORY\nA\nB\n\n## Other\nx");
    expect(s.story).toBe("A\nB");
    expect(s.notes).toBe("");
  });
});
