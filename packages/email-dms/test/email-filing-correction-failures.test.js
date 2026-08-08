import assert from "node:assert/strict";
import test from "node:test";
import { createEmailFilingCorrectionRepository } from "../src/email-filing-correction-repository.js";
import { createEmailFilingOriginalResolver } from "../src/email-filing-original-resolver.js";
import { createEmailFilingCorrectionService } from "../src/email-filing-correction-service.js";
import { createOriginalEmailFilingPlacement } from "../src/email-filing-correction-model.js";
import {
  CORRECTION_ACTOR_ID,
  MATTER_A,
  MATTER_B,
  MATTER_C,
  SESSION,
  TENANT_ID,
  THREAD_ID,
  correctionInput,
  createOriginalFilingRepository,
  originalFiling,
  serviceDependencies,
} from "./helpers/email-filing-correction-fixture.js";

function serviceFor(repository, dmsRepository, overrides = {}) {
  let counter = 0;
  return createEmailFilingCorrectionService({
    repository,
    original_filing_resolver: createEmailFilingOriginalResolver({ repository: dmsRepository }),
    id_factory: () => `correction-${counter += 1}`,
    clock: () => new Date(`2026-08-08T0${counter + 1}:00:00.000Z`),
    ...serviceDependencies(),
    ...overrides,
  });
}

async function assertRejectCode(promise, code) {
  await assert.rejects(promise, (error) => error?.code === code);
}

test("OUTM-20 requires principal, original resolver, and authorization dependencies", () => {
  // Given: a valid correction repository.
  const repository = createEmailFilingCorrectionRepository();
  const required = serviceDependencies();

  // When/Then: omitting any trust-boundary dependency fails closed at construction.
  assert.throws(
    () => createEmailFilingCorrectionService({ repository, ...required }),
    /original_filing_resolver is required/u,
  );
  assert.throws(
    () => createEmailFilingCorrectionService({
      repository,
      original_filing_resolver: { resolve() {} },
      authorize_matter: required.authorize_matter,
    }),
    /resolve_principal is required/u,
  );
  assert.throws(
    () => createEmailFilingCorrectionService({
      repository,
      original_filing_resolver: { resolve() {} },
      resolve_principal: required.resolve_principal,
    }),
    /authorize_matter is required/u,
  );
});

test("OUTM-20 denies missing, malformed, or failed session principals with zero writes", async () => {
  // Given: persisted authority and three fail-closed principal resolvers.
  const dmsRepository = createOriginalFilingRepository();
  for (const resolvePrincipal of [
    () => null,
    () => ({ tenant_id: TENANT_ID, actor_id: "" }),
    () => { throw new Error("identity provider unavailable"); },
  ]) {
    const repository = createEmailFilingCorrectionRepository();
    const service = serviceFor(repository, dmsRepository, { resolve_principal: resolvePrincipal });

    // When: a correction command crosses the principal boundary.
    const attempt = service.correct(correctionInput({ prior_placement_id: "placement:any" }));

    // Then: it is denied without leaking or persisting partial state.
    await assertRejectCode(attempt, "EMAIL_FILING_CORRECTION_PRINCIPAL_DENIED");
    assert.deepEqual(repository.snapshot(), { placements: [], audit_events: [] });
  }
});

test("OUTM-20 requires explicit source and target Matter authorization", async () => {
  // Given: a correction actor who is allowed on the source but denied on the target.
  const dmsRepository = createOriginalFilingRepository();
  const repository = createEmailFilingCorrectionRepository();
  const checked = [];
  const service = serviceFor(repository, dmsRepository, {
    authorize_matter: (request) => {
      checked.push(request);
      return request.matter_id === MATTER_A;
    },
  });
  const prior = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });
  checked.length = 0;

  // When: the actor tries to correct A to denied Matter B.
  const attempt = service.correct(correctionInput({ prior_placement_id: prior.placement_id }));

  // Then: both canonical Matter checks run, target denial is safe, and no write occurs.
  await assertRejectCode(attempt, "EMAIL_FILING_CORRECTION_ACTOR_DENIED");
  assert.deepEqual(checked.map((entry) => entry.matter_id), [MATTER_A, MATTER_B]);
  assert.ok(checked.every((entry) => entry.actor_id === CORRECTION_ACTOR_ID));
  assert.ok(checked.every((entry) => entry.tenant_id === TENANT_ID));
  assert.deepEqual(repository.snapshot(), { placements: [], audit_events: [] });
});

