import { evaluatePermission } from "../../../packages/authz/src/index.js";

const CORPORATE_SCOPE = "legal_entity_administration";

function denied(action, reason = "corporate_workspace_not_authorized") {
  return Object.freeze({ effect: "deny", action, reason, fail_closed: true });
}

export async function resolveVaultAuthorizationDocument({ runtime, tenantId, documentId }) {
  if (typeof runtime?.upload_runtime?.getDocumentState === "function") {
    return (await runtime.upload_runtime.getDocumentState({
      tenant_id: tenantId, document_id: documentId,
    }))?.document ?? null;
  }
  return runtime?.repository?.get({
    tenant_id: tenantId, model_type: "DmsDocument", document_id: documentId,
  }) ?? null;
}

// null preserves the existing Matter authorization path. A missing workspace
// never makes an unscoped document an ordinary Matter document.
export function evaluateVaultCorporatePermission({
  context, repository, document, tenantId, workspaceId = document?.workspace_id,
  action, resourceType = "vault_document",
}) {
  const workspace = workspaceId && repository?.get({
    tenant_id: tenantId, model_type: "DmsWorkspace", workspace_id: workspaceId,
  });
  if (workspace?.scope_type !== CORPORATE_SCOPE) {
    return document?.matter_id ? null : denied(action);
  }
  const principal = context?.principal;
  if (workspace.model_type !== "DmsWorkspace"
      || workspace.workspace_id !== workspaceId
      || workspace.status !== "active"
      || workspace.synthetic_only !== false
      || workspace.client_visible_by_default !== false
      || ["legal_entity_id", "organization_id", "party_id", "owner_user_id", "permission_ref", "permission_envelope_id"]
        .some((field) => typeof workspace[field] !== "string" || !workspace[field] || workspace[field].trim() !== workspace[field])
      || workspace.tenant_id !== tenantId
      || principal?.tenant_id !== tenantId
      || workspace.matter_id !== null
      || (document && document.matter_id !== null)
      || (document && (document.tenant_id !== tenantId
        || document.workspace_id !== workspace.workspace_id
        || document.permission_envelope_id !== workspace.permission_envelope_id))
      || context?.object_acl_authority?.status !== "authoritative"
      || !Array.isArray(context?.object_acl)) {
    return denied(action);
  }
  const objectAcl = context.object_acl.filter((entry) => {
    if (entry.tenant_id !== tenantId || entry.principal_id !== principal.user_id) return false;
    if (entry.resource_id === workspace.workspace_id) {
      return entry.resource_type == null || ["DmsWorkspace", "vault_workspace"].includes(entry.resource_type);
    }
    return Boolean(document?.document_id && entry.resource_id === document.document_id
      && (entry.resource_type == null || ["DmsDocument", "vault_document", "dms_document"].includes(entry.resource_type)));
  });
  const resource = {
    tenant_id: tenantId, matter_id: null, resource_type: resourceType,
    resource_id: document?.document_id ?? workspace.workspace_id,
  };
  const rules = context.rules ?? [];
  const scopedDecision = evaluatePermission({ principal, resource, action, rules, objectAcl: [] });
  if (scopedDecision.effect !== "allow") return scopedDecision;
  return evaluatePermission({
    principal, resource, action, objectAcl,
    rules: [
      ...rules.filter((rule) => rule.effect !== "allow"),
      ...(workspace.owner_user_id === principal.user_id
        ? [{ id: "corporate-workspace-owner", effect: "allow", action }]
        : []),
    ],
  });
}

export function filterVaultCorporateDocuments({ context, runtime, documents, tenantId, action }) {
  return documents.filter((entry) => {
    const decision = evaluateVaultCorporatePermission({
      context, repository: runtime.repository, document: entry.document ?? entry, tenantId, action,
    });
    return decision == null || decision.effect === "allow";
  });
}
