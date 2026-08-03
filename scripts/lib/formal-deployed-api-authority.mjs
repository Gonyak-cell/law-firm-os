import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PRIVATE_STAGING_EXACT_HEAD_ACTION, validatePrivateStagingExactHeadPacket } from "./private-staging-exact-head-authority.mjs";
import { PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS, privateStagingReceiptSignerScope, resolvePrivateStagingReceiptSigner, validatePrivateStagingReceiptSet, verifyPrivateStagingExecutionReceipt } from "./private-staging-execution-receipt.mjs";
import { buildPrivateStagingSyntheticSources, validatePrivateStagingSyntheticIdentityManifestBinding } from "./private-staging-artifact.mjs";
import { validateRuntimeSafetyApprovalPayload } from "./runtime-safety-approval-contract.mjs";
import { validateDesktopBuildManifest } from "./matter-desktop-provenance.mjs";
import { validateFormalPackageLoopbackNativeQaCapability, validateFormalPackageLoopbackQaReceipt } from "./formal-package-loopback-qa.mjs";
import { validateFormalPackageLoopbackTranscript } from "./formal-package-loopback-transcript.mjs";
import { validateFormalDeployedApiRawTranscript } from "./formal-deployed-api-transcript.mjs";
import { validatePrivateStagingEndpointContract } from "./formal-deployed-api-inputs.mjs";
import { exactKeys, fail, readSidecar, sha256Bytes } from "./formal-deployed-api-io.mjs";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

function same(actual, expected, label) {
  if (actual !== expected) fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", `${label} binding does not match`);
}

function readRef(bundleDir, ref, rootDir, label, json = false) {
  return readSidecar(bundleDir, ref, rootDir, label, { json });
}

function endpointFromReceipt(receipt) {
  const endpoint = validatePrivateStagingEndpointContract({
    environment: receipt.deployment.environment,
    stack_name: "lawos-private-staging",
    account_id: receipt.deployment.account_id,
    region: receipt.deployment.region,
    api_id: receipt.deployment.api_id,
    api_base_url: `https://${receipt.deployment.api_id}.execute-api.${receipt.deployment.region}.amazonaws.com`,
    data_scope: "synthetic-only",
    production: false,
  });
  same(endpoint.endpoint_sha256, receipt.deployment.api_endpoint_sha256, "HTTPS endpoint");
  return endpoint;
}

function validateApproval({ registry, approval, packet, packetResult, receipt }) {
  const result = validateRuntimeSafetyApprovalPayload({
    registryBytes: registry.bytes,
    receiptBytes: approval.receipt.bytes,
    signatureBytes: approval.signature.bytes,
    expectedRegistrySha256: registry.ref.sha256,
    expectedRole: "owner",
    expectedAction: PRIVATE_STAGING_EXACT_HEAD_ACTION,
    expectedEnvironment: "staging",
    expectedPacketSha256: packetResult.packet_sha256,
    expectedSourceSha: receipt.source.expected_revision,
    expectedSourceTree: receipt.source.source_tree,
    allowedDataScope: ["synthetic-only"],
    allowedContactScope: ["synthetic-mailbox-only"],
  });
  if (result.decision !== "approved") fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "exact-head approval is not approved");
  same(packet.source_sha, receipt.source.expected_revision, "packet source");
  same(packet.source_tree, receipt.source.source_tree, "packet tree");
  return result;
}

