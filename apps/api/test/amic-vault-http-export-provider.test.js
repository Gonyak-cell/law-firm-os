import assert from "node:assert/strict";
import test from "node:test";

import {
  AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER,
  AMIC_VAULT_HTTP_EXPORT_PROVIDER_PATHS,
  LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ENABLED_ENV,
  LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ORIGIN_ENV,
  LAWOS_AMIC_VAULT_EXPORT_PROVIDER_TOKEN_ENV,
  createAmicVaultHttpExportProvider,
  resolveAmicVaultHttpExportProvider,
} from "../src/amic-vault-http-export-provider.js";

const ORIGIN = "https://vault.example.test";
const TOKEN = "vault-workload-token-for-lawos-tests-0123456789";
const DOCUMENT_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const FILE_OBJECT_ID = "33333333-3333-4333-8333-333333333333";
const AUTHORIZED_EVENT_ID = "44444444-4444-4444-8444-444444444444";
const DOWNLOADED_EVENT_ID = "55555555-5555-4555-8555-555555555555";
const READBACK_EVENT_ID = "66666666-6666-4666-8666-666666666666";
const OPERATION_ID = "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CORRELATION_ID = "vaultcorr_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const PROVIDER_EXPORT_REF = "vault-export:77777777-7777-4777-8777-777777777777";
const ATTACHMENT_NAME = "의견서 final.pdf";
const BYTES = Buffer.from("exact vault bytes\n");

const EXACT_VERSION = Object.freeze({
  document_id: DOCUMENT_ID,
  version_id: VERSION_ID,
  file_object_id: FILE_OBJECT_ID,
  sha256: "a".repeat(64),
  byte_size: BYTES.byteLength,
  mime_type: "application/pdf",
});

function allow(kind) {
  return Object.freeze({ effect: "allow", decision_ref: `vault-${kind}:allow` });
}

const DECISIONS = Object.freeze({
  permission: allow("permission"),
  ethical_wall: allow("ethical-wall"),
  records: allow("records"),
  dlp: allow("dlp"),
});

const AUTHORIZATION = Object.freeze({
  authority_kind: "amic-vault-api",
  authority_ref: "amic-vault-api:oa12",
  provider_revision: "amic-vault-source:5a04cc31",
  state: "authorized",
  provider_export_ref: PROVIDER_EXPORT_REF,
  expires_at: "2026-08-29T12:00:45.000Z",
  exact_version: EXACT_VERSION,
  attachment_name: ATTACHMENT_NAME,
  decisions: DECISIONS,
  audit: Object.freeze({ event_id: AUTHORIZED_EVENT_ID, correlation_id: CORRELATION_ID }),
});

const PRINCIPAL = Object.freeze({
  tenant_id: "tenant_lawos_test",
  user_id: "user_lawos_test",
});

function authorizeInput() {
  return Object.freeze({
    principal: PRINCIPAL,
    lawos_matter_id: "matter_lawos_test",
    requested_exact_version: EXACT_VERSION,
    installation_ref_sha256: "c".repeat(64),
    compose_target_sha256: "d".repeat(64),
    operation_id: OPERATION_ID,
    correlation_id: CORRELATION_ID,
    operation_kind: "attach_outlook",
    idempotency_key: "vault-export-idempotency-test",
  });
}

function downloadInput() {
  return Object.freeze({
    principal: PRINCIPAL,
    lawos_matter_id: "matter_lawos_test",
    installation_ref_sha256: "c".repeat(64),
    compose_target_sha256: "d".repeat(64),
    operation: Object.freeze({
      operation_id: OPERATION_ID,
      correlation_id: CORRELATION_ID,
      operation_kind: "attach_outlook",
      idempotency_key: "vault-export-idempotency-test",
    }),
    authorization: AUTHORIZATION,
  });
}

function readbackInput(download) {
  return Object.freeze({
    principal: PRINCIPAL,
    lawos_matter_id: "matter_lawos_test",
    installation_ref_sha256: "c".repeat(64),
    compose_target_sha256: "d".repeat(64),
    operation: Object.freeze({
      operation_id: OPERATION_ID,
      correlation_id: CORRELATION_ID,
      operation_kind: "attach_outlook",
    }),
    authorization: AUTHORIZATION,
    download: Object.freeze({
      authority_kind: download.authority_kind,
      authority_ref: download.authority_ref,
      provider_revision: download.provider_revision,
      state: download.state,
      provider_export_ref: download.provider_export_ref,
      exact_version: download.exact_version,
      attachment_name: download.attachment_name,
      audit: download.audit,
    }),
  });
}

