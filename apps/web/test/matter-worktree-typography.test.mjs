import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const worktreeSource = await readFile(new URL("../src/components/MatterWorktreeSurface.jsx", import.meta.url), "utf8");

test("Matter board tabs reuse the Worktree practice-control typography", () => {
  assert.match(styles, /\.matter-board-tabs button,\s*\.matter-worktree-practice-areas button\s*\{[^}]*font-size:\s*16px;[^}]*font-weight:\s*400;/);
  assert.match(styles, /\.matter-board-tabs button\.active,\s*\.matter-worktree-practice-areas button\.active\s*\{[^}]*font-weight:\s*700;/);
  assert.match(worktreeSource, /className="matter-worktree-practice-areas"/);
  assert.doesNotMatch(worktreeSource, /className="matter-board-tabs matter-worktree-practice-areas"/);
});