function validateExecutionReceipts({ entries, registry, packet, packetResult, approval, endpoint, receipt }) {
  if (!Array.isArray(entries) || entries.length !== PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS.length) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "exactly nine signed pre-suite receipts are required");
  }
  const rawReceipts = [];
  for (const entry of entries) {
    exactKeys(entry, ["kind", "receipt", "signature"], "execution receipt authority");
    const raw = entry.receipt.value;
    same(raw.receipt_kind, entry.kind, "execution receipt kind");
    const scope = privateStagingReceiptSignerScope(raw.receipt_kind);
    const signer = resolvePrivateStagingReceiptSigner(registry.value, raw.key_id, Date.now(), {
      expectedRole: scope.role,
      expectedAction: scope.action,
      expectedEnvironment: scope.environment,
      receiptEnvironment: raw.environment,
      receiptStartedAt: Date.parse(raw.started_at),
      receiptFinishedAt: Date.parse(raw.finished_at),
    });
    verifyPrivateStagingExecutionReceipt({
      receipt: raw,
      signature: entry.signature.bytes,
      publicKey: signer.public_key_spki_pem,
      expected: {
        sourceSha: receipt.source.expected_revision,
        sourceTree: receipt.source.source_tree,
        artifactSha256: packet.artifact_sha256,
        ownerInstructionSha256: packetResult.packet_sha256,
        approvalId: approval.approval_id,
        executionState: "PASS",
      },
    });
    rawReceipts.push(raw);
  }
  const checked = validatePrivateStagingReceiptSet(rawReceipts, {
    sourceSha: receipt.source.expected_revision,
    sourceTree: receipt.source.source_tree,
    artifactSha256: packet.artifact_sha256,
    ownerInstructionSha256: packetResult.packet_sha256,
    approvalId: approval.approval_id,
    executionState: "PASS",
    requiredKinds: PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS,
  });
  if (checked.receipt_count !== PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS.length
    || checked.pass_count !== checked.receipt_count) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "pre-suite receipt set is not entirely PASS");
  }
  for (const kind of ["infrastructure-deployment", "cut-007"]) {
    const raw = rawReceipts.find((item) => item.receipt_kind === kind);
    same(raw?.digests?.api_endpoint_sha256, endpoint.endpoint_sha256, `${kind} signed endpoint`);
  }
  const digest = createHash("sha256");
  entries.forEach((entry) => digest.update(entry.receipt.bytes).update(entry.signature.bytes));
  same(digest.digest("hex"), receipt.deployment.exact_head_receipt_set_sha256, "exact-head receipt set");
}

