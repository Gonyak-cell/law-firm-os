import { renameSync, rmSync, writeFileSync } from "node:fs";
import {
  claimTestOnlyRf13DistLedgerFixture,
  runTestOnlyRf13DistAuthorityConsumption,
} from "../../lib/rf13-dist-authority-ledger.mjs";

const fixture = claimTestOnlyRf13DistLedgerFixture({
  descriptorPath: process.env.RFD018_TEST_FIXTURE_DESCRIPTOR,
  claimToken: process.env.RFD018_TEST_FIXTURE_CLAIM,
});
const binding = JSON.parse(process.env.RFD018_TEST_BINDING);
const holdPhase = process.env.RFD018_TEST_HOLD_PHASE ?? null;
const markerPath = process.env.RFD018_TEST_PHASE_MARKER ?? null;

const result = runTestOnlyRf13DistAuthorityConsumption(fixture, {
  binding,
  committedAt: process.env.RFD018_TEST_COMMITTED_AT ?? "2026-08-01T00:00:00.000Z",
  onPhase(phase, detail) {
    if (phase !== holdPhase) return;
    const markerCandidatePath = `${markerPath}.${process.pid}.candidate`;
    let published = false;
    try {
      writeFileSync(markerCandidatePath, `${JSON.stringify({ phase, ...detail })}\n`, { flag: "wx", mode: 0o600 });
      renameSync(markerCandidatePath, markerPath);
      published = true;
    } finally {
      if (!published) rmSync(markerCandidatePath, { force: true });
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
  },
});

process.stdout.write(`${JSON.stringify(result)}\n`);
