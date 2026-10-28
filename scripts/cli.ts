import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { checkMessage, loadTerms, noTermsIssue, scanHistory } from "./lib/denylist";
import { check } from "./lib/pipeline";
import { renderReview } from "./lib/review";
import { formatIssues, hasErrors } from "./lib/report";

const root = process.env.CAREER_ROOT ?? resolvePath(import.meta.dir, "..");
const [command = "check"] = process.argv.slice(2);

if (command === "check" && process.argv.includes("--history")) {
  const { terms, issues } = loadTerms(root);
  if (terms.length === 0) issues.push(noTermsIssue(root));
  else issues.push(...scanHistory(root, terms));
  if (issues.length) console.log(formatIssues(issues));
  if (hasErrors(issues)) process.exit(1);
  console.log("history check passed");
} else if (command === "check") {
  const { issues } = check(root);
  if (issues.length) console.log(formatIssues(issues));
  if (hasErrors(issues)) process.exit(1);
  console.log("check passed");
} else if (command === "check-message") {
  const file = process.argv[3];
  if (!file) {
    console.error("usage: bun scripts/cli.ts check-message <file>");
    process.exit(1);
  }
  const { terms } = loadTerms(root);
  const issues = checkMessage(readFileSync(resolvePath(process.cwd(), file), "utf8"), terms);
  if (issues.length) {
    console.log(formatIssues(issues));
    process.exit(1);
  }
} else if (command === "review") {
  const file = process.argv[3];
  if (!file) {
    console.error("usage: bun run review <file>");
    process.exit(1);
  }
  const { issues, pdf } = renderReview(root, resolvePath(process.cwd(), file));
  if (issues.length) console.log(formatIssues(issues).replaceAll(resolvePath(process.cwd(), file), file));
  if (hasErrors(issues)) process.exit(1);
  console.log(pdf);
} else {
  console.error(`unknown command "${command}" (use check, check-message or review)`);
  process.exit(1);
}
