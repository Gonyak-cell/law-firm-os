import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const artifactPath = "artifacts/manual-qa/upl-e09-wave1-five-flow-playwright-suite.json";

type FlowArtifact = {
  id: string;
  pass: boolean;
};

test("UPL-E-09 Wave-1 five-flow Playwright suite passes opening, time-to-billing, leave, document, and portal", async () => {
  const run = spawnSync(process.execPath, ["scripts/run-upl-e09-wave1-five-flow-playwright-suite.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
  }
  assert.equal(run.status, 0);

  const artifact = JSON.parse(await readFile(resolve(root, artifactPath), "utf8"));
  assert.equal(artifact.pass, true);
  assert.equal(artifact.playwright_suite, true);
  const flows = artifact.flows as FlowArtifact[];
  assert.deepEqual(flows.map((flow) => flow.id), ["opening", "time-to-billing", "leave", "document", "portal"]);
  assert.equal(flows.every((flow) => flow.pass === true), true);
  assert.equal(artifact.production_ready_claim, false);
  assert.equal(artifact.go_live_claim, false);
});
