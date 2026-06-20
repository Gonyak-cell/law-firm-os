const BLOCKED_MODEL_REQUEST_FIELDS = Object.freeze(["employee_salary", "document_body", "raw_hr_payload", "client_secret"]);

function rejectBlockedFields(input = {}) {
  for (const field of BLOCKED_MODEL_REQUEST_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`HRX model gateway request must not include ${field}`);
  }
}

function disabled(reason = "hrx_model_gateway_disabled") {
  return Object.freeze({
    status: "blocked",
    safe_error_code: "HRX_MODEL_GATEWAY_DISABLED",
    reason,
    external_call_made: false,
  });
}

export function createHrxModelGateway({ enabled = false, provider, model = "disabled" } = {}) {
  return Object.freeze({
    async complete(request = {}) {
      rejectBlockedFields(request);
      if (enabled !== true) return disabled();
      if (!provider || typeof provider.complete !== "function") return disabled("hrx_model_gateway_provider_missing");
      const result = await provider.complete({
        model,
        prompt_context: request.prompt_context ?? null,
        question: request.question ?? null,
      });
      return Object.freeze({
        status: "completed",
        model,
        external_call_made: true,
        output: result?.output ?? result?.answer ?? null,
        provider_metadata: Object.freeze({ ...(result?.provider_metadata ?? {}) }),
      });
    },
  });
}

export function assertHrxModelGatewayDisabledByDefault(gateway = createHrxModelGateway()) {
  if (!gateway || typeof gateway.complete !== "function") throw new TypeError("HRX model gateway complete port is required");
  return true;
}
