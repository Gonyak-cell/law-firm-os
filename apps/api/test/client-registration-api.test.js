import assert from "node:assert/strict";
import test from "node:test";

import {
  createMasterDataRepository,
} from "../../../packages/master-data/src/index.js";
import {
  createMasterDataRuntimeContext,
  handleClientGroupRegistrationCreate,
  handleClientGroupRegistrationReview,
} from "../src/master-data-context.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
} from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const OPERATIONS_EMAIL = "wsjo@amic.kr";
const STAFF_EMAIL = "yjlee@amic.kr";
const ATTORNEY_EMAIL = "jh731@amic.kr";

let server;
let baseUrl;
let repository;
let runtime;
const sessionHeaders = new Map();

function account(email) {
  const value = findRegisteredAccountByEmail(email);
  assert.ok(value, `registered account ${email} must exist`);
  return value;
}

async function headersFor(email) {
  if (!sessionHeaders.has(email)) {
    sessionHeaders.set(
      email,
      await apiSessionHeaders(baseUrl, account(email)),
    );
  }
  return sessionHeaders.get(email);
}

function registrationBody({
  client,
  idempotencyKey,
  reviewDigest,
  confirmDistinctClient,
  tenantId = TENANT,
  actorId,
} = {}) {
  const body = {
    tenant_id: tenantId,
    permission_ref: "perm_client_registration_test",
    audit_hint_ref: "audit_client_registration_test",
    idempotency_key: idempotencyKey,
    client,
  };
  if (reviewDigest !== undefined) body.review_digest = reviewDigest;
  if (confirmDistinctClient !== undefined) {
    body.confirm_distinct_client = confirmDistinctClient;
  }
  if (actorId !== undefined) body.actor_id = actorId;
  return body;
}

