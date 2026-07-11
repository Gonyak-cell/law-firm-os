import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

function rule(selector) {
  return styles.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
}

test("Worktree practice controls match the Matter board tab typography", () => {
  const boardTab = rule(".matter-board-tabs button");
  const practiceControl = rule(".matter-worktree-practice-areas button");
  assert.match(boardTab, /font-size:\s*16px/);
  assert.match(practiceControl, /font-size:\s*16px/);
  assert.match(practiceControl, /font-weight:\s*400/);
});
