import { createHash } from "node:crypto";
import { resolveMatterTaskAssignmentIdentity } from "./people-assignment-authority.js";

const MIGRATION_FIELDS = new Set([
  "assigned_to_user_id",
  "starts_at",
  "ends_at",
  "estimated_minutes",
  "assignment_resolution_state",
  "source_record_hash",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function sourceHash(task) {
  if (task.source_record_hash) return task.source_record_hash;
  const source = Object.fromEntries(Object.entries(task).filter(([field]) => !MIGRATION_FIELDS.has(field)));
  return `sha256:${createHash("sha256").update(JSON.stringify(stable(source))).digest("hex")}`;
}

export function backfillPeopleMatterTasks({
  tenant_id,
  tasks = [],
  users = [],
  members = [],
  employee_user_links = [],
} = {}) {
  const rows = [];
  const unresolved = [];
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (task?.tenant_id !== tenant_id) throw new TypeError("MatterTask migration tenant mismatch");
    const existingUserId = typeof task.assigned_to_user_id === "string" && task.assigned_to_user_id.trim()
      ? task.assigned_to_user_id.trim()
      : null;
    const candidateUserId = existingUserId ?? (
      typeof task.assigned_to === "string" && task.assigned_to.trim()
        ? task.assigned_to.trim()
        : null
    );
    const identity = resolveMatterTaskAssignmentIdentity({
      tenant_id,
      matter_id: task.matter_id,
      user_id: candidateUserId,
      as_of: task.starts_at ?? task.due_at ?? task.created_at,
      users,
      members,
      employee_user_links,
    });
    const resolvedUserId = identity.state === "resolved" ? identity.user_id : null;
    const reason = resolvedUserId ? null : identity.reason ?? "user_identity_missing";
    const row = Object.freeze({
      ...task,
      assigned_to_user_id: resolvedUserId,
      starts_at: task.starts_at ?? null,
      ends_at: task.ends_at ?? null,
      estimated_minutes: task.estimated_minutes ?? null,
      assignment_resolution_state: resolvedUserId ? "resolved" : "unresolved",
      source_record_hash: sourceHash(task),
    });
    rows.push(row);
    if (!resolvedUserId) {
      unresolved.push(Object.freeze({
        tenant_id,
        task_id: task.task_id,
        matter_id: task.matter_id,
        assigned_to: task.assigned_to ?? null,
        assigned_to_user_id: existingUserId,
        reason,
        action_label: "업무 담당자 확인 필요",
      }));
    }
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    unresolved: Object.freeze(unresolved),
    report: Object.freeze({
      row_count: rows.length,
      resolved_count: rows.length - unresolved.length,
      unresolved_count: unresolved.length,
      time_inference_count: 0,
      due_at_preserved: true,
      source_hashes_preserved: true,
    }),
  });
}
