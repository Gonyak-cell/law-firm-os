import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MAIN_PATH = new URL("../src/main.jsx", import.meta.url);

test("production task pane uses explicit Matter search and never bootstraps a default Matter", async () => {
  const source = await readFile(MAIN_PATH, "utf8");

  assert.equal(source.includes("/api/outlook/matters?limit=50"), false);
  assert.equal(source.includes("matters[0]"), false);
  for (const expected of [
    "createOutlookMatterSearchDebouncer",
    "createOutlookMatterSelection",
    "createOutlookMatterRevalidationRequest",
    "revalidateOutlookMatterSelection",
    'data-testid="matter-search-toggle"',
    'data-testid="matter-search-input"',
    "onChange={handleMatterSearchQueryChange}",
  ]) {
    assert.equal(source.includes(expected), true, `main.jsx must include ${expected}`);
  }
  assert.equal(/opened:\s*matterSearchOpen/u.test(source), true);
});

test("every production Matter mutation captures, checks, and reconciles immutable context", async () => {
  const source = await readFile(MAIN_PATH, "utf8");

  for (const expected of [
    "createOutlookOperationSnapshot",
    "isOutlookOperationSnapshotContextCurrent",
    "reconcileOutlookOperationResult",
    "outlookOperationReceiptCanonicalGraphMessageId",
    "createOutlookCanonicalMessageIdentityRequest",
    "applyOutlookCanonicalMessageIdentity",
    "outlookItemChangeDisposition",
    "completedOperationReceiptsRef",
  ]) {
    assert.equal(source.includes(expected), true, `main.jsx must include ${expected}`);
  }
  for (const action of ["fileEmail", "saveAttachments", "createFollowup"]) {
    assert.equal(
      new RegExp(`async function ${action}\\([^)]*\\) \\{[\\s\\S]*?prepareMatterMutation\\(`, "u").test(source),
      true,
      `${action} must prepare immutable Matter mutation context`,
    );
  }
  assert.equal(source.includes("assertOperationContextCurrent(operationSnapshot)"), true);
  assert.equal(source.includes("reconcileOperationReceipt(operationSnapshot,"), true);
  assert.equal(source.includes("currentItem.canonical_graph_message_id"), true);
  assert.equal(source.includes("clear_matter_selection"), true);
  assert.equal(source.includes("restore_focus_to"), true);
});
