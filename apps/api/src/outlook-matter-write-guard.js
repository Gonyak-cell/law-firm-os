export const OUTLOOK_WRITABLE_MATTER_STATUSES = Object.freeze([
  "open",
  "opening",
  "paused",
]);

const WRITABLE_STATUSES = new Set(OUTLOOK_WRITABLE_MATTER_STATUSES);

export function revalidateOutlookMatterWrite({
  tenantId,
  matterId,
  getMatter,
  authorize,
} = {}) {
  if (typeof getMatter !== "function") throw new TypeError("getMatter is required");
  if (typeof authorize !== "function") throw new TypeError("authorize is required");
  const matter = getMatter({ tenantId, matterId }) ?? null;
  if (!matter) {
    return Object.freeze({ outcome: "matter_not_found", matter: null, decision: null });
  }
  if (!WRITABLE_STATUSES.has(matter.status)) {
    return Object.freeze({ outcome: "matter_inactive", matter, decision: null });
  }
  const decision = authorize({ tenantId, matterId, matter });
  if (decision?.effect !== "allow") {
    return Object.freeze({ outcome: "permission_changed", matter, decision });
  }
  return Object.freeze({ outcome: "allowed", matter, decision });
}
