#!/usr/bin/env node

/*
 * Built-bundle proof for the two fixed Outlook surfaces.
 *
 * This runner intentionally talks to the Vite dist bundle.  The browser only
 * receives a public auth configuration and a signed local session; all
 * Outlook routes are dispatched through the same API runtime used by the
 * local server, with a deterministic Microsoft Graph mail provider.  The
 * provider never returns credentials or raw content to the browser.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import {
  createApiServer,
  createDefaultDmsRuntime,
  createDefaultMatterRuntime,
  createDefaultCrmIntakeRuntime,
} from "../apps/api/src/server.js";
import { createFinanceRuntimeContext } from "../apps/api/src/finance-runtime-context.js";
import { outlookAddinProofSnapshot } from "../apps/api/src/outlook-addin-runtime-context.js";
import { createDmsRepository, createFileStorageAdapter } from "../packages/dms/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";
import { createEmailDmsRepository } from "../packages/email-dms/src/repository.js";
import { OUTLOOK_EMAIL_OBJECT_FIELDS } from "../packages/email-dms/src/email-model.js";
import { createInquiryEvidenceStorageService } from "../packages/email-dms/src/inquiry-evidence-storage-service.js";
import { INQUIRY_EVIDENCE_OBJECT_KINDS } from "../packages/email-dms/src/inquiry-evidence-model.js";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { createInMemoryHrxRepository } from "../packages/hrx/src/repository.js";
import { createCrmRuntimeRepository } from "../packages/crm/src/runtime-repository.js";
import { createMasterDataRepository } from "../packages/master-data/src/repository.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../packages/email-dms/src/m365-connection-model.js";
import { createOutlookAttachmentReceiptAuthority } from "../apps/api/src/outlook-attachment-receipt-authority.js";
import { createApiSessionAuth } from "../apps/api/src/session-auth.js";
import { findRegisteredAccountByEmail } from "../apps/api/src/matter-vault-account-registry.js";
import { IDENTITY_LEDGER_CONTRACT_VERSION, IDENTITY_LEDGER_METHODS } from "../packages/runtime-auth/src/identity-ledger.js";
import { startOutlookAddinStaticServer } from "./lib/outlook-addin-static-server.mjs";
import { parseOutlookManifest } from "./lib/outlook-manifest-projection.mjs";
import { readyOutlookReadinessResponse } from "../apps/addin/test/helpers/outlook-readiness-fixture.js";
import { createTrustedOutlookInstallationTestAuthority } from "../apps/api/test/helpers/outlook-trusted-installation-runtime.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c09-c12-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c09-c12-outlook-addin-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c09-c12-outlook-addin-browser-proof.md`;
const SCREENSHOT_PATH = `${SCREENSHOT_DIR}/taskpane-proof.png`;
const INQUIRY_SCREENSHOT_PATH = `${SCREENSHOT_DIR}/inquiry-proof.png`;
const MANUAL_ARTIFACT_DIR = "artifacts/manual-qa";
const MANUAL_SCREENSHOT_DIR = `${MANUAL_ARTIFACT_DIR}/screenshots`;
const E04_JSON_PATH = `${MANUAL_ARTIFACT_DIR}/upl-e04-smart-alerts-local-proof-2026-07-03.json`;
const E04_MD_PATH = `${MANUAL_ARTIFACT_DIR}/upl-e04-smart-alerts-local-proof-2026-07-03.md`;
const E04_SCREENSHOT_PATH = `${MANUAL_SCREENSHOT_DIR}/upl-e04-smart-alerts-local-proof-2026-07-03.png`;
const RELEASE_CONTRACT_PATH = "contracts/outlook-addin-release-gates.json";
const RELEASE_CONTRACT = JSON.parse(readFileSync(resolve(ROOT, RELEASE_CONTRACT_PATH), "utf8"));
const RELEASE_MANIFEST_PATHS = Object.freeze([
  "apps/addin/manifest.xml",
  "apps/addin/manifest.production.xml",
  "apps/addin/manifest.inquiry.xml",
  "apps/addin/manifest.inquiry.production.xml",
]);
const FOREIGN_ACCOUNT = findRegisteredAccountByEmail("qa.tenant-b@amic.kr");
const SESSION_B_ACCOUNT = findRegisteredAccountByEmail("wsjo@amic.kr");
const ENTRA_TENANT = "entra_upl_c09_c12_synthetic";
const SESSION_SECRET = "upl-c09-c12-session-secret-at-least-32-characters";

// The local API login is signed for the canonical Matter tenant.  The page
// query string is not used for tenancy; that is deliberately a presentation
// hint in the compiled profile bootstrap.
const TENANT = "tenant_amic_matter_vault";
const MATTER = "matter_upl_c09_c12_outlook";
const ACTOR = "user_amic_jwsuh";
const ENTRA_SUBJECT = "entra_upl_c09_c12_browser_proof";
const MAILBOX = "lawyer@example.invalid";
const SUBJECT = "Outlook C09-C12 browser proof";
const INTERNET_MESSAGE_ID = "<upl-c09-c12-proof@example.invalid>";
const CONVERSATION_ID = "upl-c09-c12-conversation";
const REST_MESSAGE_ID = "rest-upl-c09-c12-proof";
const ATTACHMENT_ID = "upl-c09-c12-attachment";
const ATTACHMENT_NAME = "proof.txt";
const ATTACHMENT_BYTES = Buffer.from("attachment proof bytes", "utf8");
const GRAPH_IMMUTABLE_ID = `immutable:${REST_MESSAGE_ID}`;
const INQUIRY_LEAD_ID = "lead_upl_c09_c12_existing";

const FULL_RAIL = Object.freeze([
  "mail.save-with-attachments",
  "matter.search",
  "task.create",
  "time-entry.draft",
  "all-functions",
]);
const INQUIRY_RAIL = Object.freeze(["inquiry.entry"]);

function seedMatterRepository() {
  return createMatterRepository({
    seedRecords: [
      {
        model_type: "MatterClient",
        tenant_id: TENANT,
        client_id: "client_upl_c09_c12",
        client_display_name: "Outlook filing proof client",
        client_short_name: "OUTLOOKPROOF",
        status: "active",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
      },
      {
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: MATTER,
        matter_code: "OUTLOOK/LIT/CIV/브라우저검증",
        matter_name: "Outlook add-in browser proof matter",
        client_id: "client_upl_c09_c12",
        client_display_name: "Outlook filing proof client",
        title: "Outlook add-in browser proof matter",
        status: "open",
        created_by: ACTOR,
        created_at: "2026-07-03T00:00:00.000Z",
        permission_envelope_id: "perm:upl:c09-c12",
        audit_trace_id: "audit:upl:c09-c12",
      },
    ],
  });
}

function proofMime(restMessageId = REST_MESSAGE_ID) {
  const boundary = "upl-c09-c12-boundary";
  return Buffer.from([
    "From: sender@example.invalid",
    `To: ${MAILBOX}`,
    "Date: Mon, 10 Aug 2026 01:00:00 +0000",
    `Subject: ${SUBJECT}`,
    `Message-ID: ${INTERNET_MESSAGE_ID}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "브라우저 증명 본문",
    `--${boundary}`,
    `Content-Type: text/plain; name=\"${ATTACHMENT_NAME}\"`,
    `Content-Disposition: attachment; filename=\"${ATTACHMENT_NAME}\"`,
    "Content-Transfer-Encoding: base64",
    "",
    ATTACHMENT_BYTES.toString("base64"),
    `--${boundary}--`,
    "",
  ].join("\r\n"));
}

// Keep one canonical provider payload for the inquiry readback proof.  The
// repository metadata and the canonical storage read must both identify this
// exact MIME object, not merely agree with each other.
const EXPECTED_INQUIRY_MIME_BYTES = proofMime(REST_MESSAGE_ID);
const EXPECTED_INQUIRY_MIME_SHA256 = createHash("sha256")
  .update(EXPECTED_INQUIRY_MIME_BYTES)
  .digest("hex");
const EXPECTED_INQUIRY_MIME_BYTE_SIZE = EXPECTED_INQUIRY_MIME_BYTES.byteLength;

function providerMetadata(restMessageId = REST_MESSAGE_ID) {
  const suffix = restMessageId === REST_MESSAGE_ID ? "a" : "b";
  const internet = restMessageId === REST_MESSAGE_ID
    ? INTERNET_MESSAGE_ID
    : `<upl-c09-c12-${suffix}@example.invalid>`;
  const conversation = restMessageId === REST_MESSAGE_ID
    ? CONVERSATION_ID
    : `upl-c09-c12-conversation-${suffix}`;
  return {
    mime_bytes: proofMime(restMessageId),
    mailbox_address: MAILBOX,
    immutable_message_id: restMessageId === REST_MESSAGE_ID
      ? GRAPH_IMMUTABLE_ID
      : `immutable:${restMessageId}`,
    internet_message_id: internet,
    provider_request_id: `provider:${restMessageId}`,
    message_metadata: {
      conversation_id: conversation,
      internet_message_id: internet,
      subject: SUBJECT,
      sender: { display_name: "증명 발신자", address: "sender@example.invalid" },
      from: { display_name: "증명 발신자", address: "sender@example.invalid" },
      recipients: [{ display_name: "AMIC", address: MAILBOX, recipient_type: "to" }],
      received_at: "2026-08-10T01:00:00.000Z",
      sent_at: "2026-08-10T01:00:00.000Z",
      has_attachments: true,
      is_in_sent_items: false,
      folder_kind: "inbox",
      is_draft: false,
    },
  };
}

function userTenant(user) {
  return user?.tenant_memberships?.find((membership) => membership.status !== "disabled")?.tenant_id ?? null;
}

function createSessionAuthFixture() {
  const users = [
    findRegisteredAccountByEmail("jwsuh@amic.kr"),
    SESSION_B_ACCOUNT,
    FOREIGN_ACCOUNT,
  ].filter(Boolean).map((user) => Object.freeze({
    ...user,
    account_status: "active",
    directory_source: "upl-c09-c12-session-fixture",
  }));
  const userById = new Map(users.map((user) => [user.user_id, user]));
  const subjects = new Map([
    ["user_amic_jwsuh", ENTRA_SUBJECT],
    [SESSION_B_ACCOUNT?.user_id, "entra_upl_c09_c12_browser_proof_b"],
    [FOREIGN_ACCOUNT?.user_id, "entra_upl_c09_c12_browser_proof_foreign"],
  ].filter(([key]) => key));
  const accounts = new Map(users.map((user) => [user.user_id, {
    tenant_id: userTenant(user),
    user_id: user.user_id,
    email: user.email,
    account_status: "active",
    credential_provider: "microsoft-office-naa-synthetic",
    credential_status: "active",
    credential_rev: 1,
    failed_login_count: 0,
    locked_until: null,
    federated_tenant_id: ENTRA_TENANT,
    federated_subject_id: subjects.get(user.user_id),
  }]));
  const sessions = new Map();
  const securityAudit = [];
  const identityRepository = {
    contract_version: IDENTITY_LEDGER_CONTRACT_VERSION,
    ...Object.fromEntries(IDENTITY_LEDGER_METHODS.map((method) => [method, async () => ({ ok: true })])),
    async findDirectoryUserByEmail({ tenant_id: tenantId, email }) {
      return users.find((user) => userTenant(user) === tenantId && user.email.toLowerCase() === String(email).trim().toLowerCase()) ?? null;
    },
    async findDirectoryUserByUserId({ tenant_id: tenantId, user_id: userId }) {
      const user = userById.get(userId);
      return user && userTenant(user) === tenantId ? user : null;
    },
    async listDirectoryUsers({ tenant_id: tenantId }) {
      return users.filter((user) => userTenant(user) === tenantId);
    },
    async getAccount({ tenant_id: tenantId, user_id: userId }) {
      const account = accounts.get(userId);
      return account && account.tenant_id === tenantId ? account : null;
    },
    async ensureFederatedAccount(input) {
      const current = accounts.get(input.user.user_id);
      if (!current) throw new Error("session fixture account missing");
      const next = {
        ...current,
        federated_tenant_id: input.federated_tenant_id,
        federated_subject_id: input.federated_subject_id,
        credential_provider: input.provider_id,
      };
      accounts.set(input.user.user_id, next);
      return next;
    },
    async completeLogin(input) {
      sessions.set(input.session_jti, { ...input, revoked: false });
      return { ok: true };
    },
    async validateSession({ session_jti, user_id }) {
      const session = sessions.get(session_jti);
      return session && session.user.user_id === user_id && session.revoked !== true
        ? { ok: true }
        : { ok: false, status: 401, safe_error_code: "AUTH_SESSION_REVOKED", reason: "session_not_active" };
    },
    async revokeSession({ session_jti }) {
      const session = sessions.get(session_jti);
      if (session) session.revoked = true;
      return { ok: true, replayed: !session };
    },
    async appendSecurityAudit(event) {
      securityAudit.push(event);
      return event;
    },
    async listSecurityAudit() {
      return [...securityAudit];
    },
  };
  const officeSsoProvider = {
    provider_id: "microsoft-office-naa-upl-c09-c12",
    public_config: {
      client_id: "upl-c09-c12-office-client",
      tenant_id: ENTRA_TENANT,
      api_scope: "api://upl-c09-c12-office-client/access_as_user",
      callback_uri: "https://localhost:5186/addin/oauth-callback.html",
    },
    async verifyAccessToken(token) {
      const account = token === "upl-c09-c12-office-access-a"
        ? users.find((user) => user.user_id === ACTOR)
        : token === "upl-c09-c12-office-access-b"
          ? SESSION_B_ACCOUNT
          : token === "upl-c09-c12-office-access-foreign"
            ? FOREIGN_ACCOUNT
          : null;
      if (!account) throw Object.assign(new Error("synthetic Office token rejected"), { status: 401, safe_error_code: "AUTH_OFFICE_SSO_VERIFICATION_FAILED" });
      return {
        provider_id: "microsoft-office-naa-upl-c09-c12",
        tenant_id: ENTRA_TENANT,
        assertion_id: subjects.get(account.user_id),
        email: account.email,
        assurance_level: "microsoft-office-naa",
        token_material_returned: false,
      };
    },
  };
  function createAuth(trustedTenantId) {
    return createApiSessionAuth({
      profile: "operational",
      trustedTenantId,
      secret: SESSION_SECRET,
      identityRepository,
      officeSsoProvider,
      now: () => Date.parse("2026-08-10T02:00:00.000Z"),
    });
  }
  return {
    sessionAuth: createAuth(TENANT),
    foreignSessionAuth: createAuth(userTenant(FOREIGN_ACCOUNT)),
  };
}

async function officeSsoLogin(apiBase, accessToken) {
  const response = await fetch(`${apiBase}/api/auth/office-sso/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
  });
  const payload = await response.json();
  if (response.status !== 200 || typeof payload.session_token !== "string") {
    throw new Error(`synthetic Office SSO login failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function officeSsoLoginWithAuth(sessionAuth, accessToken) {
  const result = await sessionAuth.handleAuthApiRequest({
    pathname: "/api/auth/office-sso/exchange",
    method: "POST",
    body: { access_token: accessToken },
    requestId: "upl-c09-c12-foreign-session",
  });
  if (result.status !== 200 || typeof result.body?.session_token !== "string") {
    throw new Error(`foreign synthetic Office SSO login failed: ${result.status} ${JSON.stringify(result.body)}`);
  }
  return result.body;
}

function createProofRuntime() {
  const matterRepository = seedMatterRepository();
  const dmsRepository = createDmsRepository();
  const storageTempRootPath = mkdtempSync(join(tmpdir(), "upl-c09-c12-dms-"));
  const storage = createFileStorageAdapter({
    adapter_id: "upl-c09-c12-file-storage",
    rootPath: join(storageTempRootPath, "objects"),
  });
  const dmsRuntime = createDefaultDmsRuntime({ repository: dmsRepository, storage });
  const matterRuntime = createDefaultMatterRuntime({ repository: matterRepository, dmsRuntime });
  const emailDmsRepository = createEmailDmsRepository({
    seedRecords: [
      {
        model_type: "M365Connection",
        tenant_id: TENANT,
        user_id: ACTOR,
        entra_subject_id: ENTRA_SUBJECT,
        m365_connection_id: m365ConnectionId({ tenant_id: TENANT, user_id: ACTOR }),
        mailbox_address_hash: hashMailboxAddress(MAILBOX),
        credential_ref: "aws-secrets-manager:synthetic/upl-c09-c12-browser-proof",
        granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        consented_at: "2026-08-09T00:00:00.000Z",
        expires_at: "2027-08-09T00:00:00.000Z",
        revoked_at: null,
        state_version: 1,
      },
      {
        model_type: "M365Connection",
        tenant_id: TENANT,
        user_id: SESSION_B_ACCOUNT?.user_id,
        entra_subject_id: "entra_upl_c09_c12_browser_proof_b",
        m365_connection_id: m365ConnectionId({ tenant_id: TENANT, user_id: SESSION_B_ACCOUNT?.user_id }),
        mailbox_address_hash: hashMailboxAddress(MAILBOX),
        credential_ref: "aws-secrets-manager:synthetic/upl-c09-c12-browser-proof-b",
        granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        consented_at: "2026-08-09T00:00:00.000Z",
        expires_at: "2027-08-09T00:00:00.000Z",
        revoked_at: null,
        state_version: 1,
      },
    ],
  });
  const m365GraphConfig = {
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date("2026-08-10T02:00:00.000Z"),
    credential_vault: {
      async resolveDelegatedCredential() {
        return {
          access_token: "upl-c09-c12-access-token-never-return",
          refresh_token: "upl-c09-c12-refresh-token-never-return",
          mailbox_address: MAILBOX,
          refresh_profile: "client",
          refresh_profile_proof: "u".repeat(43),
          expires_at: "2027-08-09T00:00:00.000Z",
        };
      },
      async storeDelegatedCredential() {
        throw new Error("unexpected credential refresh in browser proof");
      },
      async deleteDelegatedCredential() {},
      referenceForGeneration({ credential_generation: generation } = {}) {
        return `aws-secrets-manager:synthetic/upl-c09-c12-${generation || "next"}`;
      },
    },
    provider: {
      async getMeMessageMime({ rest_message_id: restMessageId } = {}) {
        return providerMetadata(restMessageId);
      },
    },
  };
  const evidenceStorageConfig = Object.freeze({
    scanner: Object.freeze({
      async scan() {
        return { status: "clean" };
      },
    }),
    kms_key_ref: "alias/upl-c09-c12-inquiry-evidence",
  });
  const evidenceStorageService = createInquiryEvidenceStorageService({
    repository: emailDmsRepository,
    storage,
    ...evidenceStorageConfig,
  });
  const attachmentReceiptAuthority = createOutlookAttachmentReceiptAuthority({
    secret: "upl-c09-c12-browser-proof-receipt-secret-v1",
  });
  const employeeRepository = createInMemoryHrxRepository({
    employees: [{
      tenant_id: TENANT,
      employee_id: "employee_upl_c09_c12",
      display_name: "Outlook proof lawyer",
      status: "active",
    }],
    employment_profiles: [{
      tenant_id: TENANT,
      profile_id: "profile_upl_c09_c12",
      employee_id: "employee_upl_c09_c12",
      employment_type: "full_time",
      status: "active",
      effective_from: "2026-01-01",
      title: "Partner",
    }],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link_upl_c09_c12",
      employee_id: "employee_upl_c09_c12",
      user_id: ACTOR,
      purpose: "login_mapping",
    }],
  });
  const financeRepository = createFinanceRepository();
  financeRepository.create({
    model_type: "RateCard",
    rate_card_id: "rate_upl_c09_c12",
    tenant_id: TENANT,
    currency: "KRW",
    effective_from: "2026-01-01",
    role_rates: [{ role_id: "partner", hourly_rate: 400000 }],
    status: "active",
  });
  const financeRuntime = createFinanceRuntimeContext({
    repository: financeRepository,
    matterRepository,
    employeeRepository,
    employees: [],
  });
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [{
      model_type: "Party",
      party_id: "party_upl_c09_c12_existing",
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "기존 문의 고객",
      status: "active",
      owner_user_id: ACTOR,
    }],
  });
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [{
      model_type: "Lead",
      lead_id: INQUIRY_LEAD_ID,
      tenant_id: TENANT,
      party_id: "party_upl_c09_c12_existing",
      display_name: "기존 문의",
      status: "active",
      inquiry_status: "new",
      owner_user_id: ACTOR,
    }],
  });
  const crmIntakeRuntime = createDefaultCrmIntakeRuntime({
    crmRepository,
    crmMasterDataRepository: masterDataRepository,
    emailDmsRepository,
    matterRepository,
    dmsRuntime,
  });
  const auth = createSessionAuthFixture();
  const installationAuthority = createTrustedOutlookInstallationTestAuthority([
    {
      tenant_id: TENANT,
      user_id: ACTOR,
      entra_subject_id: ENTRA_SUBJECT,
    },
    {
      tenant_id: TENANT,
      user_id: SESSION_B_ACCOUNT.user_id,
      entra_subject_id: "entra_upl_c09_c12_browser_proof_b",
    },
  ]);
  const runtime = {
    matterRuntime,
    dmsRuntime,
    emailDmsRuntime: {
      repository: emailDmsRepository,
      storage,
      evidence_storage_service: evidenceStorageService,
      evidence_storage_config: evidenceStorageConfig,
    },
    crmIntakeRuntime,
    m365GraphConfig,
    attachmentReceiptAuthority,
    financeRuntime,
    outlookDesktopRuntime: installationAuthority.runtime,
    sessionAuth: installationAuthority.wrapSessionAuth(auth.sessionAuth),
    foreignSessionAuth: auth.foreignSessionAuth,
  };
  return {
    matterRepository,
    dmsRepository,
    emailDmsRepository,
    matterRuntime,
    dmsRuntime,
    runtime,
    attachmentReceiptAuthority,
    storageTempRootPath,
  };
}

function passed(id, value, extra = {}) {
  return { id, passed: Boolean(value), ...extra };
}

function sha256Text(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function safeMsalBridgeProbe(probe = {}) {
  return {
    configured: probe.configured === true,
    initialized: probe.initialized === true,
    account_count: Number.isSafeInteger(probe.account_count) ? probe.account_count : null,
    scopes: Array.isArray(probe.scopes) ? [...probe.scopes] : [],
    nested_app_auth: probe.nested_app_auth ?? null,
    provider_runtime_executed: probe.provider_runtime_executed === true,
    graph_request_executed: probe.graph_request_executed === true,
    token_material_returned: probe.token_material_returned === true,
    production_ready_claim: probe.production_ready_claim === true,
  };
}

function safeAutomaticSendProbe(probe = {}) {
  return {
    associated_actions: Array.isArray(probe.associated_actions)
      ? probe.associated_actions.filter((value) => typeof value === "string")
      : [],
    handler_available: probe.handler_available === true,
    event_probe_present: probe.event_probe_present === true,
  };
}

function safeBrowserRequestObservation(request = {}) {
  return {
    method: request.method ?? null,
    pathname: request.pathname ?? null,
    has_authorization_header: request.has_authorization_header === true,
    permission_context_header_sent: request.permission_context_header_sent === true,
    authorization_token_sha256: /^[a-f0-9]{64}$/u.test(request.authorization_token_sha256 ?? "")
      ? request.authorization_token_sha256
      : null,
    server_authorization_token_sha256: /^[a-f0-9]{64}$/u.test(request.server_authorization_token_sha256 ?? "")
      ? request.server_authorization_token_sha256
      : null,
    status: Number.isInteger(request.status) ? request.status : null,
    held_before_server: request.held_before_server === true,
  };
}

function safeInquiryPostObservation(request = {}) {
  const response = request.inquiry_response ?? {};
  return {
    method: request.method ?? null,
    pathname: request.pathname ?? null,
    status: Number.isInteger(request.status) ? request.status : null,
    has_authorization_header: request.has_authorization_header === true,
    server_authorization_token_sha256: /^[a-f0-9]{64}$/u.test(request.server_authorization_token_sha256 ?? "")
      ? request.server_authorization_token_sha256
      : null,
    outcome: typeof response.outcome === "string" ? response.outcome : null,
    item_outcome: typeof response.item_outcome === "string" ? response.item_outcome : null,
    inquiry_email_evidence_id: typeof response.inquiry_email_evidence_id === "string"
      ? response.inquiry_email_evidence_id
      : null,
    lead_id: typeof response.lead_id === "string" ? response.lead_id : null,
    capture_status: typeof response.capture_status === "string" ? response.capture_status : null,
  };
}

function releaseManifestProjection() {
  return RELEASE_MANIFEST_PATHS.map((path) => {
    const manifest = parseOutlookManifest(readFileSync(resolve(ROOT, path), "utf8"));
    const profile = RELEASE_CONTRACT.profiles.find((candidate) => candidate.product_id === manifest.product_id) ?? null;
    return {
      path,
      profile: profile?.profile ?? null,
      product_id: manifest.product_id,
      source_locations: manifest.form_source_locations,
      permission: manifest.permission,
      client_outlook_oauth_scopes: [...RELEASE_CONTRACT.client_outlook_oauth_scopes],
      client_outlook_graph_connection_scopes: [...RELEASE_CONTRACT.client_outlook_graph_connection_scopes],
    };
  });
}

function assertArtifactSafe(value) {
  const serialized = JSON.stringify(value);
  if (/(?:access_token|refresh_token|session_token|content_base64|attachment_bytes|document_bytes|raw_body|email_body|message_body)"\s*:\s*(?:"[^"\n]+"|true|\{|\[)/iu.test(serialized)) {
    throw new Error("browser proof artifact contains credential or raw content material");
  }
  if (/upl-c09-c12-(?:access|refresh)-token-never-return/u.test(serialized)) {
    throw new Error("browser proof artifact contains synthetic provider credential material");
  }
}

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  };
}

function sanitizedAlertResult(body = {}) {
  return {
    outcome: body.outcome ?? null,
    warning_count: body.item?.warning_count ?? null,
    warning_ids: (body.item?.warnings ?? []).map((warning) => warning.warning_id),
    send_blocked: body.item?.send_blocked ?? null,
    provider_runtime_executed: body.item?.provider_runtime_executed ?? null,
    production_ready_claim: body.item?.production_ready_claim ?? null,
    raw_body_included: body.item?.raw_body_included ?? null,
    attachment_bytes_included: body.item?.attachment_bytes_included ?? null,
    credential_material_included: body.item?.credential_material_included ?? null,
    message_hashes: body.item?.message_hashes ?? null,
  };
}

async function signedJsonFetch(baseUrl, path, { sessionToken, body } = {}) {
  const serialized = JSON.stringify(body ?? {});
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${sessionToken}`,
    },
    body: serialized,
  });
  const payload = await response.json();
  return {
    status: response.status,
    payload,
    request_hash: sha256Text(serialized),
    response_hash: sha256Text(JSON.stringify(payload)),
  };
}

async function installOfficeFixture(page, sessionToken) {
  const attachmentBase64 = ATTACHMENT_BYTES.toString("base64");
  await page.addInitScript(({ token, encodedAttachment, attachmentByteLength }) => {
    const itemFactory = (key) => {
      const suffix = key === "A" ? "" : "-b";
      const restMessageId = key === "A" ? "rest-upl-c09-c12-proof" : "rest-upl-c09-c12-proof-b";
      const internetMessageId = key === "A"
        ? "<upl-c09-c12-proof@example.invalid>"
        : "<upl-c09-c12-proof-b@example.invalid>";
      const conversationId = key === "A"
        ? "upl-c09-c12-conversation"
        : "upl-c09-c12-conversation-b";
      const attachment = {
        id: "upl-c09-c12-attachment",
        name: "proof.txt",
        contentType: "text/plain",
        size: attachmentByteLength,
        attachmentType: "file",
      };
      return {
        itemId: `ews-upl-c09-c12-${key.toLowerCase()}`,
        subject: "Outlook C09-C12 browser proof",
        normalizedSubject: "Outlook C09-C12 browser proof",
        internetMessageId,
        conversationId,
        from: { displayName: "증명 발신자", emailAddress: "sender@example.invalid" },
        to: [{ displayName: "AMIC", emailAddress: "lawyer@example.invalid" }],
        cc: [], bcc: [], attachments: [attachment],
        body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "브라우저 증명 본문" }); } },
        getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 01:00:00 +0000" }); },
        getAttachmentContentAsync(id, callback) {
          window.__LAWOS_OUTLOOK_ATTACHMENT_READS.push(id);
          const result = id === attachment.id
            ? { status: "succeeded", value: { format: "base64", content: encodedAttachment } }
            : { status: "failed", error: { message: "attachment missing" } };
          window.__LAWOS_OUTLOOK_ATTACHMENT_READ_RESULTS.push({ id, status: result.status, format: result.value?.format ?? null, content_length: result.value?.content?.length ?? null });
          callback(result);
        },
        sensitivityLabel: { getAsync(callback) { callback({ status: "succeeded", value: "confidential" }); } },
        notificationMessages: { addAsync(_id, _options, callback) { callback?.({ status: "succeeded" }); } },
        _uplRestMessageId: restMessageId,
        _uplKey: key,
        _uplSuffix: suffix,
      };
    };
    const items = { A: itemFactory("A"), B: itemFactory("B") };
    const mailbox = {
      item: items.A,
      userProfile: { emailAddress: "lawyer@example.invalid" },
      addHandlerAsync(_eventType, handler) { this._uplHandlers ??= []; this._uplHandlers.push(handler); },
      removeHandlerAsync(_eventType, { handler } = {}) { this._uplHandlers = (this._uplHandlers ?? []).filter((entry) => entry !== handler); },
      convertToRestId(itemId, version) {
        if (version !== "v2.0") throw new Error("unexpected Office.js REST version");
        return this.item?._uplRestMessageId ?? itemId;
      },
    };
    let bridgeMessageHandler = null;
    let officeToken = token;
    window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS = [];
    window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS = {};
    window.__LAWOS_OUTLOOK_ASSOCIATED_RECEIPTS = [];
    window.__LAWOS_OUTLOOK_ATTACHMENT_READS = [];
    window.__LAWOS_OUTLOOK_ATTACHMENT_READ_RESULTS = [];
    window.Office = {
      onReady(callback) { callback({ host: "Outlook", platform: "web" }); },
      EventType: { ItemChanged: "itemChanged" },
      actions: {
        associate(name, handler) {
          window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS.push(name);
          window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS[name] = handler;
        },
      },
      MailboxEnums: {
        RestVersion: { v2_0: "v2.0" },
        CoercionType: { Text: "text" },
        AttachmentContentFormat: { Base64: "base64", Eml: "eml", ICalendar: "icalendar", Url: "url" },
        AttachmentType: { Cloud: "cloud" },
        ItemNotificationMessageType: { InformationalMessage: "informationalMessage" },
      },
      context: {
        requirements: { isSetSupported: (name, version) => name === "NestedAppAuth" && version === "1.1" },
        mailbox,
      },
    };
    window.OfficeRuntime = {
      storage: {
        getItem: async () => officeToken,
        setItem: async (_key, value) => { officeToken = value; },
        removeItem: async () => { officeToken = null; },
      },
    };
    window.__SET_ITEM = (key) => {
      mailbox.item = items[key === "B" ? "B" : "A"];
      for (const handler of [...(mailbox._uplHandlers ?? [])]) handler();
    };
    window.__CURRENT_ITEM_KEY = () => mailbox.item?._uplKey ?? null;
    window.nestedAppAuthBridge = {
      addEventListener(_type, handler) { bridgeMessageHandler = handler; },
      postMessage(raw) {
        const request = JSON.parse(raw);
        const response = request.method === "GetInitContext"
          ? { requestId: request.requestId, success: true, initContext: { sdkName: "upl-browser-proof", sdkVersion: "1.0.0", accountContext: null, capabilities: {} } }
          : request.method === "GetTokenPopup"
            ? {
                requestId: request.requestId,
                success: true,
                token: {
                  access_token: "upl-c09-c12-office-access-b",
                  id_token: "eyJhbGciOiJub25lIn0.eyJvaWQiOiJ1cGwtaW50ZXJhY3RpdmUtYiIsInRpZCI6InVwbC1jMDktYzEyLWVudHJhLXRlbmFudCIsInByZWZlcnJlZF91c2VybmFtZSI6Imxhd3llckBleGFtcGxlLmludmFsaWQifQ.signature",
                  expires_in: 3600,
                  scope: "api://upl-browser-proof-client/access_as_user",
                  authority: "https://login.microsoftonline.com/organizations",
                },
                account: {
                  homeAccountId: "upl-c09-c12-browser-proof-b",
                  username: "lawyer@example.invalid",
                  tenantId: "upl-c09-c12-entra-tenant",
                  localAccountId: "upl-c09-c12-browser-proof-b",
                  environment: "login.microsoftonline.com",
                },
              }
            : { requestId: request.requestId, success: false, error: { code: "interaction_required", message: "interactive login required" } };
        queueMicrotask(() => bridgeMessageHandler?.({ data: JSON.stringify(response) }));
      },
    };
    window.sessionStorage.setItem("lawos_addin_session_token", token);
  }, { token: sessionToken, encodedAttachment: attachmentBase64, attachmentByteLength: ATTACHMENT_BYTES.length });
  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: "",
  }));
}

async function proxyApiRequest(route, apiBase, { authorizationToken = null } = {}) {
  const request = route.request();
  const targetUrl = new URL(request.url());
  const headers = { ...request.headers() };
  delete headers.host;
  delete headers.origin;
  delete headers.referer;
  if (authorizationToken) headers.authorization = `Bearer ${authorizationToken}`;
  const response = await fetch(
    apiBase + targetUrl.pathname + targetUrl.search,
    {
      method: request.method(),
      headers,
      body: ["GET", "HEAD"].includes(request.method()) ? undefined : request.postDataBuffer(),
    },
  );
  const body = Buffer.from(await response.arrayBuffer());
  let payload = null;
  try { payload = JSON.parse(body.toString("utf8")); } catch { /* non-JSON responses remain opaque */ }
  await route.fulfill({
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body,
  });
  return { status: response.status, payload };
}

