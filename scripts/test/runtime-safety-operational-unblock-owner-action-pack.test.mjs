import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PACK_PATH,
  validateOperationalUnblockOwnerActionPack,
} from "../validate-runtime-safety-operational-unblock-owner-action-pack.mjs";

function pack() {
  return JSON.parse(readFileSync(PACK_PATH, "utf8"));
}

test("operational unblock owner action pack covers every remaining runtime-safety row without granting authority", () => {
  const result = validateOperationalUnblockOwnerActionPack(pack());
  assert.equal(result.verdict, "PASS");
  assert.equal(result.covered_tuw_count, 23);
  assert.equal(result.decision_packet_count, 6);
  assert.equal(result.owner_decision_count, 6);
  assert.equal(result.affirmative_claim_count, 0);
});

test("operational unblock owner action pack rejects row omission, packet drift, and fabricated authority", () => {
  const missingRow = pack();
  missingRow.covered_tuw_ids.pop();
  assert.throws(() => validateOperationalUnblockOwnerActionPack(missingRow));

  const packetDrift = pack();
  packetDrift.decision_packet_bindings[0].sha256 = "0".repeat(64);
  assert.throws(() => validateOperationalUnblockOwnerActionPack(packetDrift));

  const fabricatedApproval = pack();
  fabricatedApproval.owner_decisions[0].selected = "approved";
  assert.throws(() => validateOperationalUnblockOwnerActionPack(fabricatedApproval));

  const prematureClaim = pack();
  prematureClaim.claims.release_ready = true;
  assert.throws(() => validateOperationalUnblockOwnerActionPack(prematureClaim));
});
