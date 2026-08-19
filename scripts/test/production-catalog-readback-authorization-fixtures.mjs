import {
  catalogReadbackBytesSha256,
} from "../../packages/persistence/src/postgres/catalog-readback-canonical.js";
import {
  catalogReadbackApprovalBinding,
  createCatalogReadbackLineage,
} from "../../packages/persistence/src/postgres/catalog-readback-lineage.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  HB,
} from "./production-catalog-readback-state-fixtures.mjs";

export const AUTHORIZATION = Object.freeze({
  trust_registry_json: canonicalizeJson({ fixture: "owner-registry" }),
  approval_receipt_json: canonicalizeJson({ fixture: "owner-receipt" }),
  approval_signature_base64: Buffer.alloc(64, 0x41).toString("base64"),
});
export const TASK3_FIXTURE_NOW = () => Date.parse(
  "2026-08-16T04:00:00.000Z",
);

export function approval(created) {
  return {
    valid: true,
    decision: "approved",
    approval_id: "task3-operator-approval",
    signed_at: "2026-08-16T04:00:00.000Z",
    expires_at: "2026-08-17T00:00:00.000Z",
    registry_sha256: HB(Buffer.from(AUTHORIZATION.trust_registry_json)),
    receipt_sha256: HB(Buffer.from(AUTHORIZATION.approval_receipt_json)),
    signature_sha256: catalogReadbackBytesSha256(Buffer.from(
      AUTHORIZATION.approval_signature_base64,
      "base64",
    )),
    packet_sha256: created.packet_sha256,
  };
}

export function lineage(created) {
  return createCatalogReadbackLineage({
    packet: created.packet,
    packetSha256: created.packet_sha256,
    approval: catalogReadbackApprovalBinding({
      approval: approval(created),
      authorization: AUTHORIZATION,
      packetSha256: created.packet_sha256,
    }),
  });
}