function bearerTokenFromHeaders(headers = {}) {
  const value = headers.authorization ?? headers.Authorization ?? "";
  const match = /^Bearer\s+(.+)$/iu.exec(String(value));
  return match?.[1]?.trim() || null;
}

const nodeConditionWaiters = new Set();

function notifyNodeConditionWaiters() {
  for (const waiter of [...nodeConditionWaiters]) waiter();
}

async function installApiFixture(page, apiBase, state) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();
    const requestHeaders = request.headers();
    if (pathname === "/api/auth/office-sso/config") {
      const clientId = "upl-browser-proof-client";
      return route.fulfill(jsonResponse({
        item: {
          configured: true,
          client_id: clientId,
          tenant_id: "organizations",
          api_scope: `api://${clientId}/access_as_user`,
          scopes: [`api://${clientId}/access_as_user`],
          callback_uri: `${url.origin}/addin/oauth-callback.html`,
          authority: "https://login.microsoftonline.com/organizations",
        },
      }));
    }
    if (!pathname.startsWith("/api/outlook/")) {
      const result = await proxyApiRequest(route, apiBase);
      state.apiRequests.push({
        method,
        pathname,
        status: result.status,
        has_authorization_header: Boolean(bearerTokenFromHeaders(requestHeaders)),
        authorization_token_sha256: bearerTokenFromHeaders(requestHeaders)
          ? sha256Text(bearerTokenFromHeaders(requestHeaders))
          : null,
      });
      if (pathname === "/api/auth/session") state.sessionValidationRequests += 1;
      notifyNodeConditionWaiters();
      return result;
    }

    const token = bearerTokenFromHeaders(requestHeaders);
    const requestEntry = {
      method,
      pathname,
      has_authorization_header: Boolean(token),
      authorization_token_sha256: token ? sha256Text(token) : null,
      permission_context_header_sent: Object.keys(requestHeaders).some((name) => name.toLowerCase() === "x-lawos-permission-context"),
      status: null,
      held_before_server: false,
    };
    state.outlookRequests.push(requestEntry);
    if (pathname === "/api/outlook/smart-alerts/evaluate") {
      state.smartAlertRequests.push(requestEntry);
    }
    notifyNodeConditionWaiters();

    if (pathname === "/api/outlook/readiness") {
      requestEntry.status = 200;
      requestEntry.server_authorization_token_sha256 = requestEntry.authorization_token_sha256;
      await route.fulfill(jsonResponse(readyOutlookReadinessResponse({
        principalRef: state.readinessPrincipalRefs?.[
          requestEntry.authorization_token_sha256
        ],
        delegatedConnectionStateVersion: 1,
      })));
      notifyNodeConditionWaiters();
      return;
    }

    const hold = (releaseQueue, counterKey) => new Promise((resolvePromise) => {
      requestEntry.held_before_server = true;
      state[counterKey] += 1;
      notifyNodeConditionWaiters();
      releaseQueue.push(async () => {
        const result = await proxyApiRequest(route, apiBase);
        requestEntry.status = result.status;
        requestEntry.server_authorization_token_sha256 = requestEntry.authorization_token_sha256;
        if (pathname === "/api/outlook/tasks" && method === "POST") state.sessionFenceResponse = result;
        notifyNodeConditionWaiters();
        resolvePromise();
      });
    });
    if ((pathname.endsWith("/timeline") || pathname.endsWith("/documents")) && state.holdReadbacks) {
      await hold(state.readbackReleases, "heldReadbackRoutes");
      return;
    }
    if (pathname === "/api/outlook/tasks" && method === "POST" && state.holdTask) {
      await hold(state.taskReleases, "heldTaskRoutes");
      return;
    }
    const authorizationOverride = state.matterFence
      && pathname === "/api/outlook/matters"
      && url.searchParams.has("matter_id")
      && !state.matterFenceUsed
      ? state.matterFenceToken
      : null;
    if (authorizationOverride) {
      requestEntry.server_authorization_token_sha256 = sha256Text(authorizationOverride);
      state.matterFenceUsed = true;
      notifyNodeConditionWaiters();
    }
    const result = await proxyApiRequest(route, apiBase, { authorizationToken: authorizationOverride });
    requestEntry.status = result.status;
    if (pathname === "/api/outlook/email/file") {
      requestEntry.attachment_state = {
        receipt_count: Array.isArray(result.payload?.attachment_state?.receipts)
          ? result.payload.attachment_state.receipts.length
          : null,
        retry_attachment_ids: Array.isArray(result.payload?.attachment_state?.retry_attachment_ids)
          ? [...result.payload.attachment_state.retry_attachment_ids]
          : null,
      };
    }
    requestEntry.server_authorization_token_sha256 = authorizationOverride
      ? sha256Text(authorizationOverride)
      : requestEntry.authorization_token_sha256;
    if (pathname === "/api/outlook/inquiries" && method === "POST") {
      const item = result.payload?.item ?? {};
      const inquiryResponse = {
        status: result.status,
        outcome: result.payload?.outcome ?? null,
        item_outcome: item.outcome ?? null,
        inquiry_email_evidence_id: item.inquiry_email_evidence_id ?? null,
        lead_id: item.lead_id ?? null,
        capture_status: item.capture_status ?? null,
      };
      requestEntry.inquiry_response = inquiryResponse;
      state.inquiryPostResponse = inquiryResponse;
    }
    if (pathname === "/api/outlook/smart-alerts/evaluate") state.smartAlertResponse = result.payload;
    if (pathname === "/api/auth/session") state.sessionValidationRequests += 1;
    notifyNodeConditionWaiters();
  });
}

