import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertOperationalPeopleProviderIdentityRepository,
  createDurablePeopleProviderIdentityRepository,
  createPeopleProviderIdentityRegistry,
  createTestPeopleProviderIdentityRepository,
} from "../src/people-provider-identity.js";

function registry() {
  let tick = 0;
  return createPeopleProviderIdentityRegistry({
    clock: () => `2026-07-30T00:00:0${tick++}.000Z`,
  });
}

test("provider identity allows one active employee and one active subject per tenant", () => {
  const store = registry();
  const first = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    consent_ref: "consent-1",
  });
  assert.equal(first.connection_state, "connected");
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-1",
      provider_subject_id: "subject-2",
      consent_ref: "consent-2",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_EMPLOYEE_ALREADY_CONNECTED",
  );
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-2",
      provider_subject_id: "subject-1",
      consent_ref: "consent-3",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_SUBJECT_ALREADY_CONNECTED",
  );
});

test("disconnect preserves history and permits a later replacement connection", () => {
  const store = registry();
  const connected = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    consent_ref: "consent-1",
  });
  const disconnected = store.disconnect({
    tenant_id: "tenant-a",
    provider_identity_id: connected.provider_identity_id,
  });
  assert.equal(disconnected.connection_state, "disconnected");
  assert.ok(disconnected.disconnected_at);
  const replacement = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-2",
    consent_ref: "consent-2",
  });
  assert.equal(replacement.connection_state, "connected");
  const snapshot = store.snapshot();
  assert.equal(snapshot.records.length, 2);
  assert.deepEqual(snapshot.audit_events.map(({ action }) => action), [
    "people.provider_identity.connected",
    "people.provider_identity.disconnected",
    "people.provider_identity.connected",
  ]);
});

test("provider identity rejects cross-tenant linking and email authority", () => {
  const store = registry();
  const connected = store.connect({
    tenant_id: "tenant-b",
    employee_id: "emp-b",
    provider_subject_id: "subject-b",
    consent_ref: "consent-b",
  });
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_tenant_id: "tenant-b",
      employee_id: "emp-1",
      provider_subject_id: "subject-1",
      consent_ref: "consent-1",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_CROSS_TENANT",
  );
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-1",
      provider_subject_id: "subject-1",
      consent_ref: "consent-1",
      email: "not-authority@example.test",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_EMAIL_AUTHORITY_FORBIDDEN",
  );
  for (const providerIdentityId of [connected.provider_identity_id, "unknown-provider-identity"]) {
    assert.throws(
      () => store.disconnect({
        tenant_id: "tenant-a",
        provider_identity_id: providerIdentityId,
      }),
      (error) => error.safe_error_code === "PEOPLE_PROVIDER_IDENTITY_NOT_FOUND",
    );
  }
});

test("a disconnected provider subject cannot move to another employee without explicit rebind", () => {
  const store = registry();
  const connected = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    consent_ref: "consent-1",
  });
  store.disconnect({
    tenant_id: "tenant-a",
    provider_identity_id: connected.provider_identity_id,
    actor_id: "emp-1",
    reason: "사용자가 Outlook 연결을 해제함",
  });
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-2",
      provider_subject_id: "subject-1",
      consent_ref: "consent-2",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_SUBJECT_REBIND_REQUIRED",
  );
});

test("latest approved subject owner may reconnect without rebind while an older owner may not", () => {
  const store = registry();
  const first = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    provider_identity_id: "provider-a",
    consent_ref: "consent-1",
  });
  store.disconnect({ tenant_id: "tenant-a", provider_identity_id: first.provider_identity_id });
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-2",
      provider_subject_id: "subject-1",
      consent_ref: "consent-2",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_SUBJECT_REBIND_REQUIRED",
  );
  const rebound = store.rebind({
    tenant_id: "tenant-a",
    source_provider_identity_id: first.provider_identity_id,
    provider_identity_id: "provider-b",
    employee_id: "emp-2",
    consent_ref: "consent-approved",
    rebind_approval_ref: "approval-latest-owner",
    approved_by_actor_id: "security-admin-1",
    reason: "인사기록 정정 승인",
  });
  store.disconnect({ tenant_id: "tenant-a", provider_identity_id: rebound.provider_identity_id });
  const reconnect = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-2",
    provider_subject_id: "subject-1",
    consent_ref: "consent-reconnect",
  });
  assert.equal(reconnect.employee_id, "emp-2");
  store.disconnect({ tenant_id: "tenant-a", provider_identity_id: reconnect.provider_identity_id });
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-1",
      provider_subject_id: "subject-1",
      consent_ref: "consent-old-owner",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_SUBJECT_REBIND_REQUIRED",
  );
});

