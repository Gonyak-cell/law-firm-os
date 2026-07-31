const CLOSED_TASK_STATES = new Set(["done", "cancelled"]);

function explicitRows({ tenant_id, user_id, tasks = [] }) {
  return (Array.isArray(tasks) ? tasks : [])
    .filter((task) => task?.tenant_id === tenant_id)
    .filter((task) => task.assigned_to_user_id === user_id)
    .filter((task) => !CLOSED_TASK_STATES.has(task.status));
}

function frozenSorted(rows, field) {
  return Object.freeze(
    rows
      .sort((left, right) => (
        String(left[field] ?? "").localeCompare(String(right[field] ?? ""))
        || String(left.task_id).localeCompare(String(right.task_id))
      ))
      .map((task) => Object.freeze({ ...task })),
  );
}

export function selectExplicitPeopleTasks(input = {}) {
  const rows = explicitRows(input);
  return Object.freeze({
    time_bound: frozenSorted(rows.filter((task) => task.starts_at && task.ends_at), "starts_at"),
    due_only: frozenSorted(rows.filter((task) => !task.starts_at && task.due_at), "due_at"),
    unscheduled: frozenSorted(
      rows.filter((task) => (
        (task.starts_at && !task.ends_at)
        || (!task.starts_at && !task.due_at)
      )),
      "task_id",
    ),
  });
}

export function comparePeopleTaskSelectors({ tenant_id, user_id, tasks = [] } = {}) {
  const legacy = (Array.isArray(tasks) ? tasks : [])
    .filter((task) => task?.tenant_id === tenant_id)
    .filter((task) => task.assigned_to === user_id)
    .filter((task) => !CLOSED_TASK_STATES.has(task.status));
  const explicit = selectExplicitPeopleTasks({ tenant_id, user_id, tasks });
  const explicitIds = new Set([
    ...explicit.time_bound,
    ...explicit.due_only,
    ...explicit.unscheduled,
  ].map(({ task_id }) => task_id));
  return Object.freeze({
    legacy_count: legacy.length,
    explicit_count: explicitIds.size,
    review_task_ids: Object.freeze(
      legacy.map(({ task_id }) => task_id).filter((taskId) => !explicitIds.has(taskId)).sort(),
    ),
    auto_attributed_count: 0,
  });
}