function waitForNodeCondition(_page, predicate, description, timeoutMs = 8_000) {
  try {
    if (predicate()) return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
  return new Promise((resolvePromise, reject) => {
    let settled = false;
    let timeoutId;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      nodeConditionWaiters.delete(check);
      clearTimeout(timeoutId);
      callback(value);
    };
    const check = () => {
      try {
        if (predicate()) finish(resolvePromise);
      } catch (error) {
        finish(reject, error);
      }
    };
    timeoutId = setTimeout(() => {
      finish(reject, new Error(`timed out waiting for ${description}`));
    }, timeoutMs);
    nodeConditionWaiters.add(check);
    check();
  });
}

async function waitForOverlay(page) {
  await page.waitForSelector("[data-testid='outlook-overlay']", { state: "visible" });
  await page.waitForSelector(".outlook-overlay-panel", { state: "visible" });
  const overlayCount = await page.locator(".outlook-overlay-layer").count();
  if (overlayCount !== 1) throw new Error(`expected one portal overlay, found ${overlayCount}`);
}

async function closeOverlay(page) {
  if (await page.locator("[data-testid='outlook-overlay-close']").count()) {
    await page.locator("[data-testid='outlook-overlay-close']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
  }
}

async function waitForActionNotice(page, label) {
  await page.waitForSelector("[data-testid='operation-result'], [data-testid='error-state']", { state: "visible" });
  const error = page.locator("[data-testid='error-state']");
  if (await error.count()) {
    throw new Error(`${label} failed: ${(await error.innerText()).slice(0, 500)}`);
  }
}

async function releaseHeldRoutes(releases) {
  await Promise.all(releases.splice(0).map((release) => release()));
}

async function selectMatter(page) {
  await page.locator("[data-feature-id='matter.search']").click();
  await waitForOverlay(page);
  await page.locator("#matter-search-input").fill("브라우저검증");
  await page.waitForFunction((matterId) => Boolean(document.querySelector(`#matter-select option[value='${matterId}']`)), MATTER);
  await page.locator("#matter-select").selectOption(MATTER);
  await page.waitForFunction((matterId) => document.querySelector("#matter-select")?.value === matterId, MATTER);
  await closeOverlay(page);
}

async function runFullSurface(page, state) {
  await page.goto(`${state.webOrigin}/addin/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".outlook-compact-shell", { state: "visible" });
  await page.waitForFunction(() => document.querySelector(".outlook-compact-shell")?.getAttribute("data-outlook-profile") === "matter-full");
  await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
  const profileProbe = await page.evaluate((expectedRail) => ({
    profile: document.querySelector(".outlook-compact-shell")?.getAttribute("data-outlook-profile"),
    profileBinding: window.__LAWOS_OUTLOOK_SURFACE_PROFILE?.profile?.key ?? null,
    rail: [...document.querySelectorAll(".outlook-icon-rail [data-feature-id]")].map((button) => button.getAttribute("data-feature-id")),
    railAriaLabels: [...document.querySelectorAll(".outlook-icon-rail [data-feature-id]")].map((button) => button.getAttribute("aria-label")),
    expectedRail,
    shellCount: document.querySelectorAll(".outlook-compact-shell").length,
  }), FULL_RAIL);
  const msalBridgeProbe = await page.evaluate(async () => {
    const init = window.__LAWOS_INIT_MSAL_BRIDGE;
    return typeof init === "function"
      ? init()
      : { configured: false, initialized: false, reason: "probe_missing" };
  });
  await selectMatter(page);
  await waitForNodeCondition(
    page,
    () => state.outlookRequests.some((request) => request.pathname === "/api/outlook/messages/identity" && request.method === "POST" && request.status === 200)
      && state.outlookRequests.some((request) => request.pathname.endsWith("/timeline") && request.method === "GET" && request.status === 200)
      && state.outlookRequests.some((request) => request.pathname.endsWith("/documents") && request.method === "GET" && request.status === 200),
    "canonical Outlook identity and Matter receipt readback after Matter selection",
  );

  await page.locator("[data-feature-id='task.create']").click();
  await waitForOverlay(page);
  await page.locator("#task-draft-title").fill("C09-C12 browser proof task");
  await page.locator("[data-testid='create-task-button']").click();
  await page.waitForRequest((request) => request.url().endsWith("/api/outlook/tasks") && request.method() === "POST");
  await closeOverlay(page);
  await waitForActionNotice(page, "task action");

  await page.locator("[data-feature-id='time-entry.draft']").click();
  await waitForOverlay(page);
  await page.locator("#time-entry-narrative").fill("C09-C12 browser proof time entry");
  await page.locator("#time-entry-duration").fill("30");
  await page.locator("[data-testid='create-time-entry-draft-button']").click();
  await page.waitForRequest((request) => request.url().endsWith("/api/outlook/time-entry-drafts") && request.method() === "POST");
  await closeOverlay(page);
  await waitForActionNotice(page, "time-entry action");

  await page.locator("[data-feature-id='mail.save-with-attachments']").click();
  await waitForOverlay(page);
  const emailFileCountBeforeAttachment = state.outlookRequests.filter(
    (request) => request.pathname === "/api/outlook/email/file" && request.method === "POST",
  ).length;
  await page.locator("[data-testid='file-email-button']").click();
  await waitForNodeCondition(
    page,
    () => state.outlookRequests.some((request) => request.pathname === "/api/outlook/attachments/save" && request.status >= 200 && request.status < 300)
      && state.outlookRequests.filter((request) => request.pathname === "/api/outlook/email/file" && request.method === "POST").length > emailFileCountBeforeAttachment,
    "browser attachment save and filing replay",
    15_000,
  );
  await page.waitForSelector("[data-testid='operation-result']", { state: "visible", timeout: 15_000 });
  await closeOverlay(page);
  await waitForActionNotice(page, "mail filing action");

  await page.locator("[data-feature-id='all-functions']").click();
  await waitForOverlay(page);
  const catalogProbe = await page.evaluate(() => ({
    overlayCount: document.querySelectorAll(".outlook-overlay-layer").length,
    panelCount: document.querySelectorAll(".outlook-overlay-panel").length,
    feature: document.querySelector(".outlook-overlay-panel")?.getAttribute("data-overlay-feature"),
    actionRows: [...document.querySelectorAll(".outlook-overlay-panel [data-action-row]")].map((row) => row.getAttribute("data-action-row")),
    staleCatalogActions: ["conversation.catalog", "document.catalog"].filter((value) => document.querySelector(`[data-action-row='${value}']`)),
  }));
  await page.locator("[data-testid='smart-alert-button']").click();
  await page.waitForSelector("[data-testid='operation-result']", { state: "visible", timeout: 15_000 });
  await closeOverlay(page);
  const automaticSendProbe = await page.evaluate(() => {
    const handler = window.__LAWOS_OUTLOOK_ASSOCIATED_HANDLERS?.onMessageSendHandler;
    const associated = window.__LAWOS_OUTLOOK_ASSOCIATED_ACTIONS ?? [];
    return {
      associated_actions: associated,
      handler_available: typeof handler === "function",
      event_probe_present: window.__LAWOS_OUTLOOK_EVENT_PROBE != null,
    };
  });
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  await page.screenshot({ path: E04_SCREENSHOT_PATH, fullPage: true });
  return {
    profileProbe,
    msalBridgeProbe,
    catalogProbe,
    automaticSendProbe,
    attachmentProbe: await page.evaluate(() => ({
      read_attachment_ids: [...(window.__LAWOS_OUTLOOK_ATTACHMENT_READS ?? [])],
      read_results: [...(window.__LAWOS_OUTLOOK_ATTACHMENT_READ_RESULTS ?? [])],
    })),
  };
}

async function runItemFenceProbe(page, state) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-feature-id='matter.search']", { state: "visible" });
  await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
  await selectMatter(page);
  state.holdReadbacks = true;
  state.heldReadbackRoutes = 0;
  state.readbackReleases = [];
  await page.locator("[data-feature-id='all-functions']").click();
  await waitForOverlay(page);
  await page.locator("[data-action-row='matter-readbacks'] button").click();
  await waitForNodeCondition(page, () => state.heldReadbackRoutes >= 2, "two held item readback requests");
  await page.evaluate(() => window.__SET_ITEM("B"));
  await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
  state.holdReadbacks = false;
  await releaseHeldRoutes(state.readbackReleases);
  await page.waitForFunction(
    () => !/C09-C12 browser proof task|브라우저 증명 본문/u.test(document.body.innerText),
    undefined,
    { timeout: 8_000 },
  );
  const bodyText = await page.locator("body").innerText();
  return {
    held_requests: state.heldReadbackRoutes,
    current_item: await page.evaluate(() => window.__CURRENT_ITEM_KEY?.()),
    stale_body_visible: /C09-C12 browser proof task|브라우저 증명 본문/u.test(bodyText),
    overlay_closed_after_item_change: await page.locator("[data-testid='outlook-overlay']").count() === 0,
  };
}

async function runMatterFenceProbe(page, state, foreignSessionToken) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-feature-id='matter.search']", { state: "visible" });
  await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
  await selectMatter(page);
  const taskRequestsBefore = state.outlookRequests.filter((request) => request.pathname === "/api/outlook/tasks" && request.method === "POST").length;
  state.matterFence = true;
  state.matterFenceToken = foreignSessionToken;
  state.matterFenceUsed = false;
  await page.locator("[data-feature-id='task.create']").click();
  await waitForOverlay(page);
  await page.locator("#task-draft-title").fill("stale Matter fence task");
  await page.locator("[data-testid='create-task-button']").click();
  await closeOverlay(page);
  await page.waitForSelector("[data-testid='error-state']", { state: "visible" });
  state.matterFence = false;
  const taskRequestsAfter = state.outlookRequests.filter((request) => request.pathname === "/api/outlook/tasks" && request.method === "POST").length;
  return {
    stale_matter_revalidation_blocked: state.matterFenceUsed === true,
    server_revalidation_used_foreign_token: state.outlookRequests.some((request) => request.server_authorization_token_sha256 === sha256Text(foreignSessionToken) && request.pathname === "/api/outlook/matters" && request.status === 200),
    task_post_count_delta: taskRequestsAfter - taskRequestsBefore,
    error_visible: await page.locator("[data-testid='error-state']").count() === 1,
  };
}

async function runSessionFenceProbe(page, apiBase, pageSessionToken, state) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-feature-id='matter.search']", { state: "visible" });
  await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
  await selectMatter(page);
  state.holdTask = true;
  state.heldTaskRoutes = 0;
  state.taskReleases = [];
  await page.locator("[data-feature-id='task.create']").click();
  await waitForOverlay(page);
  await page.locator("#task-draft-title").fill("late session fence task");
  await page.locator("[data-testid='create-task-button']").click();
  await waitForNodeCondition(page, () => state.heldTaskRoutes >= 1, "held task write");
  const staleTokenHash = sha256Text(pageSessionToken);
  const logout = await signedJsonFetch(apiBase, "/api/auth/logout", {
    sessionToken: pageSessionToken,
    body: {},
  });
  const staleSessionValidationCountBefore401 = state.apiRequests.filter((request) => (
    request.pathname === "/api/auth/session"
    && request.authorization_token_sha256 === staleTokenHash
  )).length;
  state.holdTask = false;
  await releaseHeldRoutes(state.taskReleases);
  await waitForNodeCondition(
    page,
    () => state.sessionFenceResponse?.status === 401,
    "revoked stale task rejection",
  );
  await page.waitForSelector("[data-testid='lawos-login-button']", { state: "visible", timeout: 8_000 });
  const exchangeRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/auth/office-sso/exchange") && request.method() === "POST",
    { timeout: 8_000 },
  );
  await page.locator("[data-testid='lawos-login-button']").click();
  await exchangeRequest;
  await waitForNodeCondition(
    page,
    () => state.apiRequests.some((request) => (
      request.pathname === "/api/auth/session"
      && request.status === 200
      && request.authorization_token_sha256
      && request.authorization_token_sha256 !== staleTokenHash
    )),
    "interactive B signed-session validation",
    15_000,
  );
  const currentSessionStatus = await page.evaluate(async () => {
    const token = await window.OfficeRuntime?.storage?.getItem?.("lawos_addin_session_token");
    const response = await fetch("/api/auth/session", {
      headers: { authorization: `Bearer ${token}` },
    });
    return response.status;
  });
  await page.waitForFunction(
    () => !document.body.innerText.includes("late session fence task"),
    undefined,
    { timeout: 8_000 },
  );
  const bodyText = await page.locator("body").innerText();
  const staleSessionValidations = state.apiRequests.filter((request) => (
    request.pathname === "/api/auth/session"
    && request.authorization_token_sha256 === staleTokenHash
  ));
  const revokedSessionValidations = staleSessionValidations.slice(
    staleSessionValidationCountBefore401,
  );
  return {
    held_requests: state.heldTaskRoutes,
    logout_status: logout.status,
    stale_session_token_hash: staleTokenHash,
    revoked_session_status: revokedSessionValidations.at(-1)?.status ?? null,
    revoked_session_validation_count: revokedSessionValidations.length,
    stale_session_validation_count_before_401: staleSessionValidationCountBefore401,
    login_visible_after_protected_401: true,
    interactive_exchange_observed: state.apiRequests.some((request) => request.pathname === "/api/auth/office-sso/exchange" && request.method === "POST" && request.status === 200),
    current_session_token_hash: state.apiRequests.findLast((request) => request.pathname === "/api/auth/session" && request.status === 200)?.authorization_token_sha256 ?? null,
    revoked_task_status: state.sessionFenceResponse?.status ?? null,
    current_session_status: currentSessionStatus,
    late_result_visible: bodyText.includes("late session fence task"),
    late_task_persisted: state.matterRepository.list({
      tenant_id: TENANT,
      model_type: "MatterTimelineEvent",
    }).some((entry) => entry.title === "late session fence task"),
  };
}

async function runInquirySurface(page, apiBase, webOrigin, sessionToken, state) {
  await installOfficeFixture(page, sessionToken);
  await installApiFixture(page, apiBase, state);
  await page.goto(`${webOrigin}/outlook-addin/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".outlook-compact-shell", { state: "visible" });
  await page.waitForFunction(() => document.querySelector(".outlook-compact-shell")?.getAttribute("data-outlook-profile") === "inquiry-only");
  await page.waitForFunction(() => document.querySelector("[data-feature-id='inquiry.entry']")?.disabled === false);
  const profileProbe = await page.evaluate(({ expectedRail, fullRail }) => ({
    profile: document.querySelector(".outlook-compact-shell")?.getAttribute("data-outlook-profile"),
    profileBinding: window.__LAWOS_OUTLOOK_SURFACE_PROFILE?.profile?.key ?? null,
    rail: [...document.querySelectorAll(".outlook-icon-rail [data-feature-id]")].map((button) => button.getAttribute("data-feature-id")),
    expectedRail,
    fullRailPresent: fullRail.some((featureId) => document.querySelector(`[data-feature-id='${featureId}']`)),
  }), { expectedRail: INQUIRY_RAIL, fullRail: FULL_RAIL });
  await page.locator("[data-feature-id='inquiry.entry']").click();
  await waitForOverlay(page);
  const overlayProbe = await page.evaluate(() => ({
    layerCount: document.querySelectorAll(".outlook-overlay-layer").length,
    panelCount: document.querySelectorAll(".outlook-overlay-panel").length,
    inquiryOverlayCount: document.querySelectorAll("[data-inquiry-overlay='true']").length,
  }));
  await page.locator("[data-testid='new-inquiry-button']").click();
  await page.waitForResponse((response) => response.url().endsWith("/api/outlook/inquiries") && response.request().method() === "POST");
  await waitForNodeCondition(
    page,
    () => state.inquiryPostResponse?.status != null,
    "browser inquiry registration response projection",
  );
  await closeOverlay(page);
  await page.waitForSelector("[data-testid='inquiry-status']", { state: "visible" });
  await page.screenshot({ path: INQUIRY_SCREENSHOT_PATH, fullPage: true });
  const inquiryPostRequests = state.outlookRequests.filter(
    (request) => request.pathname === "/api/outlook/inquiries" && request.method === "POST",
  );
  if (inquiryPostRequests.length !== 1) {
    throw new Error(`expected exactly one browser inquiry registration POST, found ${inquiryPostRequests.length}`);
  }
  return {
    profileProbe,
    overlayProbe,
    status: await page.locator("[data-testid='inquiry-status']").getAttribute("data-action"),
    post_observation: safeInquiryPostObservation(inquiryPostRequests[0]),
  };
}

function safeInquiryEvidenceRow(evidence) {
  return evidence
    ? {
        model_type: evidence.model_type ?? null,
        tenant_id: evidence.tenant_id ?? null,
        inquiry_email_evidence_id: evidence.inquiry_email_evidence_id ?? null,
        lead_id: evidence.lead_id ?? null,
        capture_status: evidence.capture_status ?? null,
        mime_file_object_id: evidence.mime_file_object_id ?? null,
        display_file_object_id: evidence.display_file_object_id ?? null,
        mime_sha256: /^[a-f0-9]{64}$/u.test(evidence.mime_sha256 ?? "")
          ? evidence.mime_sha256
          : null,
        mime_byte_size: Number.isSafeInteger(evidence.mime_byte_size)
          ? evidence.mime_byte_size
          : null,
      }
    : null;
}

function safeInquiryEvidenceFileRow(fileObject) {
  return {
    model_type: fileObject?.model_type ?? null,
    tenant_id: fileObject?.tenant_id ?? null,
    inquiry_evidence_file_object_id:
      fileObject?.inquiry_evidence_file_object_id ?? null,
    inquiry_email_evidence_id: fileObject?.inquiry_email_evidence_id ?? null,
    object_kind: fileObject?.object_kind ?? null,
    sha256: /^[a-f0-9]{64}$/u.test(fileObject?.sha256 ?? "")
      ? fileObject.sha256
      : null,
    byte_size: Number.isSafeInteger(fileObject?.byte_size)
      ? fileObject.byte_size
      : null,
    mime_type: fileObject?.mime_type ?? null,
    scan_status: fileObject?.scan_status ?? null,
    immutable_original: fileObject?.immutable_original === true,
  };
}

async function captureInquiryEvidenceReadback(proof, inquiryProbe) {
  const post = inquiryProbe.post_observation ?? {};
  const evidenceId = post.inquiry_email_evidence_id;
  const leadId = post.lead_id;
  const evidenceRows = proof.emailDmsRepository.list({
    tenant_id: TENANT,
    model_type: "InquiryEmailEvidence",
  });
  const fileRows = proof.emailDmsRepository.list({
    tenant_id: TENANT,
    model_type: "InquiryEvidenceFileObject",
  });
  const evidence = evidenceRows.length === 1 ? evidenceRows[0] : null;
  const boundFileRows = fileRows
    .filter((fileObject) => fileObject.inquiry_email_evidence_id === evidenceId)
    .sort((left, right) => String(left.object_kind).localeCompare(String(right.object_kind)));
  const evidenceResponsePass = post.status === 201
    && post.outcome === "registered"
    && post.item_outcome === "registered"
    && post.capture_status === "complete"
    && typeof evidenceId === "string"
    && typeof leadId === "string";
  const evidencePass = evidenceRows.length === 1
    && evidence?.tenant_id === TENANT
    && evidence?.inquiry_email_evidence_id === evidenceId
    && evidence?.lead_id === leadId
    && evidence?.capture_status === "complete"
    && evidence?.mime_file_object_id
    && evidence?.display_file_object_id
    && /^[a-f0-9]{64}$/u.test(evidence?.mime_sha256 ?? "")
    && Number.isSafeInteger(evidence?.mime_byte_size)
    && evidence?.mime_sha256 === EXPECTED_INQUIRY_MIME_SHA256
    && evidence?.mime_byte_size === EXPECTED_INQUIRY_MIME_BYTE_SIZE;
  const fileKinds = boundFileRows.map((fileObject) => fileObject.object_kind);
  const expectedFileKinds = [...INQUIRY_EVIDENCE_OBJECT_KINDS].sort();
  const filesPass = fileRows.length === 2
    && boundFileRows.length === 2
    && JSON.stringify(fileKinds) === JSON.stringify(expectedFileKinds)
    && boundFileRows.every((fileObject) => (
      fileObject.tenant_id === TENANT
      && fileObject.inquiry_email_evidence_id === evidenceId
      && fileObject.scan_status === "clean"
      && /^[a-f0-9]{64}$/u.test(fileObject.sha256 ?? "")
      && Number.isSafeInteger(fileObject.byte_size)
      && fileObject.byte_size > 0
      && (fileObject.object_kind === "original_mime"
        ? fileObject.immutable_original === true
          && fileObject.sha256 === EXPECTED_INQUIRY_MIME_SHA256
          && fileObject.byte_size === EXPECTED_INQUIRY_MIME_BYTE_SIZE
        : fileObject.immutable_original === false)
    ));
  const originalFile = boundFileRows.find((fileObject) => fileObject.object_kind === "original_mime");
  const evidenceStorageService = proof.runtime.emailDmsRuntime.evidence_storage_service;
  if (typeof evidenceStorageService?.readEvidenceContent !== "function") {
    throw new Error("canonical inquiry evidence storage read authority is unavailable");
  }
  const originalRead = await evidenceStorageService.readEvidenceContent({
    tenant_id: TENANT,
    actor_id: SESSION_B_ACCOUNT?.user_id ?? ACTOR,
    inquiry_email_evidence_id: evidenceId,
    object_kind: "original_mime",
    request_id: "upl-c09-c12-inquiry-original-readback",
  });
  const readBytes = Buffer.isBuffer(originalRead.bytes) ? originalRead.bytes : null;
  const exactBytesMatch = readBytes?.equals(EXPECTED_INQUIRY_MIME_BYTES) === true;
  const originalReadback = {
    read_method: "readEvidenceContent",
    read_status: "ok",
    inquiry_email_evidence_id: originalRead.inquiry_email_evidence_id ?? null,
    object_kind: originalRead.object_kind ?? null,
    sha256: /^[a-f0-9]{64}$/u.test(originalRead.sha256 ?? "")
      ? originalRead.sha256
      : null,
    byte_size: Number.isSafeInteger(originalRead.byte_size)
      ? originalRead.byte_size
      : null,
    mime_type: originalRead.mime_type ?? null,
    scan_status: originalRead.scan_status ?? null,
    expected_sha256: EXPECTED_INQUIRY_MIME_SHA256,
    expected_byte_size: EXPECTED_INQUIRY_MIME_BYTE_SIZE,
    exact_bytes_match: exactBytesMatch,
    raw_bytes_read: readBytes !== null && readBytes.byteLength > 0,
    storage_pointer_ref_included: originalRead.storage_pointer_ref_included === true,
  };
  const originalReadPass = originalReadback.inquiry_email_evidence_id === evidenceId
    && originalReadback.object_kind === "original_mime"
    && originalReadback.sha256 === EXPECTED_INQUIRY_MIME_SHA256
    && originalReadback.sha256 === evidence?.mime_sha256
    && originalReadback.sha256 === originalFile?.sha256
    && originalReadback.byte_size === EXPECTED_INQUIRY_MIME_BYTE_SIZE
    && originalReadback.byte_size === evidence?.mime_byte_size
    && originalReadback.byte_size === originalFile?.byte_size
    && originalReadback.mime_type === "message/rfc822"
    && originalReadback.scan_status === "clean"
    && originalReadback.raw_bytes_read === true
    && originalReadback.exact_bytes_match === true
    && originalReadback.storage_pointer_ref_included === false;
  return {
    pass: evidenceResponsePass && evidencePass && filesPass && originalReadPass,
    post_observation: post,
    repository: {
      evidence_count: evidenceRows.length,
      file_object_count: fileRows.length,
      evidence: safeInquiryEvidenceRow(evidence),
      file_objects: boundFileRows.map(safeInquiryEvidenceFileRow),
    },
    storage_readback: originalReadback,
  };
}

function listProofStorageRoots() {
  return new Set(
    readdirSync(tmpdir(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("upl-c09-c12-dms-"))
      .map((entry) => resolve(tmpdir(), entry.name)),
  );
}

function sameStringSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function startProofApiServer(options) {
  const server = createApiServer(options);
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise({
      server,
      host: "127.0.0.1",
      port: server.address().port,
    }));
  });
}

