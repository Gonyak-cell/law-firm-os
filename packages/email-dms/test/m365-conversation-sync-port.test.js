import assert from "node:assert/strict";
import test from "node:test";

import {
  M365_GRAPH_REQUIRED_SCOPES,
  createEmailDmsRepository,
  createM365ConversationSyncPort,
  createMicrosoftGraphConversationProvider,
  hashMailboxAddress,
  m365ConnectionId,
} from "../src/index.js";

const PRINCIPAL = Object.freeze({
  tenant_id: "tenant-outm26-port",
  user_id: "user-outm26-port",
  entra_subject_id: "entra-subject-outm26-port",
});
const CONNECTION_ID = m365ConnectionId(PRINCIPAL);
const CREDENTIAL_REF = "aws-secrets-manager:synthetic/outm26/credential";

function connection() {
  return {
    model_type: "M365Connection",
    m365_connection_id: CONNECTION_ID,
    ...PRINCIPAL,
    mailbox_address_hash: hashMailboxAddress("outm26@example.invalid"),
    credential_ref: CREDENTIAL_REF,
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: "2027-08-08T00:00:00.000Z",
    revoked_at: null,
    state_version: 1,
  };
}

function credential() {
  return {
    access_token: "synthetic-access-token-outm26",
    refresh_token: "synthetic-refresh-token-outm26",
    refresh_profile: "client",
    refresh_profile_proof: "p".repeat(43),
    expires_at: "2027-08-08T00:00:00.000Z",
    mailbox_address: "outm26@example.invalid",
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
  };
}

test("OUTM-26 credential port resolves Mail.Read server-side and exposes only the signed-in me mailbox", async () => {
  // Given
  const calls = [];
  const repository = createEmailDmsRepository({ seedRecords: [connection()] });
  const graphProvider = createMicrosoftGraphConversationProvider({
    microsoft_egress_transport: {
      async graphMessageSubscriptionList(input) {
        calls.push(input);
        return [];
      },
    },
  });
  const port = createM365ConversationSyncPort({
    repository,
    credential_vault: {
      async resolveDelegatedCredential({ credential_ref: ref }) {
        assert.equal(ref, CREDENTIAL_REF);
        return credential();
      },
    },
    conversation_provider: graphProvider,
    feature_enabled: true,
    provider_runtime_enabled: true,
    clock: () => new Date("2026-08-08T00:10:00.000Z"),
  });

  // When
  const listed = await port.listOwnMessageSubscriptions({
    ...PRINCIPAL,
    entra_tenant_id: PRINCIPAL.tenant_id,
  });

  // Then
  assert.deepEqual(listed, []);
  assert.deepEqual(calls, [{
    access_token: "synthetic-access-token-outm26",
    entra_tenant_id: PRINCIPAL.tenant_id,
    account_id: PRINCIPAL.entra_subject_id,
  }]);
  assert.equal(port.mailbox_scope, "me");
  assert.equal(port.shared_mailbox_enabled, false);
  await assert.rejects(
    port.listOwnMessageSubscriptions({
      ...PRINCIPAL,
      entra_tenant_id: PRINCIPAL.tenant_id,
      mailbox: "shared@example.invalid",
    }),
    (error) => error.safe_error_code === "M365_MAILBOX_OVERRIDE_BLOCKED",
  );
  assert.equal(calls.length, 1);
});
