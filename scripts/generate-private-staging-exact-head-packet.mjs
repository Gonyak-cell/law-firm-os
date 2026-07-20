#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  buildPrivateStagingExactHeadPacket,
  privateStagingPacketSha256,
} from "./lib/private-staging-exact-head-authority.mjs";
import { canonicalSha256, validatePrivateStagingCost } from "./lib/private-staging-contract.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function outsideWorktreePath(candidate, { directory = false } = {}) {
  const root = realpathSync(process.cwd());
  const input = resolve(candidate);
  let parent = directory ? input : dirname(input);
  while (!existsSync(parent)) parent = dirname(parent);
  const normalized = resolve(realpathSync(parent), relative(parent, input));
  const rel = relative(root, normalized);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("exact-head packet artifacts must remain outside the worktree");
  if (existsSync(normalized) && lstatSync(normalized).isSymbolicLink()) throw new Error("symlink packet paths are forbidden");
  return normalized;
}

function privateRegularFile(candidate, name) {
  const path = outsideWorktreePath(candidate);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0) {
    throw new Error(`${name} must be an existing private 0600 regular file outside the worktree`);
  }
  return realpathSync(path);
}

const sourceSha = git("rev-parse", "HEAD^{commit}");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const baseMainSha = git("rev-parse", "origin/main^{commit}");
const baseMainTree = git("rev-parse", "origin/main^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("exact-head packet generation requires a clean committed worktree");

const artifactManifestPath = privateRegularFile(option("--artifact-manifest"), "artifact manifest");
const artifactManifestBytes = readFileSync(artifactManifestPath);
const artifactManifest = JSON.parse(artifactManifestBytes);
if (artifactManifest.source_sha !== sourceSha || artifactManifest.source_tree !== sourceTree) throw new Error("artifact manifest source SHA/tree drifted");
const artifactPath = privateRegularFile(artifactManifest.artifact_path, "artifact archive");
const artifactSha256 = sha256(readFileSync(artifactPath));
if (artifactSha256 !== artifactManifest.artifact_sha256) throw new Error("artifact archive digest drifted");
if (artifactManifest.artifact_s3_key !== `lawos-private-staging/${sourceSha}/${artifactSha256}.zip`) throw new Error("artifact S3 key drifted");
if (artifactManifest.data_scope !== "synthetic-only" || artifactManifest.real_identity_match_count !== 0 || artifactManifest.real_client_candidate_count !== 0) throw new Error("artifact manifest is not synthetic-only");

const infrastructureTemplate = JSON.parse(readFileSync("infra/lawos-private-staging/template.json", "utf8"));
const artifactStoreTemplate = JSON.parse(readFileSync("infra/lawos-private-staging/artifact-store-template.json", "utf8"));
const costModel = JSON.parse(readFileSync("infra/lawos-private-staging/cost-estimate.json", "utf8"));
const internalAuthContract = JSON.parse(readFileSync("infra/lawos-private-staging/internal-auth-contract.json", "utf8"));
const cost = validatePrivateStagingCost(costModel);
const generatedAt = new Date();
const expiresAt = new Date(generatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
const packet = buildPrivateStagingExactHeadPacket({
  packetId: option("--packet-id"),
  baseMainSha,
  baseMainTree,
  sourceSha,
  sourceTree,
  artifactSha256,
  artifactS3Key: artifactManifest.artifact_s3_key,
  artifactManifestSha256: sha256(artifactManifestBytes),
  syntheticIdentityManifestSha256: artifactManifest.synthetic_identity_manifest_sha256,
  monthlyEstimateKrw: cost.total_monthly_estimate_krw,
  monthlyEstimateUsd: cost.total_monthly_estimate_usd,
  generatedAt: generatedAt.toISOString(),
  expiresAt: expiresAt.toISOString(),
  digests: {
    infrastructure_template_sha256: canonicalSha256(infrastructureTemplate),
    artifact_store_template_sha256: canonicalSha256(artifactStoreTemplate),
    cost_model_sha256: canonicalSha256(costModel),
    internal_auth_contract_sha256: canonicalSha256(internalAuthContract),
    deployment_manifest_sha256: canonicalSha256(artifactManifest),
  },
});

const outputDir = outsideWorktreePath(option("--output-dir"), { directory: true });
mkdirSync(outputDir, { recursive: true, mode: 0o700 });
chmodSync(outputDir, 0o700);
const packetPath = resolve(outputDir, `${packet.packet_id}.json`);
const digestPath = `${packetPath}.sha256`;
if (existsSync(packetPath) || existsSync(digestPath)) throw new Error("exact-head packet output already exists");
const bytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
writeFileSync(packetPath, bytes, { flag: "wx", mode: 0o600 });
writeFileSync(digestPath, `${privateStagingPacketSha256(packet)}  ${basename(packetPath)}\n`, { flag: "wx", mode: 0o600 });
chmodSync(packetPath, 0o600);
chmodSync(digestPath, 0o600);

process.stdout.write(`${JSON.stringify({
  verdict: "APPROVAL_REQUIRED",
  packet_path: packetPath,
  packet_sha256: privateStagingPacketSha256(packet),
  source_sha: sourceSha,
  source_tree: sourceTree,
  artifact_sha256: artifactSha256,
  data_scope: "synthetic-only",
  contact_scope: "synthetic-mailbox-only",
  aws_mutation_count: 0,
  push_executed: false,
}, null, 2)}\n`);