async function post(path, body, {
  email = OPERATIONS_EMAIL,
  noAuth = false,
  extraHeaders = {},
} = {}) {
  const headers = {
    ...(noAuth ? {} : await headersFor(email)),
    "content-type": "application/json",
    ...extraHeaders,
  };
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function review(client, idempotencyKey, options = {}) {
  return post(
    "/master-data/client-groups/review",
    registrationBody({ client, idempotencyKey, ...options }),
    options,
  );
}

async function create(client, idempotencyKey, reviewDigest, options = {}) {
  return post(
    "/master-data/client-groups",
    registrationBody({
      client,
      idempotencyKey,
      reviewDigest,
      confirmDistinctClient: options.confirmDistinctClient,
      actorId: options.actorId,
      tenantId: options.tenantId,
    }),
    options,
  );
}

test.before(async () => {
  repository = createMasterDataRepository();
  runtime = createMasterDataRuntimeContext({ repository });
  const started = await startApiServer({
    port: 0,
    masterDataRuntime: runtime,
  });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CL-P5-W02-T02 requires a signed session and registration authority before duplicate reads or writes", async () => {
  const client = {
    client_type: "person",
    display_name: "권한 확인 고객",
  };
  const before = repository.snapshot();

  const unsigned = await review(client, "review-unsigned", { noAuth: true });
  assert.equal(unsigned.status, 401);
  assert.deepEqual(unsigned.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);

  for (const email of [STAFF_EMAIL, ATTORNEY_EMAIL]) {
    const deniedReview = await review(
      client,
      `review-denied-${email}`,
      { email },
    );
    assert.equal(deniedReview.status, 403);
    assert.deepEqual(
      deniedReview.body.safe_error_codes,
      ["MASTER_DATA_API_UNAUTHORIZED_OMISSION"],
    );
    const deniedCreate = await create(
      client,
      `create-denied-${email}`,
      "forged-review-digest",
      { email },
    );
    assert.equal(deniedCreate.status, 403);
  }

  assert.deepEqual(repository.snapshot(), before);
});

test("CL-P5-W02-T02 rejects a forged tenant before touching the product repository", async () => {
  const before = repository.snapshot();
  const response = await review(
    {
      client_type: "person",
      display_name: "다른 테넌트 고객",
    },
    "review-forged-tenant",
    {
      tenantId: "tenant_not_signed",
      extraHeaders: {
        "x-lawos-permission-context": JSON.stringify({
          principal: {
            user_id: "forged_admin",
            tenant_id: "tenant_not_signed",
          },
          rules: [{ id: "forged-allow", effect: "allow", action: "*" }],
          object_acl: [],
        }),
      },
    },
  );
  assert.equal(response.status, 403);
  assert.deepEqual(
    response.body.safe_error_codes,
    ["MASTER_DATA_API_UNAUTHORIZED_OMISSION"],
  );
  assert.deepEqual(repository.snapshot(), before);
});

test("CL-P5-W02-T02 registers a person graph, saves the exact depositor alias, audits the signed actor, and replays safely", async () => {
  const client = {
    client_type: "person",
    display_name: "API 개인 고객 한별",
    email: "hanbyeol.client@example.test",
    phone: "010-4567-8910",
    depositor_alias: "한별 사건입금",
  };
  const idempotencyKey = "client-person-hanbyeol";
  const beforeReview = repository.snapshot();
  const reviewed = await review(client, idempotencyKey);
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.outcome, "passed");
  assert.equal(reviewed.body.item.can_create, true);
  assert.equal(reviewed.body.item.has_restricted_candidates, false);
  assert.equal(reviewed.body.item.requires_distinct_confirmation, false);
  assert.deepEqual(repository.snapshot(), beforeReview);

  const created = await create(
    client,
    idempotencyKey,
    reviewed.body.item.review_digest,
    { actorId: "forged_actor_must_be_ignored" },
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.outcome, "passed");
  assert.equal(created.body.replayed, false);
  assert.deepEqual(
    {
      client_type: created.body.item.client_type,
      depositor_alias_saved: created.body.item.depositor_alias_saved,
      registration_number_saved:
        created.body.item.registration_number_saved,
      contact_saved: created.body.item.contact_saved,
    },
    {
      client_type: "person",
      depositor_alias_saved: true,
      registration_number_saved: false,
      contact_saved: true,
    },
  );
  const responseText = JSON.stringify(created.body);
  assert.equal(responseText.includes(client.email), false);
  assert.equal(responseText.includes(client.phone), false);
  assert.equal(responseText.includes(client.depositor_alias), false);

  const group = repository.get({
    tenant_id: TENANT,
    model_type: "ClientGroup",
    id: created.body.item.client_group_id,
  });
  assert.equal(group.display_name, client.display_name);
  assert.equal(group.client_type, "person");
  assert.equal(group.permission_ref, "perm_client_registration_test");
  assert.equal(group.audit_hint_ref, "audit_client_registration_test");
  const person = repository.list({
    tenant_id: TENANT,
    model_type: "Person",
  }).find((item) => item.canonical_client_group_id === group.client_group_id);
  assert.equal(person.email, client.email);
  assert.equal(person.phone, client.phone);
  assert.deepEqual(
    repository
      .list({ tenant_id: TENANT, model_type: "ContactPoint" })
      .filter((item) => item.owner_entity_id === person.entity_id)
      .map(({ contact_type, value, is_primary }) => ({
        contact_type,
        value,
        is_primary,
      })),
    [
      {
        contact_type: "email",
        value: client.email,
        is_primary: true,
      },
      {
        contact_type: "phone",
        value: client.phone,
        is_primary: true,
      },
    ],
  );
  const alias = repository.list({
    tenant_id: TENANT,
    model_type: "PartyAlias",
  }).find((item) => item.party_id === group.primary_party_id);
  assert.equal(alias.alias_type, "bank_depositor_name");
  assert.equal(alias.alias_value, client.depositor_alias);
  assert.equal(alias.status, "active");

  const auditEvents = repository.listAudit({ tenant_id: TENANT });
  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0].actor_id, account(OPERATIONS_EMAIL).user_id);
  assert.equal(auditEvents[0].object_id, group.client_group_id);
  assert.equal(auditEvents[0].metadata.raw_pii_included, false);
  assert.equal(created.body.audit_event_ref, auditEvents[0].event_id);

  const afterCreate = repository.snapshot();
  const replayed = await create(
    client,
    idempotencyKey,
    reviewed.body.item.review_digest,
  );
  assert.equal(replayed.status, 200);
  assert.equal(replayed.body.outcome, "passed");
  assert.equal(replayed.body.replayed, true);
  assert.equal(
    replayed.body.item.client_group_id,
    created.body.item.client_group_id,
  );
  assert.deepEqual(repository.snapshot(), afterCreate);

  const changedClient = {
    ...client,
    display_name: "API 개인 고객 한별 변경",
  };
  const changedReview = await review(changedClient, idempotencyKey);
  const conflict = await create(
    changedClient,
    idempotencyKey,
    changedReview.body.item.review_digest,
  );
  assert.equal(conflict.status, 409);
  assert.deepEqual(
    conflict.body.safe_error_codes,
    ["MASTER_DATA_CLIENT_REGISTRATION_IDEMPOTENCY_CONFLICT"],
  );
  assert.deepEqual(repository.snapshot(), afterCreate);
});