function removeProofStorageRoot(proof) {
  const storageTempRootPath = proof?.storageTempRootPath;
  if (
    typeof storageTempRootPath !== "string"
    || !basename(storageTempRootPath).startsWith("upl-c09-c12-dms-")
    || resolve(storageTempRootPath) === resolve(tmpdir())
  ) {
    throw new Error("refusing to remove an unscoped proof storage root");
  }
  rmSync(storageTempRootPath, { recursive: true, force: true });
}

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SCREENSHOT_DIR, { recursive: true });
mkdirSync(MANUAL_ARTIFACT_DIR, { recursive: true });
mkdirSync(MANUAL_SCREENSHOT_DIR, { recursive: true });

// Keep the repository build as the first gate: this runner must never prove a
// stale source bundle.  Node 22 is supplied by the caller's PATH in CI.
execFileSync("npm", ["--workspace", "apps/addin", "run", "build"], { cwd: ROOT, stdio: "inherit" });

const proofStorageRootsBefore = listProofStorageRoots();
const proof = createProofRuntime();
const api = await startProofApiServer({
  matterRuntime: proof.matterRuntime,
  dmsRuntime: proof.dmsRuntime,
  emailDmsRuntime: proof.runtime.emailDmsRuntime,
  crmIntakeRuntime: proof.runtime.crmIntakeRuntime,
  financeRuntime: proof.runtime.financeRuntime,
  m365GraphConfig: proof.runtime.m365GraphConfig,
  sessionAuth: proof.runtime.sessionAuth,
  outlookDesktopRuntime: proof.runtime.outlookDesktopRuntime,
  outlookAttachmentReceiptAuthority: proof.attachmentReceiptAuthority,
});
const web = await startOutlookAddinStaticServer({ distRoot: resolve(ROOT, "apps/addin/dist") });
process.env.LAWOS_API_ALLOWED_ORIGINS = [process.env.LAWOS_API_ALLOWED_ORIGINS, web.origin].filter(Boolean).join(",");

