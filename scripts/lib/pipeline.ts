import { DENYLIST_FILE, loadDenylist, scanRepo } from "./denylist";
import { loadCareer } from "./load";
import type { Career, Issue } from "./types";
import { validate } from "./validate";

export function check(root: string): { career: Career; issues: Issue[] } {
  const { career, issues } = loadCareer(root);
  issues.push(...validate(career));
  const terms = loadDenylist(root);
  if (terms === null) {
    issues.push({ level: "warning", file: DENYLIST_FILE, message: "not found, so the leak check was skipped" });
  } else {
    issues.push(...scanRepo(root, terms));
  }
  return { career, issues };
}
