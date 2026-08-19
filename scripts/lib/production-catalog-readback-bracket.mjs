import { validateCatalogReadbackCatalogReceipt } from "../../packages/persistence/src/postgres/catalog-readback-receipts.js";
import { canonicalizeJson } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { task3Fail as fail } from "./production-catalog-readback-common.mjs";
import {
  createProductionCatalogReadbackExecutionReceipt,
  validateProductionCatalogReadbackExecutionReceipt,
} from "./production-catalog-readback-execution-receipt.mjs";
import { authorizeProductionCatalogReadbackExecution } from "./production-catalog-readback-execution-authorization.mjs";
import { createCatalogReadbackAwsTracker } from "./production-catalog-readback-aws-tracker.mjs";
import { recoverDiagnosticCodeState } from "./production-catalog-readback-recovery.mjs";
import {
  safeOperationCode,
  validateDiagnosticState,
  validatePreState,
  validateUpdateResult,
} from "./production-catalog-readback-state.mjs";
import { restoreCatalogReadbackDiagnostic } from "./production-catalog-readback-rollback.mjs";

export async function executeProductionCatalogReadbackBracket(input = {}, {
  aws: requestedAws,
  readInventoryEvidence,
  now,
  verifyExecutionAuthorization,
} = {}) {
  const authorized = await authorizeProductionCatalogReadbackExecution(input, {
    requestedAws,
    readInventoryEvidence,
    now,
    verifyExecutionAuthorization,
  });
  const {
    execution,
    packet,
    validatedPacket,
    preflightReceipt,
    invokeEvent,
    approvalBinding,
    lineage,
  } = authorized;
  const tracked = createCatalogReadbackAwsTracker(authorized.aws);
  const { aws, counts } = tracked;
  const identity = await aws.getCallerIdentity();
  if (identity?.account_id !== packet.target.aws_account
    || identity?.role !== "matter-prod-deploy-admin") {
    fail("TASK3_AWS_IDENTITY_DRIFT", "AWS caller identity drifted");
  }
  const pre = validatePreState(
    await aws.getFunctionState(packet.target.function_name),
    packet,
  );
  const rawNonCode = pre.non_code_configuration;
  let diagnostic = null;
  let restored = null;
  let catalogReceipt = null;
  let diagnosticDeployed = false;
  let diagnosticRevisionId = null;
  let noCodeChangeVerified = false;
  let codeStateUnknown = false;
  let rollbackAttempted = false;
  let operationError = null;
  let rollbackError = null;

  try {
    counts.update_function_code += 1;
    let candidateRevisionId = null;
    try {
      const rawUpdate = await aws.updateFunctionCode({
        function_name: packet.target.function_name,
        expected_revision_id: pre.revision_id,
        zip_bytes: execution.diagnosticZip,
        code_sha256_base64: packet.diagnostic_artifact.code_sha256_base64,
      });
      candidateRevisionId = typeof rawUpdate?.revision_id === "string"
        ? rawUpdate.revision_id
        : null;
      const update = validateUpdateResult(rawUpdate, "diagnostic code update");
      if (update.code_sha256_base64
          !== packet.diagnostic_artifact.code_sha256_base64
        || update.revision_id === pre.revision_id) {
        fail("TASK3_CODE_UPDATE_DRIFT", "diagnostic code update response drifted");
      }
      diagnosticRevisionId = update.revision_id;
      diagnosticDeployed = true;
    } catch (error) {
      const definitive = error?.code === "TASK3_CODE_UPDATE_REJECTED";
      const recovered = await recoverDiagnosticCodeState({
        readState: aws.readDiagnosticRecoveryState,
        packet,
        rawNonCode,
        mode: definitive ? "DEFINITIVE_REJECTION" : "AMBIGUOUS",
        expectedRevisionId: definitive ? null : candidateRevisionId,
      });
      operationError = error;
      if (recovered.kind === "DIAGNOSTIC") {
        diagnostic = recovered.observed;
        diagnosticRevisionId = recovered.observed.revision_id;
        diagnosticDeployed = true;
      } else if (recovered.kind === "NO_CODE_CHANGE") {
        noCodeChangeVerified = true;
      } else {
        codeStateUnknown = true;
      }
    }

    if (!operationError && !codeStateUnknown) {
      try {
        await aws.waitForFunctionActive(packet.target.function_name);
        diagnostic = validateDiagnosticState(
          await aws.getFunctionState(packet.target.function_name),
          packet,
          diagnosticRevisionId,
          rawNonCode,
        );
      } catch (error) {
        operationError = error;
        const recovered = await recoverDiagnosticCodeState({
          readState: aws.readDiagnosticRecoveryState,
          packet,
          rawNonCode,
          mode: "AMBIGUOUS",
          expectedRevisionId: diagnosticRevisionId,
        });
        if (recovered.kind === "DIAGNOSTIC") {
          diagnostic = recovered.observed;
        } else {
          diagnosticDeployed = false;
          codeStateUnknown = true;
        }
      }
    }
    if (!operationError && !codeStateUnknown) {
      counts.invoke_function += 1;
      catalogReceipt = validateCatalogReadbackCatalogReceipt(
        await aws.invokeFunction({
          function_name: packet.target.function_name,
          event: invokeEvent,
        }),
        {
          packetSha256: validatedPacket.packet_sha256,
          sourceSha: packet.source_sha,
          sourceTree: packet.source_tree,
          preflightReceiptSha256: preflightReceipt.receipt_sha256,
          packet,
          approval: approvalBinding,
        },
      );
      if (canonicalizeJson(catalogReceipt.lineage)
          !== canonicalizeJson(lineage)) {
        fail("TASK3_CATALOG_RECEIPT_DRIFT", "catalog receipt lineage drifted");
      }
    }
  } catch (error) {
    operationError = error;
  }

  if (diagnosticDeployed && diagnostic && !codeStateUnknown) {
    const rollbackResult = await restoreCatalogReadbackDiagnostic({
      aws,
      packet,
      rollbackZip: execution.rollbackZip,
      pre,
      diagnostic,
      diagnosticRevisionId,
      rawNonCode,
      counts,
    });
    restored = rollbackResult.restored;
    rollbackAttempted = rollbackResult.attempted;
    rollbackError = rollbackResult.error;
  }

  const receipt = (outcome, safeErrorCode, rollback) => {
    const created = createProductionCatalogReadbackExecutionReceipt({
      outcome,
      safeErrorCode,
      lineage,
      preflightReceiptSha256: preflightReceipt.receipt_sha256,
      catalogReceipt,
      counts,
      pre,
      diagnostic,
      restored,
      rollback,
    });
    return validateProductionCatalogReadbackExecutionReceipt(created, {
      packet,
      packetSha256: validatedPacket.packet_sha256,
      approval: approvalBinding,
    });
  };
  if (rollbackError) {
    return receipt("BLOCKED", "BLOCKED_ROLLBACK_FAILED", {
      policy_required: true,
      action_required: true,
      attempted: rollbackAttempted,
      status: "FAILED",
      restored_state_verified: false,
      diagnostic_may_remain: true,
    });
  }
  if (codeStateUnknown) {
    return receipt("BLOCKED", "CODE_STATE_UNKNOWN", {
      policy_required: true,
      action_required: true,
      attempted: false,
      status: "ROLLBACK_UNVERIFIED",
      restored_state_verified: false,
      diagnostic_may_remain: true,
    });
  }
  if (operationError) {
    const noCodeChange = !diagnosticDeployed && noCodeChangeVerified;
    return receipt("BLOCKED", safeOperationCode(
      operationError,
      "CATALOG_READBACK_EXECUTION_FAILED",
    ), {
      policy_required: true,
      action_required: !noCodeChange,
      attempted: rollbackAttempted,
      status: noCodeChange
        ? "NOT_REQUIRED_NO_CODE_CHANGE"
        : "VERIFIED_RESTORED",
      restored_state_verified: noCodeChange || Boolean(restored),
      diagnostic_may_remain: false,
    });
  }
  const rollback = {
    policy_required: true,
    action_required: true,
    attempted: true,
    status: "VERIFIED_RESTORED",
    restored_state_verified: true,
    diagnostic_may_remain: false,
  };
  if (catalogReceipt.catalog.tenant_context_authority_ready !== true) {
    return receipt(
      "BLOCKED",
      "CATALOG_READBACK_AUTHORITY_NOT_READY",
      rollback,
    );
  }
  return receipt("PASS", null, rollback);
}
