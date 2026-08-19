import assert from "node:assert/strict";
import test from "node:test";
import * as terminal from "../src/json-postgres-outlook-authority-terminal.js";

test("terminal facade exports only the closed production surface", () => {
  assert.deepEqual(Object.keys(terminal).sort(), [
    "JSON_POSTGRES_OUTLOOK_AUTHORITY_REPLAY_RECEIPT_SCHEMA_VERSION",
    "JSON_POSTGRES_OUTLOOK_AUTHORITY_TERMINAL_SCHEMA_VERSION",
    "createJsonPostgresOutlookAuthorityPublicResult",
    "createJsonPostgresOutlookAuthorityReplayReceipt",
    "createJsonPostgresOutlookAuthorityTerminal",
    "jsonPostgresOutlookAuthorityTerminalSha256",
    "outlookAuthorityTerminalKey",
    "readJsonPostgresOutlookAuthorityTerminal",
    "writeJsonPostgresOutlookAuthorityTerminal",
  ]);
});
