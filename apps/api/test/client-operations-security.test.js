import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createInquiryEvidenceStorageService } from "../../../packages/email-dms/src/inquiry-evidence-storage-service.js";
import { createFileStorageAdapter } from "../../../packages/dms/src/storage/file-storage-adapter.js";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { createAuthCredentialRecord, createAuthCredentialStore } from "../src/auth-credential-store.js";
import { createAuthPasswordResetStore } from "../src/auth-password-reset-store.js";
import {
  LAWOS_CLIENT_SCOPES,
  resolveLawosUserRoleAssignment,
} from "../src/lawos-role-registry.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
} from "../src/matter-vault-account-registry.js";
import { createAnalyticsRuntimeContext } from "../src/analytics-runtime-context.js";
import { evaluateRouteDecision } from "../src/permission-gate.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const AS_OF = "2026-07-30T03:00:00.000Z";
const ROLE_EMAILS = Object.freeze([
  "yjlee@amic.kr",
  "jh731@amic.kr",
  "wsjo@amic.kr",
  "bj.park@amic.kr",
  "ytkim@amic.kr",
]);

const CAPABILITY_ACTIONS = Object.freeze({
  "crm.inquiry.read": "crm:inquiry:read",
  "crm.inquiry.write": "crm:inquiry:update",
  "crm.inquiry.evidence.read": "email_dms:inquiry_evidence:read",
  "crm.engagement.decide": "crm:engagement:decide",
  "outlook.connection.manage": "outlook:connection:create",
  "outlook.inquiry.capture": "outlook:inquiry:capture",
  "master_data.client.write": "master_data:client:create",
  "finance.fee.write": "finance:fee_commitment:write",
  "analytics.client.read": "analytics:client:read",
  "analytics.client.export": "analytics:client:export",
});

assert.deepEqual(
  Object.keys(CAPABILITY_ACTIONS).sort(),
  [...LAWOS_CLIENT_SCOPES].sort(),
  "the security matrix must cover every registered Client capability",
);

function account(email) {
  const value = findRegisteredAccountByEmail(email);
  assert.ok(value, `registered account ${email} must exist`);
  return value;
}

function operationalAccount(email) {
  const value = account(email);
  return {
    ...value,
    local_dev: {
      ...value.local_dev,
      synthetic_token: `client-security-password-${value.user_id}`,
    },
  };
}

function createOperationalSessionAuth() {
  const records = ROLE_EMAILS.map((email) => {
    const user = account(email);
    return createAuthCredentialRecord({
      user_id: user.user_id,
      email: user.email,
      password: operationalAccount(email).local_dev.synthetic_token,
    });
  });
  return createApiSessionAuth({
    profile: "operational",
    secret: "client-operations-security-test-secret-20260731-0123456789",
    credentialStore: createAuthCredentialStore({ records }),
    passwordResetTokenStore: createAuthPasswordResetStore(),
  });
}

function createRevocableSessionAuth() {
  const base = createOperationalSessionAuth();
  let revoked = false;
  return {
    auth: Object.freeze({
      ...base,
      async resolvePermissionContextFromHeaders(...args) {
        const resolved = await base.resolvePermissionContextFromHeaders(...args);
        if (!resolved.ok || !revoked) return resolved;
        return {
          ...resolved,
          context: {
            ...resolved.context,
            object_acl: [{
              id: "client-security-lead-revoked",
              effect: "deny",
              principal_id: resolved.context.principal.user_id,
              resource_id: "lead-security-visible",
              action: "crm:inquiry:read",
            }],
          },
        };
      },
    }),
    revoke() {
      revoked = true;
    },
  };
}

function clientGroup(client_group_id, display_name, party_id) {
  return {
    model_type: "ClientGroup",
    tenant_id: TENANT,
    client_group_id,
    display_name,
    member_party_ids: [party_id],
    primary_party_id: party_id,
    owner_user_id: "user_amic_ytkim",
    status: "active",
  };
}

function lead(lead_id, client_group_id, party_id, display_name) {
  return {
    model_type: "Lead",
    tenant_id: TENANT,
    lead_id,
    party_id,
    client_group_id,
    display_name,
    inquiry_status: "new",
    source: "manual",
    received_at: "2026-07-30T01:00:00.000Z",
    next_action: "문의 확인",
    assigned_user_id: null,
    owner_user_id: "user_amic_ytkim",
    status: "active",
    version: 1,
  };
}

