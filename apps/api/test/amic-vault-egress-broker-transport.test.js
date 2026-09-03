import assert from "node:assert/strict";
import test from "node:test";

import {
  AMIC_VAULT_EGRESS_BROKER_CONTRACT_VERSION,
  AMIC_VAULT_EGRESS_BROKER_OPERATION,
  createAmicVaultEgressBrokerFetch,
} from "../src/amic-vault-egress-broker-transport.js";
import {
  MICROSOFT_EGRESS_BROKER_FUNCTION_NAME,
} from "../src/microsoft-egress-broker-transport.js";
import {
  createAmicVaultHttpUploadProvider,
} from "../src/amic-vault-http-upload-provider.js";
import {
  createHandler as createBrokerHandler,
} from "../../microsoft-egress-broker/index.mjs";

const TOKEN = "vault-provider-token-never-log-0123456789";

function brokerSuccess(result) {
  return {
    StatusCode: 200,
    Payload: Buffer.from(JSON.stringify({
      contract_version: AMIC_VAULT_EGRESS_BROKER_CONTRACT_VERSION,
      operation: AMIC_VAULT_EGRESS_BROKER_OPERATION,
      ok: true,
      status: 200,
      result,
    }), "utf8"),
  };
}

test("Vault egress fetch sends only the fixed path, bounded headers, and body through Lambda Invoke", async () => {
  const calls = [];
  const fetchFn = createAmicVaultEgressBrokerFetch({
    lambda_client: {
      async send(command) {
        assert.equal(command.constructor.name, "InvokeCommand");
        assert.equal(command.input.FunctionName, MICROSOFT_EGRESS_BROKER_FUNCTION_NAME);
        assert.equal(command.input.InvocationType, "RequestResponse");
        assert.equal(command.input.LogType, "None");
        const value = JSON.parse(Buffer.from(command.input.Payload).toString("utf8"));
        calls.push(value);
        return brokerSuccess({
          status: 201,
          headers: { "content-type": "application/json" },
          body_base64: Buffer.from(JSON.stringify({ ok: true }), "utf8").toString("base64"),
        });
      },
    },
  });

  const response = await fetchFn(
    "https://vault.example/v1/integrations/amic-os/vault/read/documents",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "accept-encoding": "identity",
        "content-type": "application/json",
        "x-amic-os-account-ledger-id": "user_amic_jwsuh",
        "x-amic-os-vault-provider-token": TOKEN,
        "x-not-forwarded": "blocked",
      },
      body: JSON.stringify({ page: 1 }),
    },
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    contract_version: AMIC_VAULT_EGRESS_BROKER_CONTRACT_VERSION,
    operation: AMIC_VAULT_EGRESS_BROKER_OPERATION,
    request: {
      pathname: "/v1/integrations/amic-os/vault/read/documents",
      headers: {
        accept: "application/json",
        "accept-encoding": "identity",
        "content-type": "application/json",
        "x-amic-os-account-ledger-id": "user_amic_jwsuh",
        "x-amic-os-vault-provider-token": TOKEN,
      },
      body_base64: Buffer.from(JSON.stringify({ page: 1 }), "utf8").toString("base64"),
    },
  });
});

test("Vault egress fetch rejects non-HTTPS and query-bearing targets before invoking Lambda", async () => {
  let invokeCount = 0;
  const fetchFn = createAmicVaultEgressBrokerFetch({
    lambda_client: {
      async send() {
        invokeCount += 1;
        return brokerSuccess({ status: 200, headers: {}, body_base64: "" });
      },
    },
  });
  const options = {
    method: "POST",
    headers: { "x-amic-os-vault-provider-token": TOKEN },
    body: "{}",
  };
  await assert.rejects(
    fetchFn("http://vault.example/v1/integrations/amic-os/vault/read/documents", options),
    { safe_error_code: "VAULT_EGRESS_REQUEST_INVALID" },
  );
  await assert.rejects(
    fetchFn("https://vault.example/v1/integrations/amic-os/vault/read/documents?next=1", options),
    { safe_error_code: "VAULT_EGRESS_REQUEST_INVALID" },
  );
  assert.equal(invokeCount, 0);
});

