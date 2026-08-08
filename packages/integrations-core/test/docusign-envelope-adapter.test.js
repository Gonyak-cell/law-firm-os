import assert from "node:assert/strict";
import test from "node:test";
import { createDocusignEnvelopeAdapter, DOCX_MIME_TYPE } from "../src/index.js";
import { CONNECTION, DOCX_BYTES, DOCX_SHA } from "./docusign-outbox-fixtures.js";

test("OUTM-33 official SDK adapter creates correlated status=created before send and supports lookup", async () => {
  const calls = [];
  class FakeApiClient {
    setBasePath(value) { calls.push(["base", value]); }
    requestJWTUserToken(...args) { calls.push(["jwt", args.slice(0, -1)]); args.at(-1)(null, { body: { access_token: "provider-access-token" } }); }
    addDefaultHeader(name, value) { calls.push(["header", name, value]); }
  }
  class FakeEnvelopesApi {
    createEnvelope(accountId, options, callback) { calls.push(["create", accountId, options]); callback(null, { envelopeId: "sdk-envelope-001" }); }
    update(accountId, envelopeId, options, callback) { calls.push(["update", accountId, envelopeId, options]); callback(null, { envelopeId }); }
    listStatusChanges(accountId, options, callback) { calls.push(["find", accountId, options]); callback(null, { envelopes: [{ envelopeId: "sdk-envelope-recovered", status: "created" }] }); }
  }
  const secrets = new Map([[CONNECTION.credential_refs.integration_key, "integration-key-value"], [CONNECTION.credential_refs.service_user_id, "service-user-value"], [CONNECTION.credential_refs.private_key, "private-key-value"]]);
  const adapter = createDocusignEnvelopeAdapter({ sdk: { ApiClient: FakeApiClient, EnvelopesApi: FakeEnvelopesApi }, resolveSecret: async ({ ref }) => secrets.get(ref) });
  const correlation = "docusign-correlation:adapter-test";
  const created = await adapter.createDraft({ connection: CONNECTION, document: { bytes: DOCX_BYTES, sha256: DOCX_SHA, filename: "agreement.docx", mime_type: DOCX_MIME_TYPE }, signers: [{ recipient_ref: "contact:1", role: "client", routing_order: 1, name: "Signer", email: "s@example.test" }], anchor_manifest: { anchors: [{ role: "client", anchor: "/sig-client/" }] }, provider_correlation_ref: correlation });
  await adapter.send({ connection: CONNECTION, envelope_id: created.envelope_id });
  const recovered = await adapter.findByCorrelation({ connection: CONNECTION, provider_correlation_ref: correlation });
  assert.equal(created.envelope_id, "sdk-envelope-001");
  assert.deepEqual(recovered, { envelope_id: "sdk-envelope-recovered", provider_correlation_ref: correlation, account_id: CONNECTION.account_id, status: "created" });
  const create = calls.find((call) => call[0] === "create");
  assert.equal(create[2].envelopeDefinition.status, "created");
  assert.deepEqual(create[2].envelopeDefinition.customFields.textCustomFields, [{ name: "AMIC_OS_PROVIDER_CORRELATION_REF", value: correlation, show: "false" }]);
  assert.equal(calls.find((call) => call[0] === "update")[3].envelope.status, "sent");
});