const browser = await chromium.launch({ headless: true });
let page;
let inquiryPage;
const state = {
  webOrigin: web.origin,
  matterRepository: proof.matterRepository,
  outlookRequests: [],
  smartAlertRequests: [],
  apiRequests: [],
  smartAlertResponse: null,
  inquiryPostResponse: null,
  holdReadbacks: false,
  heldReadbackRoutes: 0,
  readbackReleases: [],
  matterFence: false,
  holdTask: false,
  heldTaskRoutes: 0,
  taskReleases: [],
  sessionFenceResponse: null,
  sessionValidationRequests: 0,
  matterFenceToken: null,
  matterFenceUsed: false,
  readinessPrincipalRefs: {},
};
let checks = [];
try {
  const apiBase = `http://${api.host}:${api.port}`;
  const signedSession = await officeSsoLogin(apiBase, "upl-c09-c12-office-access-a");
  const sessionB = await officeSsoLogin(apiBase, "upl-c09-c12-office-access-b");
  const foreignSession = await officeSsoLoginWithAuth(proof.runtime.foreignSessionAuth, "upl-c09-c12-office-access-foreign");
  state.readinessPrincipalRefs = Object.fromEntries([
    signedSession,
    sessionB,
  ].map((session) => [
    sha256Text(session.session_token),
    session.session.outlook_desktop_principal_ref,
  ]));
  page = await browser.newPage({ viewport: { width: 390, height: 860 } });
  await installOfficeFixture(page, signedSession.session_token);
  await installApiFixture(page, apiBase, state);
  const fullProbe = await runFullSurface(page, state);
  const itemFenceProbe = await runItemFenceProbe(page, state);
  const matterFenceProbe = await runMatterFenceProbe(page, state, foreignSession.session_token);
  const sessionFenceProbe = await runSessionFenceProbe(page, apiBase, signedSession.session_token, state);

  const confidentialExternal = await signedJsonFetch(apiBase, "/api/outlook/smart-alerts/evaluate", {
    sessionToken: sessionB.session_token,
    body: {
      message: {
        to: [{ name: "외부", email: "external@example.com", external: true }],
        body_preview: "첨부 확인 부탁드립니다.",
        attachments: [{ attachment_id: "conf-1", name: "비밀자료.pdf", confidentiality: "highly_confidential" }],
      },
    },
  });
  const missingAttachment = await signedJsonFetch(apiBase, "/api/outlook/smart-alerts/evaluate", {
    sessionToken: sessionB.session_token,
    body: {
      message: {
        to: [{ name: "AMIC", email: "lawyer@amic.kr" }],
        body_preview: "첨부 확인",
        attachments: [],
      },
    },
  });
  const cleanMessage = await signedJsonFetch(apiBase, "/api/outlook/smart-alerts/evaluate", {
    sessionToken: sessionB.session_token,
    body: {
      message: {
        to: [{ name: "AMIC", email: "lawyer@amic.kr" }],
        body_preview: "확인했습니다.",
        attachments: [],
      },
    },
  });
  const invalidTokenResponse = await fetch(`${apiBase}/api/outlook/bootstrap`, {
    headers: { authorization: "Bearer lawos_session_v1.invalid.invalid" },
  });
  const invalidTokenPayload = await invalidTokenResponse.json();
  const foreignTask = await signedJsonFetch(apiBase, "/api/outlook/tasks", {
    sessionToken: foreignSession.session_token,
    body: {
      tenant_id: TENANT,
      matter_id: MATTER,
      idempotency_key: "upl-c09-c12-foreign-token-probe",
      task: { title: "foreign token must not write", status: "todo" },
    },
  });
  const forgedBody = JSON.stringify({
    message: {
      to: [{ name: "외부", email: "external@example.com" }],
      body_preview: "첨부 확인",
      attachments: [],
    },
  });
  const forged = await fetch(`${apiBase}/api/outlook/smart-alerts/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: forgedBody,
  });
  const forgedPayload = await forged.json();

  inquiryPage = await browser.newPage({ viewport: { width: 390, height: 860 } });
  const inquiryState = {
    ...state,
    outlookRequests: [],
    smartAlertRequests: [],
    sessionValidationRequests: 0,
  };
  const inquiryProbe = await runInquirySurface(inquiryPage, apiBase, web.origin, sessionB.session_token, inquiryState);
  const inquiryEvidenceProbe = await captureInquiryEvidenceReadback(proof, inquiryProbe);
  const releaseManifestProbe = releaseManifestProjection();
  const releaseManifestPass = releaseManifestProbe.length === RELEASE_MANIFEST_PATHS.length
    && releaseManifestProbe.every((entry) => (
      RELEASE_CONTRACT.manifests.includes(entry.path)
      && RELEASE_CONTRACT.profiles.some((profile) => (
        profile.profile === entry.profile
        && profile.product_id === entry.product_id
        && profile.permission === entry.permission
      ))
      && entry.source_locations.length === 1
      && JSON.stringify(entry.client_outlook_oauth_scopes) === JSON.stringify(RELEASE_CONTRACT.client_outlook_oauth_scopes)
      && JSON.stringify(entry.client_outlook_graph_connection_scopes) === JSON.stringify(RELEASE_CONTRACT.client_outlook_graph_connection_scopes)
    ));
  const snapshot = {
    ...outlookAddinProofSnapshot({ runtime: proof.runtime, tenant_id: TENANT, matter_id: MATTER }),
    time_entries: proof.runtime.financeRuntime.repository.list({
      tenant_id: TENANT,
      model_type: "TimeEntry",
      matter_id: MATTER,
    }),
  };
  const fullRailPass = JSON.stringify(fullProbe.profileProbe.rail) === JSON.stringify(FULL_RAIL);
  const inquiryRailPass = JSON.stringify(inquiryProbe.profileProbe.profileProbe?.rail ?? inquiryProbe.profileProbe.rail) === JSON.stringify(INQUIRY_RAIL);
  const exactSessionHash = sha256Text(signedSession.session_token);
  const signedBoundaryProbe = {
    exact_session_token_observed: state.outlookRequests.some((request) => request.server_authorization_token_sha256 === exactSessionHash && request.status >= 200 && request.status < 300),
    invalid_token_status: invalidTokenResponse.status,
    invalid_token_safe_error_codes: invalidTokenPayload.safe_error_codes ?? [],
    foreign_token_status: foreignTask.status,
    foreign_token_safe_error_codes: foreignTask.payload?.safe_error_codes ?? [],
  };
  const attachmentRequestProbe = {
    office_attachment_reads: fullProbe.attachmentProbe.read_attachment_ids,
    attachment_save_requests: state.outlookRequests.filter((request) => request.pathname === "/api/outlook/attachments/save" && request.method === "POST" && request.status >= 200 && request.status < 300).length,
    filing_replay_requests: state.outlookRequests.filter((request) => request.pathname === "/api/outlook/email/file" && request.method === "POST").length,
  };
  checks = [
    passed("c09-taskpane-browser-load", fullProbe.profileProbe.shellCount === 1 && fullProbe.profileProbe.profile === "matter-full"),
    passed("c09-matter-full-five-icon-rail", fullRailPass, { rail: fullProbe.profileProbe.rail }),
    passed("c09-matter-full-single-portal-overlay", fullProbe.catalogProbe.overlayCount === 1 && fullProbe.catalogProbe.panelCount === 1),
    passed("c09-auth-shell-provider-gated-visible", fullProbe.profileProbe.profileBinding === "matter-full" && releaseManifestPass, { release_manifest_contract_pass: releaseManifestPass }),
    passed("c09-msal-bridge-initialized", fullProbe.msalBridgeProbe?.configured === true && fullProbe.msalBridgeProbe?.initialized === true),
    passed("c09-msal-bridge-noninteractive", fullProbe.msalBridgeProbe?.provider_runtime_executed === false && fullProbe.msalBridgeProbe?.token_material_returned === false),
    passed("c09-signed-session-authorization-observed", signedBoundaryProbe.exact_session_token_observed && invalidTokenResponse.status === 401 && foreignTask.status >= 400, signedBoundaryProbe),
    passed("c09-legacy-permission-context-not-sent", state.smartAlertRequests.every((request) => request.permission_context_header_sent === false)),
    passed("c09-no-stale-shell-marker", fullProbe.profileProbe.shellCount === 1 && inquiryProbe.profileProbe.profile === "inquiry-only"),
    passed("c09-inquiry-only-fixed-profile", inquiryProbe.profileProbe.profile === "inquiry-only" && inquiryRailPass, { rail: inquiryProbe.profileProbe.rail }),
    passed("c09-inquiry-only-single-portal-overlay", inquiryProbe.overlayProbe.layerCount === 1 && inquiryProbe.overlayProbe.panelCount === 1 && inquiryProbe.overlayProbe.inquiryOverlayCount === 1),
    passed("c09-inquiry-new-action-current-selector", inquiryProbe.status === "new"),
    passed("c09-inquiry-evidence-storage-readback", inquiryEvidenceProbe.pass, inquiryEvidenceProbe),
    passed("c10-email-thread-created", snapshot.email_threads.length === 1, { email_threads: snapshot.email_threads.length }),
    passed("c10-email-object-current-fields", JSON.stringify(snapshot.email_object_field_contract) === JSON.stringify(OUTLOOK_EMAIL_OBJECT_FIELDS), { field_count: snapshot.email_object_field_contract.length }),
    passed("c10-timeline-email-visible", snapshot.timeline.some((entry) => entry.type === "outlook.email.filed")),
    passed("c11-attachment-document-visible", snapshot.documents.some((document) => document.document_id?.endsWith(`:${ATTACHMENT_ID}`)) && attachmentRequestProbe.office_attachment_reads.includes(ATTACHMENT_ID) && attachmentRequestProbe.attachment_save_requests >= 1, {
      attachment_document_id: snapshot.documents.find((document) => document.document_id?.endsWith(`:${ATTACHMENT_ID}`))?.document_id ?? null,
      ...attachmentRequestProbe,
    }),
    passed("c11-folder-structure-00-99", snapshot.folder_structure[0] === "00_Email" && snapshot.folder_structure.at(-1) === "99_Archive"),
    passed("c12-manual-task-visible", snapshot.timeline.some((entry) => entry.type === "matter.activity.task")),
    passed("c12-time-entry-draft-visible", snapshot.time_entries.some((entry) => entry.status === "draft"), {
      time_entries: snapshot.time_entries.length,
    }),
    passed("c12-explicit-send-review-warning-not-block", state.smartAlertResponse?.item?.warning_count === 1 && state.smartAlertResponse?.item?.send_blocked === false),
    passed("c12-automatic-send-handler-absent", fullProbe.automaticSendProbe?.handler_available === false && fullProbe.automaticSendProbe?.associated_actions?.includes("onMessageSendHandler") === false),
    passed("c12-automatic-send-event-probe-absent", fullProbe.automaticSendProbe?.event_probe_present === false),
    passed("c12-item-fence-suppresses-late-response", itemFenceProbe.held_requests >= 2 && itemFenceProbe.overlay_closed_after_item_change && itemFenceProbe.stale_body_visible === false),
    passed("c12-matter-fence-rejects-stale-selection", matterFenceProbe.stale_matter_revalidation_blocked && matterFenceProbe.task_post_count_delta === 0 && matterFenceProbe.error_visible),
    passed("c12-session-fence-suppresses-late-write", sessionFenceProbe.held_requests >= 1 && sessionFenceProbe.logout_status === 200 && sessionFenceProbe.revoked_task_status === 401 && sessionFenceProbe.login_visible_after_protected_401 === true && sessionFenceProbe.revoked_session_status === null && sessionFenceProbe.revoked_session_validation_count === 0 && sessionFenceProbe.interactive_exchange_observed === true && sessionFenceProbe.stale_session_token_hash !== sessionFenceProbe.current_session_token_hash && sessionFenceProbe.current_session_status === 200 && sessionFenceProbe.late_result_visible === false && sessionFenceProbe.late_task_persisted === false),
    passed("c12-no-stale-catalog-actions", fullProbe.catalogProbe.staleCatalogActions.length === 0),
  ];

  const e04Payload = {
    schema_version: "law-firm-os.manual-qa.upl-e04-explicit-send-review.local_receipt.v0.2",
    generated_at: new Date().toISOString(),
    tuw_id: "UPL-E-04",
    scope: "Local signed-session task pane and API proof for an explicit warning-only send review action. Automatic Outlook Send interception is absent and no external Outlook runtime is claimed.",
    screenshot_path: E04_SCREENSHOT_PATH,
    external_receipt_boundary: {
      entra_admin_consent_receipt_present: false,
      outlook_web_smoke_receipt_present: false,
      outlook_new_desktop_smoke_receipt_present: false,
      provider_runtime_executed: false,
      production_write_claim: false,
      owner_external_receipt_required_for_c09: true,
    },
    browser_request_observation: state.smartAlertRequests,
    direct_api_evaluations: {
      confidential_external: sanitizedAlertResult(confidentialExternal.payload),
      missing_attachment: sanitizedAlertResult(missingAttachment.payload),
      clean_message: sanitizedAlertResult(cleanMessage.payload),
      forged_legacy_header: {
        status: forged.status,
        safe_error_codes: forgedPayload.safe_error_codes ?? [],
        request_hash: sha256Text(forgedBody),
        response_hash: sha256Text(JSON.stringify(forgedPayload)),
      },
    },
    request_response_hashes: {
      confidential_external_request: confidentialExternal.request_hash,
      confidential_external_response: confidentialExternal.response_hash,
      missing_attachment_request: missingAttachment.request_hash,
      missing_attachment_response: missingAttachment.response_hash,
      clean_message_request: cleanMessage.request_hash,
      clean_message_response: cleanMessage.response_hash,
    },
    secret_material_included: false,
    raw_body_included: false,
    attachment_bytes_included: false,
    production_ready_claim: false,
  };
  const e04Checks = [
    passed("e04-taskpane-warning-visible", state.smartAlertResponse?.item?.warning_count === 1),
    passed("e04-signed-session-authorization-observed", state.smartAlertRequests.some((request) => request.has_authorization_header === true)),
    passed("e04-legacy-permission-context-not-sent", state.smartAlertRequests.every((request) => request.permission_context_header_sent === false)),
    passed("e04-confidential-external-warning-only", confidentialExternal.status === 200 && confidentialExternal.payload.item?.warnings?.[0]?.warning_id === "external-recipient-confidential-attachment" && confidentialExternal.payload.item?.send_blocked === false),
    passed("e04-missing-attachment-warning-only", missingAttachment.status === 200 && missingAttachment.payload.item?.warnings?.[0]?.warning_id === "missing-mentioned-attachment" && missingAttachment.payload.item?.send_blocked === false),
    passed("e04-clean-message-no-warning", cleanMessage.status === 200 && cleanMessage.payload.item?.warning_count === 0 && cleanMessage.payload.item?.send_blocked === false),
    passed("e04-forged-legacy-header-blocked", forged.status === 401 && forgedPayload.safe_error_codes?.[0] === "AUTH_SESSION_REQUIRED"),
    passed("e04-no-raw-body-or-attachment-bytes-in-receipt", !/첨부 확인 부탁드립니다\.|비밀자료\.pdf|secret\.pdf|contract attachment bytes/.test(JSON.stringify(e04Payload))),
  ];
  const e04Artifact = { ...e04Payload, checks: e04Checks, pass: e04Checks.every((check) => check.passed) };
  writeFileSync(E04_JSON_PATH, `${JSON.stringify(e04Artifact, null, 2)}\n`);
  writeFileSync(E04_MD_PATH, `# UPL E04 Explicit Send Review Local Proof\n\nGenerated at: ${e04Artifact.generated_at}\n\n- PASS: ${e04Artifact.pass}\n- Screenshot: \`${E04_SCREENSHOT_PATH}\`\n- Automatic Outlook Send interception: absent\n- External Outlook runtime: owner-required, not claimed\n\n## Checks\n\n${e04Checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`).join("\n")}\n`);
  const artifact = {
    schema_version: "law-firm-os.manual-qa.upl-c09-c12-outlook-addin.v2",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-C-09", "UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"],
    scope: "Built Outlook add-in bundles with fixed matter-full and inquiry-only profiles, one portal overlay, signed local session, DMS-backed filing, and bounded item/Matter/session fences.",
    api_base: apiBase,
    taskpane_url: `${web.origin}/addin/`,
    inquiry_url: `${web.origin}/outlook-addin/`,
    actual_outlook_proved: false,
    actual_windows_new_outlook_proved: false,
    actual_outlook_for_mac_proved: false,
    e04_local_receipt: E04_JSON_PATH,
    screenshot_path: SCREENSHOT_PATH,
    inquiry_screenshot_path: INQUIRY_SCREENSHOT_PATH,
    external_receipt_boundary: {
      entra_admin_consent_receipt_present: false,
      outlook_web_smoke_receipt_present: false,
      outlook_new_desktop_smoke_receipt_present: false,
      provider_runtime_executed: false,
      production_write_claim: false,
      owner_external_receipt_required: true,
    },
    msal_bridge_probe: safeMsalBridgeProbe(fullProbe.msalBridgeProbe),
    profile_probe: { matter_full: fullProbe.profileProbe, inquiry_only: inquiryProbe.profileProbe },
    overlay_probe: { matter_full: fullProbe.catalogProbe, inquiry_only: inquiryProbe.overlayProbe },
    inquiry_evidence_probe: inquiryEvidenceProbe,
    fence_probe: { item: itemFenceProbe, matter: matterFenceProbe, session: sessionFenceProbe },
    attachment_probe: attachmentRequestProbe,
    snapshot,
    automatic_send_probe: safeAutomaticSendProbe(fullProbe.automaticSendProbe),
    browser_request_observation: state.outlookRequests.map(safeBrowserRequestObservation),
    release_manifest_probe: releaseManifestProbe,
    signed_boundary_probe: signedBoundaryProbe,
    checks,
    pass: checks.every((check) => check.passed) && e04Artifact.pass,
  };
  assertArtifactSafe(e04Artifact);
  assertArtifactSafe(artifact);
  writeFileSync(JSON_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(MD_PATH, `# UPL C09-C12 Outlook Add-in Browser Proof\n\nGenerated at: ${artifact.generated_at}\n\n- PASS: ${artifact.pass}\n- Matter profile rail: ${fullProbe.profileProbe.rail.join(" → ")}\n- Inquiry profile rail: ${inquiryProbe.profileProbe.rail.join(" → ")}\n- Screenshot: \`${SCREENSHOT_PATH}\`\n- Inquiry screenshot: \`${INQUIRY_SCREENSHOT_PATH}\`\n- External M365/Entra receipt: owner-required, not claimed\n\n## Checks\n\n${checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`).join("\n")}\n`);
  console.log(JSON.stringify({ pass: artifact.pass, checks: checks.length, artifact: JSON_PATH }, null, 2));
  if (!artifact.pass) process.exitCode = 1;
} finally {
  await page?.close();
  await inquiryPage?.close();
  await browser.close();
  await new Promise((resolvePromise) => web.server.close(resolvePromise));
  await new Promise((resolvePromise) => api.server.close(resolvePromise));
  proof.dmsRepository.close();
  proof.matterRepository.close();
  proof.emailDmsRepository.close();
  removeProofStorageRoot(proof);
  const proofStorageRootsAfter = listProofStorageRoots();
  if (!sameStringSet(proofStorageRootsBefore, proofStorageRootsAfter)) {
    throw new Error("proof storage temp-root set changed across runner cleanup");
  }
}
