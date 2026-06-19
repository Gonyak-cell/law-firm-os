import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// Deterministic, corpus-independent checks only: this file joins the same
// `npm test` glob the closeout-pack close gate runs, so it must never depend
// on the gitignored "Law Firm OS UI/" archive, a dev server, or the network.

const root = process.cwd();

const uiToolingScripts = [
  "scripts/audit-matter-amplitude-pixel-parity.mjs",
  "scripts/capture-matter-amplitude-parity.mjs",
  "scripts/extract-amplitude-visual-tokens.mjs",
  "scripts/generate-amplitude-ui-reference.mjs",
  "scripts/generate-matter-amplitude-coverage-ledger.mjs",
  "scripts/generate-matter-amplitude-screenshot-state-registry.mjs",
  "scripts/verify-matter-amplitude-screenshot-states.mjs",
  "scripts/verify-matter-ui-flows.mjs",
  "scripts/progress-control-room-data.mjs",
  "scripts/serve-progress-control-room.mjs"
];

test("ui tooling scripts parse (node --check)", () => {
  for (const script of uiToolingScripts) {
    execFileSync(process.execPath, ["--check", path.join(root, script)], { stdio: "pipe" });
  }
});

test("amplitude screenshot inventory has full 318-screenshot coverage", () => {
  const inventory = JSON.parse(
    readFileSync(path.join(root, "docs/ui-reference/amplitude-feb-2025/amplitude-screenshot-inventory.json"), "utf8")
  );
  assert.ok(Array.isArray(inventory));
  assert.equal(inventory.length, 318);
  for (const entry of inventory) {
    assert.equal(typeof entry.screenshot_id, "number");
    assert.equal(typeof entry.flow_id, "string");
    assert.equal(typeof entry.matter_destination, "string");
    assert.ok(Array.isArray(entry.ui_elements));
  }
});

test("screenshot state registry binds every screenshot to a matter route", () => {
  const registry = JSON.parse(
    readFileSync(
      path.join(root, "docs/ui-reference/amplitude-feb-2025/matter-amplitude-screenshot-state-registry.json"),
      "utf8"
    )
  );
  assert.equal(registry.schema_version, "matter.amplitude.screenshot-state-registry.v1");
  assert.equal(registry.screenshot_count, 318);
  assert.ok(Array.isArray(registry.flow_summary));
  assert.equal(registry.flow_count, registry.flow_summary.length);
  for (const flow of registry.flow_summary) {
    assert.equal(typeof flow.flow_id, "string");
    assert.equal(typeof flow.route, "string");
    assert.ok(flow.count > 0);
  }
});