function financeDeposit(id, client_group_id, amount, party_id) {
  return [
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: `bank-${id}`,
      account_ref: "security-account",
      transaction_fingerprint: `fingerprint-${id}`,
      date: "2026-07-10",
      occurred_at: "2026-07-10T01:00:00.000Z",
      direction: "inflow",
      amount,
      balance_after: amount,
      currency: "KRW",
      status: "posted",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id: `classification-${id}`,
      bank_transaction_id: `bank-${id}`,
      client_group_id,
      transaction_date: "2026-07-10",
      transaction_direction: "inflow",
      amount,
      currency: "KRW",
      category: "client_receipt",
      status: "confirmed",
      party_id,
    },
  ];
}

function securityFixture({ aggregate = false } = {}) {
  const masterRecords = aggregate
    ? [
        clientGroup("client-security-visible", "Visible security client", "party-security-visible"),
        clientGroup("client-security-hidden", "Secret security client", "party-security-hidden"),
      ]
    : [clientGroup("client-security-visible", "Visible security client", "party-security-visible")];
  const crmRecords = aggregate
    ? [
        lead("lead-security-visible", "client-security-visible", "party-security-visible", "Visible inquiry"),
        lead("lead-security-hidden", "client-security-hidden", "party-security-hidden", "Secret inquiry"),
      ]
    : [lead("lead-security-visible", "client-security-visible", "party-security-visible", "Visible inquiry")];
  const financeRecords = aggregate
    ? [
        ...financeDeposit("visible", "client-security-visible", 1_000_000, "party-security-visible"),
        ...financeDeposit("hidden", "client-security-hidden", 99_000_000, "party-security-hidden"),
      ]
    : [];
  const masterDataRepository = createMasterDataRepository({ seedRecords: masterRecords });
  const crmRepository = createCrmRuntimeRepository({ seedRecords: crmRecords });
  const financeRepository = createFinanceRepository({ seedRecords: financeRecords });
  const analyticsRepository = createAnalyticsRepository();
  const analyticsRuntime = createAnalyticsRuntimeContext({
    repository: analyticsRepository,
    masterDataRepository,
    crmRepository,
    financeRepository,
    clock: () => new Date("2026-07-30T03:00:05.000Z"),
  });
  return {
    masterDataRepository,
    crmRepository,
    financeRepository,
    analyticsRepository,
    analyticsRuntime,
  };
}

async function withServer(fixture, callback, { emailDmsRuntime = null, sessionAuth = null } = {}) {
  const started = await startApiServer({
    port: 0,
    runtimeProfile: "local-dev",
    sessionAuth: sessionAuth ?? createOperationalSessionAuth(),
    masterDataRepository: fixture?.masterDataRepository,
    crmRepository: fixture?.crmRepository,
    crmMasterDataRepository: fixture?.masterDataRepository,
    financeRepository: fixture?.financeRepository,
    analyticsRuntime: fixture?.analyticsRuntime,
    emailDmsRuntime: emailDmsRuntime ?? undefined,
  });
  try {
    return await callback(started, `http://${started.host}:${started.port}`);
  } finally {
    started.server.closeIdleConnections?.();
    started.server.closeAllConnections?.();
    await new Promise((resolve) => started.server.close(resolve));
    for (const repository of [
      fixture?.masterDataRepository,
      fixture?.crmRepository,
      fixture?.financeRepository,
      fixture?.analyticsRepository,
      emailDmsRuntime?.repository,
    ]) {
      repository?.close?.();
    }
  }
}

function query(overrides = {}) {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: "client-security-permission",
    audit_hint_ref: "client-security-audit",
    as_of: AS_OF,
    revenue_ranking_period: "year",
    ...overrides,
  }).toString();
}

async function request(baseUrl, pathname, { accountEmail, headers = {}, ...options } = {}) {
  const authHeaders = accountEmail
    ? await apiSessionHeaders(baseUrl, operationalAccount(accountEmail))
    : {};
  const mergedHeaders = { ...authHeaders, ...headers };
  const body = options.body && typeof options.body === "object"
    ? JSON.stringify(options.body)
    : options.body;
  if (body !== undefined && !mergedHeaders["content-type"]) mergedHeaders["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: mergedHeaders,
    body,
  });
  return { status: response.status, body: await response.json() };
}