test("Vault egress fetch rejects malformed broker envelopes and unapproved response headers", async () => {
  const payloads = [
    Buffer.from("not-json"),
    brokerSuccess({
      status: 200,
      headers: { authorization: "never-forward" },
      body_base64: "",
    }).Payload,
  ];
  for (const payload of payloads) {
    const fetchFn = createAmicVaultEgressBrokerFetch({
      lambda_client: {
        async send() {
          return { StatusCode: 200, Payload: payload };
        },
      },
    });
    await assert.rejects(
      fetchFn("https://vault.example/v1/integrations/amic-os/vault/read/documents", {
        method: "POST",
        headers: { "x-amic-os-vault-provider-token": TOKEN },
        body: "{}",
      }),
      { safe_error_code: "VAULT_EGRESS_RESPONSE_INVALID" },
    );
  }
});

test("Hosted Vault read contract survives the real provider-to-broker-to-Lambda transport chain", async () => {
  const item = {
    document_id: "8e451714-0569-4db2-b2da-b58a26738f86",
    matter_id: "matter_rp05_amic_current_003",
    title: "AMIC OS Vault exact-version canary",
    current_version_id: "17765412-cb9a-40c8-b893-cefeb3b8c941",
    version_id: "17765412-cb9a-40c8-b893-cefeb3b8c941",
    current_file_object_id: "a52db6fd-2b26-4405-a145-272c5266f33b",
    file_object_id: "a52db6fd-2b26-4405-a145-272c5266f33b",
    latest_sha256: "f".repeat(64),
    content_sha256: "f".repeat(64),
    current_byte_size: 1_272,
    byte_size: 1_272,
    current_mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "AMIC-OS-Vault-canary.docx",
    indexed_at: null,
    match_fields: ["body_text"],
  };
  const hostedResponse = {
    authority_kind: "amic-vault-api",
    authority_ref: "amic-vault-api:single-install",
    provider_revision: "provider-revision-1",
    items: [item],
    page_info: {
      page: 1,
      page_size: 50,
      returned_count: 1,
      current_version_only: true,
      omitted_result_count: null,
    },
    count_leak_prevented: true,
    raw_bytes_included: false,
    storage_locator_returned: false,
  };
  const broker = createBrokerHandler({
    vault_origin: "https://vault.example",
    fetch_impl: async (url, init) => {
      assert.equal(
        url,
        "https://vault.example/v1/integrations/amic-os/vault/read/documents",
      );
      assert.equal(init.headers["x-amic-os-account-ledger-id"], "user_amic_jwsuh");
      return new Response(JSON.stringify(hostedResponse), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    },
  });
  const fetchFn = createAmicVaultEgressBrokerFetch({
    lambda_client: {
      async send(command) {
        const result = await broker(JSON.parse(
          Buffer.from(command.input.Payload).toString("utf8"),
        ));
        return {
          StatusCode: 200,
          Payload: Buffer.from(JSON.stringify(result), "utf8"),
        };
      },
    },
  });
  const provider = createAmicVaultHttpUploadProvider({
    origin: "https://vault.example",
    token: TOKEN,
    runtimeProfile: "operational",
    fetchFn,
  });

  const result = await provider.listDocuments({
    principal: {
      tenant_id: "tenant_amic_matter_vault",
      user_id: "user_amic_jwsuh",
    },
    lawos_matter_id: "matter_rp05_amic_current_003",
    page: 1,
    page_size: 50,
  });
  assert.deepEqual(result.items, [item]);
  assert.equal(result.authority_kind, "amic-vault-api");
  assert.equal(result.provider_revision, "provider-revision-1");
});
