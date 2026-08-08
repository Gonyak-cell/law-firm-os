import assert from "node:assert/strict";
import test from "node:test";

import { createMicrosoftGraphConversationProvider } from "../src/index.js";

const RESOURCE = "me/mailFolders('inbox')/messages";
const CREDENTIAL = Object.freeze({ access_token: "synthetic-access-token-outm26" });

test("OUTM-26..27 Graph conversation provider forwards only own-mailbox subscription and bounded delta contracts", async () => {
  // Given
  const calls = [];
  const provider = createMicrosoftGraphConversationProvider({
    microsoft_egress_transport: {
      async graphMessageSubscriptionCreate(input) { calls.push({ operation: "create", input }); return { provider_subscription_id: "provider-outm26" }; },
      async graphMessageDeltaList(input) { calls.push({ operation: "delta", input }); return { messages: [], delta_link: "next" }; },
    },
  });

  // When
  const created = await provider.createOwnMessageSubscription({
    mailbox_scope: "me",
    resource: RESOURCE,
    credential: CREDENTIAL,
    change_type: "created",
    client_state: "client-state-outm26",
    expiration_datetime: "2026-08-08T01:00:00.000Z",
    entra_tenant_id: "entra-tenant-outm26",
    entra_subject_id: "subject-outm26",
  });
  await provider.listOwnMessageDelta({ mailbox_scope: "me", resource: RESOURCE, credential: CREDENTIAL, delta_link: null, start_at: "2026-08-08T00:00:00.000Z" });

  // Then
  assert.deepEqual(calls, [
    { operation: "create", input: { access_token: CREDENTIAL.access_token, resource: RESOURCE, change_type: "created", client_state: "client-state-outm26", expiration_datetime: "2026-08-08T01:00:00.000Z" } },
    { operation: "delta", input: { access_token: CREDENTIAL.access_token, resource: RESOURCE, delta_link: null, start_at: "2026-08-08T00:00:00.000Z" } },
  ]);
  assert.equal(created.entra_tenant_id, "entra-tenant-outm26");
  assert.equal(created.account_id, "subject-outm26");
  await assert.rejects(
    provider.listOwnMessageDelta({ mailbox_scope: "shared", resource: RESOURCE, credential: CREDENTIAL, delta_link: null, start_at: "2026-08-08T00:00:00.000Z" }),
    /signed-in user's Inbox and Sent Items/u,
  );
  assert.equal(calls.length, 2);
});
