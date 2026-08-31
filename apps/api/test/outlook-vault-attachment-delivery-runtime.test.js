import assert from "node:assert/strict";
import test from "node:test";

import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
import {
  createOutlookVaultGraphHostVerifier,
  handleOutlookVaultAttachmentAuthorize,
  handleOutlookVaultAttachmentComplete,
  handleOutlookVaultAttachmentDelivery,
  verifyOutlookVaultAttachmentDeliveryRequest,
} from "../src/outlook-vault-attachment-delivery-runtime.js";
import { createOutlookVaultDeliveryTokenAuthority } from "../src/outlook-vault-delivery-token.js";
import { createTestAmicVaultExportProvider } from "./helpers/amic-vault-export-provider.js";

const TENANT = "tenant_outlook_vault_delivery";
const USER = "user_outlook_vault_delivery_01";
const SUBJECT = "subject_outlook_vault_delivery_01";
const MATTER = "matter_outlook_vault_delivery";
const INSTALLATION_ID = "odi_outlook_vault_delivery_0001";
const COMPOSE_TARGET = "AAMkAGI2-compose-draft-001";
const OFFICE_ATTACHMENT_ID = "office-attachment-id-sensitive-001";
const BYTES = Buffer.from("exact Outlook Vault attachment bytes\n");
const DRAFT_BOUNDARY = "lawos-outlook-vault-draft-boundary";