function routeDecision(context, action) {
  return evaluateRouteDecision({
    context,
    resource: {
      tenant_id: TENANT,
      resource_type: "ClientSecurityCapability",
      resource_id: action,
    },
    action,
  });
}

test("CL-P6-W01-T02 production signed sessions revalidate every registered Client capability", async () => {
  const fixture = securityFixture();
  await withServer(fixture, async (started, baseUrl) => {
    const matrix = [];
    for (const email of ROLE_EMAILS) {
      const headers = await apiSessionHeaders(baseUrl, operationalAccount(email));
      const session = await request(baseUrl, "/api/auth/session", { headers });
      assert.equal(session.status, 200);
      assert.equal(session.body.session.mode, "api-signed-session");
      assert.equal(session.body.session.synthetic_only, false);

      const resolved = await started.sessionAuth.resolvePermissionContextFromHeaders(
        headers,
        { requestId: `client-security-matrix-${email}`, requireSessionToken: true },
      );
      assert.equal(resolved.ok, true);
      const assignment = resolveLawosUserRoleAssignment(account(email));
      const clientScopes = assignment.scopes.filter((scope) => LAWOS_CLIENT_SCOPES.includes(scope)).sort();
      assert.deepEqual(
        [...session.body.session.scopes].filter((scope) => LAWOS_CLIENT_SCOPES.includes(scope)).sort(),
        clientScopes,
      );
      for (const [capability, action] of Object.entries(CAPABILITY_ACTIONS)) {
        const expected = clientScopes.includes(capability) ? "allow" : "deny";
        const decision = routeDecision(resolved.context, action);
        assert.equal(decision.effect, expected, `${email} ${capability} ${action}`);
        matrix.push({ email, capability, action, expected, actual: decision.effect });
      }
    }
    assert.equal(matrix.length, ROLE_EMAILS.length * LAWOS_CLIENT_SCOPES.length);
    console.log(JSON.stringify({ scenario: "production-signed-client-capability-matrix", cells: matrix }, null, 2));
  });
});

test("CL-P6-W01-T01 aggregates only ACL-permitted clients before CRM and finance reads", async () => {
  const fixture = securityFixture({ aggregate: true });
  await withServer(fixture, async (started, baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl, operationalAccount("yjlee@amic.kr"));
    const resolved = await started.sessionAuth.resolvePermissionContextFromHeaders(
      headers,
      { requestId: "client-security-aggregate-session", requireSessionToken: true },
    );
    assert.equal(resolved.ok, true);
    const restrictedContext = {
      ...resolved.context,
      object_acl: [{
        id: "client-security-hidden-deny",
        effect: "deny",
        principal_id: resolved.context.principal.user_id,
        action: "analytics:client:read",
        client_group_id: "client-security-hidden",
      }],
    };
    const projected = fixture.analyticsRuntime.clientOperationsReadModel.readDashboard({
      tenant_id: TENANT,
      permission_context: restrictedContext,
      as_of: AS_OF,
      timezone: "Asia/Seoul",
      revenue_ranking_period: "year",
    });
    assert.equal(projected.access_scope.allowed_client_group_ids.length, 1);
    const response = projected.item;
    assert.equal(response.sections.kpis.data.values.deposit_revenue_month, 1_000_000);
    assert.deepEqual(response.sections.revenue_ranking.data.items.map((item) => item.client_group_id), ["client-security-visible"]);
    assert.equal(response.sections.kpis.data.values.new_inquiries, 1);
    assert.equal(response.unauthorized_count_included, false);
    assert.equal(response.unauthorized_amount_included, false);
    const serialized = JSON.stringify(response);
    for (const hidden of ["client-security-hidden", "Secret security client", "lead-security-hidden", "Secret inquiry", "99000000"]) {
      assert.equal(serialized.includes(hidden), false, `hidden value leaked: ${hidden}`);
    }
    console.log(JSON.stringify({
      scenario: "aggregate-before-permission",
      visible_client_ids: response.sections.revenue_ranking.data.items.map((item) => item.client_group_id),
      visible_deposit_revenue_month: response.sections.kpis.data.values.deposit_revenue_month,
      unauthorized_count_included: response.unauthorized_count_included,
      unauthorized_amount_included: response.unauthorized_amount_included,
    }, null, 2));
  });
});

