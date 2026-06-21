export function createLockedBreakGlassPlaceholder({ reason = "break_glass_owner_gate_required" } = {}) {
  return Object.freeze({
    enabled: false,
    locked: true,
    reason,
    owner_gate_required: true,
    runtime_use_allowed: false
  });
}

export function assertBreakGlassLocked(placeholder = createLockedBreakGlassPlaceholder()) {
  if (placeholder.locked !== true || placeholder.runtime_use_allowed !== false) {
    throw new Error("break-glass runtime use is locked before owner gate");
  }
  return true;
}
