import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_W15_COMPONENT_RECEIPTS,
  validateJsonPostgresProgramReceipt,
} from "../../packages/persistence/src/postgres/program-receipt.js";
import {
  createJsonPostgresW15ComponentReceipt,
  createJsonPostgresW15ComponentResult,
  jsonPostgresW15ComponentRule,
  validateJsonPostgresW15ComponentResult,
} from "../lib/json-postgres-w15-receipts.mjs";

const packet = {
  phase: "w15-relational-projection",
  source_sha: "1".repeat(40),
  source_tree: "2".repeat(40),
  packet_sha256: "3".repeat(64),
  bindings: {
    w12_terminal_receipt_sha256: "4".repeat(64),
    cut012_terminal_receipt_sha256: "5".repeat(64),
    go_live_receipt_sha256: "6".repeat(64),
  },
  target: {
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
  },
};
const commonZeroCounts = [
  "source_authority_write_count",
  "dual_write_count",
  "partial_commit_count",
  "tenant_negative_visible_count",
  "raw_value_count",
];

function resultFor(kind) {
  const rule = jsonPostgresW15ComponentRule(kind);
  return createJsonPostgresW15ComponentResult({
    kind,
    packet,
    checks: Object.fromEntries(rule.checks.map((key) => [key, true])),
    safeCounts: Object.fromEntries(
      [...new Set([...commonZeroCounts, ...rule.zeroCounts])]
        .map((key) => [key, 0]),
    ),
    evidenceSha256: "7".repeat(64),
    startedAt: "2026-07-25T00:00:00.000Z",
    finishedAt: "2026-07-25T00:00:01.000Z",
  });
}

test("all 16 W15 component results project into complete safe receipts", () => {
  let predecessor = null;
  for (const [index, kind] of JSON_POSTGRES_W15_COMPONENT_RECEIPTS.entries()) {
    const result = resultFor(kind);
    assert.equal(
      validateJsonPostgresW15ComponentResult(result, { packet }).valid,
      true,
    );
    const predecessors = index === 0
      ? [
        { receipt_kind: "w12-terminal", canonical_sha256: "4".repeat(64) },
        { receipt_kind: "cut-012", canonical_sha256: "5".repeat(64) },
        { receipt_kind: "go-live", canonical_sha256: "6".repeat(64) },
      ]
      : [predecessor];
    const receipt = createJsonPostgresW15ComponentReceipt({
      packet,
      result,
      predecessors,
      receiptId: `w15-component-${String(index + 1).padStart(2, "0")}`,
      signerKeyId: "owner-local-ed25519",
      command: `node scripts/prepare-json-postgres-w15-component-receipt.mjs --kind ${kind}`,
    });
    predecessor = validateJsonPostgresProgramReceipt(receipt, {
      sourceSha: packet.source_sha,
      sourceTree: packet.source_tree,
      packetSha256: packet.packet_sha256,
    });
    assert.equal(predecessor.receipt_kind, kind);
    assert.equal(receipt.claims.json_authority_disabled, true);
    assert.equal(receipt.claims.production_write, false);
  }
});

test("W15 component evidence fails closed on a missing check or nonzero gate", () => {
  const kind = "w15-mapping-contract";
  const rule = jsonPostgresW15ComponentRule(kind);
  assert.throws(() => createJsonPostgresW15ComponentResult({
    kind,
    packet,
    checks: Object.fromEntries(rule.checks.slice(1).map((key) => [key, true])),
    safeCounts: Object.fromEntries(
      [...new Set([...commonZeroCounts, ...rule.zeroCounts])]
        .map((key) => [key, 0]),
    ),
    evidenceSha256: "7".repeat(64),
    startedAt: "2026-07-25T00:00:00.000Z",
    finishedAt: "2026-07-25T00:00:01.000Z",
  }), /checks are incomplete/u);

  const safeCounts = Object.fromEntries(
    [...new Set([...commonZeroCounts, ...rule.zeroCounts])]
      .map((key) => [key, key === "unmapped_nonnull_field_count" ? 1 : 0]),
  );
  assert.throws(() => createJsonPostgresW15ComponentResult({
    kind,
    packet,
    checks: Object.fromEntries(rule.checks.map((key) => [key, true])),
    safeCounts,
    evidenceSha256: "7".repeat(64),
    startedAt: "2026-07-25T00:00:00.000Z",
    finishedAt: "2026-07-25T00:00:01.000Z",
  }), /failed or unsafe counter/u);
});
