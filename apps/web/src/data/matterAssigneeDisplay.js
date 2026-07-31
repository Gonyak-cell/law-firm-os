const OPAQUE_ASSIGNEE_REFERENCE = /(?:^|[\s([{])(?:(?:iam[-_]?user)|(?:azure[-_]?ad|aad|object|oid)|(?:user|employee|emp|member|account|acct|principal|identity|login))(?:[_:-][a-z0-9._:-]+)(?=$|[\s)\]},.!?])/i;
const UUID_REFERENCE = /(?:^|[^0-9a-f])[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=$|[^0-9a-f])/i;

export const UNKNOWN_ASSIGNEE_DISPLAY_NAME = "담당자 이름 확인 필요";

function safeDisplayText(value, references = []) {
  const text = String(value ?? "").trim();
  const normalized = text.toLowerCase();
  const matchesReference = references.some((reference) => {
    const normalizedReference = String(reference ?? "").trim().toLowerCase();
    if (!normalizedReference) return false;
    if (normalized === normalizedReference) return true;
    const escapedReference = normalizedReference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escapedReference}(?=$|[^a-z0-9])`, "i").test(normalized);
  });
  if (!text || matchesReference || OPAQUE_ASSIGNEE_REFERENCE.test(text) || UUID_REFERENCE.test(text) || text.includes("@")) return "";
  return text;
}

function memberRoleLabel(member) {
  const identityReferences = [member?.user_id, member?.employee_id, member?.member_id];
  if (member?.role === "responsible_attorney") {
    return safeDisplayText(member?.title ?? member?.job_title ?? member?.position, identityReferences) || "책임 변호사";
  }
  return safeDisplayText(member?.title ?? member?.job_title ?? member?.position, identityReferences) || "Matter 구성원";
}

function activeAssigneeMember(member) {
  if (member?.assignment_eligible !== true) return false;
  if (member?.status !== "active" || member?.identity_resolution_state !== "resolved") return false;
  const now = Date.now();
  const validFrom = member?.valid_from ? Date.parse(member.valid_from) : null;
  const validTo = member?.valid_to ? Date.parse(member.valid_to) : null;
  if (member?.valid_from && !Number.isFinite(validFrom)) return false;
  if (member?.valid_to && !Number.isFinite(validTo)) return false;
  if (Number.isFinite(validFrom) && validFrom > now) return false;
  if (Number.isFinite(validTo) && validTo < now) return false;
  return true;
}

/**
 * Builds the visible task-assignee choices while keeping the authoritative
 * user_id in `userId` for the write payload. Raw identity references are
 * deliberately never used as visible text.
 */
export function buildMatterTaskAssigneeOptions(commandResult, matter) {
  const team = commandResult?.kind === "data" && Array.isArray(commandResult.team)
    ? commandResult.team
    : [];
  const eligibleTeam = team.filter(activeAssigneeMember);
  const membersByUserId = new Map(
    eligibleTeam
      .filter((member) => member?.user_id)
      .map((member) => [String(member.user_id).trim(), member]),
  );
  const options = new Map();
  const ownerUserId = String(matter?.owner_user_id ?? "").trim();
  const ownerMember = ownerUserId ? membersByUserId.get(ownerUserId) : null;

  if (ownerUserId && ownerMember) {
    options.set(ownerUserId, {
      userId: ownerUserId,
      displayName: safeDisplayText(ownerMember?.display_name, [ownerUserId, ownerMember?.employee_id, ownerMember?.member_id])
        || UNKNOWN_ASSIGNEE_DISPLAY_NAME,
      roleLabel: memberRoleLabel({
        ...ownerMember,
        role: ownerMember?.role ?? "responsible_attorney",
      }),
    });
  }

  for (const member of eligibleTeam) {
    const userId = String(member?.user_id ?? "").trim();
    if (!userId || member?.status !== "active" || options.has(userId)) continue;
    options.set(userId, {
      userId,
      displayName: safeDisplayText(member?.display_name, [member?.user_id, member?.employee_id, member?.member_id]) || UNKNOWN_ASSIGNEE_DISPLAY_NAME,
      roleLabel: memberRoleLabel(member),
    });
  }

  const baseCounts = new Map();
  for (const option of options.values()) {
    const key = `${option.displayName}\u0000${option.roleLabel}`;
    baseCounts.set(key, (baseCounts.get(key) ?? 0) + 1);
  }
  const duplicateIndexes = new Map();
  return [...options.values()].map((option) => {
    const key = `${option.displayName}\u0000${option.roleLabel}`;
    if ((baseCounts.get(key) ?? 0) < 2) {
      return { userId: option.userId, label: option.displayName, roleLabel: option.roleLabel };
    }
    const duplicateIndex = (duplicateIndexes.get(key) ?? 0) + 1;
    duplicateIndexes.set(key, duplicateIndex);
    return {
      userId: option.userId,
      label: option.displayName,
      roleLabel: `${option.roleLabel} · 동명이인 ${duplicateIndex}`,
    };
  });
}
