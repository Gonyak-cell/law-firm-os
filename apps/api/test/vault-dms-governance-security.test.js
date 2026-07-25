import assert from "node:assert/strict";
import test from "node:test";
import {
  createVaultDmsRuntimeSeed,
  handleVaultDocumentGovernance,
} from "../src/vault-dms-runtime-context.js";

const TENANT = "tenant-governance-security";
const DOCUMENT = "document-governance-security";
const OBJECT = "object-governance-security";
const MATTER = "matter-restricted";

test("an absent packaged account registry leaves the legacy synthetic DMS seed empty", () => {
  assert.deepEqual(createVaultDmsRuntimeSeed(null), []);
});

function runtime({ matterId = MATTER } = {}) {
  let mutationCalls = 0;
  let observedInput = null;
  return {
    authority: "postgres-v2",
    repository: null,
    upload_runtime: {
      source_only: false,
      finalizeUpload() {},
      async getGovernanceAuthorizationResource({ tenant_id, document_id, object_id }) {
        return { tenant_id, document_id, object_id, matter_id: matterId };
      },
      async placeLegalHold(input) {
        mutationCalls += 1;
        observedInput = input;
        return { status: "active", replayed: false };
      },
      async setRetentionPolicy(input) {
        mutationCalls += 1;
        observedInput = input;
        return { status: "active", replayed: false };
      },
      async assertCommittedObjectDeleteAllowed(input) {
        mutationCalls += 1;
        observedInput = input;
        return { allowed: true, replayed: false };
      },
      async requestCommittedObjectDelete(input) {
        mutationCalls += 1;
        observedInput = input;
        return { status: "pending", replayed: false };
      },
    },
    mutationCalls: () => mutationCalls,
    observedInput: () => observedInput,
  };
}

function body(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "permission-governance",
    audit_hint_ref: "audit-governance",
    object_id: OBJECT,
    legal_hold_id: "hold-governance",
    retention_policy_id: "retention-governance",
    retain_until: "2026-08-01T00:00:00.000Z",
    idempotency_key: "delete-governance",
    reason: "synthetic hold",
    ...overrides,
  };
}

function context(rules) {
  return {
    principal: { user_id: "user-governance", tenant_id: TENANT, role_ids: [] },
    rules,
    object_acl: [],
  };
}

test("DMS governance authorization uses the canonical matter and precise action before mutation", async () => {
  const target = runtime();
  const response = await handleVaultDocumentGovernance({
    documentId: DOCUMENT,
    operation: "legal-hold",
    body: body(),
    requestId: "request-governance-deny",
    runtime: target,
    context: context([
      { id: "deny-restricted", effect: "deny", action_prefix: "dms:governance:", ethical_wall_matter_id: MATTER },
      { id: "allow-governance", effect: "allow", action_prefix: "dms:governance:" },
    ]),
  });
  assert.equal(response.status, 403);
  assert.equal(target.mutationCalls(), 0);
});

test("ordinary document-write authority cannot perform DMS governance", async () => {
  const target = runtime();
  const response = await handleVaultDocumentGovernance({
    documentId: DOCUMENT,
    operation: "legal-hold",
    body: body(),
    requestId: "request-governance-write-only",
    runtime: target,
    context: context([{ id: "allow-document-write", effect: "allow", action: "dms:document:write" }]),
  });
  assert.equal(response.status, 403);
  assert.equal(target.mutationCalls(), 0);
});

test("DMS governance passes the authorized canonical matter into the transactional mutation", async () => {
  const target = runtime();
  const response = await handleVaultDocumentGovernance({
    documentId: DOCUMENT,
    operation: "legal-hold",
    body: body({ matter_id: MATTER }),
    requestId: "request-governance-allow",
    runtime: target,
    context: context([{ id: "allow-governance", effect: "allow", action: "dms:governance:legal-hold" }]),
  });
  assert.equal(response.status, 201);
  assert.equal(target.mutationCalls(), 1);
  assert.equal(target.observedInput().expected_matter_id, MATTER);
});

test("caller matter mismatch is rejected before DMS governance mutation", async () => {
  const target = runtime();
  const response = await handleVaultDocumentGovernance({
    documentId: DOCUMENT,
    operation: "legal-hold",
    body: body({ matter_id: "matter-attacker-selected" }),
    requestId: "request-governance-mismatch",
    runtime: target,
    context: context([{ id: "allow-governance", effect: "allow", action_prefix: "dms:governance:" }]),
  });
  assert.equal(response.status, 409);
  assert.deepEqual(response.body.safe_error_codes, ["DMS_CANONICAL_MATTER_MISMATCH"]);
  assert.equal(target.mutationCalls(), 0);
});

for (const operation of ["legal-hold", "retention", "delete-check", "permanent-delete"]) {
  test(`omitted caller matter cannot bypass canonical deny for ${operation}`, async () => {
    const target = runtime();
    const response = await handleVaultDocumentGovernance({
      documentId: DOCUMENT,
      operation,
      body: body({ matter_id: undefined }),
      requestId: `request-governance-canonical-deny-${operation}`,
      runtime: target,
      context: context([
        { id: "deny-restricted", effect: "deny", action_prefix: "dms:governance:", ethical_wall_matter_id: MATTER },
        { id: "allow-governance", effect: "allow", action_prefix: "dms:governance:" },
      ]),
    });
    assert.equal(response.status, 403);
    assert.equal(target.mutationCalls(), 0);
  });
}
