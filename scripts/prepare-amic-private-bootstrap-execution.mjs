#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createAmicPrivateBootstrapExecutionPacket,
} from "./lib/amic-private-bootstrap-execution.mjs";
import {
  createAmicPrivateBootstrapPhotoStorageAdapterId,
  validateAmicPrivateBootstrapGitState,
  validateAmicPrivateBootstrapPacketInput,
} from "./lib/amic-private-bootstrap-production.mjs";
import {
  dryRunAmicPrivateBootstrapMigration,
} from "./lib/amic-private-bootstrap-migration.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const ALLOWED_OPTIONS = new Set([
  "root",
  "packet-input",
  "mapping",
  "output-dir",
  "registration-source",
  "roster-source",
  "contact-source",
  "photo-directory",
]);

function parse(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    const key = flag.slice(2);
    if (!ALLOWED_OPTIONS.has(key)) throw new TypeError(`unsupported option: ${flag}`);
    if (options[key] != null) throw new TypeError(`duplicate option: ${flag}`);
    options[key] = value;
  }
  return options;
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`--${name} is required`);
  return text;
}

function git(root, ...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

const options = parse(process.argv.slice(2));
const root = realpathSync(resolve(options.root ?? process.cwd()));
if (realpathSync(git(root, "rev-parse", "--show-toplevel")) !== root) {
  throw new Error("private bootstrap preparation must run at the repository root");
}
const input = validateAmicPrivateBootstrapPacketInput(readPrivateProgramJson(
  required(options["packet-input"], "packet-input"),
  "private bootstrap packet input",
  { worktree: root },
));
const sourceSha = git(root, "rev-parse", "HEAD");
const sourceTree = git(root, "rev-parse", "HEAD^{tree}");
validateAmicPrivateBootstrapGitState({
  status: git(root, "status", "--porcelain=v1", "--untracked-files=all"),
  sourceSha,
  sourceTree,
  originMain: input.environment === "lawos-production"
    ? git(root, "rev-parse", "origin/main")
    : null,
  environment: input.environment,
});
const sourceOptions = {
  root,
  mappingPath: required(options.mapping, "mapping"),
  registrationPath: options["registration-source"] ?? undefined,
  rosterPath: options["roster-source"] ?? undefined,
  contactPath: options["contact-source"] ?? null,
  photoDirectory: options["photo-directory"] ?? undefined,
};
const preflight = await dryRunAmicPrivateBootstrapMigration(sourceOptions);
const photoStorageAdapterId = createAmicPrivateBootstrapPhotoStorageAdapterId(
  input.production_target,
);
const packet = createAmicPrivateBootstrapExecutionPacket({
  packetId: input.packet_id,
  sourceSha,
  sourceTree,
  environment: input.environment,
  preflightReceipt: preflight,
  negativeTenantId: input.negative_tenant_id,
  photoStorageProvider: "s3",
  photoStorageAdapterId,
  productionTarget: input.production_target,
});
const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
  { worktree: root },
);
const preflightFile = writePrivateProgramJson(
  join(outputDir, "private-bootstrap-preflight.json"),
  preflight,
);
const packetFile = writePrivateProgramJson(
  join(outputDir, "private-bootstrap-execution-packet.json"),
  packet,
);
const summaryFile = writePrivateProgramJson(
  join(outputDir, "private-bootstrap-preparation-summary.json"),
  {
    schema_version:
      "law-firm-os.amic-private-bootstrap-preparation-summary.v1",
    packet_id: packet.packet_id,
    packet_sha256: packet.packet_sha256,
    packet_file_sha256: packetFile.sha256,
    preflight_file_sha256: preflightFile.sha256,
    source_sha: sourceSha,
    source_tree: sourceTree,
    environment: input.environment,
    counts: packet.counts,
    current_state: "PENDING_HUMAN_APPROVAL",
    external_actions_authorized: false,
    aws_contacted: false,
    postgres_write: false,
    object_storage_write: false,
    source_mutated: false,
    raw_identity_returned: false,
    raw_photo_returned: false,
    production_ready_claim: false,
  },
);

process.stdout.write(`${JSON.stringify({
  verdict: "PASS_LOCAL_PREPARATION",
  packet_id: packet.packet_id,
  packet_sha256: packet.packet_sha256,
  source_sha: sourceSha,
  source_tree: sourceTree,
  environment: input.environment,
  packet_path: packetFile.path,
  preflight_path: preflightFile.path,
  summary_path: summaryFile.path,
  current_state: "PENDING_HUMAN_APPROVAL",
  external_actions_authorized: false,
  aws_contacted: false,
}, null, 2)}\n`);
