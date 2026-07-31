function validAsOf(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError("as_of must be an ISO timestamp");
  }
  return Date.parse(value);
}

function isCurrent(member, asOf) {
  if (member.status !== "active" || member.role !== "responsible_attorney") return false;
  if (typeof member.employee_id !== "string" || !member.employee_id.trim()) return false;
  if (member.valid_from && Date.parse(member.valid_from) > asOf) return false;
  if (member.valid_to && Date.parse(member.valid_to) < asOf) return false;
  return true;
}

export function selectCurrentPeopleAttorneyAssignments({
  tenant_id,
  as_of,
  members = [],
  verified_legacy_member_ids = [],
} = {}) {
  const asOf = validAsOf(as_of);
  const verifiedLegacy = new Set(verified_legacy_member_ids);
  return Object.freeze(
    (Array.isArray(members) ? members : [])
      .filter((member) => member?.tenant_id === tenant_id)
      .filter((member) => (
        (member.identity_resolution_state === "resolved" && Boolean(member.valid_from))
        || (
          member.identity_resolution_state == null
          && member.valid_from == null
          && verifiedLegacy.has(member.member_id)
        )
      ))
      .filter((member) => isCurrent(member, asOf))
      .sort((left, right) => left.member_id.localeCompare(right.member_id))
      .map((member) => Object.freeze({ ...member })),
  );
}

function legacySelection({ tenant_id, members = [] }) {
  return (Array.isArray(members) ? members : [])
    .filter((member) => member?.tenant_id === tenant_id)
    .filter((member) => (
      member.status === "active"
      && member.role === "responsible_attorney"
      && typeof member.employee_id === "string"
      && member.employee_id.trim()
    ));
}

export function comparePeopleMemberDualRead({
  tenant_id,
  as_of,
  legacy_members = [],
  new_members = [],
} = {}) {
  const legacy = legacySelection({ tenant_id, members: legacy_members });
  const next = selectCurrentPeopleAttorneyAssignments({ tenant_id, as_of, members: new_members });
  const legacyIds = new Set(legacy.map(({ member_id }) => member_id));
  const nextIds = new Set(next.map(({ member_id }) => member_id));
  const mismatches = [...new Set([
    ...[...legacyIds].filter((id) => !nextIds.has(id)),
    ...[...nextIds].filter((id) => !legacyIds.has(id)),
  ])].sort();
  return Object.freeze({
    legacy_count: legacy.length,
    new_count: next.length,
    mismatch_count: mismatches.length,
    mismatch_member_ids: Object.freeze(mismatches),
  });
}
