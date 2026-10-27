import { resolve as resolvePath } from "node:path";
import { check } from "./lib/pipeline";
import { formatIssues, hasErrors } from "./lib/report";

const root = process.env.CAREER_ROOT ?? resolvePath(import.meta.dir, "..");
const [command = "check"] = process.argv.slice(2);

if (command === "check") {
  const { issues } = check(root);
  if (issues.length) console.log(formatIssues(issues));
  if (hasErrors(issues)) process.exit(1);
  console.log("check passed");
} else {
  console.error(`unknown command "${command}" (use check)`);
  process.exit(1);
}