test("CL-P5-W02-T02 registers an organization with a business identifier and exact depositor alias", async () => {
  const client = {
    client_type: "organization",
    display_name: "API 새봄테크",
    legal_form: "주식회사",
    registration_number: "123-45-67890",
    depositor_alias: "새봄테크 법률비",
  };
  const idempotencyKey = "client-organization-saebom";
  const reviewed = await review(client, idempotencyKey);
  assert.equal(reviewed.body.outcome, "passed");
  const created = await create(
    client,
    idempotencyKey,
    reviewed.body.item.review_digest,
  );
  assert.equal(created.status, 201);
  assert.deepEqual(
    {
      client_type: created.body.item.client_type,
      depositor_alias_saved: created.body.item.depositor_alias_saved,
      registration_number_saved:
        created.body.item.registration_number_saved,
      contact_saved: created.body.item.contact_saved,
    },
    {
      client_type: "organization",
      depositor_alias_saved: true,
      registration_number_saved: true,
      contact_saved: false,
    },
  );
  const group = repository.get({
    tenant_id: TENANT,
    model_type: "ClientGroup",
    id: created.body.item.client_group_id,
  });
  assert.equal(group.legal_form, client.legal_form);
  const organization = repository.list({
    tenant_id: TENANT,
    model_type: "Organization",
  }).find((item) => item.canonical_client_group_id === group.client_group_id);
  assert.equal(organization.registration_number, client.registration_number);
  assert.equal(organization.legal_form, client.legal_form);
  const identifier = repository.list({
    tenant_id: TENANT,
    model_type: "PartyIdentifier",
  }).find((item) => item.party_id === group.primary_party_id);
  assert.equal(identifier.identifier_type, "business_number");
  assert.equal(identifier.identifier_value, client.registration_number);
  assert.equal(identifier.verified, false);
  const responseText = JSON.stringify(created.body);
  assert.equal(responseText.includes(client.registration_number), false);
  assert.equal(responseText.includes(client.depositor_alias), false);
});

test("CL-P5-W02-T02 requires explicit confirmation for a visible same-name ClientGroup", async () => {
  const client = {
    client_type: "organization",
    display_name: "API 새봄테크",
    legal_form: "유한회사",
    registration_number: "987-65-43210",
  };
  const idempotencyKey = "client-organization-saebom-distinct";
  const reviewed = await review(client, idempotencyKey);
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.outcome, "passed");
  assert.equal(reviewed.body.item.can_create, true);
  assert.equal(reviewed.body.item.requires_distinct_confirmation, true);
  assert.ok(
    reviewed.body.item.candidates.some(
      (candidate) => candidate.display_name === client.display_name,
    ),
  );

  const before = repository.snapshot();
  const notConfirmed = await create(
    client,
    idempotencyKey,
    reviewed.body.item.review_digest,
  );
  assert.equal(notConfirmed.status, 409);
  assert.deepEqual(
    notConfirmed.body.safe_error_codes,
    ["MASTER_DATA_CLIENT_REGISTRATION_DISTINCT_CONFIRMATION_REQUIRED"],
  );
  assert.deepEqual(repository.snapshot(), before);

  const confirmed = await create(
    client,
    idempotencyKey,
    reviewed.body.item.review_digest,
    { confirmDistinctClient: true },
  );
  assert.equal(confirmed.status, 201);
  assert.equal(confirmed.body.replayed, false);
});