test("subject ownership follows durable record order when callback clocks move backwards", () => {
  const timestamps = [
    "2027-01-01T00:00:00.000Z",
    "2027-01-02T00:00:00.000Z",
    "2026-01-01T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
    "2026-01-03T00:00:00.000Z",
    "2026-01-04T00:00:00.000Z",
  ];
  const store = createPeopleProviderIdentityRegistry({ clock: () => timestamps.shift() });
  const source = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    provider_identity_id: "provider-a",
    consent_ref: "consent-a",
  });
  store.disconnect({ tenant_id: "tenant-a", provider_identity_id: source.provider_identity_id });
  const rebound = store.rebind({
    tenant_id: "tenant-a",
    source_provider_identity_id: source.provider_identity_id,
    provider_identity_id: "provider-b",
    employee_id: "emp-2",
    consent_ref: "consent-b",
    rebind_approval_ref: "approval-backward-clock",
    approved_by_actor_id: "security-admin-1",
    reason: "인사기록 정정 승인",
  });
  store.disconnect({ tenant_id: "tenant-a", provider_identity_id: rebound.provider_identity_id });
  const reconnect = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-2",
    provider_subject_id: "subject-1",
    consent_ref: "consent-b-reconnect",
  });
  assert.equal(reconnect.employee_id, "emp-2");
  store.disconnect({ tenant_id: "tenant-a", provider_identity_id: reconnect.provider_identity_id });
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-1",
      provider_subject_id: "subject-1",
      consent_ref: "consent-a-reconnect",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_SUBJECT_REBIND_REQUIRED",
  );
});

test("provider identity ids are unique only within a tenant and tenant-scoped mutations do not leak", () => {
  const store = registry();
  const tenantA = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-a",
    provider_subject_id: "subject-a",
    provider_identity_id: "shared-provider-id",
    consent_ref: "consent-a",
  });
  const tenantB = store.connect({
    tenant_id: "tenant-b",
    employee_id: "emp-b",
    provider_subject_id: "subject-b",
    provider_identity_id: "shared-provider-id",
    consent_ref: "consent-b",
  });
  assert.equal(tenantA.provider_identity_id, tenantB.provider_identity_id);
  assert.throws(
    () => store.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-a-2",
      provider_subject_id: "subject-a-2",
      provider_identity_id: "shared-provider-id",
      consent_ref: "consent-a-2",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_IDENTITY_DUPLICATE",
  );
  store.disconnect({ tenant_id: "tenant-b", provider_identity_id: tenantB.provider_identity_id });
  assert.equal(store.get({ tenant_id: "tenant-a", employee_id: "emp-a" }).provider_identity_id, "shared-provider-id");
  assert.equal(store.get({ tenant_id: "tenant-b", employee_id: "emp-b" }), null);
  assert.throws(
    () => store.disconnect({ tenant_id: "tenant-a", provider_identity_id: "missing-provider-id" }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_IDENTITY_NOT_FOUND",
  );
});

