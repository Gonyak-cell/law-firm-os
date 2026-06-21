import { requireAssurance } from "./assurance.js";

export function evaluateSensitivePolicyHooks({ principal = {}, resource = {} } = {}) {
  const classification = resource.data_classification ?? resource.classification ?? "internal";
  if (["privileged", "client-confidential"].includes(classification)) {
    const assurance = requireAssurance(principal, "mfa");
    if (!assurance.ok) return Object.freeze({ ok: false, effect: "deny", reason: "privileged_step_up_required", assurance });
  }
  if (classification === "hr-sensitive" && !(principal.scopes ?? []).includes("hr.read")) {
    return Object.freeze({ ok: false, effect: "deny", reason: "hr_sensitive_scope_required" });
  }
  return Object.freeze({ ok: true, classification });
}