test("OUTM-20 stops at denied source Matter authorization without checking the target", async () => {
  // Given: an actor denied on the canonical source Matter.
  const dmsRepository = createOriginalFilingRepository();
  const repository = createEmailFilingCorrectionRepository();
  const checked = [];
  const service = serviceFor(repository, dmsRepository, {
    authorize_matter: (request) => { checked.push(request.matter_id); return false; },
  });
  const prior = createOriginalEmailFilingPlacement(originalFiling()).placement_id;

  // When: the actor attempts a correction from A to B.
  const attempt = service.correct(correctionInput({ prior_placement_id: prior }));

  // Then: source denial is final, target identity is not probed, and nothing is written.
  await assertRejectCode(attempt, "EMAIL_FILING_CORRECTION_ACTOR_DENIED");
  assert.deepEqual(checked, [MATTER_A]);
  assert.deepEqual(repository.snapshot(), { placements: [], audit_events: [] });
});

test("OUTM-20 rejects a correction whose canonical source and requested target are the same", async () => {
  // Given: an authorized actor and the derived original placement in Matter A.
  const dmsRepository = createOriginalFilingRepository();
  const repository = createEmailFilingCorrectionRepository();
  const service = serviceFor(repository, dmsRepository);
  const prior = createOriginalEmailFilingPlacement(originalFiling()).placement_id;

  // When: the command targets Matter A again.
  const attempt = service.correct(correctionInput({
    target_matter_id: MATTER_A,
    prior_placement_id: prior,
  }));

  // Then: the domain rejects it before any origin, correction, or audit append.
  await assertRejectCode(attempt, "EMAIL_FILING_CORRECTION_SAME_MATTER");
  assert.deepEqual(repository.snapshot(), { placements: [], audit_events: [] });
});

test("OUTM-20 treats non-true and failed authorizer results as denial", async () => {
  // Given: persisted authority and abnormal authorization adapters.
  const dmsRepository = createOriginalFilingRepository();
  for (const authorizeMatter of [
    () => undefined,
    () => ({ allowed: true }),
    () => { throw new Error("authorization backend unavailable"); },
  ]) {
    const repository = createEmailFilingCorrectionRepository();
    const service = serviceFor(repository, dmsRepository, { authorize_matter: authorizeMatter });

    // When: current placement is requested through the abnormal adapter.
    const attempt = service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });

    // Then: only literal true is accepted and no write occurs.
    await assertRejectCode(attempt, "EMAIL_FILING_CORRECTION_ACTOR_DENIED");
    assert.deepEqual(repository.snapshot(), { placements: [], audit_events: [] });
  }
});

test("OUTM-20 rejects cross-tenant principal lookup without checking Matter authority", async () => {
  // Given: a principal from another tenant and no original filing in that tenant.
  const dmsRepository = createOriginalFilingRepository();
  const repository = createEmailFilingCorrectionRepository();
  let authorizationCalls = 0;
  const service = serviceFor(repository, dmsRepository, {
    resolve_principal: () => ({ tenant_id: "tenant-other", actor_id: CORRECTION_ACTOR_ID }),
    authorize_matter: () => { authorizationCalls += 1; return true; },
  });

  // When: the foreign principal requests the local thread.
  const attempt = service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });

  // Then: tenant-scoped resolution fails before any Matter disclosure or write.
  await assertRejectCode(attempt, "EMAIL_FILING_CORRECTION_ORIGINAL_NOT_FOUND");
  assert.equal(authorizationCalls, 0);
  assert.deepEqual(repository.snapshot(), { placements: [], audit_events: [] });
});

