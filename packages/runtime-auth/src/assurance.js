export const AUTH_ASSURANCE_ORDER = Object.freeze({
  anonymous: 0,
  password: 1,
  mfa: 2,
  admin_step_up: 3
});

export function requireAssurance(principal = {}, minimum = "password") {
  const actual = AUTH_ASSURANCE_ORDER[principal.assurance_level ?? "anonymous"] ?? 0;
  const required = AUTH_ASSURANCE_ORDER[minimum] ?? 0;
  if (actual < required) {
    return Object.freeze({
      ok: false,
      reason: "step_up_required",
      required_assurance: minimum,
      actual_assurance: principal.assurance_level ?? "anonymous"
    });
  }
  return Object.freeze({ ok: true, assurance_level: principal.assurance_level });
}