function validatePackage({ refs, receipt, bundleDir, rootDir, packageQaCapability }) {
  const artifact = readRef(bundleDir, refs.artifact, rootDir, "package artifact"), manifest = readRef(bundleDir, refs.manifest, rootDir, "package manifest", true);
  const embedded = readRef(bundleDir, refs.embedded_manifest, rootDir, "embedded package manifest", true), executable = readRef(bundleDir, refs.executed_package, rootDir, "executed package binary");
  const qa = readRef(bundleDir, refs.qa_receipt, rootDir, "formal package QA receipt", true), qaTranscript = readRef(bundleDir, refs.qa_transcript, rootDir, "formal package QA transcript", true);
  const checkedManifest = validateDesktopBuildManifest(manifest.value);
  validateDesktopBuildManifest(embedded.value);
  assert.deepEqual(embedded.value, manifest.value, "embedded package manifest drifted from the bound manifest");
  same(checkedManifest.source_sha, receipt.source.expected_revision, "package manifest source");
  same(checkedManifest.source_tree, receipt.source.source_tree, "package manifest tree");
  same(checkedManifest.channel, "formal", "package manifest channel");
  same(checkedManifest.platform, receipt.package.platform === "macos" ? "darwin" : "win32", "package platform");
  const packageReceiptValidation = validateFormalPackageLoopbackQaReceipt(qa.value, {
    expectedPlatform: receipt.package.platform, expectedSourceSha: receipt.source.expected_revision,
    expectedSourceTree: receipt.source.source_tree, expectedArtifactSha256: artifact.ref?.sha256 ?? refs.artifact.sha256,
    expectedExecutedPackageSha256: executable.ref?.sha256 ?? refs.executed_package.sha256, expectedManifestSha256: refs.manifest.sha256,
  });
  if (packageReceiptValidation.valid !== true || packageReceiptValidation.authoritative !== false
    || packageReceiptValidation.verdict !== "TEST_ONLY" || packageReceiptValidation.claimed_verdict !== "PASS") {
    fail("FORMAL_DEPLOYED_API_QA_PACKAGE", "formal package QA receipt failed structural validation");
  }
  validateFormalPackageLoopbackTranscript(qaTranscript.value, {
    platform: receipt.package.platform,
    sourceSha: receipt.source.expected_revision,
    sourceTree: receipt.source.source_tree,
    artifactSha256: refs.artifact.sha256,
    executedPackageSha256: refs.executed_package.sha256,
    manifestSha256: refs.manifest.sha256,
    executedMemberDigestSha256: qa.value.bindings.executed_package.member_digest_sha256,
  });
  same(qa.value.bindings.runner_transcript.sha256, refs.qa_transcript.sha256, "formal package transcript");
  same(qa.value.bindings.runner_transcript.bytes, refs.qa_transcript.bytes, "formal package transcript bytes");
  let packageAuthority;
  try {
    packageAuthority = validateFormalPackageLoopbackNativeQaCapability(packageQaCapability, {
      platform: receipt.package.platform, source_sha: receipt.source.expected_revision, source_tree: receipt.source.source_tree,
      artifact_sha256: refs.artifact.sha256, executed_package_sha256: refs.executed_package.sha256,
      manifest_sha256: refs.manifest.sha256, verdict: "PASS", native_verdict: "PASS", authoritative: true,
      receipt_sha256: refs.qa_receipt.sha256, transcript_sha256: refs.qa_transcript.sha256,
    });
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_PACKAGE_CAPABILITY", "formal package authority requires the live canonical native-reader capability");
  }
  for (const [binding, ref] of [
    [qa.value.bindings.package_artifact, refs.artifact],
    [qa.value.bindings.package_manifest, refs.manifest],
    [qa.value.bindings.executed_package, refs.executed_package],
  ]) {
    same(binding.sha256, ref.sha256, "formal package raw receipt hash");
    same(binding.bytes, ref.bytes, "formal package raw receipt bytes");
  }
  for (const [field, ref] of [
    ["artifact", refs.artifact], ["manifest", refs.manifest], ["executed_package", refs.executed_package],
  ]) {
    same(receipt.package[`${field}_sha256`], ref.sha256, `package ${field}`);
    same(receipt.package[`${field}_bytes`], ref.bytes, `package ${field} bytes`);
  }
  same(receipt.package.package_qa_receipt_sha256, refs.qa_receipt.sha256, "package QA receipt");
  same(receipt.package.package_qa_transcript_sha256, refs.qa_transcript.sha256, "package QA transcript");
  same(receipt.package.package_qa_transcript_bytes, refs.qa_transcript.bytes, "package QA transcript bytes");
  return Object.freeze({ artifact, manifest, embedded, executable, qa, qaTranscript, packageAuthority });
}

