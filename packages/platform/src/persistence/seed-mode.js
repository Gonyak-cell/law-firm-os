export function assertRuntimeSeedAllowed({ mode = "test", production = false } = {}) {
  if (production && mode !== "disabled") {
    throw new Error("synthetic seed mode must be disabled for Matter-Vault R4 production mode");
  }
  return Object.freeze({ mode, production, seed_allowed: mode !== "disabled" });
}
