import assert from "node:assert/strict";
import test from "node:test";
import {
  VAULT_DMS_BOUNDED_CONTEXT,
  handleVaultDmsApiRequest,
} from "../src/vault-dms-runtime-context.js";

const TENANT = "tenant_vault_precedent";
const ACTOR = "user_vault_precedent";

function context(actions = []) {
  return { principal: { tenant_id: TENANT, user_id: ACTOR, role_ids: ["dms_admin"] },
    rules: actions.map((action) => ({ id: `allow:${action}`, action, effect: "allow" })),
    object_acl: [] };
}

function runtime(calls) {
  return { precedent_search_runtime: { repository: {
    async registerSource(input) { calls.push(["register", input]); return { source: { ...input, source_revision: 1 } }; },
    async disableSource(input) { calls.push(["disable", input]); return { source: { ...input, status: "disabled" } }; },
    async unapproveSource(input) { calls.push(["unapprove", input]); return { source: { ...input, status: "unapproved" } }; },
    async classifyDocumentPrivilege(input) { calls.push(["privilege", input]); return { ...input }; },
    async readiness(input) { calls.push(["readiness", input]); return { runtime_ready: true,
      authoritative: true, index_version: "lawos-precedent-fts-v2", safe_error_code: null }; },
  } } };
}

test("Vault precedent register, disable, unapprove, and readiness are permission-gated", async () => {
  for (const endpoint of ["POST /api/vault/precedent-sources",
    "POST /api/vault/documents/:document_id/privilege-label",
    "POST /api/vault/precedent-sources/:source_id/disable",
    "POST /api/vault/precedent-sources/:source_id/unapprove",
    "GET /api/vault/precedents/readiness"]) {
    assert.ok(VAULT_DMS_BOUNDED_CONTEXT.endpoints.includes(endpoint));
  }
  const calls = [];
  const denied = await handleVaultDmsApiRequest({ pathname: "/api/vault/precedent-sources",
    method: "POST", query: {}, body: { tenant_id: TENANT, source_id: "source-1",
      matter_id: "matter-1", document_id: "document-1" }, context: context(),
    requestId: "request-denied", runtime: runtime(calls) });
  assert.equal(denied.status, 403);
  assert.equal(calls.length, 0);

  const registered = await handleVaultDmsApiRequest({ pathname: "/api/vault/precedent-sources",
    method: "POST", query: {}, body: { tenant_id: TENANT, source_id: "source-1",
      source_kind: "internal_matter_document", matter_id: "matter-1",
      document_id: "document-1", version_id: "version-1", content_sha256: "a".repeat(64),
      title: "approved source", approval_id: "approval-1", approval_batch_id: "batch-1",
      approval_decision_id: "client-forged", approval_authority: "client-forged",
      approved_by: "client-forged", approved_at: "2020-01-01T00:00:00.000Z",
      idempotency_key: "register-1" },
    context: context(["dms:precedent:source:register"]), requestId: "request-register",
    runtime: runtime(calls) });
  assert.equal(registered.status, 200);
  const input = calls[0][1];
  assert.equal(input.approval_authority, "vault-approved-precedent-corpus-v1");
  assert.equal(input.approved_by, ACTOR);
  assert.match(input.approval_decision_id, /^decision:[a-f0-9]{64}$/u);
  assert.notEqual(input.approved_at, "2020-01-01T00:00:00.000Z");

  const classified = await handleVaultDmsApiRequest({
    pathname: "/api/vault/documents/document-1/privilege-label",
    method: "POST", query: {}, body: { classification: "not_privileged",
      authority: "client-forged", decision_id: "client-forged",
      provenance_sha256: "b".repeat(64), applied_by: "client-forged" },
    context: context(["dms:document:privilege:classify"]),
    requestId: "request-privilege", runtime: runtime(calls) });
  assert.equal(classified.status, 200);
  const privilegeInput = calls.find(([operation]) => operation === "privilege")[1];
  assert.equal(privilegeInput.authority, "dms-privilege-review-v1");
  assert.equal(privilegeInput.applied_by, ACTOR);
  assert.match(privilegeInput.label_id, /^privilege:[a-f0-9]{64}$/u);
  assert.match(privilegeInput.decision_id, /^decision:[a-f0-9]{64}$/u);
  assert.match(privilegeInput.provenance_sha256, /^[a-f0-9]{64}$/u);
  assert.notEqual(privilegeInput.decision_id, "client-forged");
  assert.notEqual(privilegeInput.provenance_sha256, "b".repeat(64));

  for (const operation of ["disable", "unapprove"]) {
    const response = await handleVaultDmsApiRequest({
      pathname: `/api/vault/precedent-sources/source-1/${operation}`,
      method: "POST", query: {}, body: { idempotency_key: `${operation}-1` },
      context: context([`dms:precedent:source:${operation}`]),
      requestId: `request-${operation}`, runtime: runtime(calls) });
    assert.equal(response.status, 200);
  }
  const ready = await handleVaultDmsApiRequest({ pathname: "/api/vault/precedents/readiness",
    method: "GET", query: {}, body: {},
    context: context(["dms:precedent:readiness:read"]), requestId: "request-readiness",
    runtime: runtime(calls) });
  assert.equal(ready.status, 200);
  assert.equal(ready.body.authoritative, true);

  const crossTenant = await handleVaultDmsApiRequest({ pathname: "/api/vault/precedents/readiness",
    method: "GET", query: { tenant_id: "tenant-other" }, body: {},
    context: context(["dms:precedent:readiness:read"]), requestId: "request-cross-tenant",
    runtime: runtime(calls) });
  assert.equal(crossTenant.status, 403);
});
