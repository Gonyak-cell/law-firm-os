import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertOperationalOutlookConsentRepository,
  assertOperationalOutlookTokenVault,
  createDurableOutlookConsentRepository,
  createInMemoryOpaqueTokenVault,
  createOutlookConsentService,
  createTestOnlyInMemoryOpaqueTokenVault,
  createTestOutlookConsentRepository,
} from "../src/outlook-token-vault.js";

function setup() {
  let now = "2026-07-30T00:00:00.000Z";
  const vault = createTestOnlyInMemoryOpaqueTokenVault();
  const service = createOutlookConsentService({ vault, clock: () => now });
  return { vault, service, setNow: (value) => { now = value; } };
}

function consentGrant(overrides = {}) {
  return {
    tenant_id: "tenant-a",
    provider_identity_id: "provider-1",
    consent_ref: "consent-1",
    grant_type: "delegated",
    scopes: ["Calendars.ReadBasic"],
    access_token: "raw-access-token",
    refresh_token: "raw-refresh-token",
    expires_at: "2026-07-30T00:30:00.000Z",
    ...overrides,
  };
}

function operationalContractVault(backing = {}, overrides = {}) {
  const base = createTestOnlyInMemoryOpaqueTokenVault({ backing });
  return Object.freeze({
    ...base,
    durable: true,
    opaque_at_rest: true,
    failure_atomic_transitions: true,
    staged_refs_provider_inaccessible: true,
    test_only: false,
    ...overrides,
  });
}

function faultInjectingRepository() {
  const base = createTestOutlookConsentRepository();
  let writes = 0;
  let failAt = null;
  return {
    port: {
      durable: true,
      test_only: false,
      loadState: () => base.loadState(),
      replaceState(nextState) {
        writes += 1;
        if (writes === failAt) throw new Error("injected metadata commit failure");
        return base.replaceState(nextState);
      },
    },
    failAfter(offset = 1) {
      failAt = writes + offset;
    },
  };
}

function activeVaultRefs(vault) {
  return vault.snapshot()
    .filter(({ state }) => state === "active")
    .map(({ ref }) => ref)
    .sort();
}

function consentRefs(service) {
  const [record] = service.snapshot();
  return [record.access_token_ref, record.refresh_token_ref].sort();
}

function storedConsentState(overrides = {}) {
  return {
    schema_version: "outlook-consent-metadata.v2",
    records: [{
      tenant_id: "tenant-a",
      provider_identity_id: "provider-1",
      consent_ref: "consent-1",
      connection_state: "active",
      access_token_ref: "vault:tenant-a:outlook-access:1",
      refresh_token_ref: "vault:tenant-a:outlook-refresh:2",
      expires_at: "2026-07-30T01:00:00.000Z",
      scope_hash: `sha256:${"0".repeat(64)}`,
      key_version: "v1",
      revoked_at: null,
      ...overrides,
    }],
    audit_events: [],
  };
}

test("Outlook consent stores only opaque refs for delegated Calendars.ReadBasic", () => {
  const { vault, service } = setup();
  const consent = service.grant({
    tenant_id: "tenant-a",
    provider_identity_id: "provider-1",
    consent_ref: "consent-1",
    grant_type: "delegated",
    scopes: ["Calendars.ReadBasic"],
    access_token: "raw-access-token",
    refresh_token: "raw-refresh-token",
    expires_at: "2026-07-30T01:00:00.000Z",
  });
  assert.match(consent.access_token_ref, /^vault:/);
  assert.match(consent.refresh_token_ref, /^vault:/);
  const serialized = JSON.stringify({ consent, state: service.snapshot(), vault: vault.snapshot() });
  assert.equal(serialized.includes("raw-access-token"), false);
  assert.equal(serialized.includes("raw-refresh-token"), false);
  assert.equal(serialized.includes('"access_token":'), false);
  assert.equal(serialized.includes('"refresh_token":'), false);
});

