import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ledgerPath = "docs/desktop/mater-desktop-loop-tuw-ledger.json";
const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));

assert.equal(ledger.schema, "law-firm-os.mater-desktop.loop-tuw-ledger.v0.1");
assert.equal(ledger.product_display_name, "mater");
assert.equal(ledger.machine_identifier_policy, "preserve_law_firm_os_identifiers");

const phaseIds = new Set(ledger.phases.map((phase) => phase.id));
const workPackages = new Map(ledger.work_packages.map((wp) => [wp.id, wp]));
const tuws = new Map();

for (const tuw of ledger.tuws) {
  assert(!tuws.has(tuw.id), `duplicate TUW id ${tuw.id}`);
  tuws.set(tuw.id, tuw);
  assert(phaseIds.has(tuw.phase), `${tuw.id} references missing phase ${tuw.phase}`);
  assert(workPackages.has(tuw.wp), `${tuw.id} references missing work package ${tuw.wp}`);
  assert.equal(workPackages.get(tuw.wp).phase, tuw.phase, `${tuw.id} phase does not match work package phase`);
  assert(Array.isArray(tuw.deliverables) && tuw.deliverables.length > 0, `${tuw.id} has no deliverables`);
  assert(Array.isArray(tuw.acceptance) && tuw.acceptance.length > 0, `${tuw.id} has no acceptance criteria`);
  assert(tuw.verification?.method, `${tuw.id} has no verification method`);
  assert(tuw.verification?.evidence, `${tuw.id} has no verification evidence`);
  assert(["A", "B", "C"].includes(tuw.risk_class), `${tuw.id} has invalid risk_class`);
  if (tuw.risk_class === "A") {
    assert(tuw.permission_audit_impact, `${tuw.id} is risk A but lacks permission_audit_impact`);
  }
}

assert.equal(ledger.phases.length, ledger.counts.phase_count, "phase_count mismatch");
assert.equal(ledger.work_packages.length, ledger.counts.work_package_count, "work_package_count mismatch");
assert.equal(ledger.tuws.length, ledger.counts.tuw_count, "tuw_count mismatch");

const tuwOrder = new Map(ledger.tuws.map((tuw, index) => [tuw.id, index]));
for (const tuw of ledger.tuws) {
  for (const dep of tuw.depends_on ?? []) {
    assert(tuws.has(dep), `${tuw.id} depends on missing ${dep}`);
    assert(tuwOrder.get(dep) < tuwOrder.get(tuw.id), `${tuw.id} depends on non-prior ${dep}`);
  }
}

for (const wp of ledger.work_packages) {
  const wpTuws = ledger.tuws.filter((tuw) => tuw.wp === wp.id);
  assert(wpTuws.length > 0, `${wp.id} has no TUWs`);
  const terminalTuws = wpTuws.filter((tuw) => tuw.terminal === true).map((tuw) => tuw.id);
  assert.deepEqual(terminalTuws, [wp.terminal_tuw], `${wp.id} terminal TUW mismatch`);
}

for (const phase of ledger.phases) {
  assert(tuws.has(phase.terminal_tuw), `${phase.id} terminal TUW missing`);
  assert.equal(tuws.get(phase.terminal_tuw).terminal, true, `${phase.id} terminal TUW is not terminal`);
  assert.equal(tuws.get(phase.terminal_tuw).phase, phase.id, `${phase.id} terminal TUW belongs to another phase`);
}

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      ledger: ledgerPath,
      phase_count: ledger.phases.length,
      work_package_count: ledger.work_packages.length,
      tuw_count: ledger.tuws.length
    },
    null,
    2
  )
);