test("CL-P6-W01-T01 Client export scope does not expand into generic analytics export", async () => {
  const fixture = securityFixture();
  await withServer(fixture, async (_started, baseUrl) => {
    const bodyFor = (id, tenantId = TENANT) => ({
      tenant_id: tenantId,
      permission_ref: `client-security-export-${id}`,
      audit_hint_ref: "client-security-export-audit",
      idempotency_key: `client-security-export-${id}`,
      analytics_export: {
        analytics_export_id: `client-security-export-${id}`,
        tenant_id: tenantId,
        dashboard_id: "dashboard-ar-aging",
      },
    });
    for (const email of ["wsjo@amic.kr", "bj.park@amic.kr"]) {
      const response = await request(baseUrl, "/api/analytics/exports", {
        accountEmail: email,
        method: "POST",
        body: bodyFor(email.split("@")[0]),
      });
      assert.equal(response.status, 403, `${email} must not inherit generic analytics export`);
      assert.deepEqual(response.body.safe_error_codes, ["ANALYTICS_UNAUTHORIZED_OMISSION"]);
    }
    const crossTenant = await request(baseUrl, "/api/analytics/exports", {
      accountEmail: "ytkim@amic.kr",
      method: "POST",
      body: bodyFor("attacker", "tenant-attacker"),
    });
    assert.equal(crossTenant.status, 403);
    assert.deepEqual(crossTenant.body.safe_error_codes, ["ANALYTICS_UNAUTHORIZED_OMISSION"]);
    assert.equal(
      fixture.analyticsRepository.listAudit({ tenant_id: "tenant-attacker" }).length,
      0,
      "a forged tenant must never receive a denied-route audit",
    );
    const admin = await request(baseUrl, "/api/analytics/exports", {
      accountEmail: "ytkim@amic.kr",
      method: "POST",
      body: bodyFor("admin"),
    });
    assert.equal(admin.status, 201);
    assert.equal(admin.body.item.credential_material_included, false);
    const deniedAudits = fixture.analyticsRepository.listAudit({ tenant_id: TENANT })
      .filter((event) => event.action === "analytics:export:write" && event.decision === "deny");
    assert.equal(deniedAudits.length, 3);
    const crossTenantAudit = deniedAudits.find((event) => event.reason === "cross_tenant_deny");
    assert.ok(crossTenantAudit);
    assert.equal(crossTenantAudit.actor_id, account("ytkim@amic.kr").user_id);
    assert.equal(deniedAudits.every((event) => event.metadata.raw_payload_included === false), true);
    console.log(JSON.stringify({
      scenario: "export-permission-non-expansion",
      denied_roles: ["wsjo@amic.kr", "bj.park@amic.kr"],
      admin_status: admin.status,
      cross_tenant_status: crossTenant.status,
      attacker_tenant_audit_events: fixture.analyticsRepository.listAudit({ tenant_id: "tenant-attacker" }).length,
      denied_audit_events: deniedAudits.length,
    }, null, 2));
  });
});

