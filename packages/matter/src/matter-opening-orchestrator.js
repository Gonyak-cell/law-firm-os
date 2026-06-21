import { appendMatterAuditEvent } from "./audit.js";
import { openMatterTransaction } from "./opening-service.js";
import { persistMatterVaultLink } from "./matter-vault-link-repository.js";
import { createWorkspaceForMatter } from "../../dms/src/workspace-service.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function openMatterWithVault({
  matterRepository,
  dmsRepository,
  matter,
  clearance_token,
  matter_number_seed,
  idempotency_key,
  actor_id,
  billing,
} = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  if (!matterRepository?.transaction) throw new TypeError("matterRepository transaction port is required");
  if (!dmsRepository?.transaction) throw new TypeError("dmsRepository transaction port is required");

  const replay = matterRepository.getIdempotency({
    tenant_id: matter?.tenant_id,
    idempotency_key: `${idempotency_key}:matter-vault`,
  });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return matterRepository.transaction((matterTx) => {
    const opened = openMatterTransaction({
      repository: matterTx,
      matter,
      clearance_token,
      matter_number_seed,
      idempotency_key,
      actor_id,
      billing,
    });

    const dmsCreated = dmsRepository.transaction((dmsTx) =>
      createWorkspaceForMatter({
        repository: dmsTx,
        matter: {
          ...opened.matter,
          title: opened.matter.title ?? matter.title,
          permission_envelope_id: opened.matter.permission_envelope_id ?? matter.permission_envelope_id,
          audit_trace_id: opened.matter.audit_trace_id ?? matter.audit_trace_id,
        },
        actor_id,
      }),
    );

    const linkAudit = appendMatterAuditEvent({
      repository: matterTx,
      event: {
        event_id: `matter.vault_link.created:${opened.matter.tenant_id}:${opened.matter.matter_id}`,
        tenant_id: opened.matter.tenant_id,
        actor_id,
        action: "matter.vault_link.created",
        object_type: "MatterVaultLink",
        object_id: `${opened.matter.matter_id}:${dmsCreated.workspace.workspace_id}`,
        decision: "allow",
        reason: "clearance_gated_matter_opening_created_vault_workspace",
        metadata: {
          matter_id: opened.matter.matter_id,
          vault_workspace_id: dmsCreated.workspace.workspace_id,
          idempotency_key,
        },
      },
    });

    const link = persistMatterVaultLink({
      repository: matterTx,
      link: {
        tenant_id: opened.matter.tenant_id,
        matter_id: opened.matter.matter_id,
        vault_workspace_id: dmsCreated.workspace.workspace_id,
        default_folder_id: dmsCreated.root_folder.folder_id,
        permission_envelope_id: opened.matter.permission_envelope_id,
        source_transaction_id: idempotency_key,
        audit_event_id: linkAudit.event_id,
        created_by_actor_id: actor_id,
      },
    });

    const response = Object.freeze({
      outcome: "created",
      matter: opened.matter,
      dms_workspace: dmsCreated.workspace,
      default_folder: dmsCreated.root_folder,
      matter_vault_link: link,
      billing_ledger: opened.billing_ledger ?? null,
      audit_event: opened.audit_event,
      link_audit_event: linkAudit,
      idempotent_replay: false,
    });
    matterTx.recordIdempotency({
      tenant_id: opened.matter.tenant_id,
      idempotency_key: `${idempotency_key}:matter-vault`,
      operation: "matter_vault_opening",
      response,
    });
    return response;
  });
}
