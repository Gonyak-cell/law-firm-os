#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assertMatterRollbackProfile,
  emitMatterRollbackFailure,
  parseMatterRollbackOptions,
  readMatterRollbackPacketLive,
  resolveApprovedMatterRollbackAdapter,
  resolvePrivateOutputPath,
  sha256Bytes,
  writePrivateJson,
} from "./lib/matter-rollback-contract.mjs";
import {
  attachMatterRollbackDesktopReceipt,
  importApprovedMatterRollbackAdapter,
  normalizeMatterRollbackAdapterResult,
  readPrivateJson,
  validateEmptyIsolatedDirectory,
  validateMatterRollbackPartialReceipt,
} from "./lib/matter-rollback-execution-evidence.mjs";

function required(options, name) {
  if (!options[name]) throw Object.assign(new Error("required rollback argument missing"), { code: "MATTER_ROLLBACK_ARGUMENT" });
  return options[name];
}

function defaultReceiptPath(packetPath) {
  return packetPath.endsWith(".json") ? `${packetPath.slice(0, -5)}.rollback-receipt.json` : `${packetPath}.rollback-receipt.json`;
}

const mutation = { adapter_started: false };

try {
  const options = parseMatterRollbackOptions(process.argv.slice(2), {
    allowed: [
      "--platform", "--profile", "--packet", "--isolated-user-data", "--adapter", "--adapter-module",
      "--receipt", "--invocation-id", "--generated-at",
    ],
    defaults: { platform: "macos", adapter: "dry-run" },
  });
  if (options.platform !== "macos" || !new Set(["dry-run", "real"]).has(options.adapter)) {
    throw Object.assign(new Error("desktop rollback platform or adapter invalid"), { code: "MATTER_ROLLBACK_ARGUMENT" });
  }
  const packetRef = readMatterRollbackPacketLive(required(options, "packet"));
  const { packet } = packetRef;
  const profile = assertMatterRollbackProfile(packet, required(options, "profile"));
  const isolatedUserData = validateEmptyIsolatedDirectory(required(options, "isolated-user-data"));

  if (options.adapter === "dry-run") {
    if (options["adapter-module"] || options.receipt || options["invocation-id"]) {
      throw Object.assign(new Error("dry-run arguments exceed the non-mutation boundary"), { code: "MATTER_ROLLBACK_ARGUMENT" });
    }
    process.stdout.write(`${JSON.stringify({
      verdict: "TEST_ONLY",
      authoritative: false,
      adapter: "dry-run",
      platform: "macos",
      packet_id: packet.packet_id,
      packet_sha256: packet.packet_sha256,
      isolated_user_data_empty: true,
      receipt_written: false,
      external_mutation_count: 0,
      production_rollback_claim: false,
    }, null, 2)}\n`);
  } else {
    const receiptPath = resolvePrivateOutputPath(options.receipt ?? defaultReceiptPath(packetRef.path), { mustExist: true });
    const partial = readPrivateJson(receiptPath, "partial rollback receipt").value;
    const partialValidation = validateMatterRollbackPartialReceipt(partial, { packetRef });
    const adapterPath = required(options, "adapter-module");
    const approved = resolveApprovedMatterRollbackAdapter(packet, "desktop", adapterPath);
    const invocationId = options["invocation-id"] ?? `desktop-${randomUUID()}`;
    const startedAt = new Date().toISOString();
    mutation.adapter_started = true;
    const { execute } = await importApprovedMatterRollbackAdapter(packet, "desktop", approved.path);
    const adapterResult = await execute({
      packet,
      platform: "macos",
      profile,
      isolatedUserData,
      invocation: { surface: "desktop", run_id: partial.run_id, invocation_id: invocationId, started_at: startedAt },
    });
    const now = Date.now();
    const desktopExecution = normalizeMatterRollbackAdapterResult(adapterResult, {
      packet,
      surface: "desktop",
      runId: partial.run_id,
      invocationId,
      invocationStartedAt: startedAt,
      adapterSha256: approved.sha256,
      now,
    });
    const isolatedHash = sha256Bytes(isolatedUserData);
    for (const step of desktopExecution.steps) {
      const raw = JSON.parse(readFileSync(step.receipt.path, "utf8"));
      if (raw.checks.isolated_user_data_path_sha256 !== isolatedHash) {
        throw Object.assign(new Error("isolated path binding mismatch"), { code: "MATTER_ROLLBACK_ISOLATED_DIRECTORY" });
      }
    }
    const finalReceipt = attachMatterRollbackDesktopReceipt(partial, {
      packetRef,
      desktopExecution,
      generatedAt: options["generated-at"] ?? new Date(now).toISOString(),
      now,
    });
    writePrivateJson(receiptPath, finalReceipt, { replace: true });
    process.stdout.write(`${JSON.stringify({
      verdict: "SEAL_REQUIRED",
      authoritative: false,
      next_gate: "INDEPENDENT_FINAL_SEAL_AND_ONE_TIME_VALIDATION_REQUIRED",
      packet_id: packet.packet_id,
      packet_sha256: packet.packet_sha256,
      run_id: partialValidation.api.run_id,
      adapter_invocation_count: 2,
      adapter_sha256: approved.sha256,
      receipt_path: receiptPath,
      receipt_canonical_digest: finalReceipt.canonical_digest,
      desktop_sequence: "B->A",
      external_mutation_state: "completed",
      data_rollback_write_count: 0,
      production_rollback_claim: false,
    }, null, 2)}\n`);
  }
} catch (error) {
  emitMatterRollbackFailure(error, mutation);
  process.exitCode = 1;
}
