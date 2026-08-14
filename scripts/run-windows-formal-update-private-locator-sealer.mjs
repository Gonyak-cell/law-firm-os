#!/usr/bin/env node
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import {
  WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF,
  authenticateWindowsUpdateCandidateArtifactDownload,
  createWindowsFormalUpdatePrivateLocatorAwsCliAdapter,
  sealWindowsFormalUpdatePrivateLocator,
  validateWindowsUpdateCandidateLocatorArtifactRefs,
  verifyWindowsUpdateCandidateArtifactDownload,
} from "./lib/windows-formal-update-private-locator-sealer.mjs";

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function env(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length < 1 || value.includes("\0")) {
    fail("WINDOWS_LOCATOR_SEAL_INPUT_REQUIRED", `${name} is required`);
  }
  return value;
}

function directChild(root, value, label) {
  const target = path.resolve(value);
  if (path.dirname(target) !== root) fail("WINDOWS_LOCATOR_SEAL_PATH_INVALID", `${label} must be a direct RUNNER_TEMP child`);
  return target;
}

function parsed(name) {
  try {
    return JSON.parse(env(name));
  } catch {
    fail("WINDOWS_LOCATOR_SEAL_JSON_INVALID", `${name} is not valid JSON`);
  }
}

function parsedFile(root, name) {
  const target = path.resolve(root, name);
  if (path.dirname(target) !== root) {
    fail("WINDOWS_LOCATOR_SEAL_PATH_INVALID", `${name} must be a direct metadata-root child`);
  }
  try {
    return JSON.parse(readFileSync(target, "utf8"));
  } catch {
    fail("WINDOWS_LOCATOR_SEAL_JSON_INVALID", `${name} is not valid JSON`);
  }
}

function cleanupEnvironment() {
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("AWS_") || name.startsWith("ACTIONS_ID_TOKEN_") || name.startsWith("MATTER_WINDOWS_UPDATE_")) {
      delete process.env[name];
    }
  }
}

