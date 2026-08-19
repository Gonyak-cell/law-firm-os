import { createHash } from "node:crypto";
import path from "node:path";

import {
  canonicalJson as task2CanonicalJson,
  sha256 as task2Sha256,
} from "../lib/outlook-production-aws-inventory-contract.mjs";
import {
  TASK2_EVIDENCE_NAMES,
  writeInventoryEvidence,
} from "../lib/outlook-production-aws-inventory-evidence.mjs";
import {
  CODE_BYTES,
  TEST_ROLLBACK_PARENT,
} from "./collect-outlook-production-aws-inventory-fixtures.mjs";
import {
  task2CatalogReadbackInventory,
  task2ProjectedCodeState,
  task2StateFromInventory,
} from "./production-catalog-readback-task2-state-fixture.mjs";

export const H = (value) => createHash("sha256")
  .update(String(value))
  .digest("hex");
export const HB = (value) => createHash("sha256")
  .update(value)
  .digest("hex");
const b64 = (hex) => Buffer.from(hex, "hex").toString("base64");

export const TASK2_INVENTORY = await task2CatalogReadbackInventory();
export const TASK2_INVENTORY_PATH = await writeInventoryEvidence(
  path.join(
    TEST_ROLLBACK_PARENT,
    "task3-inventory-evidence",
    TASK2_EVIDENCE_NAMES.payloadName,
  ),
  TASK2_INVENTORY,
);
export const TASK2_AUDITOR_ROW = TASK2_INVENTORY.functions.find(
  ({ name }) => name === "lawos-production-projection-auditor",
);
const TASK2_R0 = task2StateFromInventory(TASK2_INVENTORY);

export const DIAGNOSTIC_ZIP = Buffer.alloc(16, 0x31);
export const ROLLBACK_ZIP = Buffer.from(CODE_BYTES);
export const C0 = TASK2_R0.code_sha256_base64;
export const C1 = b64(HB(DIAGNOSTIC_ZIP));
const TASK2_R1 = task2ProjectedCodeState({
  revisionId: "R1",
  codeSha256Base64: C1,
  codeSize: DIAGNOSTIC_ZIP.byteLength,
});

export const FCFG = TASK2_R0.non_code_configuration_fingerprint_sha256;
export const F0 = TASK2_R0.configuration_fingerprint_sha256;
export const F1 = TASK2_R1.configuration_fingerprint_sha256;
export const TASK2_INVENTORY_BINDING = Object.freeze({
  schema_version: TASK2_INVENTORY.schema_version,
  inventory_sha256: TASK2_INVENTORY.inventory_sha256,
  observed_at: TASK2_INVENTORY.observed_at,
  projection_auditor_row_sha256: task2Sha256(
    task2CanonicalJson(TASK2_AUDITOR_ROW),
  ),
});

export function liveCatalog(ready = true) {
  const migrations = [{ id: "001_fixture", checksum: H("migration") }];
  return {
    schema_version: "law-firm-os.postgres-migration-catalog-readback.v1",
    migrations,
    migration_count: 1,
    catalog_sha256: H(JSON.stringify([
      { checksum: H("migration"), id: "001_fixture" },
    ])),
    tenant_context_authority_ready: ready,
  };
}

export function state(
  revision,
  code,
  full,
  nonCode = FCFG,
  raw,
) {
  const exact = structuredClone(code === C0 ? TASK2_R0 : TASK2_R1);
  exact.revision_id = revision;
  exact.configuration_fingerprint_sha256 = full;
  exact.non_code_configuration_fingerprint_sha256 = nonCode;
  if (raw !== undefined) exact.non_code_configuration = structuredClone(raw);
  return exact;
}
