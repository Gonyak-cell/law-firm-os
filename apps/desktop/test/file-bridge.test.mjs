import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { FILE_BRIDGE_AUDIT_MAP, FILE_BRIDGE_CHANNELS } from "../src/main/fileBridge.js";

test("file bridge suite keeps contract actions and audit map aligned", async () => {
  const contract = JSON.parse(await readFile(new URL("../../../contracts/desktop-file-bridge-contract.json", import.meta.url), "utf8"));
  const allowedActionIds = contract.allowed_actions.map((action) => action.id).sort();

  assert.deepEqual(allowedActionIds, [
    "choose_file_for_upload",
    "clear_temp_cache",
    "open_temp_preview",
    "save_document_as"
  ]);
  assert.deepEqual(Object.keys(FILE_BRIDGE_CHANNELS).sort(), ["chooseFileForUpload", "saveDocumentAs"]);
  assert.equal(FILE_BRIDGE_AUDIT_MAP.choose_file_for_upload.direction, "upload");
  assert.equal(FILE_BRIDGE_AUDIT_MAP.save_document_as.label, "save-as");
  assert.equal(FILE_BRIDGE_AUDIT_MAP.open_temp_preview.direction, "download");
});

test("file bridge suite script includes happy denied no silent scan and cache wipe coverage", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const command = packageJson.scripts["test:file-bridge"];

  assert.match(command, /file-upload-bridge\.test\.mjs/);
  assert.match(command, /file-save-as\.test\.mjs/);
  assert.match(command, /temp-preview-cleanup\.test\.mjs/);
  assert.match(command, /validate-mater-desktop-file-bridge\.mjs/);
});