export function validateFormalDeployedApiStaticAuthority(receipt, bundleDir, { rootDir = process.cwd(), packageQaCapability } = {}) {
  const refs = receipt.authority;
  exactKeys(refs, [
    "approval", "exact_head_packet", "execution_receipts", "package", "raw_transcript",
    "synthetic_identity_manifest", "trust_registry",
  ], "receipt authority");
  exactKeys(refs.approval, ["receipt", "signature"], "approval authority");
  exactKeys(refs.package, ["artifact", "embedded_manifest", "executed_package", "manifest", "qa_receipt", "qa_transcript"], "package authority");
  const registry = { ...readRef(bundleDir, refs.trust_registry, rootDir, "trust registry", true), ref: refs.trust_registry };
  const packet = readRef(bundleDir, refs.exact_head_packet, rootDir, "exact-head packet", true);
  const approval = {
    receipt: readRef(bundleDir, refs.approval.receipt, rootDir, "approval receipt"),
    signature: readRef(bundleDir, refs.approval.signature, rootDir, "approval signature"),
  };
  const packetResult = validatePrivateStagingExactHeadPacket(packet.value, {
    sourceSha: receipt.source.expected_revision,
    sourceTree: receipt.source.source_tree,
    artifactSha256: receipt.source.api_artifact_sha256,
  });
  const approvalResult = validateApproval({ registry, approval, packet: packet.value, packetResult, receipt });
  const endpoint = endpointFromReceipt(receipt);
  const executionEntries = refs.execution_receipts.map((entry) => ({
    kind: entry.kind,
    receipt: readRef(bundleDir, entry.receipt, rootDir, `${entry.kind} receipt`, true),
    signature: readRef(bundleDir, entry.signature, rootDir, `${entry.kind} signature`),
  }));
  validateExecutionReceipts({ entries: executionEntries, registry, packet: packet.value, packetResult, approval: approvalResult, endpoint, receipt });
  const identity = readRef(bundleDir, refs.synthetic_identity_manifest, rootDir, "synthetic identity manifest", true);
  same(refs.synthetic_identity_manifest.sha256, packet.value.synthetic_identity_manifest_sha256, "synthetic identity manifest");
  validatePrivateStagingSyntheticIdentityManifestBinding(identity.value, {
    sourceSha: receipt.source.expected_revision,
    sourceTree: receipt.source.source_tree,
  });
  const sources = buildPrivateStagingSyntheticSources(identity.value);
  if (sources.accountSeed?.users?.length !== 10 && sources.account_seed?.users?.length !== 10) {
    fail("FORMAL_DEPLOYED_API_QA_IDENTITY", "authority manifest must define exactly ten synthetic users");
  }
  const packageFiles = validatePackage({ refs: refs.package, receipt, bundleDir, rootDir, packageQaCapability });
  const expectedUsers = identity.value.accounts.map((item) => ({ userId: item.user_id, employeeId: item.employee_id }));
  return Object.freeze({
    receipt, refs, endpoint,
    tenantId: identity.value.tenant_id,
    expectedUsers,
    packageFiles,
    packet: packet.value,
  });
}

export function validateFormalDeployedApiAuthorityBundle(receipt, bundleDir, options = {}) {
  const staticAuthority = validateFormalDeployedApiStaticAuthority(receipt, bundleDir, options);
  const { endpoint, expectedUsers, packageFiles, refs, tenantId } = staticAuthority;
  const transcript = readRef(bundleDir, refs.raw_transcript, options.rootDir ?? process.cwd(), "raw execution transcript", true);
  const observations = validateFormalDeployedApiRawTranscript(transcript.value, {
    platform: receipt.package.platform,
    sourceSha: receipt.source.expected_revision,
    endpointSha256: endpoint.endpoint_sha256,
    artifactSha256: refs.package.artifact.sha256,
    manifestSha256: refs.package.manifest.sha256,
    executedPackageSha256: refs.package.executed_package.sha256,
    executablePathSha256: receipt.package.executable_path_sha256,
    expectedUsers,
    expectedTenantId: tenantId,
  });
  assert.deepEqual(receipt.observations, observations, "receipt observations must be derived from the raw transcript");
  same(receipt.execution.transcript_sha256, refs.raw_transcript.sha256, "raw transcript");
  same(receipt.execution.transcript_bytes, refs.raw_transcript.bytes, "raw transcript bytes");
  return Object.freeze({
    source_sha: receipt.source.expected_revision,
    source_tree: receipt.source.source_tree,
    api_source_revision: receipt.source.api_source_revision,
    api_artifact_sha256: receipt.source.api_artifact_sha256,
    api_endpoint_sha256: endpoint.endpoint_sha256,
    artifact_sha256: refs.package.artifact.sha256,
    manifest_sha256: refs.package.manifest.sha256,
    executed_package_sha256: refs.package.executed_package.sha256,
    transcript_sha256: refs.raw_transcript.sha256,
    package_qa_receipt_sha256: refs.package.qa_receipt.sha256,
    package_qa_transcript_sha256: refs.package.qa_transcript.sha256,
    package_qa_privacy_corpus_sha256: packageFiles.packageAuthority.privacy_corpus_sha256,
    authority_sha256: sha256Bytes(Buffer.from(JSON.stringify(refs))),
  });
}