function jsonResponse(body, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function contentDisposition(filename) {
  const fallback = filename.replace(/[^\w.-]+/gu, "_").slice(0, 120) || "document";
  const encoded = encodeURIComponent(filename).replace(/['()*]/gu, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function downloadResponse(overrides = {}) {
  return new Response(BYTES, {
    status: 201,
    headers: {
      "cache-control": "no-store",
      "content-type": EXACT_VERSION.mime_type,
      "content-length": String(BYTES.byteLength),
      "content-disposition": contentDisposition(ATTACHMENT_NAME),
      "x-content-type-options": "nosniff",
      "x-amic-vault-authority-kind": AUTHORIZATION.authority_kind,
      "x-amic-vault-authority-ref": AUTHORIZATION.authority_ref,
      "x-amic-vault-provider-revision": AUTHORIZATION.provider_revision,
      "x-amic-vault-export-ref": PROVIDER_EXPORT_REF,
      "x-amic-vault-document-id": DOCUMENT_ID,
      "x-amic-vault-version-id": VERSION_ID,
      "x-amic-vault-file-object-id": FILE_OBJECT_ID,
      "x-amic-vault-sha256": EXACT_VERSION.sha256,
      "x-amic-vault-byte-size": String(BYTES.byteLength),
      "x-amic-vault-audit-event-id": DOWNLOADED_EVENT_ID,
      "x-amic-vault-correlation-id": CORRELATION_ID,
      ...overrides,
    },
  });
}

test("AMIC Vault HTTP export provider stays default-off and validates transport authority", () => {
  assert.equal(resolveAmicVaultHttpExportProvider({ env: {} }), null);
  assert.equal(resolveAmicVaultHttpExportProvider({
    env: {
      [LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ENABLED_ENV]: "false",
      [LAWOS_AMIC_VAULT_EXPORT_PROVIDER_ORIGIN_ENV]: ORIGIN,
      [LAWOS_AMIC_VAULT_EXPORT_PROVIDER_TOKEN_ENV]: TOKEN,
    },
  }), null);

  assert.throws(
    () => createAmicVaultHttpExportProvider({
      origin: "http://vault.example.test",
      token: TOKEN,
      runtimeProfile: "operational",
    }),
    (error) => error.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.throws(
    () => createAmicVaultHttpExportProvider({
      origin: `${ORIGIN}/private`,
      token: TOKEN,
      runtimeProfile: "operational",
    }),
    (error) => error.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.throws(
    () => createAmicVaultHttpExportProvider({
      origin: ORIGIN,
      token: "short",
      runtimeProfile: "operational",
    }),
    (error) => error.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(createAmicVaultHttpExportProvider({
    origin: "http://127.0.0.1:4300",
    token: TOKEN,
    runtimeProfile: "local-dev",
  }).authority_kind, "amic-vault-api");
});

test("AMIC Vault HTTP export provider performs strict authorize, bounded download, and readback without exposing its credential", async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    if (url.endsWith(AMIC_VAULT_HTTP_EXPORT_PROVIDER_PATHS.authorize)) {
      return jsonResponse(AUTHORIZATION);
    }
    if (url.endsWith(AMIC_VAULT_HTTP_EXPORT_PROVIDER_PATHS.download)) {
      return downloadResponse();
    }
    if (url.endsWith(AMIC_VAULT_HTTP_EXPORT_PROVIDER_PATHS.readback)) {
      return jsonResponse({
        authority_kind: AUTHORIZATION.authority_kind,
        authority_ref: AUTHORIZATION.authority_ref,
        provider_revision: AUTHORIZATION.provider_revision,
        state: "consumed",
        provider_export_ref: PROVIDER_EXPORT_REF,
        exact_version: EXACT_VERSION,
        decisions: DECISIONS,
        audit: { event_id: READBACK_EVENT_ID, correlation_id: CORRELATION_ID },
      });
    }
    throw new Error("unexpected path");
  };
  const provider = createAmicVaultHttpExportProvider({
    origin: ORIGIN,
    token: TOKEN,
    runtimeProfile: "operational",
    fetchFn,
  });

  const authorized = await provider.authorizeExactExport(authorizeInput());
  const downloaded = await provider.downloadExactExport(downloadInput());
  const readback = await provider.readbackExactExport(readbackInput(downloaded));

  assert.deepEqual(authorized, AUTHORIZATION);
  assert.deepEqual(downloaded.body, BYTES);
  assert.deepEqual(downloaded.exact_version, EXACT_VERSION);
  assert.equal(downloaded.attachment_name, ATTACHMENT_NAME);
  assert.equal(readback.state, "consumed");
  assert.deepEqual(calls.map(({ url }) => new URL(url).pathname), [
    AMIC_VAULT_HTTP_EXPORT_PROVIDER_PATHS.authorize,
    AMIC_VAULT_HTTP_EXPORT_PROVIDER_PATHS.download,
    AMIC_VAULT_HTTP_EXPORT_PROVIDER_PATHS.readback,
  ]);
  for (const call of calls) {
    assert.equal(call.init.method, "POST");
    assert.equal(call.init.redirect, "manual");
    assert.equal(call.init.headers[AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER], TOKEN);
    assert.equal(call.init.headers["accept-encoding"], "identity");
    assert.equal(call.body.lawos_matter_id, "matter_lawos_test");
  }
  assert.deepEqual(JSON.parse(JSON.stringify(provider)), {
    authority_kind: provider.authority_kind,
  });
});

test("AMIC Vault HTTP export provider rejects redirects, malformed metadata, oversize bodies, and timeout without credential disclosure", async () => {
  const scenarios = [
    async () => new Response(null, { status: 302, headers: { location: "https://elsewhere.test" } }),
    async () => downloadResponse({ "content-disposition": "attachment; filename=wrong.pdf" }),
    async () => downloadResponse({ "content-length": String(BYTES.byteLength + 1) }),
  ];
  for (const fetchFn of scenarios) {
    const provider = createAmicVaultHttpExportProvider({
      origin: ORIGIN,
      token: TOKEN,
      runtimeProfile: "operational",
      fetchFn,
    });
    await assert.rejects(
      provider.downloadExactExport(downloadInput()),
      (error) => {
        assert.equal(error.name, "AmicVaultExportProviderError");
        assert.equal(String(error.message).includes(TOKEN), false);
        return true;
      },
    );
  }

  const timeoutProvider = createAmicVaultHttpExportProvider({
    origin: ORIGIN,
    token: TOKEN,
    runtimeProfile: "operational",
    timeoutMs: 5,
    fetchFn: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      }, { once: true });
    }),
  });
  await assert.rejects(
    timeoutProvider.authorizeExactExport(authorizeInput()),
    (error) => error.safe_error_code === "VAULT_EXPORT_PROVIDER_TIMEOUT"
      && !String(error.message).includes(TOKEN),
  );
});