test("overbroad or application scopes are rejected", () => {
  const { service } = setup();
  assert.throws(
    () => service.grant({
      tenant_id: "tenant-a",
      provider_identity_id: "provider-1",
      consent_ref: "consent-1",
      grant_type: "delegated",
      scopes: ["Calendars.Read"],
      access_token: "x",
      refresh_token: "y",
      expires_at: "2026-07-30T01:00:00.000Z",
    }),
    (error) => error.safe_error_code === "OUTLOOK_SCOPE_NOT_ALLOWED",
  );
  assert.throws(
    () => service.grant({
      tenant_id: "tenant-a",
      provider_identity_id: "provider-1",
      consent_ref: "consent-2",
      grant_type: "application",
      scopes: ["Calendars.ReadBasic"],
      access_token: "x",
      refresh_token: "y",
      expires_at: "2026-07-30T01:00:00.000Z",
    }),
    (error) => error.safe_error_code === "OUTLOOK_SCOPE_NOT_ALLOWED",
  );
});

test("restart rejects raw-looking stored token references before they can be exposed", () => {
  const repository = createTestOutlookConsentRepository({
    state: {
      ...storedConsentState({
        access_token_ref: "rawAccessSecret",
        refresh_token_ref: "rawRefreshSecret",
      }),
      access_token: "legacyRootAccessSecret",
      refresh_token: "legacyRootRefreshSecret",
    },
  });
  const normalized = JSON.stringify(repository.loadState());
  assert.equal(normalized.includes("legacyRootAccessSecret"), false);
  assert.equal(normalized.includes("legacyRootRefreshSecret"), false);
  assert.throws(
    () => createOutlookConsentService({
      vault: createTestOnlyInMemoryOpaqueTokenVault(),
      repository,
    }),
    (error) => (
      error.safe_error_code === "OUTLOOK_CONSENT_TOKEN_REF_INVALID"
      && !error.message.includes("rawAccessSecret")
      && !error.message.includes("rawRefreshSecret")
    ),
  );
});

test("restart rejects stored references that are missing from the configured vault", () => {
  const repository = createTestOutlookConsentRepository({
    state: storedConsentState(),
  });
  assert.throws(
    () => createOutlookConsentService({
      vault: createTestOnlyInMemoryOpaqueTokenVault(),
      repository,
    }),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_TOKEN_REF_INVALID",
  );
});

test("restart rejects stored references owned by another tenant without disclosing them", () => {
  const vault = createTestOnlyInMemoryOpaqueTokenVault();
  const accessRef = vault.put({
    tenant_id: "tenant-b",
    kind: "outlook-access",
    value: "other-tenant-access",
  });
  const refreshRef = vault.put({
    tenant_id: "tenant-b",
    kind: "outlook-refresh",
    value: "other-tenant-refresh",
  });
  const repository = createTestOutlookConsentRepository({
    state: storedConsentState({
      access_token_ref: accessRef,
      refresh_token_ref: refreshRef,
    }),
  });
  assert.throws(
    () => createOutlookConsentService({ vault, repository }),
    (error) => (
      error.safe_error_code === "OUTLOOK_CONSENT_TOKEN_REF_INVALID"
      && !error.message.includes(accessRef)
      && !error.message.includes(refreshRef)
    ),
  );
});

test("restart rejects stored references whose vault kinds do not match consent fields", () => {
  const vault = createTestOnlyInMemoryOpaqueTokenVault();
  const accessRef = vault.put({
    tenant_id: "tenant-a",
    kind: "outlook-refresh",
    value: "wrong-kind-access",
  });
  const refreshRef = vault.put({
    tenant_id: "tenant-a",
    kind: "outlook-access",
    value: "wrong-kind-refresh",
  });
  const repository = createTestOutlookConsentRepository({
    state: storedConsentState({
      access_token_ref: accessRef,
      refresh_token_ref: refreshRef,
    }),
  });
  assert.throws(
    () => createOutlookConsentService({ vault, repository }),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_TOKEN_REF_INVALID",
  );
});

