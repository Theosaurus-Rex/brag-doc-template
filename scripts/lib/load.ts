import matter from "gray-matter";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import YAML from "yaml";
import type { ZodType, ZodTypeDef } from "zod";
import {
  achievementSchema,
  projectSchema,
  roleSchema,
  taxonomySchema,
} from "./schema";
import type { AchievementFront } from "./schema";
import type { Achievement, Career, Doc, Issue, Project, Role } from "./types";

type Schema<T> = ZodType<T, ZodTypeDef, unknown>;

function dirs(root: string, rel: string): string[] {
  const abs = join(root, rel);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((n) => !n.startsWith(".") && statSync(join(abs, n)).isDirectory())
    .sort();
}

function files(root: string, rel: string, ext: string): string[] {
  const abs = join(root, rel);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((n) => n.endsWith(ext) && statSync(join(abs, n)).isFile())
    .sort();
}

function check<T>(schema: Schema<T>, raw: unknown, file: string, issues: Issue[]): T | undefined {
  const result = schema.safeParse(raw ?? {});
  if (result.success) return result.data;
  for (const i of result.error.issues) {
    const field = i.path.join(".");
    issues.push({ level: "error", file, ...(field ? { field } : {}), message: i.message });
  }
  return undefined;
}

function readDoc<T>(root: string, file: string, schema: Schema<T>, issues: Issue[]): Doc<T> | undefined {
  if (!existsSync(join(root, file))) {
    issues.push({ level: "error", file, message: "file is missing" });
    return undefined;
  }
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(readFileSync(join(root, file), "utf8"));
  } catch (e) {
    issues.push({ level: "error", file, message: `invalid front matter: ${(e as Error).message}` });
    return undefined;
  }
  const data = check(schema, parsed.data, file, issues);
  return data === undefined ? undefined : { file, data, body: parsed.content.trim() };
}

export function readYamlFile<T>(root: string, file: string, schema: Schema<T>, issues: Issue[]): T | undefined {
  if (!existsSync(join(root, file))) {
    issues.push({ level: "error", file, message: "file is missing" });
    return undefined;
  }
  let raw: unknown;
  try {
    raw = YAML.parse(readFileSync(join(root, file), "utf8"));
  } catch (e) {
    issues.push({ level: "error", file, message: `invalid YAML: ${(e as Error).message}` });
    return undefined;
  }
  return check(schema, raw, file, issues);
}

export function parseSections(body: string): { story: string; notes: string } {
  const sections: Record<string, string[]> = {};
  let current: string | undefined;
  for (const line of body.split("\n")) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].toLowerCase();
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  const text = (key: string) => (sections[key] ?? []).join("\n").trim();
  return { story: text("story"), notes: text("notes") };
}

function readAchievements(
  root: string,
  dir: string,
  employer: string,
  project: string | undefined,
  issues: Issue[],
  schema: Schema<AchievementFront>,
): Achievement[] {
  const out: Achievement[] = [];
  for (const name of files(root, dir, ".md")) {
    const file = `${dir}/${name}`;
    const doc = readDoc(root, file, schema, issues);
    if (!doc) continue;
    const slug = basename(name, ".md");
    out.push({
      ...doc,
      ...parseSections(doc.body),
      id: project ? `${project}/${slug}` : `${employer}/${slug}`,
      employer,
      ...(project ? { project } : {}),
    });
  }
  return out;
}

export function loadCareer(
  root: string,
  opts: { achievementSchema?: Schema<AchievementFront> } = {},
): { career: Career; issues: Issue[] } {
  const issues: Issue[] = [];
  const roles: Role[] = [];
  const projects: Project[] = [];
  const achievements: Achievement[] = [];

  const schema = opts.achievementSchema ?? achievementSchema;
  const taxonomy = readYamlFile(root, "taxonomy.yaml", taxonomySchema, issues) ?? {};

  for (const employer of dirs(root, "roles")) {
    const base = `roles/${employer}`;
    const role = readDoc(root, `${base}/role.md`, roleSchema, issues);
    if (role) roles.push({ ...role, employer });
    achievements.push(...readAchievements(root, `${base}/achievements`, employer, undefined, issues, schema));
    for (const slug of dirs(root, `${base}/projects`)) {
      const pdir = `${base}/projects/${slug}`;
      const id = `${employer}/${slug}`;
      const project = readDoc(root, `${pdir}/project.md`, projectSchema, issues);
      if (project) projects.push({ ...project, id, employer, slug });
      achievements.push(...readAchievements(root, `${pdir}/achievements`, employer, id, issues, schema));
    }
  }

  return { career: { root, taxonomy, roles, projects, achievements }, issues };
}
