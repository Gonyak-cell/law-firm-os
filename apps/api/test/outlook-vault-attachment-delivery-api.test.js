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
import { createOutlookVaultGraphHostVerifier } from "../src/outlook-vault-attachment-delivery-runtime.js";
import { createOutlookVaultDeliveryTokenAuthority } from "../src/outlook-vault-delivery-token.js";
import { createApiServer } from "../src/server.js";
import { createTestAmicVaultExportProvider } from "./helpers/amic-vault-export-provider.js";

const TENANT = "tenant_outlook_vault_http";
const USER = "user_outlook_vault_http_01";
const SUBJECT = "subject_outlook_vault_http_01";
const MATTER = "matter_outlook_vault_http";
const INSTALLATION_ID = "odi_outlook_vault_http_000001";
const COMPOSE_TARGET = "AAMkAGI2-http-draft-001";
const BYTES = Buffer.from("HTTP exact Outlook Vault attachment bytes\n");
const DRAFT_BOUNDARY = "lawos-outlook-vault-http-draft-boundary";

function draftMime() {
  const name = "http-outlook-exact.pdf";
  return Buffer.from([
    "From: lawyer@amic.kr",
    "To: client@example.test",
    "Subject: HTTP Outlook Vault draft",
    "Message-ID: <outlook-vault-http-draft@example.test>",
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${DRAFT_BOUNDARY}"`,
    "",
    `--${DRAFT_BOUNDARY}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Draft body",
    `--${DRAFT_BOUNDARY}`,
    `Content-Type: application/pdf; name="${name}"`,
    `Content-Disposition: attachment; filename="${name}"`,
    "Content-Transfer-Encoding: base64",
    "",
    BYTES.toString("base64"),
    `--${DRAFT_BOUNDARY}--`,
    "",
  ].join("\r\n"));
}

function roster() {
  return parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "outlook-vault-http-v1",
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: TENANT,
      user_id: index === 0 ? USER : `user_outlook_vault_http_${String(index + 1).padStart(2, "0")}`,
      entra_subject_id: index === 0 ? SUBJECT : `subject_outlook_vault_http_${String(index + 1).padStart(2, "0")}`,
      enabled: true,
    })),
  });
}

function setup() {
  const repository = createDmsRepository();
  const storage = createLocalStorageAdapter({ adapter_id: "outlook-vault-http" });
  const seeded = uploadDocument({
    repository,
    storage,
    document: {
      document_id: "document_outlook_vault_http",
      tenant_id: TENANT,
      matter_id: `vault-${MATTER}`,
      workspace_id: "workspace_outlook_vault_http",
      folder_id: null,
      title: "HTTP Outlook exact attachment",
      filename: "http-outlook-exact.pdf",
      status: "active",
      current_version_id: "version_outlook_vault_http_2",
      permission_envelope_id: "permission_outlook_vault_http",
      audit_trace_id: "audit_outlook_vault_http",
      mime_type: "application/pdf",
    },
    bytes: BYTES,
    actor_id: USER,
    idempotency_key: "outlook-vault-http-seed",
  });
  const exactVersion = Object.freeze({
    document_id: seeded.document.document_id,
    version_id: seeded.version.version_id,
    file_object_id: seeded.file_object.file_object_id,
    sha256: seeded.version.sha256,
    byte_size: seeded.file_object.byte_size,
    mime_type: seeded.file_object.mime_type,
  });
  const principal = Object.freeze({
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    scopes: Object.freeze([OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE]),
  });
  const context = Object.freeze({
    principal,
    rules: Object.freeze([
      Object.freeze({ id: "allow-vault-download", effect: "allow", action: "vault:download:preflight" }),
      Object.freeze({ id: "allow-dms-read", effect: "allow", action: "dms:document:read" }),
    ]),
    object_acl: Object.freeze([]),
  });
  let sessionReads = 0;
  const sessionAuth = Object.freeze({
    capabilities: Object.freeze({}),
    async resolvePermissionContextFromHeaders() {
      sessionReads += 1;
      return Object.freeze({
        ok: true,
        principal,
        context,
        token_payload: Object.freeze({ surface: "outlook_addin" }),
      });
    },
    async resolveVaultCapabilities() {
      return Object.freeze({
        authoritative: true,
        capabilities: Object.freeze([
          Object.freeze({ id: "download", allowed: true, safe_reason_code: null }),
        ]),
      });
    },
  });
  const installation = Object.freeze({
    installation_id: INSTALLATION_ID,
    status: "active",
    state_version: 2,
    lease_expires_at: "2099-08-29T02:00:00.000Z",
    retired_at: null,
    release_trusted: true,
    authority_snapshot_at: "2099-08-29T01:00:00.000Z",
  });
  const outlookDesktopRuntime = Object.freeze({
    entitlement_roster: roster(),
    installation_service: Object.freeze({
      async readTrustedCurrent() { return installation; },
    }),
  });
  const outlookVaultHostVerifier = createOutlookVaultGraphHostVerifier({
    mailPort: Object.freeze({
      async getOwnMessageMime(input) {
        assert.equal(input.rest_message_id, COMPOSE_TARGET);
        return Object.freeze({
          mime_bytes: draftMime(),
          immutable_message_id: "immutable-outlook-vault-http-draft-001",
          provider_request_id: "provider-outlook-vault-http-draft-001",
          message_metadata: Object.freeze({ is_draft: true }),
        });
      },
    }),
  });
  const matterRuntime = Object.freeze({
    repository: createMatterRepository({
      seedRecords: [{
        model_type: "Matter",
        tenant_id: TENANT,
        matter_id: MATTER,
        matter_code: "VAULT/OUTLOOK/HTTP",
        matter_name: "Outlook Vault HTTP",
        client_id: "client_outlook_vault_http",
        client_display_name: "Outlook Vault HTTP client",
        title: "Outlook Vault HTTP",
        status: "open",
        created_by: USER,
        created_at: "2026-08-29T00:00:00.000Z",
        permission_envelope_id: "permission-outlook-vault-http",
        audit_trace_id: "audit-outlook-vault-http",
      }],
    }),
  });
  return {
    repository,
    exactVersion,
    sessionAuth,
    matterRuntime,
    outlookDesktopRuntime,
    outlookVaultHostVerifier,
    provider: createTestAmicVaultExportProvider({
      repository,
      storage,
      tenantId: TENANT,
      actorId: USER,
    }),
    deliveryAuthority: createOutlookVaultDeliveryTokenAuthority({
      secret: "outlook-vault-http-delivery-test-secret-material-0001",
    }),
    sessionReadCount() { return sessionReads; },
  };
}

async function withServer(state, run) {
  const server = createApiServer({
    matterRuntime: state.matterRuntime,
    dmsRuntime: { repository: state.repository },
    sessionAuth: state.sessionAuth,
    outlookDesktopRuntime: state.outlookDesktopRuntime,
    vaultExportProvider: state.provider,
    outlookVaultDeliveryAuthority: state.deliveryAuthority,
    outlookVaultDeliveryPublicOrigin: "https://lawos-api.example.test",
    outlookVaultHostVerifier: state.outlookVaultHostVerifier,
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("HTTP Outlook attachment route requires signed explicit authorization but lets Exchange consume only the opaque GET", async () => {
  const state = setup();
  await withServer(state, async (baseUrl) => {
    const authorizationResponse = await fetch(
      `${baseUrl}/api/outlook/vault/attachments/authorize`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer signed-outlook-session",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          matter_id: MATTER,
          exact_version: state.exactVersion,
          request_nonce_sha256: "7".repeat(64),
          compose_target_ref: COMPOSE_TARGET,
        }),
      },
    );
    assert.equal(authorizationResponse.status, 200);
    const authorization = await authorizationResponse.json();
    assert.equal(state.sessionReadCount(), 1);

    const issuedUrl = new URL(authorization.delivery_uri);
    const deliveryResponse = await fetch(`${baseUrl}${issuedUrl.pathname}`);
    assert.equal(deliveryResponse.status, 200);
    assert.deepEqual(Buffer.from(await deliveryResponse.arrayBuffer()), BYTES);
    assert.equal(deliveryResponse.headers.get("cache-control"), "private, max-age=60, immutable");
    assert.equal(deliveryResponse.headers.get("content-type"), "application/pdf");
    assert.equal(state.sessionReadCount(), 1, "Exchange GET must not open the signed session flow");

    const completionResponse = await fetch(
      `${baseUrl}/api/outlook/vault/attachments/complete`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer signed-outlook-session",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          operation_id: authorization.operation_id,
          exact_version: state.exactVersion,
          compose_target_ref: COMPOSE_TARGET,
          attachment_ack: {
            attachment_id: "office-http-attachment-id-001",
            attachment_name: authorization.attachment_name,
            attachment_size: state.exactVersion.byte_size,
          },
        }),
      },
    );
    assert.equal(completionResponse.status, 200);
    const completion = await completionResponse.json();
    assert.equal(completion.outcome, "attachment_verified");
    assert.equal(completion.receipt.stage, "attached");
    assert.equal(completion.graph_host_verified, true);
    assert.equal(completion.client_ack_authoritative, false);
    assert.equal(completion.host_verification_authority, "microsoft-graph-draft-mime");
    assert.equal(state.sessionReadCount(), 2);

    const invalidDelivery = await fetch(
      `${baseUrl}/api/outlook/vault/attachments/delivery/lawos_ovd_v1.invalid.invalid.invalid`,
    );
    assert.equal(invalidDelivery.status, 403);
    assert.deepEqual((await invalidDelivery.json()).safe_error_codes, [
      "OUTLOOK_VAULT_DELIVERY_TOKEN_INVALID",
    ]);
    assert.equal(state.sessionReadCount(), 2, "invalid opaque GET must not fall into login");
  });
});
