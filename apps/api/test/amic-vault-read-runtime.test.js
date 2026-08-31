import assert from "node:assert/strict";
import test from "node:test";

import { handleAmicVaultProviderRead } from "../src/amic-vault-read-runtime.js";

const TENANT_ID = "tenant_amic_matter_vault";
const PRINCIPAL = Object.freeze({
  tenant_id: TENANT_ID,
  user_id: "user_amic_jwsuh",
  scopes: Object.freeze(["matter.read", "vault.read"]),
});
const EXACT = Object.freeze({
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

function providerResult(items = [EXACT]) {
  return Object.freeze({
    authority_kind: "amic-vault-api",
    authority_ref: "amic-vault-api:single-install",
    provider_revision: "single-install-upload-v1",
    items: Object.freeze(items),
    page_info: Object.freeze({
      page: 1,
      page_size: 50,
      returned_count: items.length,
      current_version_only: true,
      omitted_result_count: null,
    }),
    count_leak_prevented: true,
    raw_bytes_included: false,
    storage_locator_returned: false,
  });
}

function harness({ readAllowed = true } = {}) {
  const calls = [];
  return {
    calls,
    provider: Object.freeze({
      async resolveCapabilities(input) {
        calls.push(["capabilities", input]);
        return {
          authoritative: true,
          provider_state: "ready",
          tenant_binding_state: "bound",
          user_binding_state: "bound",
          authority_ref: "amic-vault-api:single-install",
          capabilities: { read: readAllowed },
        };
      },
      async listDocuments(input) {
        calls.push(["list", input]);
        return providerResult();
      },
      async searchDocuments(input) {
        calls.push(["search", input]);
        return providerResult([{ ...EXACT, match_fields: Object.freeze(["body_text"]) }]);
      },
    }),
  };
}

test("provider-backed document browse uses the Vault authority and never a local DMS repository", async () => {
  const { calls, provider } = harness();
  const result = await handleAmicVaultProviderRead({
    pathname: "/api/vault/documents",
    query: {
      tenant_id: TENANT_ID,
      matter_id: "matter-lawos-1",
      permission_ref: "legacy-ignored",
      audit_hint_ref: "audit-read-1",
    },
    principal: PRINCIPAL,
    requestId: "request-read-1",
    provider,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.local_dms_read_used, false);
  assert.equal(result.body.provider_authority.authority_ref, "amic-vault-api:single-install");
  assert.deepEqual(result.body.items, [EXACT]);
  assert.deepEqual(calls.map(([kind]) => kind), ["capabilities", "list"]);
  assert.deepEqual(calls[1][1], {
    principal: { tenant_id: TENANT_ID, user_id: PRINCIPAL.user_id },
    lawos_matter_id: "matter-lawos-1",
    page: 1,
    page_size: 50,
  });
  assert.equal(JSON.stringify(result.body.items).includes("storage_uri"), false);
  assert.equal(JSON.stringify(result.body.items).includes("content_base64"), false);
});

test("provider-backed search preserves current-version and date bounds, including empty browse search", async () => {
  const { calls, provider } = harness();
  const result = await handleAmicVaultProviderRead({
    pathname: "/api/vault/search",
    query: {
      tenant_id: TENANT_ID,
      q: "  계약 해지  ",
      current_version: "current",
      date_from: "2026-01-01",
      date_to: "2026-08-29",
      page: "1",
      page_size: "50",
      audit_hint_ref: "audit-search-1",
    },
    principal: PRINCIPAL,
    requestId: "request-search-1",
    provider,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.page_info.search_backend, "amic-vault-authoritative");
  assert.equal(result.body.page_info.body_text_indexed, true);
  assert.deepEqual(calls[1], ["search", {
    principal: { tenant_id: TENANT_ID, user_id: PRINCIPAL.user_id },
    lawos_matter_id: null,
    page: 1,
    page_size: 50,
    query: "계약 해지",
    current_version_only: true,
    date_from: "2026-01-01",
    date_to: "2026-08-29",
  }]);

  const empty = harness();
  const emptyResult = await handleAmicVaultProviderRead({
    pathname: "/api/vault/search",
    query: { tenant_id: TENANT_ID, current_version: "current" },
    principal: PRINCIPAL,
    requestId: "request-search-empty",
    provider: empty.provider,
  });
  assert.equal(emptyResult.status, 200);
  assert.equal(empty.calls[1][1].query, "");
});

test("scope, account binding, capability, and input failures stop before authoritative read", async () => {
  for (const scenario of [
    {
      principal: { ...PRINCIPAL, scopes: [] },
      query: { tenant_id: TENANT_ID },
      code: "VAULT_SCOPE_NOT_GRANTED",
      expectedCalls: 0,
    },
    {
      principal: PRINCIPAL,
      query: { tenant_id: TENANT_ID, date_from: "2026-02-30" },
      code: "VAULT_READ_REQUEST_INVALID",
      expectedCalls: 0,
      pathname: "/api/vault/search",
    },
  ]) {
    const current = harness();
    const result = await handleAmicVaultProviderRead({
      pathname: scenario.pathname ?? "/api/vault/documents",
      query: scenario.query,
      principal: scenario.principal,
      requestId: "request-denied",
      provider: current.provider,
    });
    assert.equal(result.status, scenario.code === "VAULT_READ_REQUEST_INVALID" ? 400 : 403);
    assert.deepEqual(result.body.safe_error_codes, [scenario.code]);
    assert.equal(current.calls.length, scenario.expectedCalls);
  }

  const denied = harness({ readAllowed: false });
  const result = await handleAmicVaultProviderRead({
    pathname: "/api/vault/documents",
    query: { tenant_id: TENANT_ID },
    principal: PRINCIPAL,
    requestId: "request-capability-denied",
    provider: denied.provider,
  });
  assert.equal(result.status, 403);
  assert.deepEqual(result.body.safe_error_codes, ["VAULT_CAPABILITY_NOT_GRANTED"]);
  assert.deepEqual(denied.calls.map(([kind]) => kind), ["capabilities"]);
});

test("the caller tenant hint is non-authoritative and Vault receives only the signed session binding", async () => {
  const current = harness();
  const result = await handleAmicVaultProviderRead({
    pathname: "/api/vault/documents",
    query: { tenant_id: "attacker-selected-tenant" },
    principal: PRINCIPAL,
    requestId: "request-tenant-hint",
    provider: current.provider,
  });
  assert.equal(result.status, 200);
  assert.deepEqual(current.calls[1][1].principal, {
    tenant_id: TENANT_ID,
    user_id: PRINCIPAL.user_id,
  });
});

test("provider transport and strict-response failures map to bounded read errors", async () => {
  const current = harness();
  const provider = {
    ...current.provider,
    async listDocuments() {
      throw Object.assign(new Error("invalid"), {
        status: 502,
        safe_error_code: "VAULT_READ_PROVIDER_RESPONSE_INVALID",
      });
    },
  };
  const result = await handleAmicVaultProviderRead({
    pathname: "/api/vault/documents",
    query: { tenant_id: TENANT_ID },
    principal: PRINCIPAL,
    requestId: "request-invalid-provider",
    provider,
  });
  assert.equal(result.status, 502);
  assert.deepEqual(result.body.safe_error_codes, ["VAULT_READ_PROVIDER_RESPONSE_INVALID"]);
});
