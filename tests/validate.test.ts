import { describe, expect, test } from "bun:test";
import { loadCareer } from "../scripts/lib/load";
import { validate } from "../scripts/lib/validate";
import { FIXTURE, makeTree } from "./helpers";

const GUILD = "roles/acme/achievements/2024-05-started-guild.md";
const run = (overrides: Record<string, string | null>) => validate(loadCareer(makeTree(overrides)).career);

describe("validate", () => {
  test("fixture is clean", () => {
    expect(validate(loadCareer(FIXTURE).career)).toEqual([]);
  });

  test("unknown tag", () => {
    const issues = run({ [GUILD]: "---\ndate: 2024-05\nheadline: Guild\ntags: [leadership, vibes]\n---\n" });
    expect(issues).toEqual([{ level: "error", file: GUILD, field: "tags", message: 'unknown tag "vibes" (not in taxonomy.yaml)' }]);
  });

  test("end before start", () => {
    const issues = run({
      "roles/acme/projects/portal/project.md":
        "---\nclient: a retailer\nname: P\nstart: 2024-06\nend: 2023-02\nrole: Lead\n---\n",
    });
    expect(issues).toContainEqual({
      level: "error",
      file: "roles/acme/projects/portal/project.md",
      field: "end",
      message: "end (2023-02) is before start (2024-06)",
    });
  });

  test("achievement outside its project dates is a warning", () => {
    const file = "roles/acme/projects/portal/achievements/2023-06-shipped-billing.md";
    const issues = run({ [file]: "---\ndate: 2025-01\nheadline: Late\ntags: [delivery]\n---\n" });
    expect(issues).toEqual([
      { level: "warning", file, field: "date", message: "2025-01 is outside the project's dates (2023-02 to 2024-06)" },
    ]);
  });
});
