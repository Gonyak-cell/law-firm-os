import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_ITEM_ID_ERROR_CODES,
  applyOutlookCanonicalMessageIdentity,
  createOutlookCanonicalMessageIdentityRequest,
  resolveCurrentOutlookRestMessageId,
} from "../src/outlook-item-id.js";

test("CL-P3-W01-T02 Office.js read item ID를 REST v2.0 ID로 변환하고 EWS ID는 반환하지 않는다", () => {
  const calls = [];
  const Office = {
    MailboxEnums: {
      RestVersion: {
        v2_0: "v2.0",
      },
    },
    context: {
      mailbox: {
        item: {
          itemId: "ews-item-id-must-not-return",
        },
        convertToRestId(itemId, version) {
          calls.push({ itemId, version });
          return "rest-v2-message-id";
        },
      },
    },
  };
  const result = resolveCurrentOutlookRestMessageId({ Office });
  assert.deepEqual(calls, [{
    itemId: "ews-item-id-must-not-return",
    version: "v2.0",
  }]);
  assert.equal(result.rest_message_id, "rest-v2-message-id");
  assert.equal(result.source_id_type, "restId");
  assert.equal(result.raw_office_item_id_returned, false);
  assert.equal(
    JSON.stringify(result).includes("ews-item-id-must-not-return"),
    false,
  );
});

test("provider canonical identity는 exact REST/internet/conversation tuple에만 결합한다", () => {
  const item = Object.freeze({
    rest_message_id: "rest-v2-message-id",
    graph_message_id: "rest-v2-message-id",
    internet_message_id: "<message@example.invalid>",
    conversation_id: "conversation-001",
  });
  const request = createOutlookCanonicalMessageIdentityRequest({
    item,
    matterId: "matter-001",
  });
  assert.deepEqual(request, {
    path: "/api/outlook/messages/identity",
    method: "POST",
    body: {
      matter_id: "matter-001",
      rest_message_id: "rest-v2-message-id",
      internet_message_id: "<message@example.invalid>",
      conversation_id: "conversation-001",
    },
  });

  const resolved = applyOutlookCanonicalMessageIdentity({
    item,
    response: {
      item: {
        rest_message_id: "rest-v2-message-id",
        internet_message_id: "<message@example.invalid>",
        conversation_id: "conversation-001",
        canonical_graph_message_id: "immutable-message-001",
      },
    },
  });
  assert.equal(resolved.canonical_graph_message_id, "immutable-message-001");
  assert.equal(Object.isFrozen(resolved), true);
  assert.throws(
    () => applyOutlookCanonicalMessageIdentity({
      item,
      response: {
        item: {
          ...resolved,
          conversation_id: "conversation-other",
        },
      },
    }),
    /canonical Outlook identity does not match/u,
  );
  assert.throws(
    () => applyOutlookCanonicalMessageIdentity({ item, response: { item: {} } }),
    /canonical_graph_message_id is required/u,
  );
});

test("CL-P3-W01-T02 read item 또는 변환 API가 없으면 raw item ID를 대체값으로 쓰지 않는다", () => {
  assert.throws(
    () => resolveCurrentOutlookRestMessageId({
      Office: { context: { mailbox: { item: {} } } },
    }),
    (error) => (
      error.safe_error_code
      === OUTLOOK_ITEM_ID_ERROR_CODES.read_item_required
    ),
  );
  assert.throws(
    () => resolveCurrentOutlookRestMessageId({
      Office: {
        context: {
          mailbox: {
            item: { itemId: "ews-no-converter" },
          },
        },
      },
    }),
    (error) => (
      error.safe_error_code
      === OUTLOOK_ITEM_ID_ERROR_CODES.conversion_unavailable
    ),
  );
});
