export function createSafeErrorEnvelope({ request_id, safe_error_codes = [], status = 400, audit_hint_ref = null } = {}) {
  return Object.freeze({
    status,
    body: Object.freeze({
      request_id,
      outcome: "blocked",
      items: [],
      safe_error_codes,
      audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    }),
  });
}