async function createEvidenceFixture() {
  const root = mkdtempSync(join(tmpdir(), "lawos-client-security-evidence-"));
  const repository = createEmailDmsRepository();
  const storage = createFileStorageAdapter({
    adapter_id: "client-security-evidence",
    rootPath: join(root, "objects"),
  });
  const service = createInquiryEvidenceStorageService({
    repository,
    storage,
    scanner: {
      async scan({ bytes, object_kind: objectKind }) {
        return objectKind === "original_mime" && bytes.includes(Buffer.from("QUARANTINE"))
          ? { status: "quarantined" }
          : { status: "clean" };
      },
    },
    kms_key_ref: "kms:client-security-test",
    clock: () => new Date("2026-07-30T03:00:00.000Z"),
  });
  const store = (id, mime) => service.storeMessageEvidence({
    tenant_id: TENANT,
    mailbox_address: "client-security@example.invalid",
    captured_by: "user_amic_yjlee",
    idempotency_key: `client-security-evidence-${id}`,
    mime_bytes: Buffer.from(mime),
    graph_immutable_message_id: `graph-client-security-${id}`,
    kms_key_ref: "kms:client-security-test",
    message_metadata: {
      internet_message_id: `<client-security-${id}@example.invalid>`,
      conversation_id: `conversation-client-security-${id}`,
      subject: `Client security ${id}`,
      sender: { display_name: "Security sender", address: "sender@example.invalid" },
      recipients: [{ recipient_type: "to", display_name: "Intake", address: "client-security@example.invalid" }],
      received_at: "2026-07-30T02:59:00.000Z",
    },
  });
  const clean = await store("clean", "From: sender@example.invalid\r\nSubject: clean\r\n\r\nClean MIME body");
  const quarantined = await store("quarantine", "From: sender@example.invalid\r\nSubject: quarantine\r\n\r\nQUARANTINE");
  return { root, repository, storage, service, clean, quarantined };
}

test("CL-P6-W01-T01 signed MIME reads deny cross-tenant/forged principals and quarantine raw content", async () => {
  const evidence = await createEvidenceFixture();
  const fixture = securityFixture();
  const emailDmsRuntime = {
    authority: "email-dms",
    repository: evidence.repository,
    storage: evidence.storage,
    evidence_storage_service: evidence.service,
    production_ready_claim: false,
  };
  await withServer(fixture, async (_started, baseUrl) => {
    const cleanId = evidence.clean.evidence.inquiry_email_evidence_id;
    const quarantineId = evidence.quarantined.evidence.inquiry_email_evidence_id;
    const clean = await request(baseUrl, `/api/outlook/inquiries/evidence/${encodeURIComponent(cleanId)}/content?${query({ kind: "original" })}`, {
      accountEmail: "yjlee@amic.kr",
    });
    assert.equal(clean.status, 200);
    assert.equal(clean.body.item.scan_status, "clean");
    assert.equal(clean.body.item.content_base64, Buffer.from("From: sender@example.invalid\r\nSubject: clean\r\n\r\nClean MIME body").toString("base64"));
    assert.equal(clean.body.item.raw_path_exposed, false);

    const crossTenant = await request(baseUrl, `/api/outlook/inquiries/evidence/${encodeURIComponent(cleanId)}/content?${query({ tenant_id: "tenant-attacker", kind: "original" })}`, {
      accountEmail: "yjlee@amic.kr",
      headers: { "x-lawos-tenant-id": "tenant-attacker", "x-lawos-actor-id": "forged-principal" },
    });
    assert.equal(crossTenant.status, 403);
    assert.equal(JSON.stringify(crossTenant.body).includes("Clean MIME body"), false);
    assert.deepEqual(crossTenant.body.safe_error_codes, ["M365_CONNECTION_TENANT_MISMATCH"]);

    const token = (await apiSessionHeaders(baseUrl, operationalAccount("yjlee@amic.kr"))).authorization.slice("Bearer ".length);
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    const forged = await request(baseUrl, `/api/outlook/inquiries/evidence/${encodeURIComponent(cleanId)}/content?${query({ kind: "original" })}`, {
      headers: { authorization: `Bearer ${tamperedToken}` },
    });
    assert.equal(forged.status, 401);
    assert.deepEqual(forged.body.safe_error_codes, ["AUTH_SESSION_INVALID"]);

    const quarantined = await request(baseUrl, `/api/outlook/inquiries/evidence/${encodeURIComponent(quarantineId)}/content?${query({ kind: "original" })}`, {
      accountEmail: "yjlee@amic.kr",
    });
    assert.equal(quarantined.status, 423);
    assert.deepEqual(quarantined.body.safe_error_codes, ["INQUIRY_EVIDENCE_QUARANTINED"]);
    assert.equal(JSON.stringify(quarantined.body).includes("From: sender@example.invalid"), false);

    const audits = evidence.repository.listAudit({ tenant_id: TENANT });
    assert.equal(audits.some((event) => event.event_type === "inquiry.email_evidence.sensitive_read" && event.object_id === cleanId), true);
    assert.equal(audits.some((event) => event.event_type === "inquiry.email_evidence.quarantined" && event.object_id === quarantineId), true);
    assert.equal(audits.filter((event) => event.event_type === "inquiry.email_evidence.sensitive_read" && event.object_id === quarantineId).length, 0);
    console.log(JSON.stringify({
      scenario: "sensitive-mime-deny-and-quarantine",
      clean_status: clean.status,
      cross_tenant_status: crossTenant.status,
      forged_token_status: forged.status,
      quarantine_status: quarantined.status,
      audit_event_types: audits.map((event) => event.event_type),
    }, null, 2));
  }, { emailDmsRuntime });
  rmSync(evidence.root, { recursive: true, force: true });
});

