import { createHash } from "node:crypto";
import { rmSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  buildFormalDeployedApiChainSuccessOutput,
  FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA,
  FormalDeployedApiQaError,
  canonicalReceiptBytes,
  readFormalDeployedApiCredentialFile,
  readFormalDeployedApiPackageQaReceipt,
} from "../lib/formal-deployed-api-package-qa.mjs";
import { validateFormalDeployedApiStaticAuthority } from "../lib/formal-deployed-api-authority.mjs";
import { mintFormalDeployedApiCredentialAccountCapability } from "../lib/formal-deployed-api-inputs.mjs";
import { consumeFormalDeployedApiLauncherCapability } from "../lib/formal-deployed-api-launcher.mjs";
import { createFormalDeployedApiStaticBundle, prepareFormalArtifactExecution } from "../lib/formal-deployed-api-package-runtime.mjs";
import { runFormalDeployedApiRestartQaFromCanonicalChain } from "../lib/formal-deployed-api-restart-contract.mjs";
import { runFormalDeployedApiScenario } from "../lib/formal-deployed-api-scenario.mjs";
import { validateFormalDeployedApiRawTranscript } from "../lib/formal-deployed-api-transcript.mjs";
import { fail, sha256Bytes, sidecarRef, writePrivateFile } from "../lib/formal-deployed-api-io.mjs";
import { readFormalPackageLoopbackLivePrivacyValidations, readFormalPackageLoopbackNativeQaReceipt, validateFormalPackageLoopbackNativeQaCapability } from "../lib/formal-package-loopback-qa.mjs";
import { buildDesktopArtifactPrivacyCorpus, desktopArtifactPrivacyCorpusSha256 } from "../lib/matter-desktop-artifact-privacy.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const SHA1 = /^[0-9a-f]{40}$/u;
const nativePlatform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : null;
let launcherAuthority;

try {
  launcherAuthority = consumeFormalDeployedApiLauncherCapability({ platform: nativePlatform });
} catch {
  process.stderr.write(`${JSON.stringify({ verdict: "BLOCKED_BY_AUTHORITY", error_code: "FORMAL_DEPLOYED_API_QA_LAUNCHER_REQUIRED", actual_deployment_pass: false, production_contact_count: 0 })}\n`);
  process.exit(2);
}

function parseOptions(argv) {
  const values = {};
  const allowed = new Map([["--platform", "platform"], ["--credential-file", "credentialFile"], ["--receipt", "receiptPath"]]);
  for (let index = 0; index < argv.length; index += 1) {
    const key = allowed.get(argv[index]);
    if (!key || !argv[index + 1] || argv[index + 1].startsWith("--")) fail("FORMAL_DEPLOYED_API_QA_ARGUMENT", `invalid argument ${argv[index]}`);
    values[key] = argv[++index];
  }
  if (!values.platform || !values.credentialFile || !values.receiptPath) fail("FORMAL_DEPLOYED_API_QA_ARGUMENT", "platform, credential file, and receipt are required");
  if (!["macos", "windows"].includes(values.platform)) fail("FORMAL_DEPLOYED_API_QA_PLATFORM", "platform must be macos or windows");
  return values;
}

function json(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", `${label} is not valid JSON`);
  }
}

function exactReceiptSetSha256(execution) {
  const hash = createHash("sha256");
  execution.forEach((entry) => hash.update(entry.receipt.value).update(entry.signature.value));
  return hash.digest("hex");
}

function authorityRefs(bundle, execution, transcriptRef) {
  return {
    trust_registry: bundle.refs.trust_registry,
    exact_head_packet: bundle.refs.exact_head_packet,
    approval: bundle.refs.approval,
    synthetic_identity_manifest: bundle.refs.synthetic_identity_manifest,
    execution_receipts: bundle.refs.execution_receipts,
    package: {
      ...bundle.refs.package,
      executed_package: execution.executable.ref,
      embedded_manifest: execution.embeddedManifest.ref,
    },
    raw_transcript: transcriptRef,
  };
}