test("CL-P5-W02-T02 blocks an exact registration-number conflict without echoing the identifier", async () => {
  const client = {
    client_type: "organization",
    display_name: "API 등록번호 충돌 법인",
    legal_form: "주식회사",
    registration_number: "123-45-67890",
  };
  const idempotencyKey = "client-organization-registration-conflict";
  const reviewed = await review(client, idempotencyKey);
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.outcome, "review_required");
  assert.equal(reviewed.body.item.can_create, false);
  assert.equal(
    JSON.stringify(reviewed.body).includes(client.registration_number),
    false,
  );

  const before = repository.snapshot();
  const blocked = await create(
    client,
    idempotencyKey,
    reviewed.body.item.review_digest,
    { confirmDistinctClient: true },
  );
  assert.equal(blocked.status, 409);
  assert.deepEqual(
    blocked.body.safe_error_codes,
    ["MASTER_DATA_CLIENT_REGISTRATION_IDENTIFIER_CONFLICT"],
  );
  assert.equal(
    JSON.stringify(blocked.body).includes(client.registration_number),
    false,
  );
  assert.deepEqual(repository.snapshot(), before);
});

test("CL-P5-W02-T02 invalidates a review when the duplicate candidate set changes", async () => {
  const client = {
    client_type: "person",
    display_name: "API 후보 변경 고객",
  };
  const initial = await review(client, "client-candidate-snapshot-initial");
  assert.equal(initial.status, 200);
  assert.equal(initial.body.item.candidates.length, 0);

  const competing = await create(
    client,
    "client-candidate-snapshot-competing",
    initial.body.item.review_digest,
  );
  assert.equal(competing.status, 201);

  const beforeStaleCreate = repository.snapshot();
  const stale = await create(
    client,
    "client-candidate-snapshot-stale",
    initial.body.item.review_digest,
    { confirmDistinctClient: true },
  );
  assert.equal(stale.status, 409);
  assert.deepEqual(
    stale.body.safe_error_codes,
    ["MASTER_DATA_CLIENT_REGISTRATION_REVIEW_DIGEST_MISMATCH"],
  );
  assert.deepEqual(repository.snapshot(), beforeStaleCreate);
});

test("CL-P5-W02-T02 hides ACL-denied duplicate candidates and blocks creation without leaking names, ids, or counts", () => {
  const existingGroup = repository.list({
    tenant_id: TENANT,
    model_type: "ClientGroup",
  }).find((item) => item.display_name === "API 개인 고객 한별");
  assert.ok(existingGroup);
  const context = {
    principal: {
      user_id: "user_acl_test",
      tenant_id: TENANT,
      role_ids: ["client_operations"],
    },
    rules: [
      {
        id: "allow-client-registration",
        effect: "allow",
        action_prefix: "master_data:client:",
      },
      {
        id: "allow-client-read",
        effect: "allow",
        action: "analytics:client:read",
      },
    ],
    object_acl: [
      {
        id: "deny-hidden-client",
        effect: "deny",
        principal_id: "user_acl_test",
        action: "analytics:client:read",
        resource_id: existingGroup.client_group_id,
      },
    ],
  };
  const body = registrationBody({
    client: {
      client_type: "person",
      display_name: existingGroup.display_name,
    },
    idempotencyKey: "client-hidden-duplicate",
  });
  const before = repository.snapshot();
  const reviewed = handleClientGroupRegistrationReview({
    body,
    context,
    requestId: "req_hidden_duplicate_review",
    runtime,
  });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.outcome, "review_required");
  assert.deepEqual(reviewed.body.item.candidates, []);
  assert.equal(reviewed.body.item.has_restricted_candidates, true);
  assert.equal(reviewed.body.item.can_create, false);
  const safeReviewText = JSON.stringify(reviewed.body);
  assert.equal(safeReviewText.includes(existingGroup.client_group_id), false);
  assert.equal(safeReviewText.includes(existingGroup.display_name), false);
  assert.equal("omitted_item_count" in reviewed.body, false);
  assert.deepEqual(repository.snapshot(), before);

  const blocked = handleClientGroupRegistrationCreate({
    body: {
      ...body,
      review_digest: reviewed.body.item.review_digest,
      confirm_distinct_client: true,
    },
    context,
    requestId: "req_hidden_duplicate_create",
    runtime,
  });
  assert.equal(blocked.status, 409);
  assert.deepEqual(
    blocked.body.safe_error_codes,
    ["MASTER_DATA_CLIENT_REGISTRATION_RESTRICTED_DUPLICATE"],
  );
  const safeBlockedText = JSON.stringify(blocked.body);
  assert.equal(safeBlockedText.includes(existingGroup.client_group_id), false);
  assert.equal(safeBlockedText.includes(existingGroup.display_name), false);
  assert.deepEqual(repository.snapshot(), before);
});