test("restart validates token references nested in pending previous and target records", () => {
  const vault = createTestOnlyInMemoryOpaqueTokenVault();
  const previous = storedConsentState({
    access_token_ref: vault.put({
      tenant_id: "tenant-a",
      kind: "outlook-access",
      value: "previous-access",
    }),
    refresh_token_ref: vault.put({
      tenant_id: "tenant-a",
      kind: "outlook-refresh",
      value: "previous-refresh",
    }),
  }).records[0];
  const target = {
    ...previous,
    access_token_ref: "rawPendingAccess",
    refresh_token_ref: "rawPendingRefresh",
  };
  const repository = createTestOutlookConsentRepository({
    state: {
      schema_version: "outlook-consent-metadata.v2",
      records: [{
        ...target,
        connection_state: "transition_pending",
        pending_operation: {
          operation_id: "outlook-op:pending-raw-ref",
          transition: "refresh",
          previous_record: previous,
          target_record: target,
          audit_action: "outlook.consent.refreshed",
          actor_id: null,
          occurred_at: "2026-07-30T00:30:00.000Z",
        },
      }],
      audit_events: [],
    },
  });
  assert.throws(
    () => createOutlookConsentService({ vault, repository }),
    (error) => (
      error.safe_error_code === "OUTLOOK_CONSENT_TOKEN_REF_INVALID"
      && !error.message.includes("rawPendingAccess")
      && !error.message.includes("rawPendingRefresh")
    ),
  );
});

test("opaque token references are tenant bound for resolve, revoke, and rotate", () => {
  const vault = createTestOnlyInMemoryOpaqueTokenVault();
  const ref = vault.put({
    tenant_id: "tenant-a",
    kind: "outlook-access",
    value: "secret",
    key_version: "v1",
  });
  for (const operation of [
    () => vault.resolveForProvider({ tenant_id: "tenant-b", ref }),
    () => vault.revoke({ tenant_id: "tenant-b", ref }),
    () => vault.rotate({ tenant_id: "tenant-b", ref, key_version: "v2" }),
    () => vault.resolveForProvider({ tenant_id: "tenant-a", ref: "unknown-token-ref" }),
  ]) {
    assert.throws(
      operation,
      (error) => error.safe_error_code === "OUTLOOK_TOKEN_NOT_FOUND",
    );
  }
  assert.equal(vault.resolveForProvider({ tenant_id: "tenant-a", ref }), "secret");
});

test("durable consent metadata and revoke audit survive restart without token plaintext", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-outlook-consent-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "outlook-consent.json");
  const vault = createTestOnlyInMemoryOpaqueTokenVault();
  const first = createOutlookConsentService({
    vault,
    repository: createDurableOutlookConsentRepository({ filePath }),
    clock: () => "2026-07-30T00:00:00.000Z",
  });
  first.grant({
    tenant_id: "tenant-a",
    provider_identity_id: "provider-1",
    consent_ref: "consent-1",
    grant_type: "delegated",
    scopes: ["Calendars.ReadBasic"],
    access_token: "restart-access-token",
    refresh_token: "restart-refresh-token",
    expires_at: "2026-07-30T01:00:00.000Z",
  });

  const restarted = createOutlookConsentService({
    vault,
    repository: createDurableOutlookConsentRepository({ filePath }),
    clock: () => "2026-07-30T00:10:00.000Z",
  });
  const resolved = restarted.resolveCredential({
    tenant_id: "tenant-a",
    consent_ref: "consent-1",
  });
  assert.match(resolved.credential_ref, /^vault:/);
  restarted.revoke({
    tenant_id: "tenant-a",
    consent_ref: "consent-1",
    actor_id: "emp-1",
  });

  const afterRevokeRestart = createOutlookConsentService({
    vault,
    repository: createDurableOutlookConsentRepository({ filePath }),
    clock: () => "2026-07-30T00:11:00.000Z",
  });
  assert.equal(afterRevokeRestart.snapshot()[0].connection_state, "revoked");
  assert.deepEqual(afterRevokeRestart.auditSnapshot().map(({ action }) => action), [
    "outlook.consent.granted",
    "outlook.consent.revoked",
  ]);
  assert.throws(
    () => afterRevokeRestart.resolveCredential({
      tenant_id: "tenant-a",
      consent_ref: "consent-1",
    }),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_REVOKED",
  );
  const persisted = readFileSync(filePath, "utf8");
  assert.equal(persisted.includes("restart-access-token"), false);
  assert.equal(persisted.includes("restart-refresh-token"), false);
});

