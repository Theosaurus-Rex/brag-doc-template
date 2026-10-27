import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Issue } from "./types";

export const typstAvailable = () => Bun.which("typst") !== null;

export function renderReview(root: string, mdPath: string): { issues: Issue[]; pdf?: string } {
  const file = mdPath;
  const abs = resolve(root, mdPath);
  if (!existsSync(abs)) return { issues: [{ level: "error", file, message: "file not found" }] };

  const rel = relative(root, abs);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return { issues: [{ level: "error", file, message: "file must be inside the repo" }] };
  }
  if (!typstAvailable()) {
    return { issues: [{ level: "error", file, message: "typst is not installed (brew install typst)" }] };
  }

  const pdf = abs.replace(/\.[^./\\]*$/, "") + ".pdf";
  const result = Bun.spawnSync(
    ["typst", "compile", "--root", root, "--input", `md=/${rel.split("\\").join("/")}`, join(root, "template/review.typ"), pdf],
    { cwd: root },
  );
  if (result.exitCode !== 0) {
    return { issues: [{ level: "error", file, message: result.stderr.toString().trim() }] };
  }
  return { issues: [], pdf };
}
