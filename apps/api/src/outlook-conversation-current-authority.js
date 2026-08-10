import { validateOutlookEmailFileIdempotency } from "../../../packages/email-dms/src/email-filing-service.js";
import { assertCanonicalIdempotencyKey } from "../../../packages/email-dms/src/email-filing-canonical.js";

const ORIGINAL_MIME_DOCUMENT = /^doc:(.+):original-mime:([a-f0-9]{64})$/u;

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

export async function resolveConversationPolicySeed({
  repository,
  durable_mime_authority,
  tenant_id,
  matter_id,
  conversation_id,
  m365_connection_id,
  seed_email_thread_id,
  seed_filing_receipt_ref,
} = {}) {
  const thread = repository?.get?.({
    tenant_id,
    model_type: "DmsEmailThread",
    email_thread_id: seed_email_thread_id,
  });
  if (!thread || thread.status !== "active"
    || thread.tenant_id !== tenant_id
    || thread.matter_id !== matter_id
    || thread.conversation_id !== conversation_id
    || thread.account_ref !== m365_connection_id
    || !Array.isArray(thread.filed_document_ids)
    || thread.filed_document_ids.length !== 1) return null;
  const match = ORIGINAL_MIME_DOCUMENT.exec(thread.filed_document_ids[0]);
  if (!match || match[1] !== thread.email_thread_id) return null;
  const seedFilingReceiptRef = `outlook-email-file:${thread.email_thread_id}:${match[2]}:dms`;
  if (seed_filing_receipt_ref !== undefined && seed_filing_receipt_ref !== seedFilingReceiptRef) return null;
  const receipt = repository?.getIdempotency?.({
    tenant_id,
    idempotency_key: seedFilingReceiptRef,
  });
  if (!validateOutlookEmailFileIdempotency({ entry: receipt, thread }).valid) return null;
  try {
    await assertCanonicalIdempotencyKey(seedFilingReceiptRef, thread, durable_mime_authority);
  } catch {
    return null;
  }
  return Object.freeze({ seed_filing_receipt_ref: seedFilingReceiptRef });
}

export function verifyConversationPolicyAuthority({ runtimes, principal, input, clock = () => new Date() } = {}) {
  const current = clock();
  const at = current instanceof Date ? current.getTime() : NaN;
  if (!Number.isFinite(at) || !principal || principal.tenant_id !== input.tenant_id
    || principal.user_id !== input.user_id || principal.entra_subject_id !== input.entra_subject_id
    || input.actor_id !== principal.user_id) return Object.freeze({ allowed: false, reason: "principal_changed" });
  const connection = ownedConnection(runtimes?.emailDmsRuntime?.repository, principal, input.m365_connection_id, at);
  if (!connection) return Object.freeze({ allowed: false, reason: "connection_invalid" });
  const matter = matterAccess(runtimes?.matterRuntime?.repository, principal, input.matter_id, at);
  if (!matter) return Object.freeze({ allowed: false, reason: "matter_access_changed" });
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