async function readNativePackageCapability({ bundle, artifactExecution, launcherCapability, platform, sourceSha, sourceTree, refs }) {
  const corpus = await buildDesktopArtifactPrivacyCorpus({ repoRoot: ROOT, env: process.env });
  const privacyCorpusSha256 = desktopArtifactPrivacyCorpusSha256(corpus);
  let privacyArtifactRoot = null;
  if (platform === "macos") {
    const candidate = resolve(bundle.packageQaAuthority.evidenceRoot, "rfd-tuw-014-privacy");
    const portable = relative(ROOT, candidate);
    if (portable === ".." || portable.startsWith(`..${sep}`) || isAbsolute(portable)) {
      fail("FORMAL_DEPLOYED_API_QA_PACKAGE_CAPABILITY", "formal package privacy root escaped the repository");
    }
    privacyArtifactRoot = portable.split(sep).join("/");
  }
  const privacyValidations = await readFormalPackageLoopbackLivePrivacyValidations(bundle.packageQaAuthority.receiptPath, {
    launcherCapability,
    repositoryRoot: ROOT,
    evidenceRoot: bundle.packageQaAuthority.evidenceRoot,
    expectedPlatform: platform,
    expectedPrivacyArtifactRoot: privacyArtifactRoot,
    corpus,
    executedRootPath: artifactExecution.executedRootPath,
  });
  const capability = readFormalPackageLoopbackNativeQaReceipt(bundle.packageQaAuthority.receiptPath, {
    launcherCapability,
    repositoryRoot: ROOT,
    evidenceRoot: bundle.packageQaAuthority.evidenceRoot,
    executedPackagePath: artifactExecution.executablePath,
    expectedPlatform: platform,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    expectedArtifactSha256: refs.package.artifact.sha256,
    expectedExecutedPackageSha256: refs.package.executed_package.sha256,
    expectedManifestSha256: refs.package.manifest.sha256,
    expectedPrivacyArtifactRoot: privacyArtifactRoot,
    expectedPrivacyCorpusSha256: privacyCorpusSha256,
    privacyValidations,
  });
  try {
    return validateFormalPackageLoopbackNativeQaCapability(capability, {
      platform,
      source_sha: sourceSha,
      source_tree: sourceTree,
      artifact_sha256: refs.package.artifact.sha256,
      executed_package_sha256: refs.package.executed_package.sha256,
      manifest_sha256: refs.package.manifest.sha256,
      privacy_corpus_sha256: privacyCorpusSha256,
      verdict: "PASS",
      native_verdict: "PASS",
      authoritative: true,
      receipt_sha256: refs.package.qa_receipt.sha256,
      transcript_sha256: refs.package.qa_transcript.sha256,
    });
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_PACKAGE_CAPABILITY", "formal package QA was not authorized by the live native reader");
  }
}

function receiptSkeleton({ platform, sourceSha, sourceTree, apiArtifactSha256, endpoint, refs, executablePathSha256, exactHeadReceiptSetSha256, transcriptRef, observations = {}, verdict = "PASS" }) {
  return {
    schema_version: FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA,
    generated_at: new Date().toISOString(),
    verdict,
    code_readiness: { status: "PASS" },
    source: { expected_revision: sourceSha, source_tree: sourceTree, api_source_revision: sourceSha, api_artifact_sha256: apiArtifactSha256 },
    package: {
      platform,
      artifact_sha256: refs.package.artifact.sha256,
      artifact_bytes: refs.package.artifact.bytes,
      manifest_sha256: refs.package.manifest.sha256,
      manifest_bytes: refs.package.manifest.bytes,
      executed_package_sha256: refs.package.executed_package.sha256,
      executed_package_bytes: refs.package.executed_package.bytes,
      executable_path_sha256: executablePathSha256,
      package_qa_receipt_sha256: refs.package.qa_receipt.sha256,
      package_qa_receipt_bytes: refs.package.qa_receipt.bytes,
      package_qa_transcript_sha256: refs.package.qa_transcript.sha256,
      package_qa_transcript_bytes: refs.package.qa_transcript.bytes,
    },
    deployment: {
      status: "PASS",
      executed: true,
      environment: endpoint.environment,
      account_id: endpoint.account_id,
      region: endpoint.region,
      api_id: endpoint.api_id,
      api_endpoint_sha256: endpoint.endpoint_sha256,
      exact_head_receipt_set_sha256: exactHeadReceiptSetSha256,
      production_contact_count: observations.production_contact_count ?? 0,
    },
    execution: { classification: "ACTUAL_PRIVATE_STAGING", transcript_sha256: transcriptRef.sha256, transcript_bytes: transcriptRef.bytes },
    observations,
    authority: refs,
    boundaries: { actual_deployment_pass: true, credential_material_returned: false, password_confirm_count: 0, password_reset_count: 0, production_contact_count: observations.production_contact_count ?? 0, production_write_count: 0, real_data_contact_count: 0, release_executed: false, staging_synthetic_mutation_count: 4 },
    blockers: [],
  };
}

