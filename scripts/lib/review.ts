import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { Issue } from "./types";

export const typstAvailable = () => Bun.which("typst") !== null;

const text = z.string().min(1);

const show = z.object({ name: text, level: text.optional() }).strict();

const example = z
  .object({
    title: text,
    client: text.optional(),
    date: text,
    detail: text,
    result: text.optional(),
    shows: z.array(show).default([]),
  })
  .strict();

const theme = z.object({ name: text, examples: z.array(example).min(1) }).strict();

export const reviewSchema = z
  .object({
    name: text,
    role: text,
    level: text,
    employer: text.optional(),
    period: text,
    summary: z.array(text).min(1).max(5),
    levels: z.array(text).min(1).max(4).optional(),
    themes: z.array(theme).min(1),
    gaps: z.array(z.object({ name: text, note: text.optional() }).strict()).default([]),
    asks: z.array(z.object({ title: text, text }).strict()).default([]),
  })
  .strict();

export type Review = z.infer<typeof reviewSchema>;

function validateReview(file: string, raw: unknown): Issue[] {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      level: "error",
      file,
      field: i.path.join(".") || undefined,
      message: i.message,
    }));
  }
  const { levels, themes } = parsed.data;
  if (!levels) return [];
  const issues: Issue[] = [];
  themes.forEach((t, ti) =>
    t.examples.forEach((e, ei) =>
      e.shows.forEach((s, si) => {
        if (s.level !== undefined && !levels.includes(s.level)) {
          issues.push({
            level: "error",
            file,
            field: `themes.${ti}.examples.${ei}.shows.${si}.level`,
            message: `"${s.level}" is not in levels`,
          });
        }
      }),
    ),
  );
  return issues;
}

export function renderReview(root: string, path: string): { issues: Issue[]; pdf?: string } {
  const file = path;
  const abs = resolve(root, path);
  if (!existsSync(abs)) return { issues: [{ level: "error", file, message: "file not found" }] };

  const rel = relative(root, abs);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return { issues: [{ level: "error", file, message: "file must be inside the repo" }] };
  }
  if (!/\.ya?ml$/.test(abs)) {
    return { issues: [{ level: "error", file, message: "review file must be YAML (.yaml)" }] };
  }
  if (!typstAvailable()) {
    return { issues: [{ level: "error", file, message: "typst is not installed (brew install typst)" }] };
  }

  let raw: unknown;
  try {
    raw = parse(readFileSync(abs, "utf8"));
  } catch (e) {
    return { issues: [{ level: "error", file, message: `invalid YAML: ${(e as Error).message}` }] };
  }
  const issues = validateReview(file, raw);
  if (issues.length) return { issues };

  const pdf = abs.replace(/\.[^./\\]*$/, "") + ".pdf";
  const result = Bun.spawnSync(
    ["typst", "compile", "--root", root, "--input", `data=/${rel.split("\\").join("/")}`, join(root, "template/review.typ"), pdf],
    { cwd: root },
  );
  if (result.exitCode !== 0) {
    return { issues: [{ level: "error", file, message: result.stderr.toString().trim() }] };
  }
  return { issues: [], pdf };
}
