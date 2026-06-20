export const DEFAULT_MINIMIZED_FIELDS = Object.freeze(["secret", "token", "password", "raw_payload", "customer_payload"]);

export function minimizeForPrivacy(record = {}, fields = DEFAULT_MINIMIZED_FIELDS) {
  const minimized = {};
  for (const [key, value] of Object.entries(record)) {
    minimized[key] = fields.includes(key) ? "[omitted]" : value;
  }
  return Object.freeze({ ...minimized, privacy_minimized: true, production_ready_claim: false });
}