test("explicit rebind is audited, idempotent, and tenant scoped", () => {
  const store = registry();
  const connected = store.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    consent_ref: "consent-1",
  });
  store.disconnect({
    tenant_id: "tenant-a",
    provider_identity_id: connected.provider_identity_id,
  });
  const request = {
    tenant_id: "tenant-a",
    source_provider_identity_id: connected.provider_identity_id,
    provider_identity_id: "provider-target-1",
    employee_id: "emp-2",
    consent_ref: "consent-2",
    rebind_approval_ref: "approval-1",
    approved_by_actor_id: "security-admin-1",
    reason: "인사기록 정정 승인",
  };
  const rebound = store.rebind(request);
  const replay = store.rebind(request);
  assert.deepEqual(replay, rebound);
  assert.equal(rebound.employee_id, "emp-2");
  assert.equal(rebound.provider_subject_id, "subject-1");
  assert.equal(rebound.rebind_from_provider_identity_id, connected.provider_identity_id);
  assert.equal(store.snapshot().rebind_receipts.length, 1);
  assert.equal(
    store.snapshot().audit_events.filter(({ action }) => action === "people.provider_identity.rebound").length,
    1,
  );
  assert.throws(
    () => store.rebind({
      ...request,
      reason: "다른 인사기록 정정 승인",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_REBIND_APPROVAL_REUSED",
  );
  assert.throws(
    () => store.rebind({
      ...request,
      consent_ref: "consent-not-approved",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_REBIND_APPROVAL_REUSED",
  );
  assert.throws(
    () => store.rebind({
      ...request,
      provider_identity_id: "provider-target-not-approved",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_REBIND_APPROVAL_REUSED",
  );
  assert.throws(
    () => store.rebind({
      ...request,
      tenant_id: "tenant-b",
      employee_id: "emp-3",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_IDENTITY_NOT_FOUND",
  );
  const otherTenant = store.connect({
    tenant_id: "tenant-b",
    employee_id: "emp-3",
    provider_subject_id: "subject-1",
    consent_ref: "consent-3",
  });
  assert.equal(otherTenant.connection_state, "connected");
});

test("durable provider history and revoke audit survive restart", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-provider-identity-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "provider-identities.json");
  const first = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-07-30T00:00:00.000Z",
  });
  const connected = first.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    consent_ref: "consent-1",
  });
  first.disconnect({
    tenant_id: "tenant-a",
    provider_identity_id: connected.provider_identity_id,
    actor_id: "emp-1",
    reason: "사용자가 Outlook 연결을 해제함",
  });

  const restarted = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-07-30T00:01:00.000Z",
  });
  assert.equal(restarted.get({ tenant_id: "tenant-a", employee_id: "emp-1" }), null);
  assert.equal(restarted.history({ tenant_id: "tenant-a", employee_id: "emp-1" }).length, 1);
  assert.deepEqual(restarted.snapshot().audit_events.map(({ action }) => action), [
    "people.provider_identity.connected",
    "people.provider_identity.disconnected",
  ]);
  assert.throws(
    () => restarted.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-2",
      provider_subject_id: "subject-1",
      consent_ref: "consent-2",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_SUBJECT_REBIND_REQUIRED",
  );
  const rebindRequest = {
    tenant_id: "tenant-a",
    source_provider_identity_id: connected.provider_identity_id,
    provider_identity_id: "provider-target-durable",
    employee_id: "emp-2",
    consent_ref: "consent-approved",
    rebind_approval_ref: "approval-durable",
    approved_by_actor_id: "security-admin-1",
    reason: "인사기록 정정 승인",
  };
  const rebound = restarted.rebind(rebindRequest);
  assert.equal(rebound.provider_identity_id, "provider-target-durable");

  const afterRebindRestart = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-07-30T00:02:00.000Z",
  });
  assert.deepEqual(afterRebindRestart.rebind(rebindRequest), rebound);
  afterRebindRestart.disconnect({
    tenant_id: "tenant-a",
    provider_identity_id: rebound.provider_identity_id,
  });
  const reconnect = afterRebindRestart.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-2",
    provider_subject_id: "subject-1",
    consent_ref: "consent-reconnect-after-restart",
  });
  assert.equal(reconnect.employee_id, "emp-2");
  afterRebindRestart.disconnect({
    tenant_id: "tenant-a",
    provider_identity_id: reconnect.provider_identity_id,
  });
  assert.throws(
    () => afterRebindRestart.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-1",
      provider_subject_id: "subject-1",
      consent_ref: "consent-old-owner-after-restart",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_SUBJECT_REBIND_REQUIRED",
  );
  assert.throws(
    () => afterRebindRestart.rebind({
      ...rebindRequest,
      consent_ref: "consent-not-approved",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_REBIND_APPROVAL_REUSED",
  );
});

