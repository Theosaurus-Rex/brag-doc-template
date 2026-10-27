import type { Career, Issue } from "./types";

const endKey = (end: string) => (end === "present" ? "9999-12" : end);

function checkRange(file: string, start: string, end: string, issues: Issue[], field = "end") {
  if (endKey(end) < start) {
    issues.push({ level: "error", file, field, message: `end (${end}) is before start (${start})` });
  }
}

export function validate(career: Career): Issue[] {
  const issues: Issue[] = [];

  for (const role of career.roles) {
    checkRange(role.file, role.data.start, role.data.end, issues);
    role.data.history.forEach((h, i) => checkRange(role.file, h.start, h.end, issues, `history.${i}.end`));
  }
  for (const project of career.projects) {
    checkRange(project.file, project.data.start, project.data.end, issues);
  }

  const projects = new Map(career.projects.map((p) => [p.id, p]));
  for (const a of career.achievements) {
    for (const tag of a.data.tags) {
      if (!(tag in career.taxonomy)) {
        issues.push({ level: "error", file: a.file, field: "tags", message: `unknown tag "${tag}" (not in taxonomy.yaml)` });
      }
    }
    const p = a.project ? projects.get(a.project) : undefined;
    if (p && (a.data.date < p.data.start || a.data.date > endKey(p.data.end))) {
      issues.push({
        level: "warning",
        file: a.file,
        field: "date",
        message: `${a.data.date} is outside the project's dates (${p.data.start} to ${p.data.end})`,
      });
    }
  }

  return issues;
}
