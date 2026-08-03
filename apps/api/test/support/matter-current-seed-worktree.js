import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AMIC_CURRENT_MATTER_CODE_CANDIDATES,
  createMatterRepository,
} from "../../../../packages/matter/src/index.js";
import { writeDurableJsonFile } from "../../../../packages/persistence/src/durable-file.js";
import {
  MATTER_RUNTIME_CANONICAL_TENANT_ID,
  createMatterRuntimeContext,
  createMatterRuntimeSeed,
} from "../../src/matter-runtime-context.js";

export { MATTER_RUNTIME_CANONICAL_TENANT_ID };

export const MATTER = AMIC_CURRENT_MATTER_CODE_CANDIDATES[0];
export const TASK_ID = "task_current_seed_canonical";

export const QUERY = Object.freeze({
  tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
  permission_ref: "matter_current_seed_worktree_read",
  audit_hint_ref: "matter_current_seed_worktree_test",
  as_of: "2026-07-31T00:00:00.000Z",
});

export async function withIsolatedBackupRoot(callback) {
  const backupRoot = mkdtempSync(join(tmpdir(), "matter-current-seed-backups-"));
  // Pass the scoped root explicitly; never use process.env as per-call state.
  return callback({ backupRoot });
}

export function createRepository({ backupRoot, writeState = writeDurableJsonFile, ...options } = {}) {
  return createMatterRepository({
    ...options,
    writeState: (writeOptions) => writeState({
      ...writeOptions,
      ...(backupRoot === undefined ? {} : { backupRoot }),
    }),
  });
}

export function context(userId = "test_actor") {
  return {
    principal: {
      user_id: userId,
      tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
      role_ids: ["lawos_attorney"],
    },
    rules: [{ id: "allow-current-seed-worktree-read", effect: "allow", action: "matter:worktree:read" }],
    object_acl: [],
  };
}

export function createRuntime(repository, options = {}) {
  return createMatterRuntimeContext({ repository, ...options });
}

export function freshRuntime({ backupRoot, taskOptions, ...runtimeOptions } = {}) {
  const seed = currentSeed();
  const repository = createRepository({ backupRoot, seedRecords: seed.records });
  repository.create(canonicalTask(taskOptions));
  return createRuntime(repository, runtimeOptions);
}

export function currentSeed() {
  return createMatterRuntimeSeed({
    syntheticTenantId: "tenant_current_seed_synthetic",
    currentMatterTenantId: MATTER_RUNTIME_CANONICAL_TENANT_ID,
    includeCurrentMatterCodes: true,
  });
}

export function canonicalTask({ actorId = "test_actor" } = {}) {
  return {
    model_type: "MatterTask",
    task_id: TASK_ID,
    tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
    matter_id: MATTER.matter_id,
    title: "[QA] 동일 원장 업무",
    status: "todo",
    created_by: actorId,
    due_at: "2026-07-31T08:00:00+09:00",
  };
}

export function seedRecordsWithoutSelectedWorktree(seed) {
  return seed.records.filter((record) => !(
    record.tenant_id === MATTER_RUNTIME_CANONICAL_TENANT_ID
    && record.matter_id === MATTER.matter_id
    && (record.model_type === "MatterMember" || record.model_type === "MatterWorktree")
  ));
}

export function selectedRecords(repository, modelType) {
  return repository.list({
    tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
    model_type: modelType,
    matter_id: MATTER.matter_id,
  });
}

export function durableWorktree({ worktreeId, status = "active" }) {
  return {
    model_type: "MatterWorktree",
    worktree_id: worktreeId,
    tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
    matter_id: MATTER.matter_id,
    status,
    version: 7,
    permission_envelope_id: `perm:${MATTER_RUNTIME_CANONICAL_TENANT_ID}:${MATTER.matter_id}`,
    audit_trace_id: `audit:${MATTER_RUNTIME_CANONICAL_TENANT_ID}:${MATTER.matter_id}`,
    synthetic_only: false,
    created_by: "durable_user",
    created_at: "2026-07-30T01:00:00.000Z",
    updated_by: "durable_user",
    updated_at: "2026-07-30T02:00:00.000Z",
  };
}

export function durableMember({
  memberId = "member_durable_selected",
  status = "active",
  userId = "test_actor",
} = {}) {
  return {
    model_type: "MatterMember",
    member_id: memberId,
    tenant_id: MATTER_RUNTIME_CANONICAL_TENANT_ID,
    matter_id: MATTER.matter_id,
    user_id: userId,
    role: "responsible_attorney",
    status,
    access_scope: "matter_team",
    permission_envelope_id: `perm:${MATTER_RUNTIME_CANONICAL_TENANT_ID}:${MATTER.matter_id}`,
    audit_trace_id: `audit:${MATTER_RUNTIME_CANONICAL_TENANT_ID}:${MATTER.matter_id}`,
    synthetic_only: false,
    created_by: "durable_user",
    created_at: "2026-07-30T01:00:00.000Z",
  };
}

export function durableStorePath(prefix) {
  return join(mkdtempSync(join(tmpdir(), prefix)), "matter-store.json");
}