test("durable record order preserves the latest owner across restart and backward clocks", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-provider-identity-backward-clock-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "provider-identities.json");
  const first = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2027-01-01T00:00:00.000Z",
  });
  const source = first.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    provider_identity_id: "provider-a",
    consent_ref: "consent-a",
  });
  first.disconnect({ tenant_id: "tenant-a", provider_identity_id: source.provider_identity_id });

  const reboundRegistry = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-01-01T00:00:00.000Z",
  });
  const rebound = reboundRegistry.rebind({
    tenant_id: "tenant-a",
    source_provider_identity_id: source.provider_identity_id,
    provider_identity_id: "provider-b",
    employee_id: "emp-2",
    consent_ref: "consent-b",
    rebind_approval_ref: "approval-backward-clock-restart",
    approved_by_actor_id: "security-admin-1",
    reason: "인사기록 정정 승인",
  });
  reboundRegistry.disconnect({ tenant_id: "tenant-a", provider_identity_id: rebound.provider_identity_id });

  const reconnectRegistry = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-01-02T00:00:00.000Z",
  });
  const reconnect = reconnectRegistry.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-2",
    provider_subject_id: "subject-1",
    consent_ref: "consent-b-reconnect",
  });
  assert.equal(reconnect.employee_id, "emp-2");
  reconnectRegistry.disconnect({ tenant_id: "tenant-a", provider_identity_id: reconnect.provider_identity_id });

  const finalRestart = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-01-03T00:00:00.000Z",
  });
  assert.throws(
    () => finalRestart.connect({
      tenant_id: "tenant-a",
      employee_id: "emp-1",
      provider_subject_id: "subject-1",
      consent_ref: "consent-a-reconnect",
    }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_SUBJECT_REBIND_REQUIRED",
  );
});

test("two live durable registries replay an identical concurrent rebind and reject a mismatched one", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-provider-identity-concurrent-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "provider-identities.json");
  const seed = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-07-30T00:00:00.000Z",
  });
  const source = seed.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    provider_identity_id: "provider-source",
    consent_ref: "consent-source",
  });
  seed.disconnect({ tenant_id: "tenant-a", provider_identity_id: source.provider_identity_id });

  const winner = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-07-30T00:01:00.000Z",
  });
  const identicalLoser = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-07-30T00:02:00.000Z",
  });
  const mismatchedLoser = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
    clock: () => "2026-07-30T00:03:00.000Z",
  });
  const request = {
    tenant_id: "tenant-a",
    source_provider_identity_id: source.provider_identity_id,
    provider_identity_id: "provider-target",
    employee_id: "emp-2",
    consent_ref: "consent-target",
    rebind_approval_ref: "approval-concurrent",
    approved_by_actor_id: "security-admin-1",
    reason: "인사기록 정정 승인",
  };
  const persisted = winner.rebind(request);
  assert.deepEqual(identicalLoser.rebind(request), persisted);
  assert.throws(
    () => mismatchedLoser.rebind({ ...request, consent_ref: "consent-different" }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_REBIND_APPROVAL_REUSED",
  );
  const restarted = createPeopleProviderIdentityRegistry({
    repository: createDurablePeopleProviderIdentityRepository({ filePath }),
  });
  assert.deepEqual(restarted.rebind(request), persisted);
});

test("unrelated durable conflicts are not converted into a successful rebind", () => {
  const seed = registry();
  const source = seed.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_subject_id: "subject-1",
    provider_identity_id: "provider-source",
    consent_ref: "consent-source",
  });
  seed.disconnect({ tenant_id: "tenant-a", provider_identity_id: source.provider_identity_id });
  const base = createTestPeopleProviderIdentityRepository({ state: seed.snapshot() });
  let replaceAttempts = 0;
  const conflictRepository = Object.freeze({
    durable: true,
    test_only: false,
    loadState: base.loadState,
    replaceState() {
      replaceAttempts += 1;
      const error = new Error("durable store generation conflict");
      error.code = "LAWOS_STORE_CONFLICT";
      throw error;
    },
  });
  const store = createPeopleProviderIdentityRegistry({ repository: conflictRepository });
  assert.throws(
    () => store.rebind({
      tenant_id: "tenant-a",
      source_provider_identity_id: source.provider_identity_id,
      provider_identity_id: "provider-target",
      employee_id: "emp-2",
      consent_ref: "consent-target",
      rebind_approval_ref: "approval-conflict",
      approved_by_actor_id: "security-admin-1",
      reason: "인사기록 정정 승인",
    }),
    (error) => error.code === "LAWOS_STORE_CONFLICT",
  );
  assert.equal(replaceAttempts, 2);
});

test("operational identity repository gate rejects the in-memory test adapter", () => {
  const repository = createTestPeopleProviderIdentityRepository();
  assert.throws(
    () => assertOperationalPeopleProviderIdentityRepository(repository),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_IDENTITY_DURABLE_REPOSITORY_REQUIRED",
  );
  assert.throws(
    () => createPeopleProviderIdentityRegistry({ repository, operational: true }),
    (error) => error.safe_error_code === "PEOPLE_PROVIDER_IDENTITY_DURABLE_REPOSITORY_REQUIRED",
  );
});
