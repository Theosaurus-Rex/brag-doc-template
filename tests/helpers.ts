import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const FIXTURE = join(import.meta.dir, "fixtures/basic");

export function makeTree(overrides: Record<string, string | null> = {}, opts: { git?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "brag-"));
  cpSync(FIXTURE, root, { recursive: true });
  for (const [rel, content] of Object.entries(overrides)) {
    const path = join(root, rel);
    if (content === null) {
      rmSync(path, { recursive: true, force: true });
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
  }
  if (opts.git) Bun.spawnSync(["git", "init", "-q"], { cwd: root });
  return root;
}