test("operational vault gate rejects the explicit in-memory test adapter", () => {
  const testRepository = createTestOutlookConsentRepository();
  assert.throws(
    () => assertOperationalOutlookConsentRepository(testRepository),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_DURABLE_REPOSITORY_REQUIRED",
  );
  assert.throws(
    () => assertOperationalOutlookTokenVault(createTestOnlyInMemoryOpaqueTokenVault()),
    (error) => error.safe_error_code === "OUTLOOK_OPERATIONAL_VAULT_REQUIRED",
  );
  const operationalPort = {
    reference_prefix: "external-vault:",
    durable: true,
    opaque_at_rest: true,
    failure_atomic_transitions: true,
    staged_refs_provider_inaccessible: true,
    test_only: false,
    stageTransition() {},
    commitTransition() {},
    abortTransition() {},
    getTransition() {},
    describeRef() {},
    resolveForProvider() {},
  };
  assert.equal(assertOperationalOutlookTokenVault(operationalPort), operationalPort);
});

test("consent rejects a vault adapter that returns raw token material as its reference", () => {
  const aborted = [];
  const unsafeVault = {
    reference_prefix: "vault:",
    stageTransition({ tenant_id, operation_id, creates }) {
      return {
        operation_id,
        status: "staged",
        refs: Object.fromEntries(creates.map((create) => [
          create.key,
          {
            opaque_ref: true,
            tenant_id,
            kind: create.kind,
            ref: create.value,
          },
        ])),
      };
    },
    commitTransition() {},
    abortTransition(input) {
      aborted.push(input);
      return { status: "aborted", refs: {} };
    },
    getTransition() {},
    describeRef() {},
    resolveForProvider() {},
  };
  const service = createOutlookConsentService({ vault: unsafeVault });
  assert.throws(
    () => service.grant({
      tenant_id: "tenant-a",
      provider_identity_id: "provider-1",
      consent_ref: "consent-1",
      grant_type: "delegated",
      scopes: ["Calendars.ReadBasic"],
      access_token: "rawtoken",
      refresh_token: "rawrefresh",
      expires_at: "2026-07-30T01:00:00.000Z",
    }),
    (error) => error.safe_error_code === "OUTLOOK_VAULT_RETURNED_RAW_TOKEN",
  );
  assert.equal(aborted.length, 1);
  assert.equal(aborted[0].tenant_id, "tenant-a");
  assert.match(aborted[0].operation_id, /^outlook-op:/);
  assert.deepEqual(service.snapshot(), []);
});

