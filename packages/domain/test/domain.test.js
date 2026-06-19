import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDocumentReferenceIsMatterTraced,
  assertMatterBelongsToClient,
  createAuditEventReference,
  createClient,
  createDocumentReference,
  createMatter,
  createRole,
  createTenant,
  createUser,
} from "../src/index.js";

test("creates canonical Tenant, User, Client, and Matter with matter-first invariants", () => {
  const tenant = createTenant({ tenant_id: "t_synthetic", name: "Synthetic Firm" });
  const user = createUser({ user_id: "u_owner", tenant_id: tenant.tenant_id, email: "owner@example.test" });
  const client = createClient({ client_id: "c_acme", tenant_id: tenant.tenant_id, display_name: "ACME Synthetic" });
  const matter = createMatter({
    matter_id: "m_acme_001",
    tenant_id: tenant.tenant_id,
    client_id: client.client_id,
    owner_user_id: user.user_id,
    status: "open",
    confidentiality: "restricted",
  });

  assert.equal(assertMatterBelongsToClient(matter, client), true);
});

test("creates Role and AuditEventReference contract entities", () => {
  const role = createRole({ role_id: "role_attorney", tenant_id: "t_synthetic", name: "Attorney", permissions: ["matter.read"] });
  const auditRef = createAuditEventReference({
    audit_event_id: "evt_001",
    tenant_id: "t_synthetic",
    matter_id: "m_acme_001",
    action: "document.view",
    occurred_at: "2026-06-03T00:00:00.000Z",
  });

  assert.equal(role.permissions[0], "matter.read");
  assert.equal(auditRef.audit_event_id, "evt_001");
});

test("AuditEventReference can represent non-matter audit events", () => {
  const auditRef = createAuditEventReference({
    audit_event_id: "evt_login",
    tenant_id: "t_synthetic",
    action: "auth.login",
    occurred_at: "2026-06-03T00:00:00.000Z",
  });

  assert.equal(auditRef.matter_id, null);
});

test("Matter requires tenant, client, owner, status, and confidentiality", () => {
  assert.throws(
    () => createMatter({ matter_id: "m_bad", tenant_id: "t_synthetic", client_id: "c_acme" }),
    /owner_user_id, status, confidentiality/,
  );
});

test("Client confidentiality must use canonical levels", () => {
  assert.throws(
    () => createClient({ client_id: "c_bad", tenant_id: "t_synthetic", display_name: "Bad Client", confidentiality: "secret-ish" }),
    /Client confidentiality must be one of/,
  );
});

test("cross-tenant Matter and Client relationships are rejected", () => {
  const matter = createMatter({
    matter_id: "m_acme_001",
    tenant_id: "t_synthetic",
    client_id: "c_acme",
    owner_user_id: "u_owner",
    status: "open",
    confidentiality: "restricted",
  });
  const otherTenantClient = createClient({ client_id: "c_acme", tenant_id: "t_other", display_name: "Other Tenant ACME" });

  assert.throws(() => assertMatterBelongsToClient(matter, otherTenantClient), /Cross-tenant relationship is forbidden/);
});

test("DocumentReference remains DMS-owned and Matter-traced", () => {
  const matter = createMatter({
    matter_id: "m_acme_001",
    tenant_id: "t_synthetic",
    client_id: "c_acme",
    owner_user_id: "u_owner",
    status: "open",
    confidentiality: "restricted",
  });
  const doc = createDocumentReference({ document_id: "d_001", tenant_id: "t_synthetic", matter_id: matter.matter_id });

  assert.equal(assertDocumentReferenceIsMatterTraced(doc, matter), true);
  assert.equal(doc.dms_owned, true);
});
