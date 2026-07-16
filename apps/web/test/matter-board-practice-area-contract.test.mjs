import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/components/MattersSurface.jsx", import.meta.url);

test("WT-01-01 Matter board consumes the shared practice-area classifier", async () => {
  // Given
  const source = await readFile(sourceUrl, "utf8");

  // When
  const hasSharedImport = /import\s+\{\s*classifyMatterPracticeArea\s*\}\s+from\s+["'][^"']*packages\/matter\/src\/practice-area\.js["']/.test(source);

  // Then
  assert.equal(hasSharedImport, true);
  assert.match(source, /const matterBoardCategory = classifyMatterPracticeArea;/);
  assert.doesNotMatch(source, /function matterBoardCategory\(/);
});