test("CL-P5-W02-T02 binds review proof to the visible candidate snapshot and permission principal", () => {
  const existingGroup = repository.list({
    tenant_id: TENANT,
    model_type: "ClientGroup",
  }).find((item) => item.display_name === "API 개인 고객 한별");
  assert.ok(existingGroup);
  const client = {
    client_type: "person",
    display_name: existingGroup.display_name,
  };
  const deniedContext = {
    principal: {
      user_id: "user_acl_transition",
      tenant_id: TENANT,
      role_ids: ["client_operations"],
    },
    rules: [
      {
        id: "allow-client-registration-transition",
        effect: "allow",
        action_prefix: "master_data:client:",
      },
      {
        id: "allow-client-read-transition",
        effect: "allow",
        action: "analytics:client:read",
      },
    ],
    object_acl: [{
      id: "deny-transition-candidate",
      effect: "deny",
      principal_id: "user_acl_transition",
      action: "analytics:client:read",
      resource_id: existingGroup.client_group_id,
    }],
  };
  const allowedContext = {
    ...deniedContext,
    object_acl: [],
  };
  const body = registrationBody({
    client,
    idempotencyKey: "client-review-proof-transition",
  });
  const before = repository.snapshot();
  const deniedReview = handleClientGroupRegistrationReview({
    body,
    context: deniedContext,
    requestId: "req_review_proof_denied",
    runtime,
  });
  assert.equal(deniedReview.status, 200);
  assert.equal(deniedReview.body.item.candidates.length, 0);
  assert.equal(deniedReview.body.item.has_restricted_candidates, true);
  const oldDigest = deniedReview.body.item.review_digest;
  const allowedReview = handleClientGroupRegistrationReview({
    body,
    context: allowedContext,
    requestId: "req_review_proof_allowed",
    runtime,
  });
  assert.equal(allowedReview.status, 200);
  assert.equal(allowedReview.body.item.candidates.length, 1);
  assert.equal(allowedReview.body.item.candidates[0].client_group_id, existingGroup.client_group_id);
  assert.notEqual(allowedReview.body.item.review_digest, oldDigest);
  assert.equal("has_hidden_candidate_count" in allowedReview.body.item, false);
  const staleCreate = handleClientGroupRegistrationCreate({
    body: {
      ...body,
      review_digest: oldDigest,
      confirm_distinct_client: true,
    },
    context: allowedContext,
    requestId: "req_review_proof_stale_create",
    runtime,
  });
  assert.equal(staleCreate.status, 409);
  assert.deepEqual(
    staleCreate.body.safe_error_codes,
    ["MASTER_DATA_CLIENT_REGISTRATION_REVIEW_DIGEST_MISMATCH"],
  );
  const safeStaleText = JSON.stringify(staleCreate.body);
  assert.equal(safeStaleText.includes(existingGroup.client_group_id), false);
  assert.equal(safeStaleText.includes(existingGroup.display_name), false);
  assert.deepEqual(repository.snapshot(), before);
});

