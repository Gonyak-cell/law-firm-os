import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER,
  AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER,
} from "../src/amic-vault-http-export-provider.js";
import {
  AMIC_VAULT_HTTP_DIRECT_UPLOAD_MAX_BYTES,
  AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS,
  LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ENABLED_ENV,
  LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV,
  LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV,
  createAmicVaultHttpUploadProvider,
  resolveAmicVaultHttpUploadProvider,
} from "../src/amic-vault-http-upload-provider.js";

const ORIGIN = "https://vault.example.test";
const TOKEN = "vault-upload-workload-token-for-lawos-tests-0123456789";
const OPERATION_ID = "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CORRELATION_ID = "vaultcorr_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const BYTES = Buffer.from("exact upload bytes\n");
const SHA256 = createHash("sha256").update(BYTES).digest("hex");

function allow(kind) {
  return Object.freeze({ effect: "allow", decision_ref: `vault-${kind}:allow` });
}

const DECISIONS = Object.freeze({
  permission: allow("permission"),
  ethical_wall: allow("ethical-wall"),
  records: allow("records"),
  dlp: allow("dlp"),
});

const PRINCIPAL = Object.freeze({
  tenant_id: "tenant_lawos_test",
  user_id: "user_lawos_test",
});

const PREFLIGHT = Object.freeze({
  authority_kind: "amic-vault-api",
  authority_ref: "amic-vault-api:upload-pack",
  provider_revision: "amic-vault-source:upload-pack",
  preflight_ref: `vault-preflight:${OPERATION_ID}`,
  expires_at: "2026-08-29T12:05:00.000Z",
  resolved: Object.freeze({
    vault_tenant_id: "tenant-vault-test",
    vault_actor_id: "actor-vault-test",
    vault_matter_id: "matter-vault-test",
    vault_workspace_id: "workspace-vault-test",
    vault_folder_id: null,
  }),
  decisions: DECISIONS,
  audit: Object.freeze({
    event_id: "44444444-4444-4444-8444-444444444444",
    correlation_id: CORRELATION_ID,
  }),
});

const EXACT_VERSION = Object.freeze({
  document_id: "11111111-1111-4111-8111-111111111111",
  version_id: "22222222-2222-4222-8222-222222222222",
  file_object_id: "33333333-3333-4333-8333-333333333333",
  sha256: SHA256,
  byte_size: BYTES.byteLength,
  mime_type: "application/pdf",
});

const COMMIT = Object.freeze({
  authority_kind: PREFLIGHT.authority_kind,
  authority_ref: PREFLIGHT.authority_ref,
  provider_revision: PREFLIGHT.provider_revision,
  state: "quarantined",
  provider_operation_ref: `vault-upload:${OPERATION_ID}`,
  accepted: Object.freeze({
    sha256: SHA256,
    byte_size: BYTES.byteLength,
    mime_type: "application/pdf",
  }),
  exact_version: null,
  retry_after_ms: 1_000,
  audit: Object.freeze({
    event_id: "55555555-5555-4555-8555-555555555555",
    correlation_id: CORRELATION_ID,
  }),
});

const READBACK = Object.freeze({
  authority_kind: PREFLIGHT.authority_kind,
  authority_ref: PREFLIGHT.authority_ref,
  provider_revision: PREFLIGHT.provider_revision,
  state: "readback_verified",
  provider_operation_ref: COMMIT.provider_operation_ref,
  exact_version: EXACT_VERSION,
  retry_after_ms: null,
  decisions: DECISIONS,
  audit: Object.freeze({
    event_id: "66666666-6666-4666-8666-666666666666",
    correlation_id: CORRELATION_ID,
  }),
});

const CAPABILITIES = Object.freeze({
  authoritative: true,
  provider_state: "ready",
  tenant_binding_state: "bound",
  user_binding_state: "bound",
  authority_ref: "amic-vault-api:single-install",
  capabilities: Object.freeze({
    read: true,
    upload: true,
    download: true,
    attach: true,
    work: false,
    governance: false,
    audit: false,
  }),
});

function preflightInput() {
  return Object.freeze({
    principal: PRINCIPAL,
    lawos_matter_id: "matter_lawos_test",
    requested_workspace_id: null,
    requested_folder_id: null,
    source: Object.freeze({
      kind: "microsoft_graph_mime_attachment",
      ref_sha256: "c".repeat(64),
    }),
    operation_id: OPERATION_ID,
    correlation_id: CORRELATION_ID,
    request_id: "request-upload-preflight",
  });
}

function commitInput(overrides = {}) {
  return Object.freeze({
    principal: PRINCIPAL,
    preflight: PREFLIGHT,
    operation: Object.freeze({
      operation_id: OPERATION_ID,
      correlation_id: CORRELATION_ID,
      idempotency_key: "vault-upload-idempotency-test",
      operation_kind: "save_email_attachment",
    }),
    source: Object.freeze({ ref_sha256: "c".repeat(64) }),
    file: Object.freeze({
      filename: "의견서 final.pdf",
      mime_type: "application/pdf",
      byte_size: BYTES.byteLength,
      sha256: SHA256,
      bytes: BYTES,
      ...overrides,
    }),
    request_id: "request-upload-commit",
  });
}

