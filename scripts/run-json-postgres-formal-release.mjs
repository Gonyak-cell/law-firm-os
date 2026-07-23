#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  createJsonPostgresFormalReleaseBundle,
  createJsonPostgresFormalReleaseEvidence,
  jsonPostgresFormalReleaseSha256,
  validateJsonPostgresFormalReleaseBundle,
} from "./lib/json-postgres-formal-release.mjs";
import {
  jsonPostgresReleaseEvidenceSha256,
} from "./lib/json-postgres-release-program.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set(["prepare", "publish"]);
const INPUT_VERSION = "law-firm-os.json-postgres-formal-release-input.v1";
const REPOSITORY = "Gonyak-cell/law-firm-os";
const ARTIFACT_KINDS = new Set([
  "macos-dmg",
  "macos-zip",
  "windows-installer",
  "windows-blockmap",
]);
const SENSITIVE_VALUE =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{20,}\b/u;

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function required(value, name) {
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function command(file, args, options = {}) {
  return execFileSync(file, args, {
    cwd: process.cwd(),
    encoding: options.encoding ?? "utf8",
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
}

function exactRegularFile(path, label) {
  const absolute = resolve(required(path, label));
  if (lstatSync(absolute).isSymbolicLink()) throw new Error(`${label} must not be a symlink`);
  const canonical = realpathSync(absolute);
  if (!statSync(canonical).isFile()) throw new Error(`${label} must be a regular file`);
  return canonical;
}

function sanitizeDependencyTree(value = {}) {
  const dependencies = Object.fromEntries(
    Object.entries(value.dependencies ?? {})
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([name, dependency]) => [name, sanitizeDependencyTree({
        name,
        version: dependency.version,
        dependencies: dependency.dependencies,
      })]),
  );
  return {
    name: String(value.name ?? ""),
    version: String(value.version ?? ""),
    dependencies,
  };
}

function assertNoSensitiveMaterial(value, label) {
  if (SENSITIVE_VALUE.test(
    Buffer.isBuffer(value) ? value.toString("utf8") : String(value),
  )) {
    throw new Error(`${label} contains sensitive material`);
  }
}

function verifiedReceipt(path, kind, trustRegistry, packet) {
  const receipt = verifyJsonPostgresProgramReceipt({
    receipt: readPrivateProgramJson(path, `${kind} receipt`),
    signature: readPrivateProgramBytes(`${path}.sig`, `${kind} signature`),
    trustRegistry,
  });
  if (receipt.receipt_kind !== kind
    || receipt.execution_state !== "PASS"
    || receipt.source_sha !== packet.source_sha
    || receipt.source_tree !== packet.source_tree
    || receipt.packet_sha256 !== packet.packet_sha256) {
    throw new Error(`${kind} receipt exact binding drifted`);
  }
  return receipt;
}

function releaseArtifacts(input, packet) {
  if (input?.schema_version !== INPUT_VERSION
    || input.repository !== REPOSITORY
    || !Array.isArray(input.artifacts)
    || input.artifacts.length !== 4
    || input.artifacts.some((item) => !ARTIFACT_KINDS.has(item.kind))) {
    throw new Error("formal release input is invalid");
  }
  const artifacts = input.artifacts.map((item) => {
    const path = exactRegularFile(item.path, `${item.kind} artifact`);
    const bytes = readFileSync(path);
    return {
      kind: item.kind,
      name: basename(path),
      sha256: sha256ProgramBytes(bytes),
      byte_size: bytes.byteLength,
      source_sha: packet.source_sha,
      source_tree: packet.source_tree,
      ...(item.kind === "windows-blockmap"
        ? { bound_to_signed_artifact: item.bound_to_signed_artifact === true }
        : { native_signature_verified: item.native_signature_verified === true }),
      local_path: path,
    };
  });
  if (new Set(artifacts.map((item) => item.kind)).size !== 4
    || new Set(artifacts.map((item) => item.name)).size !== 4) {
    throw new Error("formal release artifact kinds or names are duplicated");
  }
  return artifacts;
}

function signingInventory(artifacts, platform) {
  return artifacts
    .filter((artifact) => platform === "macos"
      ? artifact.kind.startsWith("macos-")
      : artifact.kind === "windows-installer")
    .map((artifact) => ({
      name: artifact.name,
      sha256: artifact.sha256,
      byte_size: artifact.byte_size,
      source_sha: artifact.source_sha,
      source_tree: artifact.source_tree,
      platform,
      signed: true,
    }));
}

function releaseInput() {
  return readPrivateProgramJson(
    required(option("--release-input"), "--release-input"),
    "formal release input",
  );
}

const operation = required(option("--operation"), "--operation");
if (!OPERATIONS.has(operation)) throw new Error("unsupported formal release operation");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("formal release requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("formal release requires exact origin/main");
}
const packetSource = readPrivateProgramJson(
  required(option("--packet"), "--packet"),
  "W13/W14 execution packet",
);
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
const registryPath = required(option("--registry"), "--registry");
const registrySha256 = required(option("--registry-sha256"), "--registry-sha256");
const trustRegistry = readPrivateProgramJson(registryPath, "owner trust registry");
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: registrySha256,
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const cut012 = verifiedReceipt(
  required(option("--cut012-receipt"), "--cut012-receipt"),
  "cut-012",
  trustRegistry,
  packet,
);
const macos = verifiedReceipt(
  required(option("--macos-signing-receipt"), "--macos-signing-receipt"),
  "macos-signing",
  trustRegistry,
  packet,
);
const windows = verifiedReceipt(
  required(option("--windows-signing-receipt"), "--windows-signing-receipt"),
  "windows-signing",
  trustRegistry,
  packet,
);
const input = releaseInput();
const artifactsWithPath = releaseArtifacts(input, packet);
const artifacts = artifactsWithPath.map(({ local_path: ignored, ...item }) => item);
const tag = required(input.tag, "release input tag");

if (operation === "prepare") {
  const macosEvidence = readPrivateProgramJson(
    required(option("--macos-signing-evidence"), "--macos-signing-evidence"),
    "macOS signing evidence",
  );
  const windowsEvidence = readPrivateProgramJson(
    required(option("--windows-signing-evidence"), "--windows-signing-evidence"),
    "Windows signing evidence",
  );
  if (macosEvidence.artifact_inventory_sha256
      !== jsonPostgresFormalReleaseSha256(signingInventory(artifacts, "macos"))
    || windowsEvidence.artifact_inventory_sha256
      !== jsonPostgresFormalReleaseSha256(signingInventory(artifacts, "windows"))) {
    throw new Error("formal release artifact inventory drifted from native signing evidence");
  }
  const reproducibility = readPrivateProgramJson(
    required(option("--reproducibility"), "--reproducibility"),
    "artifact reproducibility evidence",
  );
  const security = readPrivateProgramJson(
    required(option("--security"), "--security"),
    "release security evidence",
  );
  const outputDir = createPrivateProgramOutputDirectory(
    required(option("--output-dir"), "--output-dir"),
  );
  const sbomBytes = command(
    "npm",
    ["sbom", "--all", "--sbom-format", "cyclonedx"],
    { encoding: null, maxBuffer: 128 * 1024 * 1024 },
  );
  const dependencyInventory = sanitizeDependencyTree(JSON.parse(command(
    "npm",
    ["ls", "--all", "--json"],
    { maxBuffer: 128 * 1024 * 1024 },
  )));
  assertNoSensitiveMaterial(sbomBytes, "SBOM");
  assertNoSensitiveMaterial(JSON.stringify(dependencyInventory), "dependency inventory");
  const sbomFile = writePrivateProgramBytes(join(outputDir, "sbom.cdx.json"), sbomBytes);
  const dependencyFile = writePrivateProgramJson(
    join(outputDir, "dependency-inventory.json"),
    dependencyInventory,
  );
  const provenance = {
    schema_version: "law-firm-os.json-postgres-release-provenance.v1",
    source: {
      repository: REPOSITORY,
      sha: sourceSha,
      tree: sourceTree,
      packet_sha256: packet.packet_sha256,
      production_artifact_sha256: packet.bindings.artifact_sha256,
    },
    builder: {
      node: process.version,
      npm: command("npm", ["--version"]).trim(),
      source_dirty: false,
    },
    subjects: artifacts.map(({ kind, name, sha256, byte_size }) => ({
      kind,
      name,
      sha256,
      byte_size,
    })),
    claims: {
      exact_main: true,
      generated_from_signed_artifacts: true,
      public_release_claim: false,
      go_live_claim: false,
    },
  };
  const provenanceFile = writePrivateProgramJson(
    join(outputDir, "provenance.json"),
    provenance,
  );
  const checksums = [
    ...artifacts.map((item) => `${item.sha256}  ${item.name}`),
    `${sbomFile.sha256}  ${basename(sbomFile.path)}`,
    `${dependencyFile.sha256}  ${basename(dependencyFile.path)}`,
    `${provenanceFile.sha256}  ${basename(provenanceFile.path)}`,
  ].sort().join("\n") + "\n";
  const checksumFile = writePrivateProgramBytes(
    join(outputDir, "checksums.sha256"),
    checksums,
  );
  const bundle = createJsonPostgresFormalReleaseBundle({
    packet,
    tag,
    artifacts,
    cut012Receipt: cut012,
    macosSigningReceipt: macos,
    windowsSigningReceipt: windows,
    reproducibility,
    security,
    sbomSha256: sbomFile.sha256,
    dependencyInventorySha256: dependencyFile.sha256,
    provenanceSha256: provenanceFile.sha256,
    checksumsSha256: checksumFile.sha256,
  });
  const bundleFile = writePrivateProgramJson(
    join(outputDir, "formal-release-bundle.json"),
    bundle,
  );
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    operation,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packet.packet_sha256,
    tag,
    bundle_path: bundleFile.path,
    bundle_sha256: bundle.bundle_sha256,
    sbom_path: sbomFile.path,
    dependency_inventory_path: dependencyFile.path,
    provenance_path: provenanceFile.path,
    checksums_path: checksumFile.path,
    tag_created: false,
    artifacts_published: false,
    release: false,
    go_live: false,
  }, null, 2)}\n`);
} else {
  const bundlePath = required(option("--bundle"), "--bundle");
  const bundle = readPrivateProgramJson(bundlePath, "formal release bundle");
  validateJsonPostgresFormalReleaseBundle(bundle, { packet });
  if (bundle.tag !== tag
    || JSON.stringify(bundle.artifacts) !== JSON.stringify(artifacts)) {
    throw new Error("formal release bundle artifacts drifted from publication input");
  }
  const supportFiles = [
    exactRegularFile(bundlePath, "formal release bundle"),
    exactRegularFile(required(option("--sbom"), "--sbom"), "SBOM"),
    exactRegularFile(
      required(option("--dependency-inventory"), "--dependency-inventory"),
      "dependency inventory",
    ),
    exactRegularFile(required(option("--provenance"), "--provenance"), "provenance"),
    exactRegularFile(required(option("--checksums"), "--checksums"), "checksums"),
  ];
  for (const [path, expected] of [
    [supportFiles[1], bundle.sbom_sha256],
    [supportFiles[2], bundle.dependency_inventory_sha256],
    [supportFiles[3], bundle.provenance_sha256],
    [supportFiles[4], bundle.checksums_sha256],
  ]) {
    if (sha256ProgramBytes(readFileSync(path)) !== expected) {
      throw new Error("formal release support artifact digest drifted");
    }
  }
  const localTag = spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}^{}`], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (localTag.status === 0 && localTag.stdout.trim() !== sourceSha) {
    throw new Error("local release tag points to a different source");
  }
  const remoteTag = spawnSync("git", [
    "ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}^{}`,
  ], { cwd: process.cwd(), encoding: "utf8" });
  if (remoteTag.status === 0
    && remoteTag.stdout.trim().split(/\s/u)[0] !== sourceSha) {
    throw new Error("remote release tag points to a different source");
  }
  const priorRelease = spawnSync("gh", [
    "release", "view", tag, "--repo", REPOSITORY, "--json", "tagName",
  ], { cwd: process.cwd(), encoding: "utf8" });
  if (priorRelease.status === 0) {
    throw new Error("formal release already exists; idempotent readback requires explicit recovery");
  }
  if (localTag.status !== 0) {
    command("git", ["tag", "-a", tag, sourceSha, "-m", `LawOS ${tag}`]);
  }
  if (remoteTag.status !== 0) {
    command("git", ["push", "origin", `refs/tags/${tag}`]);
  }
  const releaseNotes = exactRegularFile(
    required(option("--release-notes"), "--release-notes"),
    "release notes",
  );
  assertNoSensitiveMaterial(readFileSync(releaseNotes), "release notes");
  const publishFiles = [
    ...artifactsWithPath.map((item) => item.local_path),
    ...supportFiles,
  ];
  command("gh", [
    "release", "create", tag,
    "--repo", REPOSITORY,
    "--verify-tag",
    "--title", `LawOS ${tag}`,
    "--notes-file", releaseNotes,
    ...publishFiles,
  ], { maxBuffer: 128 * 1024 * 1024 });
  const published = JSON.parse(command("gh", [
    "release", "view", tag,
    "--repo", REPOSITORY,
    "--json", "tagName,isDraft,isPrerelease,assets",
  ]));
  const expectedNames = new Set(publishFiles.map(basename));
  const actualNames = new Set((published.assets ?? []).map((item) => item.name));
  if (published.tagName !== tag
    || published.isDraft !== false
    || published.isPrerelease !== false
    || expectedNames.size !== actualNames.size
    || [...expectedNames].some((name) => !actualNames.has(name))) {
    throw new Error("formal release publication readback is incomplete");
  }
  const publication = {
    schema_version: "law-firm-os.json-postgres-release-publication.v1",
    outcome: "PASS",
    tag,
    source_sha: sourceSha,
    source_tree: sourceTree,
    bundle_sha256: bundle.bundle_sha256,
    tag_created: true,
    artifacts_published: true,
    published_artifact_count: actualNames.size,
    publication_failure_count: 0,
  };
  const evidence = createJsonPostgresFormalReleaseEvidence({
    packet,
    bundle,
    publication,
  });
  if (evidence.result_sha256 !== jsonPostgresReleaseEvidenceSha256(evidence)) {
    throw new Error("formal release evidence digest drifted");
  }
  const outputDir = createPrivateProgramOutputDirectory(
    required(option("--output-dir"), "--output-dir"),
  );
  const publicationFile = writePrivateProgramJson(
    join(outputDir, "formal-release-publication.json"),
    publication,
  );
  const evidenceFile = writePrivateProgramJson(
    join(outputDir, "formal-release-evidence.json"),
    evidence,
  );
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    operation,
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packet.packet_sha256,
    tag,
    publication_path: publicationFile.path,
    evidence_path: evidenceFile.path,
    evidence_result_sha256: evidence.result_sha256,
    tag_created: true,
    artifacts_published: true,
    go_live: false,
  }, null, 2)}\n`);
}