test("startup uses the durable pre-stage intent to abort secrets left without a consent record", (t) => {
  const base = createTestOnlyInMemoryOpaqueTokenVault();
  const dir = mkdtempSync(join(tmpdir(), "lawos-outlook-operation-intent-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "outlook-consent.json");
  const repository = createDurableOutlookConsentRepository({ filePath });
  const interruptedVault = {
    ...base,
    stageTransition(input) {
      base.stageTransition(input);
      throw new Error("simulated process stop after stage");
    },
    getTransition() {
      throw new Error("simulated process is no longer available");
    },
  };
  const interrupted = createOutlookConsentService({
    vault: interruptedVault,
    repository,
    clock: () => "2026-07-30T00:00:00.000Z",
  });
  assert.throws(
    () => interrupted.grant(consentGrant({
      access_token: "crash-access",
      refresh_token: "crash-refresh",
    })),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_TRANSITION_PENDING",
  );
  const [intent] = repository.loadState().operation_intents;
  assert.match(intent.operation_id, /^outlook-op:/);
  assert.deepEqual(repository.loadState().records, []);
  assert.equal(base.snapshot().filter(({ state }) => state === "staged").length, 2);
  const persistedIntent = readFileSync(filePath, "utf8");
  assert.equal(persistedIntent.includes(intent.operation_id), true);
  assert.equal(persistedIntent.includes("crash-access"), false);
  assert.equal(persistedIntent.includes("crash-refresh"), false);

  const justBeforeExpiry = new Date(
    Date.parse(intent.recover_after) - 1,
  ).toISOString();
  const freshRestart = createOutlookConsentService({
    vault: base,
    repository: createDurableOutlookConsentRepository({ filePath }),
    clock: () => justBeforeExpiry,
  });
  assert.deepEqual(freshRestart.recoverySnapshot(), []);
  assert.equal(base.getTransition({
    tenant_id: "tenant-a",
    operation_id: intent.operation_id,
  }).status, "staged");
  assert.equal(
    createDurableOutlookConsentRepository({ filePath }).loadState().operation_intents.length,
    1,
  );

  const restartedRepository = createDurableOutlookConsentRepository({ filePath });
  const recovered = createOutlookConsentService({
    vault: base,
    repository: restartedRepository,
    clock: () => intent.recover_after,
  });
  assert.deepEqual(recovered.snapshot(), []);
  assert.equal(base.getTransition({
    tenant_id: "tenant-a",
    operation_id: intent.operation_id,
  }).status, "aborted");
  assert.deepEqual(restartedRepository.loadState().operation_intents, []);
  assert.equal(base.snapshot().filter(({ state }) => state === "staged").length, 0);
  assert.equal(JSON.stringify(base.snapshot()).includes("crash-access"), false);
  assert.equal(JSON.stringify(base.snapshot()).includes("crash-refresh"), false);
});

test("a second live coordinator does not recover another coordinator's fresh intent", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-outlook-live-intent-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "outlook-consent.json");
  const base = createTestOnlyInMemoryOpaqueTokenVault();
  let observer = null;
  let stagedOperationId = null;
  const firstVault = {
    ...base,
    stageTransition(input) {
      const staged = base.stageTransition(input);
      stagedOperationId = input.operation_id;
      observer = createOutlookConsentService({
        vault: base,
        repository: createDurableOutlookConsentRepository({ filePath }),
        clock: () => "2026-07-30T00:00:00.000Z",
      });
      assert.deepEqual(observer.recoverySnapshot(), []);
      assert.equal(base.getTransition({
        tenant_id: input.tenant_id,
        operation_id: input.operation_id,
      }).status, "staged");
      return staged;
    },
  };
  const first = createOutlookConsentService({
    vault: firstVault,
    repository: createDurableOutlookConsentRepository({ filePath }),
    clock: () => "2026-07-30T00:00:00.000Z",
  });

  const consent = first.grant(consentGrant());

  assert.equal(consent.connection_state, "active");
  assert.ok(observer);
  assert.equal(base.getTransition({
    tenant_id: "tenant-a",
    operation_id: stagedOperationId,
  }).status, "committed");
  const persisted = createDurableOutlookConsentRepository({ filePath }).loadState();
  assert.deepEqual(persisted.operation_intents, []);
  assert.equal(persisted.records[0].connection_state, "active");
  assert.equal(observer.snapshot()[0].connection_state, "active");
});

test("a lost stage response is discovered and aborted before returning the error", () => {
  const base = createTestOnlyInMemoryOpaqueTokenVault();
  const lostResponseVault = {
    ...base,
    stageTransition(input) {
      base.stageTransition(input);
      throw new Error("injected lost stage response");
    },
  };
  const service = createOutlookConsentService({ vault: lostResponseVault });

  assert.throws(
    () => service.grant(consentGrant()),
    /injected lost stage response/,
  );
  const [{ operation_id: operationId }] = base.snapshot();
  assert.equal(base.getTransition({
    tenant_id: "tenant-a",
    operation_id: operationId,
  }).status, "aborted");
  assert.equal(base.snapshot().filter(({ state }) => state === "staged").length, 0);
  assert.deepEqual(service.snapshot(), []);
});

