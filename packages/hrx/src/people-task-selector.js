import { selectExplicitPeopleTasks } from "../../matter/src/people-task-cutover.js";

export function selectMemberMatterTasks({
  tenant_id,
  user_id,
  tasks = [],
} = {}) {
  return selectExplicitPeopleTasks({ tenant_id, user_id, tasks });
}
