export const STEP_UP_PROVIDER_CONTRACT_VERSION = "law-firm-os.step-up-provider.v1";

function text(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
}

export function createStepUpProviderInterface({ providerId, factors, verify, localInternal = false } = {}) {
  const provider_id = text(providerId, "step-up provider_id");
  const supported_factors = Object.freeze([...(factors ?? [])].map((factor) => text(factor, "step-up factor")));
  if (supported_factors.length === 0) throw new TypeError("at least one step-up factor is required");
  if (typeof verify !== "function") throw new TypeError("step-up provider verify is required");
  return Object.freeze({
    contract_version: STEP_UP_PROVIDER_CONTRACT_VERSION,
    provider_id,
    supported_factors,
    local_internal: localInternal === true,
    production_provider_claim: false,
    async verify(input = {}) {
      const factor = text(input.factor, "step-up factor");
      if (!supported_factors.includes(factor)) {
        return Object.freeze({ ok: false, reason: "step_up_factor_unsupported", provider_id, factor });
      }
      let result;
      try {
        result = await verify(Object.freeze({ ...input, factor }));
      } catch {
        result = null;
      }
      return Object.freeze({
        ok: result?.ok === true,
        reason: result?.ok === true ? null : "step_up_verification_failed",
        provider_id,
        factor,
        assertion_id: result?.ok === true ? text(result.assertion_id, "step-up assertion_id") : null,
        production_provider_claim: false,
      });
    },
  });
}

export function createLocalInternalStepUpProvider({ providerId = "lawos-local-internal-step-up", factors = ["totp"], verifyProof } = {}) {
  if (typeof verifyProof !== "function") throw new TypeError("local/internal step-up verifyProof is required; no default proof is available");
  return createStepUpProviderInterface({
    providerId,
    factors,
    localInternal: true,
    verify: verifyProof,
  });
}
