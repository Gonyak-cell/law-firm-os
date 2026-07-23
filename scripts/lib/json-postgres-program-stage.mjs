import {
  validateJsonPostgresProgramStage,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";
import {
  JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
  jsonPostgresProgramReceiptMetadata,
  validateJsonPostgresProgramReceipt,
} from "./json-postgres-program-receipt.mjs";

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

export function createJsonPostgresProgramStageReceipt({
  stage,
  packet,
  observed,
  predecessors,
  receiptId,
  signerKeyId,
  startedAt,
  finishedAt,
  command,
} = {}) {
  const result = validateJsonPostgresProgramStage({
    stage,
    packet,
    observed,
    predecessors,
  });
  const metadata = jsonPostgresProgramReceiptMetadata(stage);
  const receipt = {
    schema_version: JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
    receipt_id: requiredText(receiptId, "receiptId"),
    receipt_kind: stage,
    phase: metadata.phase,
    environment: metadata.environment,
    profile: metadata.profile,
    signer_key_id: requiredText(signerKeyId, "signerKeyId"),
    execution_state: "PASS",
    source_sha: result.source_sha,
    source_tree: result.source_tree,
    packet_sha256: result.packet_sha256,
    bindings_sha256: result.bindings_sha256,
    started_at: requiredText(startedAt, "startedAt"),
    finished_at: requiredText(finishedAt, "finishedAt"),
    command: requiredText(command, "command"),
    exit_code: 0,
    predecessor_receipt_sha256: [...result.predecessor_receipt_sha256],
    result_sha256: result.result_sha256,
    safe_counts: { ...result.safe_counts },
    claims: { ...result.claims },
  };
  validateJsonPostgresProgramReceipt(receipt, {
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: result.bindings_sha256,
  });
  return Object.freeze({
    result,
    receipt: Object.freeze(receipt),
  });
}
