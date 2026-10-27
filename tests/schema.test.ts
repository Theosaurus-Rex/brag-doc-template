import { describe, expect, test } from "bun:test";
import { achievementSchema, projectSchema, roleSchema } from "../scripts/lib/schema";

describe("schemas", () => {
  test("accepts YYYY-MM and present", () => {
    const r = roleSchema.safeParse({ employer: "Acme", title: "Eng", start: "2022-03", end: "present" });
    expect(r.success).toBe(true);
  });

  test("rejects a Date or number with a quoted-date hint", () => {
    const asDate = achievementSchema.safeParse({ date: new Date("2024-03-01"), headline: "x", tags: ["delivery"] });
    const asNumber = roleSchema.safeParse({ employer: "A", title: "B", start: 2022, end: "present" });
    expect(asDate.success).toBe(false);
    expect(asNumber.success).toBe(false);
    if (!asDate.success) expect(asDate.error.issues[0].message).toContain("YYYY-MM");
    if (!asNumber.success) expect(asNumber.error.issues[0].message).toContain("YYYY-MM");
  });

  test("rejects unknown keys", () => {
    const r = projectSchema.safeParse({ client: "a bank", name: "P", start: "2023-01", end: "2023-02", role: "Dev", clientName: "x" });
    expect(r.success).toBe(false);
  });
});
