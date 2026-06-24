import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_sf_b_w07_synthetic";
const ACTOR_ID = "matter_data_cloud_operator";
const JOB_ID = "data_cloud_job_sf_b_w07";

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR_ID, tenant_id: TENANT, role_ids: ["data_cloud_operator"] },
    rules: [{ id: `rule_sf_b_w07_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function withServer(callback) {
  const started = await startApiServer({ port: 0 });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, { method = "GET", body, headers = {} } = {}) {
  const requestHeaders = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...headers,
  };
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function query(permission = "read") {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: `perm_ref_sf_b_w07_${permission}`,
    audit_hint_ref: `audit_hint_sf_b_w07_${permission}`,
  }).toString();
}

function body(overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_sf_b_w07_write",
    audit_hint_ref: "audit_hint_sf_b_w07_write",
    actor_id: ACTOR_ID,
    ...overrides,
  };
}

async function createJob(baseUrl) {
  return json(baseUrl, "/api/data-cloud/enrichment-jobs", {
    method: "POST",
    body: body({
      idempotency_key: "sf-b-w07-enrichment-job-create",
      job_id: JOB_ID,
      provider_id: "provider_salesforce_data_cloud",
      target_object: "Client",
      target_refs: [{ object_type: "Client", record_ref: "raw-client-ref-should-not-return", label: "Client" }],
      data_categories: ["firmographic", "relationship"],
    }),
  });
}

test("SF-B-W07R health and provider routes are mounted and safe", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    const boundedContext = health.body.bounded_contexts.find((item) => item.bounded_context === "data-cloud-enrichment");
    assert.equal(health.status, 200);
    assert.ok(boundedContext);
    assert.equal(boundedContext.production_ready_claim, false);
    assert.equal(boundedContext.external_provider_runtime_enabled, false);
    assert.equal(boundedContext.product_record_mutation_allowed, false);
    assert.ok(boundedContext.endpoints.includes("GET /api/data-cloud/providers"));
    assert.ok(boundedContext.endpoints.includes("POST /api/data-cloud/segment-activations"));

    const providers = await json(baseUrl, `/api/data-cloud/providers?${query("providers")}`);
    assert.equal(providers.status, 200);
    assert.equal(providers.body.outcome, "passed");
    assert.equal(providers.body.items.some((item) => item.provider_id === "provider_salesforce_data_cloud"), true);
    assert.equal(providers.body.items[0].credentials_included, false);
    assert.equal(providers.body.items[0].provider_tokens_included, false);
    assert.equal(providers.body.items[0].provider_payload_included, false);
    assert.equal(JSON.stringify(providers.body).includes(ACTOR_ID), false);

    const denied = await json(baseUrl, `/api/data-cloud/providers?${query("denied")}`, {
      headers: { [PERMISSION_CONTEXT_HEADER]: permissionContext("deny") },
    });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.count_leak_prevented, true);
  });
});

test("SF-B-W07R provider registration and consent records are route-backed but blocked by required gates", async () => {
  await withServer(async (baseUrl) => {
    const provider = await json(baseUrl, "/api/data-cloud/providers", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w07-provider-create",
        provider_id: "provider_sf_b_w07",
        label: "Owner reviewed enrichment provider",
        data_categories: ["firmographic"],
      }),
    });
    assert.equal(provider.status, 201);
    assert.equal(provider.body.outcome, "provider_blocked");
    assert.equal(provider.body.ui_state, "provider_blocked");
    assert.equal(provider.body.item.status, "disabled");
    assert.equal(provider.body.item.provider_configured, false);
    assert.equal(provider.body.item.provider_call_performed, false);

    const replay = await json(baseUrl, "/api/data-cloud/providers", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w07-provider-create",
        provider_id: "provider_sf_b_w07",
        label: "Owner reviewed enrichment provider",
      }),
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.outcome, "idempotent_replay");

    const consent = await json(baseUrl, "/api/data-cloud/consent-records", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w07-consent-create",
        consent_record_id: "consent_sf_b_w07",
        data_categories: ["firmographic", "relationship"],
        lawful_basis: "owner_review_required",
      }),
    });
    assert.equal(consent.status, 201);
    assert.equal(consent.body.outcome, "owner_blocked");
    assert.equal(consent.body.item.consent_applied, false);
    assert.equal(consent.body.item.raw_consent_document_included, false);
  });
});

test("SF-B-W07R enrichment job create and preview are safe while execute is provider-blocked", async () => {
  await withServer(async (baseUrl) => {
    const created = await createJob(baseUrl);
    assert.equal(created.status, 201);
    assert.equal(created.body.outcome, "passed");
    assert.equal(created.body.ui_state, "route_mounted");
    assert.equal(created.body.item.provider_call_performed, false);
    assert.equal(created.body.item.product_records_mutated, false);
    assert.equal(JSON.stringify(created.body).includes("raw-client-ref-should-not-return"), false);

    const preview = await json(baseUrl, `/api/data-cloud/enrichment-jobs/${JOB_ID}/preview?${query("preview")}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.item.provider_call_performed, false);
    assert.equal(preview.body.item.raw_identifiers_included, false);
    assert.equal(preview.body.item.provider_payload_included, false);
    assert.equal(preview.body.item.product_records_mutated, false);

    const executed = await json(baseUrl, `/api/data-cloud/enrichment-jobs/${JOB_ID}/execute`, {
      method: "POST",
      body: body({ idempotency_key: "sf-b-w07-execute-job" }),
    });
    assert.equal(executed.status, 200);
    assert.equal(executed.body.outcome, "provider_blocked");
    assert.equal(executed.body.ui_state, "provider_blocked");
    assert.equal(executed.body.result.provider_receipt_required, true);
    assert.equal(executed.body.result.raw_provider_fields_included, false);

    const results = await json(baseUrl, `/api/data-cloud/enrichment-results?${query("results")}`);
    assert.equal(results.status, 200);
    assert.equal(results.body.items.some((item) => item.job_id === JOB_ID), true);
    assert.equal(results.body.items.some((item) => item.provider_call_performed === true), false);
  });
});

