#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  createJsonPostgresSourceReadPacket,
} from "../packages/persistence/src/postgres/source-read-contract.js";
import {
  validateJsonPostgresRecordAuthorityBinding,
} from "../packages/persistence/src/postgres/source-adjudication.js";
import {
  deriveJsonPostgresInventoryContentSha256,
} from "../packages/persistence/src/postgres/source-inventory.js";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function repeated(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
    values.push(value);
  }
  if (values.length === 0) throw new TypeError(`${name} is required`);
  return values;
}

function git(...args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("source-read packet generation requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const inventory = readPrivateProgramJson(option("--inventory"), "safe source inventory");
const recordAuthority = readPrivateProgramJson(
  option("--record-authority"),
  "record authority manifest",
);
validateJsonPostgresRecordAuthorityBinding(recordAuthority, { inventory });
const inventoryContentSha256 = deriveJsonPostgresInventoryContentSha256(inventory);
const created = createJsonPostgresSourceReadPacket({
  packetId: option("--packet-id"),
  sourceSha,
  sourceTree,
  inventoryContentSha256,
  recordAuthoritySha256: recordAuthority.authority_sha256,
  approvedRootRefs: repeated("--approved-root"),
});
const outputDir = createPrivateProgramOutputDirectory(option("--output-dir"));
const packet = writePrivateProgramJson(
  join(outputDir, "source-read-packet.json"),
  created.packet,
);
const summary = writePrivateProgramJson(
  join(outputDir, "source-read-packet-summary.json"),
  {
    schema_version: "law-firm-os.json-postgres-source-read-packet-summary.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    inventory_content_sha256: inventoryContentSha256,
    record_authority_sha256: recordAuthority.authority_sha256,
    inventory_delta_policy_sha256: created.packet.inventory_delta_policy_sha256,
    packet_sha256: created.packet_sha256,
    approved_root_refs: created.packet.approved_root_refs,
    current_state: "PENDING_HUMAN_APPROVAL",
    external_actions_authorized: false,
    real_data_read: false,
    source_mutated: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  packet_path: packet.path,
  packet_file_sha256: packet.sha256,
  packet_sha256: created.packet_sha256,
  inventory_delta_policy_sha256: created.packet.inventory_delta_policy_sha256,
  summary_path: summary.path,
  current_state: "PENDING_HUMAN_APPROVAL",
  external_actions_authorized: false,
}, null, 2)}\n`);
