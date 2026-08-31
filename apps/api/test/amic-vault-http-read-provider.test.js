import assert from "node:assert/strict";
import test from "node:test";

import {
  AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS,
  createAmicVaultHttpUploadProvider,
} from "../src/amic-vault-http-upload-provider.js";
import {
  AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER,
  AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER,
} from "../src/amic-vault-http-export-provider.js";

const ORIGIN = "https://vault.example.test";
const TOKEN = "vault-read-workload-token-for-lawos-tests-0123456789";
const PRINCIPAL = Object.freeze({
  tenant_id: "tenant_amic_matter_vault",
  user_id: "user_amic_jwsuh",
});
const ITEM = Object.freeze({
  document_id: "11111111-1111-4111-8111-111111111111",
  matter_id: "matter-lawos-1",
  title: "공급계약서",
  current_version_id: "22222222-2222-4222-8222-222222222222",
  version_id: "22222222-2222-4222-8222-222222222222",
  current_file_object_id: "33333333-3333-4333-8333-333333333333",
  file_object_id: "33333333-3333-4333-8333-333333333333",
  latest_sha256: "a".repeat(64),
  content_sha256: "a".repeat(64),
  current_byte_size: 4096,
  byte_size: 4096,
  current_mime_type: "application/pdf",
  mime_type: "application/pdf",
  filename: "supply-contract.pdf",
  indexed_at: null,
  match_fields: Object.freeze(["title"]),
});

function response(items = [ITEM]) {
  return {
    authority_kind: "amic-vault-api",
    authority_ref: "amic-vault-api:single-install",
    provider_revision: "single-install-upload-v1",
    items,
    page_info: {
      page: 1,
      page_size: 50,
      returned_count: items.length,
      current_version_only: true,
      omitted_result_count: null,
    },
    count_leak_prevented: true,
    raw_bytes_included: false,
    storage_locator_returned: false,
  };
}

function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

test("HTTP read methods bind the workload account and accept only exact safe projections", async () => {
  const calls = [];
  const provider = createAmicVaultHttpUploadProvider({
    origin: ORIGIN,
    token: TOKEN,
    runtimeProfile: "operational",
    fetchFn: async (url, init) => {
      calls.push({ path: new URL(url).pathname, init, body: JSON.parse(init.body) });
      return json(response());
    },
  });
  const list = await provider.listDocuments({
    principal: PRINCIPAL,
    lawos_matter_id: "matter-lawos-1",
    page: 1,
    page_size: 50,
  });
  const search = await provider.searchDocuments({
    principal: PRINCIPAL,
    query: "계약",
    lawos_matter_id: null,
    current_version_only: true,
    date_from: "2026-01-01",
    date_to: "2026-08-29",
    page: 1,
    page_size: 50,
  });

  assert.deepEqual(list.items, [ITEM]);
  assert.deepEqual(search.items, [ITEM]);
  assert.deepEqual(calls.map(({ path }) => path), [
    AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.documents,
    AMIC_VAULT_HTTP_UPLOAD_PROVIDER_PATHS.search,
  ]);
  for (const call of calls) {
    assert.equal(call.init.headers[AMIC_OS_VAULT_PROVIDER_TOKEN_HEADER], TOKEN);
    assert.equal(call.init.headers[AMIC_OS_VAULT_ACCOUNT_LEDGER_HEADER], PRINCIPAL.user_id);
    assert.equal(JSON.stringify(call.body).includes("content_base64"), false);
  }
});

test("HTTP read methods reject invalid request dates, all-version reads, extra response fields, and exact-version drift", async () => {
  const noFetch = createAmicVaultHttpUploadProvider({
    origin: ORIGIN,
    token: TOKEN,
    runtimeProfile: "operational",
    fetchFn: async () => { throw new Error("must not fetch"); },
  });
  const validSearch = {
    principal: PRINCIPAL,
    query: "",
    lawos_matter_id: null,
    current_version_only: true,
    date_from: null,
    date_to: null,
    page: 1,
    page_size: 50,
  };
  await assert.rejects(
    noFetch.searchDocuments({ ...validSearch, current_version_only: false }),
    (error) => error.safe_error_code === "VAULT_READ_PROVIDER_REQUEST_INVALID",
  );
  await assert.rejects(
    noFetch.searchDocuments({ ...validSearch, date_from: "2026-02-30" }),
    (error) => error.safe_error_code === "VAULT_READ_PROVIDER_REQUEST_INVALID",
  );

  for (const invalid of [
    { ...response(), secret_storage_uri: "s3://must-not-pass" },
    response([{ ...ITEM, version_id: "44444444-4444-4444-8444-444444444444" }]),
    response([{ ...ITEM, content_sha256: "b".repeat(64) }]),
  ]) {
    const provider = createAmicVaultHttpUploadProvider({
      origin: ORIGIN,
      token: TOKEN,
      runtimeProfile: "operational",
      fetchFn: async () => json(invalid),
    });
    await assert.rejects(
      provider.listDocuments({
        principal: PRINCIPAL,
        lawos_matter_id: null,
        page: 1,
        page_size: 50,
      }),
      (error) => error.safe_error_code === "VAULT_READ_PROVIDER_RESPONSE_INVALID",
    );
  }
});