test("SF-B-W07R identity, unified profile, segment activation, and audit stay owner/provider gated", async () => {
  await withServer(async (baseUrl) => {
    await createJob(baseUrl);

    const identity = await json(baseUrl, "/api/data-cloud/identity-resolution", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w07-identity-resolution",
        identity_resolution_id: "identity_sf_b_w07",
      }),
    });
    assert.equal(identity.status, 200);
    assert.equal(identity.body.outcome, "owner_blocked");
    assert.equal(identity.body.item.automatic_merge_performed, false);
    assert.equal(identity.body.item.canonical_master_data_write_performed, false);
    assert.equal(identity.body.item.direct_matter_creation_performed, false);

    const profile = await json(baseUrl, `/api/data-cloud/unified-profiles/unified_profile_client_seed?${query("profile")}`);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.item.provider_graph_included, false);
    assert.equal(profile.body.item.direct_identifiers_included, false);
    assert.equal(profile.body.item.raw_contact_values_included, false);

    const activation = await json(baseUrl, "/api/data-cloud/segment-activations", {
      method: "POST",
      body: body({
        idempotency_key: "sf-b-w07-segment-activation",
        activation_id: "segment_activation_sf_b_w07",
        segment_label: "Client review segment",
        destination_label: "Salesforce audience",
      }),
    });
    assert.equal(activation.status, 201);
    assert.equal(activation.body.outcome, "provider_blocked");
    assert.equal(activation.body.item.activation_submitted, false);
    assert.equal(activation.body.item.audience_member_identifiers_included, false);

    const audit = await json(baseUrl, `/api/data-cloud/audit?${query("audit")}`);
    assert.equal(audit.status, 200);
    assert.equal(audit.body.items.length >= 2, true);
    assert.equal(audit.body.items.some((item) => item.provider_payload_included === true), false);
    assert.equal(audit.body.items.some((item) => item.credentials_included === true), false);
    assert.equal(JSON.stringify(audit.body).includes(ACTOR_ID), false);
  });
});