test("CL-P5-W02-T02 replays a successful create after hidden duplicates and ACL state change without writing", () => {
  const principalId = account(OPERATIONS_EMAIL).user_id;
  const context = {
    principal: {
      user_id: principalId,
      tenant_id: TENANT,
      role_ids: ["client_operations"],
    },
    rules: [
      {
        id: "allow-replay-boundary-create",
        effect: "allow",
        action_prefix: "master_data:client:",
      },
      {
        id: "allow-replay-boundary-read",
        effect: "allow",
        action: "analytics:client:read",
      },
    ],
    object_acl: [],
  };
  const client = {
    client_type: "person",
    display_name: "API replay boundary hidden state",
  };
  const body = registrationBody({
    client,
    idempotencyKey: "client-replay-boundary",
  });
  const reviewed = handleClientGroupRegistrationReview({
    body,
    context,
    requestId: "req_replay_boundary_review",
    runtime,
  });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.item.can_create, true);

  const created = handleClientGroupRegistrationCreate({
    body: {
      ...body,
      review_digest: reviewed.body.item.review_digest,
    },
    context,
    requestId: "req_replay_boundary_create",
    runtime,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.replayed, false);
  const clientGroupId = created.body.item.client_group_id;

  repository.create({
    model_type: "Party",
    tenant_id: TENANT,
    party_id: "party-client-replay-boundary-hidden",
    party_type: "person",
    display_name: client.display_name,
    status: "active",
    owner_user_id: principalId,
  });
  const changedContext = {
    ...context,
    object_acl: [{
      id: "deny-replay-boundary-existing-group",
      effect: "deny",
      principal_id: principalId,
      action: "analytics:client:read",
      resource_id: clientGroupId,
    }],
  };
  const beforeReplay = repository.snapshot();
  const replayed = handleClientGroupRegistrationCreate({
    body: {
      ...body,
      review_digest: reviewed.body.item.review_digest,
    },
    context: changedContext,
    requestId: "req_replay_boundary_after_state_change",
    runtime,
  });
  assert.equal(replayed.status, 200);
  assert.equal(replayed.body.replayed, true);
  assert.equal(replayed.body.item.client_group_id, clientGroupId);
  const safeReplayText = JSON.stringify(replayed.body);
  assert.equal(safeReplayText.includes("party-client-replay-boundary-hidden"), false);
  assert.equal("has_restricted_candidates" in replayed.body.item, false);
  assert.equal("omitted_item_count" in replayed.body, false);
  assert.deepEqual(repository.snapshot(), beforeReplay);
});

test("CL-P5-W02-T02 returns bounded validation errors without reflecting raw client fields", async () => {
  const rawValue = "raw-client-value-must-not-return";
  const before = repository.snapshot();
  const response = await post("/master-data/client-groups/review", {
    tenant_id: TENANT,
    permission_ref: "perm_client_registration_test",
    audit_hint_ref: "audit_client_registration_test",
    idempotency_key: "client-invalid-type",
    client: {
      client_type: "invalid",
      display_name: rawValue,
      email: `${rawValue}@example.test`,
    },
  });
  assert.equal(response.status, 400);
  assert.deepEqual(
    response.body.safe_error_codes,
    ["MASTER_DATA_CLIENT_REGISTRATION_INVALID_INPUT"],
  );
  assert.equal(JSON.stringify(response.body).includes(rawValue), false);

  const missingLegalForm = await review(
    {
      client_type: "organization",
      display_name: rawValue,
    },
    "client-missing-legal-form",
  );
  assert.equal(missingLegalForm.status, 400);
  assert.deepEqual(
    missingLegalForm.body.safe_error_codes,
    ["MASTER_DATA_CLIENT_REGISTRATION_INVALID_INPUT"],
  );
  assert.equal(
    JSON.stringify(missingLegalForm.body).includes(rawValue),
    false,
  );
  assert.deepEqual(repository.snapshot(), before);
});
