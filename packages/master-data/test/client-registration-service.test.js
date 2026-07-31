import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_REGISTRATION_ERROR_CODES,
  createClientRegistrationService,
  createMasterDataRepository,
} from "../src/index.js";

const TENANT = "tenant-client-registration";
const ACTOR = "actor-client-registration";

function service(repository = createMasterDataRepository()) {
  return createClientRegistrationService({ repository, tenant_id: TENANT, actor_id: ACTOR });
}

function withDigest(registrationService, input) {
  const review = registrationService.review(input);
  return { ...input, review_digest: review.review_digest };
}

test("client registration creates complete person and organization graphs with deterministic primary refs", () => {
  const repository = createMasterDataRepository();
  const registrationService = service(repository);
  const personInput = withDigest(registrationService, {
    client_type: "person",
    display_name: "Lee Contact",
    email: "lee@example.com",
    phone: "+82-2-0000-0000",
  });
  const person = registrationService.create({ ...personInput, idempotency_key: "client-person-001" });
  assert.equal(person.client_type, "person");
  assert.ok(person.canonical_record_ids.person_id);
  assert.equal(person.canonical_record_ids.organization_id, null);
  assert.equal(person.primary_party_id, person.canonical_record_ids.party_id);
  assert.equal(person.primary_entity_id, person.canonical_record_ids.entity_id);
  const personGroup = repository.get({ tenant_id: TENANT, model_type: "ClientGroup", id: person.client_group_id });
  assert.equal(personGroup.primary_entity_id, person.canonical_record_ids.entity_id);
  assert.equal(personGroup.primary_party_id, person.canonical_record_ids.party_id);
  assert.equal(repository.get({ tenant_id: TENANT, model_type: "Person", id: person.canonical_record_ids.person_id }).phone, "+82-2-0000-0000");
  const personContactPoints = repository
    .list({ tenant_id: TENANT, model_type: "ContactPoint" })
    .filter((point) => point.owner_entity_id === person.canonical_record_ids.entity_id);
  assert.deepEqual(
    personContactPoints.map(({ contact_type, value, is_primary }) => ({
      contact_type,
      value,
      is_primary,
    })),
    [
      {
        contact_type: "email",
        value: "lee@example.com",
        is_primary: true,
      },
      {
        contact_type: "phone",
        value: "+82-2-0000-0000",
        is_primary: true,
      },
    ],
  );

  const organizationInput = withDigest(registrationService, {
    client_type: "organization",
    display_name: "Acme Corporation",
    legal_form: "주식회사",
    registration_number: "BN-001",
  });
  const organization = registrationService.create({ ...organizationInput, idempotency_key: "client-org-001" });
  assert.equal(organization.client_type, "organization");
  assert.ok(organization.canonical_record_ids.organization_id);
  assert.equal(organization.canonical_record_ids.person_id, null);
  const organizationRecord = repository.get({
    tenant_id: TENANT,
    model_type: "Organization",
    id: organization.canonical_record_ids.organization_id,
  });
  assert.equal(organizationRecord.legal_form, "주식회사");
  assert.equal(organizationRecord.registration_number, "BN-001");
  const organizationGroup = repository.get({ tenant_id: TENANT, model_type: "ClientGroup", id: organization.client_group_id });
  assert.equal(organizationGroup.primary_entity_id, organization.canonical_record_ids.entity_id);
  assert.equal(organizationGroup.legal_form, "주식회사");
});

test("review is read-only and flags unlinked duplicate records without exposing their identity", () => {
  const repository = createMasterDataRepository();
  repository.create({
    model_type: "Party",
    tenant_id: TENANT,
    party_id: "party-unlinked-secret",
    party_type: "organization",
    display_name: "Unlinked Client",
    status: "active",
    owner_user_id: ACTOR,
  });
  const before = repository.snapshot();
  const registrationService = service(repository);
  const review = registrationService.review({
    client_type: "organization",
    display_name: "Unlinked Client",
    legal_form: "주식회사",
  });
  assert.equal(review.has_unmatched_duplicate_candidates, true);
  assert.equal(review.unmatched_duplicate_candidate_count, 1);
  assert.deepEqual(review.unmatched_duplicate_candidate_model_types, ["Party"]);
  assert.equal(JSON.stringify(review).includes("party-unlinked-secret"), false);
  assert.equal(JSON.stringify(review).includes("Unlinked Client"), false);
  assert.deepEqual(repository.snapshot(), before);
});