test("startup retry repairs an unbound staged transition without retaining an exception", () => {
  const base = createTestOnlyInMemoryOpaqueTokenVault();
  const repository = createTestOutlookConsentRepository();
  const interrupted = createOutlookConsentService({
    repository,
    vault: {
      ...base,
      stageTransition(input) {
        base.stageTransition(input);
        throw new Error("simulated process stop after stage");
      },
      getTransition() {
        throw new Error("simulated process is no longer available");
      },
    },
    clock: () => "2026-07-30T00:00:00.000Z",
  });
  assert.throws(
    () => interrupted.grant(consentGrant({
      access_token: "retry-access",
      refresh_token: "retry-refresh",
    })),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_TRANSITION_PENDING",
  );
  const [intent] = repository.loadState().operation_intents;
  const abortUnavailable = {
    ...base,
    abortTransition() {
      throw new Error("injected vault abort outage");
    },
  };
  const blocked = createOutlookConsentService({
    vault: abortUnavailable,
    repository,
    clock: () => intent.recover_after,
  });
  assert.deepEqual(blocked.recoverySnapshot(), [{
    operation_id: intent.operation_id,
    outcome: "pending",
    safe_error_code: "OUTLOOK_CONSENT_INTENT_RECOVERY_FAILED",
  }]);
  assert.throws(
    () => blocked.grant(consentGrant()),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_ALREADY_EXISTS",
  );
  assert.equal(base.getTransition({
    tenant_id: "tenant-a",
    operation_id: intent.operation_id,
  }).status, "staged");

  const recovered = createOutlookConsentService({
    vault: base,
    repository,
    clock: () => intent.recover_after,
  });
  assert.deepEqual(recovered.snapshot(), []);
  assert.equal(base.getTransition({
    tenant_id: "tenant-a",
    operation_id: intent.operation_id,
  }).status, "aborted");
  assert.deepEqual(repository.loadState().operation_intents, []);
});

test("failed staged refresh metadata write aborts new refs and keeps old credentials active", () => {
  let now = "2026-07-30T00:00:00.000Z";
  const vault = operationalContractVault();
  const repository = faultInjectingRepository();
  const service = createOutlookConsentService({
    vault,
    repository: repository.port,
    clock: () => now,
    operational: true,
  });
  service.grant(consentGrant());
  const originalRefs = consentRefs(service);
  now = "2026-07-30T00:31:00.000Z";
  repository.failAfter(2);
  assert.throws(
    () => service.resolveCredential({
      tenant_id: "tenant-a",
      consent_ref: "consent-1",
      refresh: () => ({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_at: "2026-07-30T01:31:00.000Z",
      }),
    }),
    /injected metadata commit failure/,
  );
  assert.equal(service.snapshot()[0].connection_state, "active");
  assert.deepEqual(activeVaultRefs(vault), originalRefs);
  assert.equal(vault.snapshot().some(({ state }) => state === "staged"), false);
});

test("failed staged-transition cleanup surfaces a durable vault repair reference", () => {
  const baseVault = operationalContractVault();
  const vault = Object.freeze({
    ...baseVault,
    abortTransition() {
      throw new Error("injected vault abort failure");
    },
  });
  const repository = faultInjectingRepository();
  repository.failAfter(2);
  const service = createOutlookConsentService({
    vault,
    repository: repository.port,
    clock: () => "2026-07-30T00:00:00.000Z",
    operational: true,
  });
  assert.throws(
    () => service.grant(consentGrant()),
    (error) => (
      error.repair_required === true
      && /^outlook-op:/.test(error.repair_operation_id)
      && error.cleanup_safe_error_code === "OUTLOOK_VAULT_ABORT_FAILED"
    ),
  );
  assert.deepEqual(activeVaultRefs(vault), []);
  assert.equal(vault.snapshot().every(({ state }) => state === "staged"), true);
  assert.deepEqual(service.snapshot(), []);
});

test("failed refresh vault commit remains pending and restart recovers without active orphan refs", () => {
  let now = "2026-07-30T00:00:00.000Z";
  const backing = {};
  const baseVault = operationalContractVault(backing);
  let failCommit = false;
  const vault = Object.freeze({
    ...baseVault,
    commitTransition(input) {
      if (failCommit) {
        failCommit = false;
        throw new Error("injected vault commit failure");
      }
      return baseVault.commitTransition(input);
    },
  });
  const repository = faultInjectingRepository().port;
  const service = createOutlookConsentService({
    vault,
    repository,
    clock: () => now,
    operational: true,
  });
  service.grant(consentGrant());
  const oldRefs = consentRefs(service);
  now = "2026-07-30T00:31:00.000Z";
  failCommit = true;
  assert.throws(
    () => service.resolveCredential({
      tenant_id: "tenant-a",
      consent_ref: "consent-1",
      refresh: () => ({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_at: "2026-07-30T01:31:00.000Z",
      }),
    }),
    (error) => (
      error.safe_error_code === "OUTLOOK_CONSENT_TRANSITION_PENDING"
      && error.repair_required === true
    ),
  );
  assert.equal(service.snapshot()[0].connection_state, "transition_pending");
  assert.deepEqual(activeVaultRefs(vault), oldRefs);

  const restarted = createOutlookConsentService({
    vault,
    repository,
    clock: () => now,
    operational: true,
  });
  assert.equal(restarted.snapshot()[0].connection_state, "active");
  assert.deepEqual(activeVaultRefs(vault), consentRefs(restarted));
  assert.equal(vault.snapshot().some(({ state }) => state === "staged"), false);
});

