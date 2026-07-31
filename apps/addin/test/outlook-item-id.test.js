import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_ITEM_ID_ERROR_CODES,
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
