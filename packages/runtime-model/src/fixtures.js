import { createCanonicalRecord, validateCanonicalDataset } from "./validators.js";

const TENANT_ID = "tenant-runtime-spine";
const MATTER_ID = "matter-runtime-spine";
const PARTY_ID = "party-runtime-spine";
const CLIENT_ID = "client-runtime-spine";
const CLASSIFICATION_ENVELOPE_ID = "class-runtime-spine";

export function createCanonicalSeedFixture() {
  const records = [
    createCanonicalRecord("Tenant", { tenant_id: TENANT_ID, name: "Runtime Spine Synthetic Tenant", status: "active" }),
    createCanonicalRecord("User", { tenant_id: TENANT_ID, user_id: "user-runtime-spine", display_name: "Runtime Spine User", status: "active" }),
    createCanonicalRecord("Employee", { tenant_id: TENANT_ID, employee_id: "employee-runtime-spine", display_name: "Runtime Spine Employee", status: "active" }),
    createCanonicalRecord("TenantMembership", { tenant_id: TENANT_ID, membership_id: "membership-runtime-spine", user_id: "user-runtime-spine", role_id: "role-runtime-spine", status: "active" }),
    createCanonicalRecord("RuntimeRole", { tenant_id: TENANT_ID, role_id: "role-runtime-spine", name: "Runtime Spine Role", scopes: ["matter:read", "matter:write"] }),
    createCanonicalRecord("Person", { tenant_id: TENANT_ID, person_id: "person-runtime-spine", display_name: "Runtime Spine Person", status: "active" }),
    createCanonicalRecord("Organization", { tenant_id: TENANT_ID, organization_id: "org-runtime-spine", display_name: "Runtime Spine Organization", status: "active" }),
    createCanonicalRecord("Party", { tenant_id: TENANT_ID, party_id: PARTY_ID, party_type: "organization", display_name: "Runtime Spine Party", status: "active" }),
    createCanonicalRecord("Client", { tenant_id: TENANT_ID, client_id: CLIENT_ID, party_id: PARTY_ID, display_name: "Runtime Spine Client", status: "active" }),
    createCanonicalRecord("ClientGroup", { tenant_id: TENANT_ID, client_group_id: "client-group-runtime-spine", display_name: "Runtime Spine Client Group", client_ids: [CLIENT_ID] }),
    createCanonicalRecord("ExternalUser", { tenant_id: TENANT_ID, external_user_id: "external-runtime-spine", party_id: PARTY_ID, display_name: "Runtime Spine External User", status: "invited" }),
    createCanonicalRecord("Matter", { tenant_id: TENANT_ID, matter_id: MATTER_ID, client_id: CLIENT_ID, title: "Runtime Spine Matter", status: "open" }),
    createCanonicalRecord("MatterMember", { tenant_id: TENANT_ID, matter_member_id: "matter-member-runtime-spine", matter_id: MATTER_ID, employee_id: "employee-runtime-spine", role: "responsible_attorney", status: "active" }),
    createCanonicalRecord("ContactRole", { tenant_id: TENANT_ID, contact_role_id: "contact-role-runtime-spine", party_id: PARTY_ID, matter_id: MATTER_ID, role: "client_contact", status: "active" }),
    createCanonicalRecord("ClassificationEnvelope", { tenant_id: TENANT_ID, classification_envelope_id: CLASSIFICATION_ENVELOPE_ID, classification: "confidential", privilege: true, legal_hold: false, retention_policy_id: "retention-runtime-spine", permission_envelope_id: "permission-runtime-spine" }),
    createCanonicalRecord("Document", { tenant_id: TENANT_ID, document_id: "document-runtime-spine", matter_id: MATTER_ID, title: "Runtime Spine Document", status: "active", classification_envelope_id: CLASSIFICATION_ENVELOPE_ID }),
    createCanonicalRecord("DocumentVersion", { tenant_id: TENANT_ID, document_version_id: "document-version-runtime-spine", document_id: "document-runtime-spine", version_number: 1, content_hash: "sha256:runtime-spine", status: "current" }),
    createCanonicalRecord("EmailThread", { tenant_id: TENANT_ID, thread_id: "thread-runtime-spine", matter_id: MATTER_ID, subject: "Runtime Spine Thread", status: "active" }),
    createCanonicalRecord("EmailMessage", { tenant_id: TENANT_ID, message_id: "message-runtime-spine", thread_id: "thread-runtime-spine", sent_at: "2026-06-21T00:00:00.000Z", subject: "Runtime Spine Message", status: "active" }),
    createCanonicalRecord("Task", { tenant_id: TENANT_ID, task_id: "task-runtime-spine", matter_id: MATTER_ID, title: "Runtime Spine Task", status: "open" }),
    createCanonicalRecord("Deadline", { tenant_id: TENANT_ID, deadline_id: "deadline-runtime-spine", matter_id: MATTER_ID, title: "Runtime Spine Deadline", due_at: "2026-07-01", status: "open" }),
    createCanonicalRecord("Event", { tenant_id: TENANT_ID, event_id: "event-runtime-spine", matter_id: MATTER_ID, title: "Runtime Spine Event", starts_at: "2026-07-02T00:00:00.000Z", status: "scheduled" }),
    createCanonicalRecord("Issue", { tenant_id: TENANT_ID, issue_id: "issue-runtime-spine", matter_id: MATTER_ID, title: "Runtime Spine Issue", status: "open" }),
    createCanonicalRecord("MatterWiki", { tenant_id: TENANT_ID, wiki_id: "wiki-runtime-spine", matter_id: MATTER_ID, snapshot_version: 1, status: "draft" }),
    createCanonicalRecord("VaultSnapshot", { tenant_id: TENANT_ID, vault_snapshot_id: "vault-snapshot-runtime-spine", matter_id: MATTER_ID, workspace_id: "workspace-runtime-spine", snapshot_hash: "sha256:vault-runtime-spine", status: "captured" })
  ];

  const validation = validateCanonicalDataset(records);
  if (!validation.ok) throw new Error(`Invalid canonical seed fixture: ${validation.errors.join("; ")}`);
  return Object.freeze(records);
}

export const CANONICAL_SEED_FIXTURE = createCanonicalSeedFixture();
