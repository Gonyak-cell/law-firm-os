export class MatterWorktreeConflictError extends Error {
  constructor(code, message, currentVersion = null) {
    super(message);
    this.name = "MatterWorktreeConflictError";
    this.code = code;
    this.current_version = currentVersion;
  }
}

export function createActiveMatterWorktree(repository, input) {
  if (input.status !== "active") throw new TypeError("createActiveMatterWorktree requires active status");
  const conflict = repository.list({
    tenant_id: input.tenant_id,
    model_type: "MatterWorktree",
    matter_id: input.matter_id,
  }).find(({ status }) => status === "active");
  if (conflict) {
    throw new MatterWorktreeConflictError(
      "WORKTREE_ACTIVE_CONFLICT",
      `Active MatterWorktree already exists for Matter ${input.matter_id}`,
    );
  }
  return repository.create(input);
}

export function advanceMatterWorktreeVersion(repository, command) {
  const current = repository.get({
    tenant_id: command.tenant_id,
    model_type: "MatterWorktree",
    id: command.worktree_id,
  });
  if (!current) {
    throw new MatterWorktreeConflictError("WORKTREE_NOT_FOUND", `MatterWorktree ${command.worktree_id} not found`);
  }
  if (current.version !== command.expected_version) {
    throw new MatterWorktreeConflictError(
      "WORKTREE_VERSION_CONFLICT",
      `Expected Worktree version ${command.expected_version}, current version is ${current.version}`,
      current.version,
    );
  }
  return repository.update(
    { tenant_id: command.tenant_id, model_type: "MatterWorktree", id: command.worktree_id },
    {
      version: current.version + 1,
      updated_by: command.updated_by,
      updated_at: command.updated_at,
    },
  );
}
