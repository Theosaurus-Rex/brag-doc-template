import { loadTerms, noTermsIssue, scanRepo } from "./denylist";
import { loadCareer } from "./load";
import type { Career, Issue } from "./types";
import { validate } from "./validate";

export function check(root: string): { career: Career; issues: Issue[] } {
  const { career, issues } = loadCareer(root);
  issues.push(...validate(career));
  const { terms, issues: termIssues } = loadTerms(root);
  issues.push(...termIssues);
  if (terms.length === 0) issues.push(noTermsIssue(root));
  else issues.push(...scanRepo(root, terms));
  return { career, issues };
}
