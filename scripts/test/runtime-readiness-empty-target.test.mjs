import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("runtime readiness validator rejects an empty runtime target scope", () => {
  const result = spawnSync(process.execPath, ["scripts/validate-runtime-readiness.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Runtime readiness validation failed/);
  assert.match(result.stderr, /requires at least one runtime\/mixed pack/);
});