async function main() {
  const mode = process.argv[2];
  if (!["--authenticate-downloads", "--preflight", "--seal", "--purge"].includes(mode) || process.argv.length !== 3) {
    fail("WINDOWS_LOCATOR_SEAL_MODE_INVALID", "exactly one locator sealer mode is required");
  }
  const runnerTemp = path.resolve(env("RUNNER_TEMP"));
  const privateRoot = directChild(runnerTemp, env("MATTER_WINDOWS_UPDATE_LOCATOR_PRIVATE_ROOT"), "locator private root");
  const outputDir = directChild(runnerTemp, env("MATTER_WINDOWS_UPDATE_LOCATOR_OUTPUT_DIR"), "locator output directory");
  const receiptPath = directChild(runnerTemp, env("MATTER_WINDOWS_UPDATE_LOCATOR_RECEIPT_PATH"), "locator seal receipt");
  const downloaded = {
    baseline: directChild(runnerTemp, env("MATTER_WINDOWS_UPDATE_BASELINE_LOCATOR_DIR"), "baseline locator directory"),
    target: directChild(runnerTemp, env("MATTER_WINDOWS_UPDATE_TARGET_LOCATOR_DIR"), "target locator directory"),
  };
  if (mode === "--purge") {
    for (const target of [privateRoot, outputDir, ...Object.values(downloaded)]) rmSync(target, { recursive: true, force: true });
    cleanupEnvironment();
    process.stdout.write('{"verdict":"PASS","private_residue_removed":true}\n');
    return;
  }
  const refs = validateWindowsUpdateCandidateLocatorArtifactRefs(parsed("MATTER_WINDOWS_UPDATE_CANDIDATE_REFS_JSON"));
  if (["--authenticate-downloads", "--preflight"].includes(mode)) {
    const metadataRoot = directChild(
      runnerTemp,
      env("MATTER_WINDOWS_UPDATE_CANDIDATE_METADATA_ROOT"),
      "candidate API metadata root",
    );
    const metadata = Object.fromEntries(["baseline", "target"].map((role) => [
      role,
      parsedFile(metadataRoot, `${role}-artifact.json`),
    ]));
    const runs = Object.fromEntries(["baseline", "target"].map((role) => [
      role,
      parsedFile(metadataRoot, `${role}-run.json`),
    ]));
    const jobs = Object.fromEntries(["baseline", "target"].map((role) => [
      role,
      parsedFile(metadataRoot, `${role}-jobs.json`),
    ]));
    const archives = {
      baseline: directChild(runnerTemp, env("MATTER_WINDOWS_UPDATE_BASELINE_LOCATOR_ARCHIVE"), "baseline raw locator archive"),
      target: directChild(runnerTemp, env("MATTER_WINDOWS_UPDATE_TARGET_LOCATOR_ARCHIVE"), "target raw locator archive"),
    };
    for (const role of ["baseline", "target"]) {
      const parameters = {
        ref: refs[role],
        run: runs[role],
        jobs: jobs[role],
        artifact: metadata[role],
        archivePath: archives[role],
      };
      if (mode === "--authenticate-downloads") authenticateWindowsUpdateCandidateArtifactDownload(parameters);
      else verifyWindowsUpdateCandidateArtifactDownload({ ...parameters, extractedDir: downloaded[role] });
    }
    process.stdout.write(`${JSON.stringify({ verdict: "PASS", phase: mode.slice(2), candidate_count: 2, oidc_used: false })}\n`);
    return;
  }
  const governanceRoot = path.resolve(env("MATTER_WINDOWS_UPDATE_GOVERNANCE_ROOT"));
  const result = await sealWindowsFormalUpdatePrivateLocator({
    refs,
    candidateArtifactDirs: downloaded,
    governanceRoot,
    privateRoot,
    outputDir,
    receiptPath,
    bindings: parsed("MATTER_WINDOWS_UPDATE_LOCATOR_STORAGE_BINDINGS_JSON"),
    producer: {
      repository: env("GITHUB_REPOSITORY"),
      workflow_ref: WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF,
      job: WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB,
      run_id: env("GITHUB_RUN_ID"),
      run_attempt: env("GITHUB_RUN_ATTEMPT"),
      source_sha: env("MATTER_WINDOWS_UPDATE_SEAL_SOURCE_SHA"),
      source_tree: env("MATTER_WINDOWS_UPDATE_SEAL_SOURCE_TREE"),
    },
    wrapping: parsed("MATTER_WINDOWS_UPDATE_LOCATOR_WRAPPING_BINDING_JSON"),
    aws: createWindowsFormalUpdatePrivateLocatorAwsCliAdapter(),
  });
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS",
    state: "SEALED",
    schema_version: WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA,
    producer_workflow_ref: WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF,
    producer_job: WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB,
    private_locator_sha256: result.private_locator_sha256,
    private_locator_bytes: result.private_locator_bytes,
    envelope_sha256: result.envelope_sha256,
    wrapping_public_key_sha256: result.envelope.wrapping_public_key_sha256,
    receipt_sha256: result.receipt_sha256,
    object_count: result.object_count,
    governance_upload_count: result.governance_upload_count,
    artifact_name: `windows-formal-update-private-locator-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,
    artifact_files: [
      WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES.aggregate_envelope,
      WINDOWS_UPDATE_PRIVATE_LOCATOR_FILES.aggregate_ciphertext,
    ],
    plaintext_locator_uploaded: false,
    governance_plaintext_uploaded_to_github: false,
  })}\n`);
}

try {
  await main();
} catch (error) {
  const code = /^[A-Z0-9._-]{1,96}$/u.test(error?.code ?? "") ? error.code : "WINDOWS_LOCATOR_SEAL_BLOCKED";
  process.stderr.write(`${JSON.stringify({ verdict: "FAIL", error_code: code })}\n`);
  process.exitCode = 1;
}
