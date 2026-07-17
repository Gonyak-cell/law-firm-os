#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const PACK_PATH = "workbook/lawos-runtime-safety-operational-unblock-owner-action-pack-2026-07-17.json";

const REQUIRED_TUW_IDS = Object.freeze([
  "RS-BKP-005", "RS-DMS-001", "RS-DMS-010", "RS-PRJ-005", "RS-PRJ-006",
  "RS-OFF-001", "RS-OFF-002", "RS-OFF-003", "RS-OFF-004", "RS-OFF-005", "RS-OFF-006",
  "RS-CUT-001", "RS-CUT-002", "RS-CUT-003", "RS-CUT-004", "RS-CUT-005", "RS-CUT-006",
  "RS-CUT-007", "RS-CUT-008", "RS-CUT-009", "RS-CUT-010", "RS-CUT-011", "RS-CUT-012",
]);

const REQUIRED_DECISIONS = Object.freeze([
  "DMS_PROVIDER_AUTHORITY",
  "READINESS_AUTHORITY",
  "OFFLINE_CAPABILITY",
  "CUTOVER_PLAN",
  "STAGING_ACCEPTANCE",
  "PRODUCTION_AUTHORIZATION",
]);

const REQUIRED_BINDINGS = Object.freeze({
  "RS-DMS-001": ["workbook/lawos-dms-provider-authority-decision-packet-2026-07-17.json", "08c3493653fee69d707ab4a1a9733f934f410625ccd002376e8fbce12a8d60f2", "dms-provider-authority", "source-local"],
  "RS-PRJ-005/006": ["workbook/lawos-readiness-authority-decision-packet-2026-07-17.json", "4702e68194ae42c46d153dd152123bd6fc9a9dfcf30b3db42f2de0a2b23dbf10", "readiness-authority", "source-local"],
  "RS-OFF-001..006": ["workbook/lawos-offline-action-conflict-decision-packet-2026-07-17.json", "2f1073fc4844f112799f7f05b683aaa19f4dfc9456e424b6821546dd64289445", "offline-capability", "desktop-local"],
  "RS-CUT-001": ["workbook/lawos-runtime-safety-evidence/RS-CUT-001/approval-packet.json", "7b85ecbc293f437f5e310b4cee2ea6ea681c083a97d3081c026a6c4355e9016a", "central-ledger-cutover-plan", "source-local"],
  "RS-CUT-004..007": ["workbook/lawos-runtime-safety-evidence/RS-CUT-004/decision-packet.json", "700280a9a312d4ca6a388b015c42b96a27f055f1ffbf3459a38636beabd612a0", "central-ledger-staging-acceptance", "staging"],
  "RS-CUT-008..012": ["workbook/lawos-runtime-safety-evidence/RS-CUT-008/production-authorization.json", "af9a595ae70ab3aabc75ce245cb207224604fd61ccb3c662d5cad5333cbbc82c", "central-ledger-production-authorization", "production"],
});

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sorted(values) {
  return [...values].sort();
}

export function validateOperationalUnblockOwnerActionPack(pack, { root = process.cwd() } = {}) {
  assert.equal(pack.schema_version, "law-firm-os.runtime-safety.operational-unblock-owner-action-pack.v1");
  assert.equal(pack.status, "OWNER_ACTION_REQUIRED");
  assert.equal(pack.prepared_from.local_main_sha, "199ac95ae591110031822a701c22a8c293549fcf");
  assert.equal(pack.prepared_from.local_main_tree, "f82dd4e9977d75bf3f0c25dda728c95e257c6f3c");
  assert.deepEqual(sorted(pack.covered_tuw_ids), sorted(REQUIRED_TUW_IDS));
  assert.equal(new Set(pack.covered_tuw_ids).size, REQUIRED_TUW_IDS.length);

  assert.equal(pack.decision_packet_bindings.length, Object.keys(REQUIRED_BINDINGS).length);
  assert.equal(new Set(pack.decision_packet_bindings.map((binding) => binding.gate)).size, Object.keys(REQUIRED_BINDINGS).length);
  for (const binding of pack.decision_packet_bindings) {
    assert.deepEqual(
      [binding.path, binding.sha256, binding.action, binding.environment],
      REQUIRED_BINDINGS[binding.gate],
      `unexpected decision binding: ${binding.gate}`,
    );
    const path = `${root}/${binding.path}`;
    assert.equal(existsSync(path), true, `missing decision packet: ${binding.path}`);
    assert.equal(sha256(path), binding.sha256, `decision packet drift: ${binding.path}`);
    assert.match(binding.action, /^[a-z0-9-]+$/u);
    assert.match(binding.environment, /^[a-z0-9-]+$/u);
  }

  assert.deepEqual(sorted(pack.owner_decisions.map((entry) => entry.id)), sorted(REQUIRED_DECISIONS));
  for (const decision of pack.owner_decisions) {
    assert.equal(decision.selected, null, `${decision.id} must remain unsigned in an owner action request`);
    assert.deepEqual(decision.allowed, ["approved", "rejected"]);
  }

  assert.equal(pack.external_authority_inputs.approval_trust_registry_path, null);
  assert.equal(pack.external_authority_inputs.approval_trust_registry_sha256, null);
  assert.deepEqual(pack.external_authority_inputs.signed_receipts_and_detached_signatures, []);
  assert.equal(pack.external_authority_inputs.staging.real_client_data_authorized, false);
  assert.equal(pack.external_authority_inputs.aws_backup.sso_session_verified, false);
  assert.equal(pack.execution_order.length, 8);
  assert.equal(Object.values(pack.claims).every((value) => value === false), true);

  return Object.freeze({
    verdict: "PASS",
    packet_id: pack.packet_id,
    covered_tuw_count: pack.covered_tuw_ids.length,
    decision_packet_count: pack.decision_packet_bindings.length,
    owner_decision_count: pack.owner_decisions.length,
    affirmative_claim_count: 0,
  });
}

export function readAndValidateOperationalUnblockOwnerActionPack(path = PACK_PATH) {
  return validateOperationalUnblockOwnerActionPack(JSON.parse(readFileSync(path, "utf8")));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(readAndValidateOperationalUnblockOwnerActionPack(process.argv[2] ?? PACK_PATH), null, 2));
}