test("rotation final metadata failure is recoverable and never snapshots raw adapter output", () => {
  const backing = {};
  const baseVault = operationalContractVault(backing);
  let corruptRotationRef = false;
  const vault = Object.freeze({
    ...baseVault,
    stageTransition(input) {
      const staged = baseVault.stageTransition(input);
      if (!corruptRotationRef || !input.creates.every(({ copy_ref }) => Boolean(copy_ref))) {
        return staged;
      }
      return {
        ...staged,
        refs: {
          access: { ...staged.refs.access, ref: "rawaccess" },
          refresh: { ...staged.refs.refresh, ref: "rawrefresh" },
        },
      };
    },
  });
  const repository = faultInjectingRepository().port;
  const service = createOutlookConsentService({
    vault,
    repository,
    clock: () => "2026-07-30T00:00:00.000Z",
    operational: true,
  });
  service.grant(consentGrant());
  const originalRefs = consentRefs(service);
  corruptRotationRef = true;
  assert.throws(
    () => service.rotateKey({
      tenant_id: "tenant-a",
      consent_ref: "consent-1",
      key_version: "v2",
    }),
    (error) => error.safe_error_code === "OUTLOOK_VAULT_REF_NAMESPACE_INVALID",
  );
  const serialized = JSON.stringify({
    consent: service.snapshot(),
    audit: service.auditSnapshot(),
    vault: vault.snapshot(),
  });
  assert.equal(serialized.includes("rawaccess"), false);
  assert.equal(serialized.includes("rawrefresh"), false);
  assert.deepEqual(activeVaultRefs(vault), originalRefs);
});

test("rotation metadata finalization failure leaves durable pending state that restart finalizes", () => {
  const vault = operationalContractVault();
  const repository = faultInjectingRepository();
  const service = createOutlookConsentService({
    vault,
    repository: repository.port,
    clock: () => "2026-07-30T00:00:00.000Z",
    operational: true,
  });
  service.grant(consentGrant());
  repository.failAfter(3);
  assert.throws(
    () => service.rotateKey({
      tenant_id: "tenant-a",
      consent_ref: "consent-1",
      key_version: "v2",
    }),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_TRANSITION_PENDING",
  );
  assert.equal(service.snapshot()[0].connection_state, "transition_pending");
  assert.deepEqual(activeVaultRefs(vault), consentRefs(service));

  const restarted = createOutlookConsentService({
    vault,
    repository: repository.port,
    clock: () => "2026-07-30T00:01:00.000Z",
    operational: true,
  });
  assert.equal(restarted.snapshot()[0].connection_state, "active");
  assert.equal(restarted.snapshot()[0].key_version, "v2");
  assert.deepEqual(activeVaultRefs(vault), consentRefs(restarted));
});

test("revoke metadata finalization failure blocks access until restart records revoked state", () => {
  const vault = operationalContractVault();
  const repository = faultInjectingRepository();
  const service = createOutlookConsentService({
    vault,
    repository: repository.port,
    clock: () => "2026-07-30T00:00:00.000Z",
    operational: true,
  });
  service.grant(consentGrant());
  repository.failAfter(3);
  assert.throws(
    () => service.revoke({
      tenant_id: "tenant-a",
      consent_ref: "consent-1",
    }),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_TRANSITION_PENDING",
  );
  assert.equal(service.snapshot()[0].connection_state, "transition_pending");
  assert.deepEqual(activeVaultRefs(vault), []);

  const restarted = createOutlookConsentService({
    vault,
    repository: repository.port,
    clock: () => "2026-07-30T00:01:00.000Z",
    operational: true,
  });
  assert.equal(restarted.snapshot()[0].connection_state, "revoked");
  assert.deepEqual(activeVaultRefs(vault), []);
});