async function runFormalDeployedApiPackageQa() {
  const options = parseOptions(process.argv.slice(2));
  if (options.platform !== nativePlatform) fail("FORMAL_DEPLOYED_API_QA_PLATFORM", "platform must match the sanitized OS launcher");
  const sourceSha = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA;
  if (!SHA1.test(sourceSha ?? "")) fail("FORMAL_DEPLOYED_API_QA_SOURCE", "MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full lowercase Git SHA");
  const credential = readFormalDeployedApiCredentialFile(options.credentialFile, { rootDir: ROOT });
  if (process.env.MATTER_DESKTOP_RUNTIME_BASE_URL !== credential.endpoint.api_base_url) {
    fail("FORMAL_DEPLOYED_API_QA_ENDPOINT", "runtime endpoint must exactly match the credential endpoint");
  }
  const bundle = createFormalDeployedApiStaticBundle({ credential, receiptPath: options.receiptPath, rootDir: ROOT, platform: options.platform });
  const packet = json(bundle.raw.packet.value, "exact-head packet");
  const exactHeadReceiptSetSha256 = exactReceiptSetSha256(bundle.raw.execution);
  let artifactExecution;
  try {
    artifactExecution = prepareFormalArtifactExecution({ platform: options.platform, artifactPath: bundle.raw.artifact.path, bundleDir: bundle.bundleDir, rootDir: ROOT });
    const executablePathSha256 = sha256Bytes(artifactExecution.executablePath);
    const placeholderTranscript = { name: "rfd015-raw-transcript.json", sha256: "0".repeat(64), bytes: 1 };
    const provisionalRefs = authorityRefs(bundle, artifactExecution, placeholderTranscript);
    const provisional = receiptSkeleton({ platform: options.platform, sourceSha, sourceTree: packet.source_tree, apiArtifactSha256: packet.artifact_sha256, endpoint: credential.endpoint, refs: provisionalRefs, executablePathSha256, exactHeadReceiptSetSha256, transcriptRef: placeholderTranscript });
    const packageQaCapability = await readNativePackageCapability({ bundle, artifactExecution, launcherCapability: launcherAuthority.nativeCapability, platform: options.platform, sourceSha, sourceTree: packet.source_tree, refs: provisionalRefs });
    const staticAuthority = validateFormalDeployedApiStaticAuthority(provisional, bundle.bundleDir, { rootDir: ROOT, packageQaCapability });
    if (credential.account.tenant_id !== staticAuthority.tenantId) {
      fail("FORMAL_DEPLOYED_API_QA_CREDENTIAL", "signed account tenant must match the exact-head synthetic identity manifest");
    }
    const credentialAccountCapability = mintFormalDeployedApiCredentialAccountCapability(credential, {
      tenantId: staticAuthority.tenantId,
      otherTenantId: credential.account.other_tenant_id,
      matterId: credential.account.matter_id,
    });
    const transcript = await runFormalDeployedApiScenario({
      platform: options.platform,
      endpoint: credential.endpoint.api_base_url,
      account: credential.account,
      sourceSha,
      artifactSha256: provisional.package.artifact_sha256,
      manifestSha256: provisional.package.manifest_sha256,
      executableSha256: provisional.package.executed_package_sha256,
      executablePath: artifactExecution.executablePath,
      expectedUsers: staticAuthority.expectedUsers,
    });
    const observations = validateFormalDeployedApiRawTranscript(transcript, {
      platform: options.platform,
      sourceSha,
      endpointSha256: credential.endpoint.endpoint_sha256,
      artifactSha256: provisional.package.artifact_sha256,
      manifestSha256: provisional.package.manifest_sha256,
      executedPackageSha256: provisional.package.executed_package_sha256,
      executablePathSha256,
      expectedUsers: staticAuthority.expectedUsers,
      expectedTenantId: staticAuthority.tenantId,
    });
    const transcriptBytes = canonicalReceiptBytes(transcript);
    const transcriptRef = sidecarRef("rfd015-raw-transcript.json", transcriptBytes);
    writePrivateFile(resolve(bundle.bundleDir, transcriptRef.name), transcriptBytes, ROOT);
    const refs = authorityRefs(bundle, artifactExecution, transcriptRef);
    const receipt = receiptSkeleton({ platform: options.platform, sourceSha, sourceTree: packet.source_tree, apiArtifactSha256: packet.artifact_sha256, endpoint: credential.endpoint, refs, executablePathSha256, exactHeadReceiptSetSha256, transcriptRef, observations });
    writePrivateFile(bundle.target, canonicalReceiptBytes(receipt), ROOT);
    const loaded = readFormalDeployedApiPackageQaReceipt(bundle.target, { rootDir: ROOT, packageQaCapability });
    const restart = await runFormalDeployedApiRestartQaFromCanonicalChain({
      rfd015ReceiptPath: bundle.target,
      rfd015Receipt: loaded.receipt,
      rfd015Capability: loaded.capability,
      packageQaCapability,
      launcherCapability: launcherAuthority.nativeCapability,
      credentialAccountCapability,
      rootDir: ROOT,
    });
    if (restart.receipt.verdict !== "PASS" || !restart.capability) {
      fail(restart.receipt.blocked_code ?? "FORMAL_DEPLOYED_API_QA_RESTART_CHAIN", "canonical deployed API restart QA did not pass");
    }
    const output = buildFormalDeployedApiChainSuccessOutput({
      rfd015ReceiptPath: bundle.target,
      rfd015Receipt: loaded.receipt,
      rfd015Validation: loaded.validation,
      rfd016ReceiptPath: restart.receiptPath,
      rfd016Receipt: restart.receipt,
      rootDir: ROOT,
    });
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return output;
  } finally {
    try { artifactExecution?.cleanup(); } catch {}
    if (artifactExecution?.scratch) rmSync(artifactExecution.scratch, { recursive: true, force: true });
  }
}

function formalDeployedApiFailure(error) {
  const blocked = /(?:AUTHORITY|CREDENTIAL|PRIVATE_PATH|REFERENCE|LAUNCHER|PACKAGE|SOURCE|ENDPOINT|DIGEST|SHAPE)/u.test(error?.code ?? "");
  return Object.freeze({
    exitCode: blocked ? 2 : 1,
    payload: { verdict: blocked ? "BLOCKED_BY_AUTHORITY" : "FAIL", error_code: error?.code ?? "FORMAL_DEPLOYED_API_QA_FAILED", message: error instanceof FormalDeployedApiQaError ? error.message : "formal deployed API package QA failed", actual_deployment_pass: false, production_contact_count: 0 },
  });
}

try {
  await runFormalDeployedApiPackageQa();
} catch (error) {
  const failure = formalDeployedApiFailure(error);
  process.stderr.write(`${JSON.stringify(failure.payload)}\n`);
  process.exitCode = failure.exitCode;
}