test("visible ClientGroup candidates require explicit distinct-client confirmation", () => {
  const repository = createMasterDataRepository();
  const registrationService = service(repository);
  const firstInput = withDigest(registrationService, {
    client_type: "organization",
    display_name: "Visible Candidate",
    legal_form: "주식회사",
  });
  const first = registrationService.create({ ...firstInput, idempotency_key: "visible-existing-001" });
  const review = registrationService.review({
    client_type: "organization",
    display_name: "Visible Candidate",
    legal_form: "주식회사",
  });
  assert.equal(review.has_visible_name_candidates, true);
  assert.equal(review.client_group_candidates[0].client_group_id, first.client_group_id);
  assert.equal(review.client_group_candidates[0].display_name, "Visible Candidate");
  assert.equal(review.client_group_candidates[0].client_type, "organization");
  assert.ok(review.client_group_candidates[0].reason_codes.includes("exact_display_name"));
  assert.throws(
    () => registrationService.create({
      client_type: "organization",
      display_name: "Visible Candidate",
      legal_form: "주식회사",
      idempotency_key: "visible-new-001",
      review_digest: review.review_digest,
    }),
    (error) => error.safe_error_code === CLIENT_REGISTRATION_ERROR_CODES.distinct_confirmation_required,
  );
  const confirmed = registrationService.create({
    client_type: "organization",
    display_name: "Visible Candidate",
    legal_form: "주식회사",
    idempotency_key: "visible-new-001",
    review_digest: review.review_digest,
    confirm_distinct_client: true,
  });
  assert.notEqual(confirmed.client_group_id, first.client_group_id);
});

test("exact registration identifier conflict blocks create before any product write", () => {
  const repository = createMasterDataRepository();
  repository.create({
    model_type: "Organization",
    tenant_id: TENANT,
    organization_id: "organization-existing-identifier",
    entity_id: "entity-existing-identifier",
    party_id: "party-existing-identifier",
    display_name: "Existing Legal Client",
    registration_number: "REG-EXACT-001",
    status: "active",
    owner_user_id: ACTOR,
  });
  const registrationService = service(repository);
  const input = withDigest(registrationService, {
    client_type: "organization",
    display_name: "A New Name",
    legal_form: "주식회사",
    registration_number: "reg exact 001",
  });
  const before = repository.snapshot();
  const review = registrationService.review(input);
  assert.equal(review.has_exact_identifier_conflict, true);
  assert.throws(
    () => registrationService.create({ ...input, idempotency_key: "identifier-conflict-001" }),
    (error) => error.safe_error_code === CLIENT_REGISTRATION_ERROR_CODES.identifier_conflict,
  );
  assert.deepEqual(repository.snapshot(), before);
});

test("optional depositor alias and registration identifier are linked to the primary party without leaking raw values", () => {
  const repository = createMasterDataRepository();
  const registrationService = service(repository);
  const rawEmail = "billing-contact@example.com";
  const rawAlias = "ACME BANK DEPOSITOR";
  const rawRegistration = "BN-SAFE-001";
  const input = withDigest(registrationService, {
    client_type: "organization",
    display_name: "Safe Summary Corp",
    legal_form: "주식회사",
    registration_number: rawRegistration,
    depositor_alias: rawAlias,
  });
  const result = registrationService.create({ ...input, idempotency_key: "safe-summary-001" });
  const alias = repository.list({ tenant_id: TENANT, model_type: "PartyAlias" })[0];
  const identifier = repository.list({ tenant_id: TENANT, model_type: "PartyIdentifier" })[0];
  assert.equal(alias.alias_type, "bank_depositor_name");
  assert.equal(alias.party_id, result.primary_party_id);
  assert.equal(identifier.identifier_type, "business_number");
  assert.equal(identifier.party_id, result.primary_party_id);
  assert.equal(JSON.stringify(result).includes(rawEmail), false);
  assert.equal(JSON.stringify(result).includes(rawAlias), false);
  assert.equal(JSON.stringify(result).includes(rawRegistration), false);
  const audit = repository.listAudit({ tenant_id: TENANT })[0];
  assert.equal(JSON.stringify(audit).includes(rawAlias), false);
  assert.equal(JSON.stringify(audit).includes(rawRegistration), false);
  assert.equal(JSON.stringify(audit).includes(rawEmail), false);
});

test("trusted actor and safe permission or audit refs are carried across the graph and audit", () => {
  const repository = createMasterDataRepository();
  const registrationService = service(repository);
  const input = withDigest(registrationService, {
    client_type: "person",
    display_name: "Referenced Person",
    permission_ref: "perm:client:create",
    audit_hint_ref: "audit-hint:client-registration",
  });
  const result = registrationService.create({ ...input, idempotency_key: "refs-001" });
  for (const record of repository.list({ tenant_id: TENANT })) {
    if (record.model_type === "ClientGroup" || record.model_type === "Party" || record.model_type === "Entity" || record.model_type === "Person") {
      assert.equal(record.permission_ref, "perm:client:create");
      assert.equal(record.audit_hint_ref, "audit-hint:client-registration");
      assert.equal(record.owner_user_id, ACTOR);
    }
  }
  const audit = repository.listAudit({ tenant_id: TENANT })[0];
  assert.equal(audit.actor_id, ACTOR);
  assert.equal(audit.metadata.permission_ref, "perm:client:create");
  assert.equal(audit.metadata.audit_hint_ref, "audit-hint:client-registration");
  assert.equal(result.client_group_id, audit.object_id);
});

