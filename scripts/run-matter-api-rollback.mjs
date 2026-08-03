#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import {
  assertMatterRollbackProfile,
  buildMatterRollbackDryRunApiPlan,
  emitMatterRollbackFailure,
  parseMatterRollbackOptions,
  readMatterRollbackPacketLive,
  resolveApprovedMatterRollbackAdapter,
  resolvePrivateOutputPath,
  validateMatterRollbackApproval,
  validateMatterRollbackExecutionCheckpoint,
  writePrivateJson,
} from "./lib/matter-rollback-contract.mjs";
import {
  buildMatterRollbackPartialReceipt,
  importApprovedMatterRollbackAdapter,
  normalizeMatterRollbackAdapterResult,
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
      "--mode", "--profile", "--packet", "--approval-receipt", "--approval-signature", "--adapter",
      "--adapter-module", "--receipt", "--execution-checkpoint-receipt", "--execution-checkpoint-signature",
      "--run-id", "--invocation-id", "--generated-at",
    ],
    defaults: { mode: "plan", adapter: "dry-run" },
  });
  if (!new Set(["plan", "execute"]).has(options.mode) || !new Set(["dry-run", "real"]).has(options.adapter)) {
    throw Object.assign(new Error("rollback mode or adapter invalid"), { code: "MATTER_ROLLBACK_ARGUMENT" });
  }
  const packetRef = readMatterRollbackPacketLive(required(options, "packet"));
  const { packet } = packetRef;
  const profile = assertMatterRollbackProfile(packet, required(options, "profile"));
  const approvalReceiptPath = required(options, "approval-receipt");
  const approval = validateMatterRollbackApproval({
    packet,
    receiptPath: approvalReceiptPath,
    signaturePath: options["approval-signature"] ?? `${approvalReceiptPath}.sig`,
  });

  if (options.mode === "plan") {
    if (options.adapter !== "dry-run" || options["adapter-module"] || options.receipt
      || options["execution-checkpoint-receipt"] || options["run-id"] || options["invocation-id"]) {
      throw Object.assign(new Error("plan mode is packet-only and read-only"), { code: "MATTER_ROLLBACK_ARGUMENT" });
    }
    process.stdout.write(`${JSON.stringify({
      verdict: "TEST_ONLY",
      authoritative: false,
      mode: "plan",
      environment: packet.environment,
      packet_id: packet.packet_id,
      packet_sha256: packet.packet_sha256,
      approval_id: approval.approval_id,
      approved_plan_sha256: packet.execution_boundary.approved_api_plan_sha256,
      plan: buildMatterRollbackDryRunApiPlan(packet),
      external_mutation_count: 0,
      production_rollback_claim: false,
    }, null, 2)}\n`);
  } else if (options.adapter === "dry-run") {
    if (options["adapter-module"] || options.receipt || options["execution-checkpoint-receipt"]
      || options["run-id"] || options["invocation-id"]) {
      throw Object.assign(new Error("dry-run arguments exceed the non-mutation boundary"), { code: "MATTER_ROLLBACK_ARGUMENT" });
    }
    process.stdout.write(`${JSON.stringify({
      verdict: "TEST_ONLY",
      authoritative: false,
      mode: "execute",
      adapter: "dry-run",
      packet_id: packet.packet_id,
      packet_sha256: packet.packet_sha256,
      receipt_written: false,
      external_mutation_count: 0,
      production_rollback_claim: false,
    }, null, 2)}\n`);
  } else {
    const checkpointReceiptPath = required(options, "execution-checkpoint-receipt");
    const executionCheckpoint = validateMatterRollbackExecutionCheckpoint({
      packet,
      receiptPath: checkpointReceiptPath,
      signaturePath: options["execution-checkpoint-signature"] ?? `${checkpointReceiptPath}.sig`,
    });
    const adapterPath = required(options, "adapter-module");
    const approved = resolveApprovedMatterRollbackAdapter(packet, "api", adapterPath);
    const receiptPath = resolvePrivateOutputPath(options.receipt ?? defaultReceiptPath(packetRef.path));
    const runId = options["run-id"] ?? `run-${randomUUID()}`;
    const invocationId = options["invocation-id"] ?? `api-${randomUUID()}`;
    const startedAt = new Date().toISOString();
    mutation.adapter_started = true;
    const { execute } = await importApprovedMatterRollbackAdapter(packet, "api", approved.path);
    const adapterResult = await execute({
      packet,
      profile,
      invocation: { surface: "api", run_id: runId, invocation_id: invocationId, started_at: startedAt },
    });
    const now = Date.now();
    const apiExecution = normalizeMatterRollbackAdapterResult(adapterResult, {
      packet,
      surface: "api",
      runId,
      invocationId,
      invocationStartedAt: startedAt,
      adapterSha256: approved.sha256,
      now,
    });
    const receipt = buildMatterRollbackPartialReceipt({
      packetRef,
      approval,
      executionCheckpoint,
      apiExecution,
      generatedAt: options["generated-at"] ?? new Date(now).toISOString(),
    });
    writePrivateJson(receiptPath, receipt);
    process.stdout.write(`${JSON.stringify({
      verdict: "API_ATTESTED",
      authoritative: false,
      next_gate: "DESKTOP_ATTESTATION_AND_FINAL_SEAL_REQUIRED",
      packet_id: packet.packet_id,
      packet_sha256: packet.packet_sha256,
      run_id: runId,
      adapter_invocation_count: 1,
      adapter_sha256: approved.sha256,
      receipt_path: receiptPath,
      api_sequence: "A->B->A",
      external_mutation_state: "completed",
      data_rollback_write_count: 0,
      production_rollback_claim: false,
    }, null, 2)}\n`);
  }
} catch (error) {
  emitMatterRollbackFailure(error, mutation);
  process.exitCode = 1;
}