function draftMime({
  bytes = BYTES,
  name = "outlook-exact-contract.pdf",
  mimeType = "application/pdf",
} = {}) {
  return Buffer.from([
    "From: lawyer@amic.kr",
    "To: client@example.test",
    "Subject: Vault exact attachment draft",
    "Message-ID: <outlook-vault-draft@example.test>",
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${DRAFT_BOUNDARY}"`,
    "",
    `--${DRAFT_BOUNDARY}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Draft body",
    `--${DRAFT_BOUNDARY}`,
    `Content-Type: ${mimeType}; name="${name}"`,
    `Content-Disposition: attachment; filename="${name}"`,
    "Content-Transfer-Encoding: base64",
    "",
    bytes.toString("base64"),
    `--${DRAFT_BOUNDARY}--`,
    "",
  ].join("\r\n"));
}

function roster() {
  return parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "outlook-vault-delivery-v1",
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: TENANT,
      user_id: index === 0 ? USER : `user_outlook_vault_delivery_${String(index + 1).padStart(2, "0")}`,
      entra_subject_id: index === 0 ? SUBJECT : `subject_outlook_vault_delivery_${String(index + 1).padStart(2, "0")}`,
      enabled: true,
    })),
  });
}

function trustedInstallation(overrides = {}) {
  return Object.freeze({
    installation_id: INSTALLATION_ID,
    status: "active",
    state_version: 4,
    lease_expires_at: "2099-08-29T02:00:00.000Z",
    retired_at: null,
    release_trusted: true,
    authority_snapshot_at: "2099-08-29T01:00:00.000Z",
    ...overrides,
  });
}

function harness({
  capabilityAllowed = true,
  graphAttachmentBytes = BYTES,
  graphIsDraft = true,
} = {}) {
  let timestamp = Date.parse("2026-08-29T01:00:00.000Z");
  let currentInstallation = trustedInstallation();
  let graphReads = 0;
  const now = () => timestamp;
  const repository = createDmsRepository();
  const storage = createLocalStorageAdapter({ adapter_id: "outlook-vault-delivery" });
  const document = uploadDocument({
    repository,
    storage,
    document: {
      document_id: "document_outlook_vault_delivery",
      tenant_id: TENANT,
      matter_id: `vault-${MATTER}`,
      workspace_id: "workspace_outlook_vault_delivery",
      folder_id: null,
      title: "Outlook exact attachment",
      filename: "outlook-exact-contract.pdf",
      status: "active",
      current_version_id: "version_outlook_vault_delivery_9",
      permission_envelope_id: "permission_outlook_vault_delivery",
      audit_trace_id: "audit_outlook_vault_delivery",
      mime_type: "application/pdf",
    },
    bytes: BYTES,
    actor_id: USER,
    idempotency_key: "outlook-vault-delivery-seed",
  });
  const exactVersion = Object.freeze({
    document_id: document.document.document_id,
    version_id: document.version.version_id,
    file_object_id: document.file_object.file_object_id,
    sha256: document.version.sha256,
    byte_size: document.file_object.byte_size,
    mime_type: document.file_object.mime_type,
  });
  const principal = Object.freeze({
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    scopes: Object.freeze([OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE]),
  });
  const installation = Object.freeze({
    installation_id: INSTALLATION_ID,
    status: "active",
    state_version: 4,
    lease_expires_at: "2099-08-29T02:00:00.000Z",
    retired_at: null,
  });
  const context = Object.freeze({
    principal,
    rules: Object.freeze([
      Object.freeze({ id: "allow-vault-download", effect: "allow", action: "vault:download:preflight" }),
      Object.freeze({ id: "allow-dms-read", effect: "allow", action: "dms:document:read" }),
    ]),
    object_acl: Object.freeze([]),
  });
  const matterRuntime = Object.freeze({
    repository: createMatterRepository({
      seedRecords: [{
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: MATTER,
        matter_code: "VAULT/OUTLOOK/DELIVERY",
        matter_name: "Outlook Vault delivery",
        client_id: "client_outlook_vault_delivery",
        client_display_name: "Outlook Vault delivery client",
        title: "Outlook Vault delivery",
        status: "open",
        created_by: USER,
        created_at: "2026-08-29T00:00:00.000Z",
        permission_envelope_id: "permission-outlook-vault-delivery",
        audit_trace_id: "audit-outlook-vault-delivery",
      }],
    }),
  });
  const provider = createTestAmicVaultExportProvider({
    repository,
    storage,
    tenantId: TENANT,
    actorId: USER,
    now,
  });
  const deliveryAuthority = createOutlookVaultDeliveryTokenAuthority({
    secret: "outlook-vault-attachment-delivery-test-secret-0001",
    now,
    randomBytesFn: () => Buffer.from("010203040506070809101112", "hex"),
  });
  const hostVerifier = createOutlookVaultGraphHostVerifier({
    mailPort: Object.freeze({
      async getOwnMessageMime(input) {
        graphReads += 1;
        assert.equal(input.tenant_id, TENANT);
        assert.equal(input.user_id, USER);
        assert.equal(input.entra_subject_id, SUBJECT);
        assert.equal(input.rest_message_id, COMPOSE_TARGET);
        return Object.freeze({
          mime_bytes: draftMime({ bytes: graphAttachmentBytes }),
          immutable_message_id: "immutable-outlook-vault-draft-001",
          provider_request_id: `graph-draft-read-${graphReads}`,
          message_metadata: Object.freeze({ is_draft: graphIsDraft }),
        });
      },
    }),
    now,
  });
  return {
    principal,
    installation,
    context,
    matterRuntime,
    dmsRuntime: { repository },
    repository,
    provider,
    deliveryAuthority,
    hostVerifier,
    exactVersion,
    now,
    sessionAuth: {
      async resolveVaultCapabilities() {
        return {
          authoritative: true,
          capabilities: [{
            id: "download",
            allowed: capabilityAllowed,
            safe_reason_code: capabilityAllowed ? null : "VAULT_CAPABILITY_DENIED",
          }],
        };
      },
    },
    outlookDesktopRuntime: Object.freeze({
      entitlement_roster: roster(),
      installation_service: Object.freeze({
        async readTrustedCurrent() { return currentInstallation; },
      }),
    }),
    setCurrentInstallation(value) { currentInstallation = value; },
    advance(milliseconds) { timestamp += milliseconds; },
    graphReadCount() { return graphReads; },
  };
}

function authorizeInput(state, overrides = {}) {
  return {
    body: {
      matter_id: MATTER,
      exact_version: state.exactVersion,
      request_nonce_sha256: "5".repeat(64),
      compose_target_ref: COMPOSE_TARGET,
      ...(overrides.body ?? {}),
    },
    principal: state.principal,
    context: state.context,
    installation: state.installation,
    requestId: "request-outlook-vault-attachment-authorize",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    deliveryAuthority: state.deliveryAuthority,
    publicOrigin: "https://lawos-api.example.test",
    now: state.now,
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== "body")),
  };
}

function verifiedDelivery(state, authorization) {
  const url = new URL(authorization.body.delivery_uri);
  return verifyOutlookVaultAttachmentDeliveryRequest({
    method: "GET",
    pathname: url.pathname,
    authority: state.deliveryAuthority,
  });
}

function completeInput(state, authorization, overrides = {}) {
  return {
    body: {
      operation_id: authorization.body.operation_id,
      exact_version: state.exactVersion,
      compose_target_ref: COMPOSE_TARGET,
      attachment_ack: {
        attachment_id: OFFICE_ATTACHMENT_ID,
        attachment_name: authorization.body.attachment_name,
        attachment_size: state.exactVersion.byte_size,
      },
      ...(overrides.body ?? {}),
    },
    principal: state.principal,
    context: state.context,
    installation: state.installation,
    requestId: "request-outlook-vault-attachment-complete",
    sessionAuth: state.sessionAuth,
    matterRuntime: state.matterRuntime,
    dmsRuntime: state.dmsRuntime,
    hostVerifier: state.hostVerifier,
    now: state.now,
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== "body")),
  };
}

test("explicit Outlook action authorizes an opaque URI, streams exact bytes once, and records a hashed host acknowledgement", async () => {
  const state = harness();
  const authorization = await handleOutlookVaultAttachmentAuthorize(authorizeInput(state));
  assert.equal(authorization.status, 200);
  assert.equal(authorization.body.outcome, "attachment_delivery_authorized");
  assert.match(authorization.body.delivery_uri, /^https:\/\/lawos-api\.example\.test\//u);
  assert.ok(authorization.body.delivery_uri.length < 2_048);
  assert.equal(JSON.stringify(authorization.body).includes("provider_export_ref"), false);
  assert.equal(authorization.body.provider_grant_returned, false);

  const verified = verifiedDelivery(state, authorization);
  assert.equal(verified.ok, true);
  const delivery = await handleOutlookVaultAttachmentDelivery({
    verifiedDelivery: verified,
    requestId: "request-outlook-vault-attachment-delivery",
    outlookDesktopRuntime: state.outlookDesktopRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
  });
  assert.equal(delivery.status, 200);
  assert.deepEqual(delivery.body, BYTES);
  assert.equal(delivery.attachment_name, authorization.body.attachment_name);
  assert.equal(delivery.headers["cache-control"], "private, max-age=60, immutable");

  const completion = await handleOutlookVaultAttachmentComplete(
    completeInput(state, authorization),
  );
  assert.equal(completion.status, 200);
  assert.equal(completion.body.outcome, "attachment_verified");
  assert.equal(completion.body.receipt.stage, "attached");
  assert.equal(completion.body.graph_host_verified, true);
  assert.equal(completion.body.client_ack_authoritative, false);
  assert.equal(
    completion.body.host_verification_authority,
    "microsoft-graph-draft-mime",
  );
  assert.equal(completion.body.attachment_id_returned, false);
  assert.equal(state.graphReadCount(), 1);

  state.advance(1_000);
  const replay = await handleOutlookVaultAttachmentComplete(
    completeInput(state, authorization, { requestId: "request-completion-replay" }),
  );
  assert.equal(replay.status, 200);
  assert.equal(replay.body.attachment_ack_sha256, completion.body.attachment_ack_sha256);
  assert.equal(replay.body.receipt.receipt_id, completion.body.receipt.receipt_id);
  assert.equal(state.graphReadCount(), 1, "trusted verification replay must not reread Graph");

  const snapshot = JSON.stringify(state.repository.snapshot());
  assert.equal(snapshot.includes(OFFICE_ATTACHMENT_ID), false);
  assert.equal(snapshot.includes('"attachment_id"'), false);
  assert.deepEqual(state.provider.calls.map(({ method }) => method), [
    "authorizeExactExport",
    "downloadExactExport",
    "readbackExactExport",
  ]);
});

test("delivery fails closed after installation retirement and a consumed operation never re-downloads provider bytes", async () => {
  const state = harness();
  const authorization = await handleOutlookVaultAttachmentAuthorize(authorizeInput(state));
  const verified = verifiedDelivery(state, authorization);
  state.setCurrentInstallation(null);
  const retired = await handleOutlookVaultAttachmentDelivery({
    verifiedDelivery: verified,
    requestId: "request-delivery-retired",
    outlookDesktopRuntime: state.outlookDesktopRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
  });
  assert.equal(retired.status, 403);
  assert.deepEqual(retired.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_TRUSTED_INSTALLATION_REQUIRED",
  ]);
  assert.equal(state.provider.calls.filter(({ method }) => method === "downloadExactExport").length, 0);

  state.setCurrentInstallation(trustedInstallation());
  const first = await handleOutlookVaultAttachmentDelivery({
    verifiedDelivery: verified,
    requestId: "request-delivery-first",
    outlookDesktopRuntime: state.outlookDesktopRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
  });
  assert.equal(first.status, 200);
  const replay = await handleOutlookVaultAttachmentDelivery({
    verifiedDelivery: verified,
    requestId: "request-delivery-replay",
    outlookDesktopRuntime: state.outlookDesktopRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
  });
  assert.equal(replay.status, 409);
  assert.deepEqual(replay.body.safe_error_codes, ["VAULT_EXPORT_ALREADY_CONSUMED"]);
  assert.equal(state.provider.calls.filter(({ method }) => method === "downloadExactExport").length, 1);
});

test("capability denial, binding drift, and false Office metadata cannot authorize or complete an attachment", async () => {
  const denied = harness({ capabilityAllowed: false });
  const deniedAuthorization = await handleOutlookVaultAttachmentAuthorize(authorizeInput(denied));
  assert.equal(deniedAuthorization.status, 403);
  assert.deepEqual(deniedAuthorization.body.safe_error_codes, ["VAULT_CAPABILITY_DENIED"]);
  assert.equal(denied.provider.calls.length, 0);

  const state = harness();
  const authorization = await handleOutlookVaultAttachmentAuthorize(authorizeInput(state));
  const delivery = await handleOutlookVaultAttachmentDelivery({
    verifiedDelivery: verifiedDelivery(state, authorization),
    requestId: "request-delivery-before-bad-ack",
    outlookDesktopRuntime: state.outlookDesktopRuntime,
    dmsRuntime: state.dmsRuntime,
    vaultExportProvider: state.provider,
    now: state.now,
  });
  assert.equal(delivery.status, 200);

  const wrongCompose = await handleOutlookVaultAttachmentComplete(completeInput(state, authorization, {
    body: { compose_target_ref: "AAMkAGI2-different-draft" },
  }));
  assert.equal(wrongCompose.status, 409);
  assert.deepEqual(wrongCompose.body.safe_error_codes, [
    "OUTLOOK_VAULT_ATTACHMENT_BINDING_MISMATCH",
  ]);

  const wrongMetadata = await handleOutlookVaultAttachmentComplete(completeInput(state, authorization, {
    body: {
      attachment_ack: {
        attachment_id: OFFICE_ATTACHMENT_ID,
        attachment_name: "different.pdf",
        attachment_size: state.exactVersion.byte_size,
      },
    },
  }));
  assert.equal(wrongMetadata.status, 409);
  assert.deepEqual(wrongMetadata.body.safe_error_codes, [
    "OUTLOOK_VAULT_ATTACHMENT_ACK_MISMATCH",
  ]);

  const corrected = await handleOutlookVaultAttachmentComplete(completeInput(state, authorization));
  assert.equal(corrected.status, 200);
  assert.equal(corrected.body.receipt.stage, "attached");
});

test("client acknowledgement alone cannot complete when Graph draft bytes are absent or verification is unavailable", async () => {
  const mismatched = harness({
    graphAttachmentBytes: Buffer.from("different draft attachment bytes\n"),
  });
  const mismatchedAuthorization = await handleOutlookVaultAttachmentAuthorize(
    authorizeInput(mismatched),
  );
  const mismatchedDelivery = await handleOutlookVaultAttachmentDelivery({
    verifiedDelivery: verifiedDelivery(mismatched, mismatchedAuthorization),
    requestId: "request-delivery-before-graph-mismatch",
    outlookDesktopRuntime: mismatched.outlookDesktopRuntime,
    dmsRuntime: mismatched.dmsRuntime,
    vaultExportProvider: mismatched.provider,
    now: mismatched.now,
  });
  assert.equal(mismatchedDelivery.status, 200);
  const rejected = await handleOutlookVaultAttachmentComplete(
    completeInput(mismatched, mismatchedAuthorization),
  );
  assert.equal(rejected.status, 409);
  assert.deepEqual(rejected.body.safe_error_codes, [
    "OUTLOOK_VAULT_HOST_VERIFICATION_MISMATCH",
  ]);
  assert.equal(mismatched.graphReadCount(), 1);
  assert.equal(mismatched.repository.snapshot().idempotency.some(({ operation }) => (
    operation === "amic_os_vault_exact_export_final"
    || operation === "amic_os_outlook_vault_attachment_ack"
  )), false);

  const unavailable = harness();
  const unavailableAuthorization = await handleOutlookVaultAttachmentAuthorize(
    authorizeInput(unavailable),
  );
  const unavailableDelivery = await handleOutlookVaultAttachmentDelivery({
    verifiedDelivery: verifiedDelivery(unavailable, unavailableAuthorization),
    requestId: "request-delivery-before-host-verifier-unavailable",
    outlookDesktopRuntime: unavailable.outlookDesktopRuntime,
    dmsRuntime: unavailable.dmsRuntime,
    vaultExportProvider: unavailable.provider,
    now: unavailable.now,
  });
  assert.equal(unavailableDelivery.status, 200);
  const blocked = await handleOutlookVaultAttachmentComplete(
    completeInput(unavailable, unavailableAuthorization, { hostVerifier: null }),
  );
  assert.equal(blocked.status, 503);
  assert.deepEqual(blocked.body.safe_error_codes, [
    "OUTLOOK_VAULT_HOST_VERIFICATION_UNAVAILABLE",
  ]);
  assert.equal(unavailable.repository.snapshot().idempotency.some(({ operation }) => (
    operation === "amic_os_vault_exact_export_final"
  )), false);
});
