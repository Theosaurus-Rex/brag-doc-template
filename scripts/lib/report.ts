import type { Issue } from "./types";

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.level === "error");

export function formatIssues(issues: Issue[]): string {
  return issues
    .map((i) => `${i.level === "error" ? "error  " : "warning"}  ${i.file}${i.field ? ` [${i.field}]` : ""}  ${i.message}`)
    .join("\n");
}
