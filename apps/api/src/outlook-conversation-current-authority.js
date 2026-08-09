function activeMember(member, at) {
  return member?.status === "active"
    && (!member.valid_from || Date.parse(member.valid_from) <= at)
    && (!member.valid_to || Date.parse(member.valid_to) >= at);
}

function ownedConnection(repository, principal, connectionId, at) {
  const connection = repository?.get?.({
    tenant_id: principal.tenant_id,
    model_type: "M365Connection",
    m365_connection_id: connectionId,
  });
  if (!connection || connection.user_id !== principal.user_id
    || connection.entra_subject_id !== principal.entra_subject_id
    || connection.revoked_at || Date.parse(connection.expires_at) <= at
    || connection.connection_authority !== "delegated"
    || connection.mailbox_scope !== "me"
    || !connection.granted_scopes?.includes("Mail.Read")) return null;
  return connection;
}

function matterAccess(repository, principal, matterId, at) {
  const matter = repository?.get?.({
    tenant_id: principal.tenant_id,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (!matter || !["opening", "open", "paused"].includes(matter.status)) return null;
  const members = repository.list({
    tenant_id: principal.tenant_id,
    model_type: "MatterMember",
    matter_id: matterId,
  }).filter((member) => member.user_id === principal.user_id && activeMember(member, at));
  return members.length === 1 ? { matter, member: members[0] } : null;
}

function seedFiling(repository, input) {
  const thread = repository?.get?.({
    tenant_id: input.tenant_id,
    model_type: "DmsEmailThread",
    email_thread_id: input.seed_email_thread_id,
  });
  const receipt = repository?.getIdempotency?.({
    tenant_id: input.tenant_id,
    idempotency_key: input.seed_filing_receipt_ref,
  });
  if (!thread || thread.status !== "active" || thread.matter_id !== input.matter_id
    || thread.conversation_id !== input.conversation_id
    || thread.account_ref !== input.m365_connection_id
    || !Array.isArray(thread.filed_document_ids) || thread.filed_document_ids.length < 1
    || receipt?.response?.email_thread_id !== thread.email_thread_id
    || receipt.response.matter_id !== thread.matter_id
    || JSON.stringify(receipt.response.filed_document_ids) !== JSON.stringify(thread.filed_document_ids)) return null;
  return thread;
}

export function verifyConversationPolicyAuthority({ runtimes, principal, input, require_seed = false, clock = () => new Date() } = {}) {
  const current = clock();
  const at = current instanceof Date ? current.getTime() : NaN;
  if (!Number.isFinite(at) || !principal || principal.tenant_id !== input.tenant_id
    || principal.user_id !== input.user_id || principal.entra_subject_id !== input.entra_subject_id
    || input.actor_id !== principal.user_id) return Object.freeze({ allowed: false, reason: "principal_changed" });
  const connection = ownedConnection(runtimes?.emailDmsRuntime?.repository, principal, input.m365_connection_id, at);
  if (!connection) return Object.freeze({ allowed: false, reason: "connection_invalid" });
  const matter = matterAccess(runtimes?.matterRuntime?.repository, principal, input.matter_id, at);
  if (!matter) return Object.freeze({ allowed: false, reason: "matter_access_changed" });
  if (require_seed && !seedFiling(runtimes?.dmsRuntime?.repository, input)) {
    return Object.freeze({ allowed: false, reason: "seed_filing_invalid" });
  }
  return Object.freeze({ allowed: true, connection, ...matter });
}

export function verifyConversationWorkerAuthority({ runtimes, policy, connection, clock = () => new Date() } = {}) {
  return verifyConversationPolicyAuthority({
    runtimes,
    clock,
    principal: {
      tenant_id: policy.tenant_id,
      user_id: policy.user_id,
      entra_subject_id: policy.entra_subject_id,
    },
    input: {
      tenant_id: policy.tenant_id,
      user_id: policy.user_id,
      entra_subject_id: policy.entra_subject_id,
      actor_id: policy.user_id,
      m365_connection_id: connection.m365_connection_id,
      matter_id: policy.matter_id,
    },
  });
}