test("vault stage failure never activates a partially created token", () => {
  const vault = createTestOnlyInMemoryOpaqueTokenVault();
  assert.throws(
    () => vault.stageTransition({
      tenant_id: "tenant-a",
      operation_id: "stage-failure-1",
      creates: [
        {
          key: "access",
          kind: "outlook-access",
          value: "new-access-token",
          key_version: "v1",
        },
        {
          key: "refresh",
          kind: "outlook-refresh",
          key_version: "v1",
        },
      ],
    }),
    /create requires value or copy_ref/,
  );
  assert.deepEqual(activeVaultRefs(vault), []);
  assert.equal(vault.snapshot().some(({ state }) => state === "staged"), false);
});

test("coordinator contract recovers when a reconstructed adapter retains external vault state", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-outlook-operational-restart-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const filePath = join(dir, "outlook-consent.json");
  const backing = {};
  const first = createOutlookConsentService({
    vault: operationalContractVault(backing),
    repository: createDurableOutlookConsentRepository({ filePath }),
    clock: () => "2026-07-30T00:00:00.000Z",
    operational: true,
  });
  first.grant(consentGrant({
    access_token: "restart-access-token",
    refresh_token: "restart-refresh-token",
    expires_at: "2026-07-30T01:00:00.000Z",
  }));

  const restartedVault = operationalContractVault(backing);
  const restarted = createOutlookConsentService({
    vault: restartedVault,
    repository: createDurableOutlookConsentRepository({ filePath }),
    clock: () => "2026-07-30T00:10:00.000Z",
    operational: true,
  });
  const credential = restarted.resolveCredential({
    tenant_id: "tenant-a",
    consent_ref: "consent-1",
  });
  assert.match(credential.credential_ref, /^vault:/);
  assert.deepEqual(activeVaultRefs(restartedVault), consentRefs(restarted));
  const serialized = readFileSync(filePath, "utf8");
  assert.equal(serialized.includes("restart-access-token"), false);
  assert.equal(serialized.includes("restart-refresh-token"), false);
});

test("compatibility in-memory vault export remains explicitly test-only", () => {
  const vault = createInMemoryOpaqueTokenVault();
  assert.equal(vault.test_only, true);
  assert.equal(vault.durable, false);
  for (const method of [
    "stageTransition",
    "commitTransition",
    "abortTransition",
    "getTransition",
    "describeRef",
    "resolveForProvider",
  ]) {
    assert.equal(typeof vault[method], "function");
  }
});

test("expired access refreshes once, key rotation replaces refs, and revoke blocks immediately", () => {
  const { vault, service, setNow } = setup();
  service.grant({
    tenant_id: "tenant-a",
    provider_identity_id: "provider-1",
    consent_ref: "consent-1",
    grant_type: "delegated",
    scopes: ["Calendars.ReadBasic"],
    access_token: "raw-access-token",
    refresh_token: "raw-refresh-token",
    expires_at: "2026-07-30T00:30:00.000Z",
  });
  setNow("2026-07-30T00:31:00.000Z");
  let refreshCount = 0;
  const resolved = service.resolveCredential({
    tenant_id: "tenant-a",
    consent_ref: "consent-1",
    refresh: ({ refresh_token }) => {
      refreshCount += 1;
      assert.equal(refresh_token, "raw-refresh-token");
      return {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_at: "2026-07-30T01:31:00.000Z",
      };
    },
  });
  assert.equal(refreshCount, 1);
  assert.match(resolved.credential_ref, /^vault:/);
  const rotated = service.rotateKey({
    tenant_id: "tenant-a",
    consent_ref: "consent-1",
    key_version: "v2",
  });
  assert.equal(rotated.key_version, "v2");
  assert.ok(vault.snapshot().some(({ key_version, state }) => key_version === "v2" && state === "active"));
  const revoked = service.revoke({ tenant_id: "tenant-a", consent_ref: "consent-1" });
  assert.equal(revoked.connection_state, "revoked");
  assert.throws(
    () => service.resolveCredential({ tenant_id: "tenant-a", consent_ref: "consent-1" }),
    (error) => error.safe_error_code === "OUTLOOK_CONSENT_REVOKED",
  );
});