test("OUTM-20 rejects stale placement and changed-payload idempotency conflicts", async () => {
  // Given: A has already been corrected to B under canonical identity.
  const dmsRepository = createOriginalFilingRepository();
  const repository = createEmailFilingCorrectionRepository();
  const service = serviceFor(repository, dmsRepository);
  const prior = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });
  await service.correct(correctionInput({ prior_placement_id: prior.placement_id }));

  // When/Then: a stale prior and a changed replay cannot fork or overwrite the chain.
  await assertRejectCode(service.correct(correctionInput({
    source_matter_id: MATTER_B,
    target_matter_id: MATTER_C,
    idempotency_key: "outm20-stale",
    prior_placement_id: prior.placement_id,
  })), "EMAIL_FILING_CORRECTION_STALE_PLACEMENT");
  await assertRejectCode(service.correct(correctionInput({
    target_matter_id: MATTER_C,
    reason: "다른 정정 사유",
    prior_placement_id: prior.placement_id,
  })), "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT");
  const snapshot = repository.snapshot();
  assert.equal(snapshot.placements.length, 2);
  assert.equal(snapshot.audit_events.length, 1);
});

test("OUTM-20 persistence failure rolls back origin, correction, and audit together", async () => {
  // Given: a durable correction adapter that crashes before its first commit.
  const dmsRepository = createOriginalFilingRepository();
  const emptyValue = { placements: [], audit_events: [] };
  const repository = createEmailFilingCorrectionRepository({
    filePath: "/virtual/outm20-correction-store.json",
    read_state: () => ({ exists: false, value: emptyValue, generation: 0 }),
    write_state: () => {
      throw Object.assign(new Error("synthetic persistence crash"), { code: "OUTM20_STORE_CRASH" });
    },
  });
  const service = serviceFor(repository, dmsRepository);
  const prior = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });

  // When: the atomic append reaches persistence.
  const attempt = service.correct(correctionInput({ prior_placement_id: prior.placement_id }));

  // Then: no in-memory partial target reference or receipt remains.
  await assertRejectCode(attempt, "OUTM20_STORE_CRASH");
  assert.deepEqual(repository.snapshot(), emptyValue);
});

test("OUTM-20 reloads one complete committed transaction when writer acknowledgement fails", async () => {
  // Given: a writer that durably commits every collection, then loses its acknowledgement.
  const dmsRepository = createOriginalFilingRepository();
  const emptyValue = { placements: [], audit_events: [] };
  let durableValue = structuredClone(emptyValue);
  let generation = 0;
  const repository = createEmailFilingCorrectionRepository({
    filePath: "/virtual/outm20-after-commit-store.json",
    read_state: () => ({
      exists: generation > 0,
      value: structuredClone(durableValue),
      generation,
    }),
    write_state: ({ value }) => {
      durableValue = structuredClone(value);
      generation += 1;
      throw Object.assign(new Error("synthetic acknowledgement loss"), {
        code: "OUTM20_AFTER_COMMIT",
      });
    },
  });
  const service = serviceFor(repository, dmsRepository);
  const prior = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });

  // When: persistence succeeds but the writer cannot return its receipt.
  const attempt = service.correct(correctionInput({ prior_placement_id: prior.placement_id }));

  // Then: reload exposes the complete correction transaction, never a partial link.
  await assertRejectCode(attempt, "OUTM20_AFTER_COMMIT");
  const snapshot = repository.snapshot();
  assert.equal(snapshot.placements.length, 2);
  assert.equal(snapshot.audit_events.length, 1);
  assert.deepEqual(snapshot, durableValue);
});