test("organization legal form is required by the service and person-only fields cannot cross types", () => {
  const registrationService = service();
  assert.throws(
    () => registrationService.review({
      client_type: "organization",
      display_name: "Missing Legal Form",
    }),
    (error) => error.safe_error_code === CLIENT_REGISTRATION_ERROR_CODES.invalid_input,
  );
  assert.throws(
    () => registrationService.review({
      client_type: "person",
      display_name: "Person With Legal Form",
      legal_form: "주식회사",
    }),
    (error) => error.safe_error_code === CLIENT_REGISTRATION_ERROR_CODES.invalid_input,
  );
});

test("review digest is invalidated when the duplicate candidate snapshot changes", () => {
  const repository = createMasterDataRepository();
  const registrationService = service(repository);
  const input = {
    client_type: "person",
    display_name: "Candidate Changed Person",
  };
  const initialReview = registrationService.review(input);

  const competingInput = withDigest(registrationService, input);
  registrationService.create({
    ...competingInput,
    idempotency_key: "candidate-change-competing",
  });

  assert.throws(
    () => registrationService.create({
      ...input,
      idempotency_key: "candidate-change-stale",
      review_digest: initialReview.review_digest,
      confirm_distinct_client: true,
    }),
    (error) => error.safe_error_code === CLIENT_REGISTRATION_ERROR_CODES.review_digest_mismatch,
  );
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "ClientGroup" }).length, 1);
});

test("create is replayable and rejects conflicting idempotency reuse", () => {
  const repository = createMasterDataRepository();
  const registrationService = service(repository);
  const firstInput = withDigest(registrationService, {
    client_type: "person",
    display_name: "Replayable Person",
  });
  const first = registrationService.create({ ...firstInput, idempotency_key: "replay-001" });
  const replay = registrationService.create({ ...firstInput, idempotency_key: "replay-001" });
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.client_group_id, first.client_group_id);
  const conflictingInput = withDigest(registrationService, {
    client_type: "person",
    display_name: "Changed Replay Payload",
  });
  assert.throws(
    () => registrationService.create({ ...conflictingInput, idempotency_key: "replay-001" }),
    (error) => error.safe_error_code === CLIENT_REGISTRATION_ERROR_CODES.idempotency_conflict,
  );
  const otherActorService = createClientRegistrationService({
    repository,
    tenant_id: TENANT,
    actor_id: "actor-client-registration-other",
  });
  const otherActorInput = withDigest(otherActorService, {
    client_type: "person",
    display_name: "Replayable Person",
  });
  assert.throws(
    () => otherActorService.create({
      ...otherActorInput,
      idempotency_key: "replay-001",
    }),
    (error) => error.safe_error_code === CLIENT_REGISTRATION_ERROR_CODES.idempotency_conflict,
  );
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "ClientGroup" }).length, 1);
});

test("registration transaction rolls back graph, audit, and idempotency when an optional alias write fails", () => {
  const base = createMasterDataRepository();
  const repository = {
    ...base,
    list: base.list.bind(base),
    get: base.get.bind(base),
    getIdempotency: base.getIdempotency.bind(base),
    snapshot: base.snapshot.bind(base),
    transaction(callback) {
      return base.transaction((tx) => {
        const wrapped = new Proxy(tx, {
          get(target, property, receiver) {
            if (property === "create") {
              return (record) => {
                if (record.model_type === "PartyAlias") throw new Error("forced alias failure");
                return target.create(record);
              };
            }
            return Reflect.get(target, property, receiver);
          },
        });
        return callback(wrapped);
      });
    },
  };
  const registrationService = service(repository);
  const input = withDigest(registrationService, {
    client_type: "organization",
    display_name: "Rollback Corp",
    legal_form: "주식회사",
    depositor_alias: "Rollback Alias",
  });
  assert.throws(
    () => registrationService.create({ ...input, idempotency_key: "rollback-001" }),
    /forced alias failure/,
  );
  assert.equal(base.list({ tenant_id: TENANT }).length, 0);
  assert.equal(base.listAudit({ tenant_id: TENANT }).length, 0);
  assert.equal(base.getIdempotency({ tenant_id: TENANT, idempotency_key: "rollback-001" }), undefined);
});

test("review and identifier checks are tenant scoped", () => {
  const repository = createMasterDataRepository();
  repository.create({
    model_type: "Organization",
    tenant_id: "tenant-other",
    organization_id: "organization-other",
    entity_id: "entity-other",
    party_id: "party-other",
    display_name: "Cross Tenant Name",
    registration_number: "CROSS-TENANT-001",
    status: "active",
    owner_user_id: "owner-other",
  });
  const registrationService = service(repository);
  const input = withDigest(registrationService, {
    client_type: "organization",
    display_name: "Cross Tenant Name",
    legal_form: "주식회사",
    registration_number: "CROSS-TENANT-001",
  });
  const review = registrationService.review(input);
  assert.equal(review.has_visible_name_candidates, false);
  assert.equal(review.has_exact_identifier_conflict, false);
  const created = registrationService.create({ ...input, idempotency_key: "tenant-isolation-001" });
  assert.equal(created.client_type, "organization");
  assert.equal(repository.list({ tenant_id: "tenant-other", model_type: "ClientGroup" }).length, 0);
});
