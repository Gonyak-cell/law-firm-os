import {
  task3Fail as fail,
} from "./production-catalog-readback-common.mjs";
import {
  recoverRestoredCodeState,
} from "./production-catalog-readback-recovery.mjs";
import {
  validateRestoredState,
  validateUpdateResult,
} from "./production-catalog-readback-state.mjs";

export async function restoreCatalogReadbackDiagnostic({
  aws,
  packet,
  rollbackZip,
  pre,
  diagnostic,
  diagnosticRevisionId,
  rawNonCode,
  counts,
} = {}) {
  let restored = null;
  let attempted = false;
  try {
    if (!diagnostic || !diagnosticRevisionId
      || diagnostic.revision_id !== diagnosticRevisionId
      || diagnostic.code_sha256_base64
        !== packet.diagnostic_artifact.code_sha256_base64) {
      fail(
        "TASK3_ROLLBACK_REVISION_UNKNOWN",
        "exact diagnostic rollback state is unavailable",
      );
    }
    counts.update_function_code += 1;
    attempted = true;
    let rollback = null;
    let updateError = null;
    try {
      rollback = validateUpdateResult(await aws.updateFunctionCode({
        function_name: packet.target.function_name,
        expected_revision_id: diagnosticRevisionId,
        zip_bytes: rollbackZip,
        code_sha256_base64: packet.rollback_artifact.code_sha256_base64,
      }), "rollback code update");
      if (rollback.code_sha256_base64
          !== packet.pre_state.code_sha256_base64
        || new Set([
          pre.revision_id,
          diagnosticRevisionId,
          rollback.revision_id,
        ]).size !== 3) {
        fail(
          "TASK3_ROLLBACK_UPDATE_DRIFT",
          "rollback code update response drifted",
        );
      }
    } catch (error) {
      updateError = error;
    }

    if (rollback) {
      try {
        await aws.waitForFunctionActive(packet.target.function_name);
        restored = validateRestoredState(
          await aws.getFunctionState(packet.target.function_name),
          packet,
          diagnosticRevisionId,
          rollback.revision_id,
          rawNonCode,
        );
      } catch (error) {
        updateError = error;
      }
    } else {
      try {
        await aws.waitForFunctionActive(packet.target.function_name);
      } catch (error) {
        updateError ??= error;
      }
    }
    if (!restored) {
      restored = await recoverRestoredCodeState({
        readState: aws.readRollbackRecoveryState,
        packet,
        diagnosticRevisionId,
        rawNonCode,
      });
    }
    if (!restored) throw updateError ?? new Error("rollback is unverified");
    return Object.freeze({
      restored,
      diagnostic,
      diagnosticRevisionId,
      attempted,
      error: null,
    });
  } catch (error) {
    return Object.freeze({
      restored,
      diagnostic,
      diagnosticRevisionId,
      attempted,
      error,
    });
  }
}
