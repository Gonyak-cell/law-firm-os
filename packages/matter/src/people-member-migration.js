import { createHash } from "node:crypto";
import { resolveUniqueEmployeeUserLink } from "../../hrx/src/identity-link.js";

const MIGRATION_FIELDS = new Set([
  "valid_from",
  "valid_to",
  "identity_resolution_state",
  "source_record_hash",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function sourceHash(member) {
  if (member.source_record_hash) return member.source_record_hash;
  const source = Object.fromEntries(
    Object.entries(member).filter(([field]) => !MIGRATION_FIELDS.has(field)),
  );
  return `sha256:${createHash("sha256").update(JSON.stringify(stable(source))).digest("hex")}`;
}

function assignmentStartedAt(member, auditEvents) {
  return auditEvents
    .filter((event) => (
      event?.tenant_id === member.tenant_id
      && event?.object_id === member.member_id
      && event?.action === "matter.team.member.add"
      && Number.isFinite(Date.parse(event.occurred_at))
    ))
    .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at))[0]?.occurred_at ?? null;
}

function normalizedIsoDate(value, field) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`MatterMember migration ${field} must be an ISO date`);
  }
  return value;
}

function validPeriod(member) {
  const validFrom = normalizedIsoDate(member?.valid_from, "valid_from");
  const validTo = normalizedIsoDate(member?.valid_to, "valid_to");
  if (validFrom && validTo && Date.parse(validTo) < Date.parse(validFrom)) {
    throw new TypeError("MatterMember migration valid_to must be on or after valid_from");
  }
  return { validFrom, validTo };
}

export function backfillPeopleMatterMembers({
  tenant_id,
  members = [],
  employee_user_links = [],
  audit_events = [],
} = {}) {
  const rows = [];
  const unresolved = [];
  const validityReviewRequired = [];
  for (const member of Array.isArray(members) ? members : []) {
    if (member?.tenant_id !== tenant_id) throw new TypeError("MatterMember migration tenant mismatch");
    const { validFrom, validTo } = validPeriod(member);
    const explicitEmployeeId = typeof member.employee_id === "string" && member.employee_id.trim()
      ? member.employee_id.trim()
      : null;
    const identity = explicitEmployeeId ? null : resolveUniqueEmployeeUserLink({
      tenant_id,
      user_id: member.user_id,
      links: employee_user_links,
    });
    const resolvedEmployeeId = explicitEmployeeId ?? (identity?.state === "resolved" ? identity.employee_id : null);
    const resolutionState = resolvedEmployeeId ? "resolved" : "unresolved";
    const row = Object.freeze({
      ...member,
      employee_id: resolvedEmployeeId,
      valid_from: validFrom ?? (resolvedEmployeeId ? assignmentStartedAt(member, audit_events) : null),
      valid_to: validTo,
      identity_resolution_state: resolutionState,
      source_record_hash: sourceHash(member),
    });
    rows.push(row);
    if (!resolvedEmployeeId) {
      unresolved.push(Object.freeze({
        tenant_id,
        member_id: member.member_id,
        matter_id: member.matter_id,
        user_id: member.user_id,
        reason: identity?.state ?? "unresolved_missing",
        action_label: "담당자 지정 필요",
      }));
    }
    if (!row.valid_from) {
      validityReviewRequired.push(Object.freeze({
        tenant_id,
        member_id: member.member_id,
        matter_id: member.matter_id,
        reason: "valid_from_unverified",
        action_label: "담당 시작일 확인 필요",
      }));
    }
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    unresolved: Object.freeze(unresolved),
    validity_review_required: Object.freeze(validityReviewRequired),
    report: Object.freeze({
      row_count: rows.length,
      resolved_count: rows.length - unresolved.length,
      unresolved_count: unresolved.length,
      valid_from_unverified_count: validityReviewRequired.length,
      source_hashes_preserved: true,
      guessed_validity_dates: 0,
    }),
  });
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function peopleMemberUnresolvedCsv(rows = []) {
  const fields = ["tenant_id", "member_id", "matter_id", "user_id", "reason", "action_label"];
  return [
    fields.join(","),
    ...(Array.isArray(rows) ? rows : []).map((row) => fields.map((field) => csvValue(row[field])).join(",")),
  ].join("\n");
}