test("CL-P6-W01-T01 Outlook evidence GET revalidates the linked Lead ACL after revocation", async () => {
  const evidence = await createEvidenceFixture();
  const cleanId = evidence.clean.evidence.inquiry_email_evidence_id;
  evidence.repository.update({
    tenant_id: TENANT,
    model_type: "InquiryEmailEvidence",
    inquiry_email_evidence_id: cleanId,
  }, {
    lead_id: "lead-security-visible",
    capture_status: "complete",
  });
  const fixture = securityFixture();
  const revocableSessionAuth = createRevocableSessionAuth();
  const emailDmsRuntime = {
    authority: "email-dms",
    repository: evidence.repository,
    storage: evidence.storage,
    evidence_storage_service: evidence.service,
    production_ready_claim: false,
  };
  await withServer(fixture, async (_started, baseUrl) => {
    const beforeMetadata = await request(baseUrl, `/api/outlook/inquiries?${query({ q: "Visible inquiry" })}`, {
      accountEmail: "yjlee@amic.kr",
    });
    assert.equal(beforeMetadata.status, 200);
    assert.equal(beforeMetadata.body.items.length, 1);
    assert.equal(beforeMetadata.body.items[0].display_name, "Visible inquiry");

    const beforeContent = await request(baseUrl, `/api/outlook/inquiries/evidence/${encodeURIComponent(cleanId)}/content?${query({ kind: "original" })}`, {
      accountEmail: "yjlee@amic.kr",
    });
    assert.equal(beforeContent.status, 200);
    assert.equal(beforeContent.body.item.content_base64.length > 0, true);

    revocableSessionAuth.revoke();

    const afterMetadata = await request(baseUrl, `/api/outlook/inquiries?${query({ q: "Visible inquiry" })}`, {
      accountEmail: "yjlee@amic.kr",
    });
    assert.equal(afterMetadata.status, 200);
    assert.deepEqual(afterMetadata.body.items, []);
    assert.equal(JSON.stringify(afterMetadata.body).includes("Visible inquiry"), false);

    const revokedContent = await request(baseUrl, `/api/outlook/inquiries/evidence/${encodeURIComponent(cleanId)}/content?${query({ kind: "original" })}`, {
      accountEmail: "yjlee@amic.kr",
    });
    assert.equal(revokedContent.status, 404);
    assert.deepEqual(revokedContent.body.safe_error_codes, ["INQUIRY_EVIDENCE_NOT_FOUND"]);
    assert.equal(JSON.stringify(revokedContent.body).includes("Client security clean"), false);
    assert.equal(JSON.stringify(revokedContent.body).includes("From: sender@example.invalid"), false);
    assert.equal(revokedContent.body.item, null);

    const missingContent = await request(baseUrl, `/api/outlook/inquiries/evidence/client-security-missing/content?${query({ kind: "original" })}`, {
      accountEmail: "yjlee@amic.kr",
    });
    assert.equal(missingContent.status, revokedContent.status);
    assert.deepEqual(missingContent.body.safe_error_codes, revokedContent.body.safe_error_codes);
    assert.equal(missingContent.body.item, null);
    console.log(JSON.stringify({
      scenario: "outlook-evidence-lead-acl-revocation",
      metadata_before_status: beforeMetadata.status,
      metadata_after_items: afterMetadata.body.items.length,
      content_before_status: beforeContent.status,
      revoked_content_status: revokedContent.status,
      missing_content_status: missingContent.status,
      no_existence_leak: true,
    }, null, 2));
  }, { emailDmsRuntime, sessionAuth: revocableSessionAuth.auth });
  rmSync(evidence.root, { recursive: true, force: true });
});
