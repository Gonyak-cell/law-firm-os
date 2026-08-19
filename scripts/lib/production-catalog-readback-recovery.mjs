import {
  sameRawNonCode,
  validateDiagnosticState,
  validateRestoredState,
  validateState,
} from "./production-catalog-readback-state.mjs";

export const TASK3_RECOVERY_READ_LIMIT = 2;

export function exactCatalogReadbackPreState(state, packet, rawNonCode) {
  return state.revision_id === packet.pre_state.revision_id
    && state.code_sha256_base64 === packet.pre_state.code_sha256_base64
    && state.configuration_fingerprint_sha256
      === packet.pre_state.configuration_fingerprint_sha256
    && state.non_code_configuration_fingerprint_sha256
      === packet.pre_state.non_code_configuration_fingerprint_sha256
    && sameRawNonCode(state.non_code_configuration, rawNonCode);
}

function exactDiagnostic(observed, packet, rawNonCode, expectedRevisionId) {
  try {
    const diagnostic = validateDiagnosticState(
      observed,
      packet,
      observed.revision_id,
      rawNonCode,
    );
    return expectedRevisionId && diagnostic.revision_id !== expectedRevisionId
      ? null
      : diagnostic;
  } catch {
    return null;
  }
}

export async function recoverDiagnosticCodeState({
  readState,
  packet,
  rawNonCode,
  mode = "AMBIGUOUS",
  expectedRevisionId = null,
} = {}) {
  for (let attempt = 0; attempt < TASK3_RECOVERY_READ_LIMIT; attempt += 1) {
    let observed;
    try {
      observed = validateState(
        await readState(),
        "diagnostic recovery state",
      );
    } catch {
      continue;
    }
    if (mode === "DEFINITIVE_REJECTION"
      && exactCatalogReadbackPreState(observed, packet, rawNonCode)) {
      return Object.freeze({ kind: "NO_CODE_CHANGE", observed });
    }
    const diagnostic = mode === "AMBIGUOUS"
      ? exactDiagnostic(
        observed,
        packet,
        rawNonCode,
        expectedRevisionId,
      )
      : null;
    if (diagnostic) {
      return Object.freeze({ kind: "DIAGNOSTIC", observed: diagnostic });
    }
    if (mode === "AMBIGUOUS"
      && exactCatalogReadbackPreState(observed, packet, rawNonCode)) {
      continue;
    }
    return Object.freeze({ kind: "CODE_STATE_UNKNOWN", observed: null });
  }
  return Object.freeze({ kind: "CODE_STATE_UNKNOWN", observed: null });
}

export async function recoverRestoredCodeState({
  readState,
  packet,
  diagnosticRevisionId,
  rawNonCode,
} = {}) {
  for (let attempt = 0; attempt < TASK3_RECOVERY_READ_LIMIT; attempt += 1) {
    let observed;
    try {
      observed = validateState(
        await readState(),
        "rollback recovery state",
      );
    } catch {
      continue;
    }
    try {
      return validateRestoredState(
        observed,
        packet,
        diagnosticRevisionId,
        observed.revision_id,
        rawNonCode,
      );
    } catch {
      if (observed.revision_id === diagnosticRevisionId
        && observed.code_sha256_base64
          === packet.diagnostic_artifact.code_sha256_base64) {
        continue;
      }
      return null;
    }
  }
  return null;
}