function readbackInput() {
  return Object.freeze({
    principal: PRINCIPAL,
    preflight: PREFLIGHT,
    commit: COMMIT,
    operation: Object.freeze({
      operation_id: OPERATION_ID,
      correlation_id: CORRELATION_ID,
      operation_kind: "save_email_attachment",
    }),
    expected: Object.freeze({
      sha256: SHA256,
      byte_size: BYTES.byteLength,
      mime_type: "application/pdf",
    }),
    request_id: "request-upload-readback",
  });
}

function jsonResponse(body, status = 201, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

test("AMIC Vault HTTP upload provider stays default-off and validates transport authority", () => {
  assert.equal(resolveAmicVaultHttpUploadProvider({ env: {} }), null);
  assert.equal(resolveAmicVaultHttpUploadProvider({
    env: {
      [LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ENABLED_ENV]: "false",
      [LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ORIGIN_ENV]: ORIGIN,
      [LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_TOKEN_ENV]: TOKEN,
    },
  }), null);

  assert.throws(
    () => createAmicVaultHttpUploadProvider({
      origin: "http://vault.example.test",
      token: TOKEN,
      runtimeProfile: "operational",
    }),
    (error) => error.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.throws(
    () => createAmicVaultHttpUploadProvider({
      origin: `${ORIGIN}/private`,
      token: TOKEN,
      runtimeProfile: "operational",
    }),
    (error) => error.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.throws(
    () => createAmicVaultHttpUploadProvider({
      origin: ORIGIN,
      token: "short",
      runtimeProfile: "operational",
    }),
    (error) => error.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED",
  );
  assert.equal(createAmicVaultHttpUploadProvider({
    origin: "http://127.0.0.1:4300",
    token: TOKEN,
    runtimeProfile: "local-dev",
  }).authority_kind, "amic-vault-api");
});

test("AMIC Vault HTTP upload provider sends metadata as strict JSON and exact bytes only in multipart", async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    const pathname = new URL(url).pathname;
    if (pathname === AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.commit) {
      const envelopeText = init.body.get("envelope");
      const file = init.body.get("file");
      calls.push({
        pathname,
        init,
        envelopeText,
        envelope: JSON.parse(envelopeText),
        fileName: file.name,
        fileType: file.type,
        fileBytes: Buffer.from(await file.arrayBuffer()),
      });
      return jsonResponse(COMMIT);
    }
    calls.push({ pathname, init, body: JSON.parse(init.body) });
    if (pathname === AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.capabilities) {
      return jsonResponse(CAPABILITIES, 200);
    }
    if (pathname === AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.preflight) {
      return jsonResponse(PREFLIGHT);
    }
    if (pathname === AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.readback) {
      return jsonResponse(READBACK);
    }
    throw new Error("unexpected path");
  };
  const provider = createAmicVaultHttpUploadProvider({
    origin: ORIGIN,
    token: TOKEN,
    runtimeProfile: "operational",
    fetchFn,
  });

  assert.deepEqual(await provider.resolveCapabilities({
    tenant_id: PRINCIPAL.tenant_id,
    user_id: PRINCIPAL.user_id,
    request_id: "request-capabilities",
  }), CAPABILITIES);
  assert.deepEqual(await provider.preflightUpload(preflightInput()), PREFLIGHT);
  assert.deepEqual(await provider.commitUpload(commitInput()), COMMIT);
  assert.deepEqual(await provider.readbackUpload(readbackInput()), READBACK);

  assert.deepEqual(calls.map(({ pathname }) => pathname), [
    AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.capabilities,
    AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.preflight,
    AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.commit,
    AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.readback,
  ]);
  for (const call of calls) {
    assert.equal(call.init.method, "POST");
    assert.equal(call.init.redirect, "manual");
    assert.equal(call.init.headers[AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER], TOKEN);
    assert.equal(call.init.headers[AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER], PRINCIPAL.user_id);
    assert.equal(call.init.headers["accept-encoding"], "identity");
  }
  const capability = calls[0];
  assert.deepEqual(capability.body, {
    principal: PRINCIPAL,
    request_id: "request-capabilities",
  });
  const commit = calls[2];
  assert.equal(commit.init.headers["content-type"], undefined);
  assert.equal(Object.hasOwn(commit.envelope.file, "bytes"), false);
  assert.equal(commit.envelopeText.includes(BYTES.toString("base64")), false);
  assert.equal(commit.fileName, "의견서 final.pdf");
  assert.equal(commit.fileType, "application/pdf");
  assert.deepEqual(commit.fileBytes, BYTES);
  assert.equal(JSON.stringify(provider).includes(TOKEN), false);
  assert.equal(JSON.stringify(provider).includes(ORIGIN), false);
});

test("AMIC Vault HTTP staged upload sends 1 GiB metadata without proxying file bytes", async () => {
  const oneGiB = 1024 * 1024 * 1024;
  const transfer = Object.freeze({
    authority_kind: PREFLIGHT.authority_kind,
    authority_ref: PREFLIGHT.authority_ref,
    provider_revision: PREFLIGHT.provider_revision,
    state: "transfer_ready",
    transfer_ref: `vault-transfer:${OPERATION_ID}`,
    expires_at: "2026-08-29T12:30:00.000Z",
    method: "PUT",
    upload_url: `https://vault-bucket.s3.ap-northeast-2.amazonaws.com/quarantine/test?X-Amz-Signature=${"a".repeat(64)}`,
    required_headers: {
      "content-length": String(oneGiB),
      "content-type": "text/plain",
      "if-none-match": "*",
    },
    file: { filename: "one-gib.txt", mime_type: "text/plain", byte_size: oneGiB },
    max_upload_bytes: oneGiB,
  });
  const directCommit = Object.freeze({
    ...COMMIT,
    accepted: Object.freeze({
      sha256: SHA256,
      byte_size: oneGiB,
      mime_type: "text/plain",
    }),
  });
  const calls = [];
  const provider = createAmicVaultHttpUploadProvider({
    origin: ORIGIN,
    token: TOKEN,
    runtimeProfile: "operational",
    fetchFn: async (url, init) => {
      const pathname = new URL(url).pathname;
      const body = JSON.parse(init.body);
      calls.push({ pathname, init, body });
      return pathname === AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.prepare
        ? jsonResponse(transfer, 200)
        : jsonResponse(directCommit, 202);
    },
  });
  const common = {
    principal: PRINCIPAL,
    preflight: PREFLIGHT,
    operation: {
      operation_id: OPERATION_ID,
      correlation_id: CORRELATION_ID,
      idempotency_key: "vault-upload-idempotency-test",
      operation_kind: "save_local_file",
    },
  };
  const prepared = await provider.prepareStagedUpload({
    ...common,
    file: transfer.file,
    request_id: "request-upload-prepare",
  });
  const completed = await provider.completeStagedUpload({
    ...common,
    transfer: { transfer_ref: transfer.transfer_ref },
    file: { ...transfer.file, sha256: SHA256 },
    request_id: "request-upload-complete",
  });

  assert.equal(AMIC_VAULT_HTTP_DIRECT_UPLOAD_MAX_BYTES, oneGiB);
  assert.deepEqual(prepared, transfer);
  assert.deepEqual(completed, directCommit);
  assert.deepEqual(calls.map(({ pathname }) => pathname), [
    AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.prepare,
    AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.complete,
  ]);
  for (const call of calls) {
    assert.equal(call.init.headers["content-type"], "application/json");
    assert.equal(JSON.stringify(call.body).includes("bytes"), false);
    assert.equal(JSON.stringify(call.body).includes(BYTES.toString("base64")), false);
  }
});

test("AMIC Vault HTTP upload provider rejects byte drift, redirects, malformed JSON responses, and timeout without credential disclosure", async () => {
  const unusedFetch = async () => {
    throw new Error("fetch must not run for invalid bytes");
  };
  const integrityProvider = createAmicVaultHttpUploadProvider({
    origin: ORIGIN,
    token: TOKEN,
    runtimeProfile: "operational",
    fetchFn: unusedFetch,
  });
  await assert.rejects(
    integrityProvider.commitUpload(commitInput({ sha256: "f".repeat(64) })),
    (error) => error.safe_error_code === "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
  );
  await assert.rejects(
    integrityProvider.commitUpload(commitInput({ byte_size: BYTES.byteLength + 1 })),
    (error) => error.safe_error_code === "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
  );
  await assert.rejects(
    integrityProvider.preflightUpload({ ...preflightInput(), bytes: BYTES }),
    (error) => error.safe_error_code === "VAULT_UPLOAD_PROVIDER_REQUEST_INVALID",
  );

  for (const fetchFn of [
    async () => new Response(null, { status: 302, headers: { location: "https://elsewhere.test" } }),
    async () => new Response("not json", { status: 201, headers: { "content-type": "text/plain" } }),
  ]) {
    const provider = createAmicVaultHttpUploadProvider({
      origin: ORIGIN,
      token: TOKEN,
      runtimeProfile: "operational",
      fetchFn,
    });
    await assert.rejects(
      provider.preflightUpload(preflightInput()),
      (error) => {
        assert.equal(error.name, "AmicVaultUploadProviderError");
        assert.equal(String(error.message).includes(TOKEN), false);
        return true;
      },
    );
  }

  const timeoutProvider = createAmicVaultHttpUploadProvider({
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
    timeoutProvider.preflightUpload(preflightInput()),
    (error) => error.safe_error_code === "VAULT_UPLOAD_PROVIDER_TIMEOUT"
      && !String(error.message).includes(TOKEN),
  );
});
