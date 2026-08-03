import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPrivateStagingExactHeadPacket, privateStagingPacketSha256 } from "../../lib/private-staging-exact-head-authority.mjs";
import { PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS } from "../../lib/private-staging-execution-receipt.mjs";
import { canonicalizeJson } from "../../lib/runtime-safety-approval-contract.mjs";
import { createDesktopBuildManifest, DESKTOP_RENDERER_DIGEST_ALGORITHM } from "../../lib/matter-desktop-provenance.mjs";
import { FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION, FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA, FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA } from "../../lib/formal-package-loopback-qa.mjs";
import { FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA } from "../../lib/formal-deployed-api-package-qa.mjs";
import { FORMAL_DEPLOYED_API_TRANSCRIPT_SCHEMA, opaqueSha256, validateFormalDeployedApiRawTranscript } from "../../lib/formal-deployed-api-transcript.mjs";
import { canonicalReceiptBytes, sha256Bytes, sidecarRef } from "../../lib/formal-deployed-api-io.mjs";

export const SOURCE_SHA = "a".repeat(40);
export const SOURCE_TREE = "b".repeat(40);
export const API_ARTIFACT_SHA = "c".repeat(64);
export const API_ID = "abcdefgh12";
export const ENDPOINT = `https://${API_ID}.execute-api.ap-northeast-2.amazonaws.com`;
export const ENDPOINT_SHA = sha256Bytes(ENDPOINT);
export const TENANT_ID = "tenant_lawos_staging_cut007_a";
export const OTHER_TENANT_ID = "tenant_lawos_staging_negative_b";
const APPROVAL_ID = "LAWOS-PRIVATE-STAGING-EXACT-HEAD-APPROVAL-20260801";
const KEY_ID = "lawos-owner-ed25519-rfd015";

function write(root, name, bytes) {
  const raw = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const path = join(root, name);
  writeFileSync(path, raw, { mode: 0o600 });
  chmodSync(path, 0o600);
  return { path, bytes: raw, ref: sidecarRef(name, raw) };
}

function syntheticManifest() {
  return {
    schema_version: "law-firm-os.private-staging.synthetic-account-directory.v1",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_approved: true,
    tenant_id: TENANT_ID,
    accounts: Array.from({ length: 10 }, (_, index) => ({
      user_id: `synthetic-lawos-staging-user-${index + 1}`,
      employee_id: `emp-lawos-staging-user-${index + 1}`,
      email: `lawos-staging-user-${index + 1}@example.invalid`,
      display_name: `LawOS Staging Pilot USER-${index + 1}`,
      role_ids: index === 0 ? ["firm_admin", "matter_vault_admin"] : ["attorney", "matter_vault_user"],
      ...(index === 9 ? { account_status: "disabled" } : {}),
    })),
  };
}

function packageManifest() {
  return createDesktopBuildManifest({
    version: "0.1.17",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    renderer: { sha256: "d".repeat(64), file_count: 12, algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM },
    channel: "formal",
    platform: "darwin",
    arch: "arm64",
    appId: "com.amic.matter.desktop",
    requestedRuntimeMode: "none",
    effectiveRuntimeMode: "none",
    runtimeIncluded: false,
    runtimeDataClass: "none",
    nonDistributable: false,
    distributable: true,
    builtAt: "2026-08-01T00:00:00.000Z",
  });
}

function action(sequence, method, path, status, bodyAction = null) {
  return { ui_action_present: true, request: { sequence, method, path, status, body_action: bodyAction } };
}

function packageQa({ artifactSha, artifactBytes, manifestSha, manifestBytes, executableSha, executableBytes, transcriptRef }) {
  const ref = (path, sha256, scope = "repository", bytes = 128) => ({ scope, path, sha256, bytes });
  return {
    schema_version: FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
    tuw_id: "RFD-TUW-014",
    platform: "macos",
    generated_at: "2026-08-01T00:00:00.000Z",
    verdict: "PASS",
    native_verdict: "PASS",
    evidence_scope: "local_exact_source_loopback_only",
    source: { revision: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false, renderer: { sha256: "d".repeat(64), file_count: 12, algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM } },
    bindings: {
      package_artifact: ref("artifact.dmg", artifactSha, "repository", artifactBytes),
      executed_package: { kind: "macos_dmg_member_executable", member_path: "matter.app/Contents/MacOS/matter", sha256: executableSha, bytes: executableBytes, member_digest_sha256: executableSha },
      package_manifest: { ...ref("manifest.json", manifestSha, "repository", manifestBytes), embedded_member_path: "matter.app/Contents/Resources/matter-build-manifest.json", source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, renderer_sha256: "d".repeat(64) },
      loopback_api: { source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, health_source_sha: SOURCE_SHA, fixture_id: "rfd-tuw-014-synthetic" },
      runner_transcript: transcriptRef,
      artifact_privacy: { corpus_sha256: "2".repeat(64), receipts: [ref("privacy-a.json", "3".repeat(64), "evidence"), ref("privacy-b.json", "4".repeat(64), "evidence")] },
      all_source_sha_equal: true,
    },
    package: { channel: "formal", app_id: "com.amic.matter.desktop", thin_client: true, runtime_data_mode: "none", runtime_data_class: "none", bundled_local_api_present: false, private_local_runtime_present: false, operator_token_present: false, formal_local_api_default_disabled: true, bundle_member_path: "matter.app", artifacts: [{ role: "dmg", ...ref("artifact.dmg", artifactSha, "repository", artifactBytes) }, { role: "zip", ...ref("artifact.zip", "5".repeat(64)) }, { role: "manifest", ...ref("manifest.json", manifestSha, "repository", manifestBytes) }], distribution: { app_codesign: "pass", app_gatekeeper: "pass", app_stapler: "pass", dmg_codesign: "pass", dmg_gatekeeper: "pass", dmg_stapler: "pass", dmg_image: "pass" } },
    runtime: { mode: "production-auth-http", topology: "thin-client", base_url_kind: "isolated_loopback_nonpackaged", base_url: "http://127.0.0.1:4812", api_profile: "local-dev-synthetic-only", operator_token_used: false, secret_env_injection_count: 0, external_network_request_count: 0, aws_request_count: 0, health_status: 200 },
    fixture: { synthetic_only: true, people_count: 10, real_identity_count: 0, profile_photo_or_initials_count: 10, profile_photo_count: 5, profile_initials_count: 5 },
    scenarios: { forest_login_rendered: true, signed_in: true, profile_populated: true, people_roster_rendered: true, people_profile_photo_or_initials_complete: true, matter_queue_rendered: true, matter_task_created: true, matter_time_created: true, matter_time_week_locked: true, matter_wip_created: true, matter_billing_created: true, leave_rendered: true, payroll_rendered: true, restart_session_restored: true },
    action_evidence: { matter_queue: { visible_count: 1, seeded_task_id: "task-rfd-tuw-014-queue" }, matter_task: action(10, "POST", "/api/matter/ops/tasks", 201), matter_time: action(11, "POST", "/api/matter/ops/time-entries", 201), matter_time_week_submit: action(12, "POST", "/api/matter/ops/time-weeks/submit", 200), matter_time_week_lock: action(13, "POST", "/api/matter/ops/time-weeks/lock", 200), matter_wip: action(14, "POST", "/api/matter/ops/wip", 201, "generate"), matter_billing: action(15, "POST", "/api/matter/ops/wip", 201, "prebill") },
    diagnostics: { page_error_count: 0, console_error_count: 0, external_request_count: 0 },
    execution: { classification: "ACTUAL_NATIVE_RUNNER", runner_capability: "native-macos-dmg", process_invocation_count: 3, package_launch_count: 2, adapter_invocation_count: 6 },
    boundaries: { private_local_runtime_used: false, real_employee_write: false, staging_runtime_used: false, production_runtime_used: false, aws_write: false, staging_evidence: false, production_evidence: false, deployment_evidence: false, public_release_claim: false, production_go_live_claim: false, windows_native_claim: false, authenticode_claim: false, limitation: FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION },
    authenticode: null,
    screenshots: [{ name: "screen", ...ref("screen.png", "e".repeat(64), "evidence", 256) }],
  };
}

function packageQaTranscript({ artifactSha, manifestSha, executableSha }) {
  const actions = [
    ["POST", "/api/matter/ops/tasks", 201, null],
    ["POST", "/api/matter/ops/time-entries", 201, null],
    ["POST", "/api/matter/ops/time-weeks/submit", 200, null],
    ["POST", "/api/matter/ops/time-weeks/lock", 200, null],
    ["POST", "/api/matter/ops/wip", 201, "generate"],
    ["POST", "/api/matter/ops/wip", 201, "prebill"],
  ];
  return {
    schema_version: FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
    tuw_id: "RFD-TUW-014",
    platform: "macos",
    started_at: "2026-08-01T00:00:00.000Z",
    finished_at: "2026-08-01T00:01:00.000Z",
    source: { revision: SOURCE_SHA, source_tree: SOURCE_TREE },
    artifacts: { package_artifact_sha256: artifactSha, executed_package_sha256: executableSha, executed_member_digest_sha256: executableSha, manifest_sha256: manifestSha, privacy_receipt_sha256s: ["3".repeat(64), "4".repeat(64)] },
    runtime: { base_url: "http://127.0.0.1:4812", mode: "production-auth-http", topology: "thin-client", health_source_sha: SOURCE_SHA },
    execution: { classification: "ACTUAL_NATIVE_RUNNER", runner_capability: "native-macos-dmg", process_invocation_count: 3, package_launch_count: 2, adapter_invocation_count: 6 },
    requests: [...Array.from({ length: 9 }, (_, index) => ({ sequence: index + 1, method: "GET", path: `/api/test/${index + 1}`, status: 200, body_action: null, remote_loopback: true })), ...actions.map(([method, path, status, body_action], index) => ({ sequence: index + 10, method, path, status, body_action, remote_loopback: true }))],
    screenshots: [{ sequence: 1, name: "screen", path: "screen.png", sha256: "e".repeat(64), bytes: 256 }],
    diagnostics: { page_errors: [], console_errors: [], external_requests: [], aws_request_count: 0 },
  };
}

export function validTranscript({ artifactSha, manifestSha, executableSha, executablePathSha, accounts = syntheticManifest().accounts } = {}) {
  const ids = ["task-id", "time-id", "wip-id", "billing-id"];
  const kinds = ["task", "time", "wip", "billing"];
  const mutations = kinds.flatMap((kind, index) => [1, 2].map((attempt) => ({ kind, attempt, idempotency_key_sha256: opaqueSha256(`${kind}-key`), resource_id_sha256: opaqueSha256(ids[index]), response_sha256: opaqueSha256(`${kind}-${attempt}`), status: 200, replay: attempt === 2 })));
  return {
    schema_version: FORMAL_DEPLOYED_API_TRANSCRIPT_SCHEMA,
    run_id: "rfd015-fixture-run",
    platform: "macos",
    started_at: "2026-08-01T00:00:00.000Z",
    finished_at: "2026-08-01T00:01:00.000Z",
    health_response: { status: 200, source_revision: SOURCE_SHA, persistence_authority: "postgres-v2", runtime_profile: "operational", synthetic_only: true, uses_real_client_data: false, body_sha256: "1".repeat(64) },
    runtime_observation: { mode: "production-auth-http", base_url_sha256: ENDPOINT_SHA, operator_runtime_configured: false },
    process_events: [{ sequence: 1, kind: "launch", phase: "startup", artifact_sha256: artifactSha, manifest_sha256: manifestSha, executable_sha256: executableSha, spawnfile_sha256: executablePathSha, pid_fingerprint_sha256: "2".repeat(64) }, { sequence: 2, kind: "exit", phase: "shutdown", exit_code: 0 }],
    telemetry_boundary_events: ["configured_before_launch", "process_spawn_observed", "shutdown_observed", "telemetry_flushed_after_shutdown"].map((kind, index) => ({ sequence: index + 1, kind })),
    network_events: [{ sequence: 1, phase: "whole-process-netlog", method: "GET", status: 200, failed: false, origin_sha256: ENDPOINT_SHA, operator_header_count: 0 }],
    console_events: [],
    process_error_events: [],
    identity_rows: accounts.map((account, index) => ({ sequence: index + 1, user_id_sha256: opaqueSha256(account.user_id), employee_id_sha256: opaqueSha256(account.employee_id), classification: "approved-synthetic", photo_sha256: index < 5 ? opaqueSha256(`photo-${index}`) : null, initials_sha256: index < 5 ? null : opaqueSha256(`initials-${index}`) })),
    other_tenant_observation: { signed_tenant_sha256: opaqueSha256(TENANT_ID), requested_tenant_sha256: opaqueSha256(OTHER_TENANT_ID), status: 400, outcome: "blocked", safe_error_code: "HRX_QUERY_CONTEXT_FORBIDDEN", forbidden_query_keys: ["tenant_id"], employees_field_present: false, visible_count: 0, response_sha256: "7".repeat(64) },
    other_tenant_rows: [],
    matter_today_rows: [{ sequence: 1, row_sha256: "3".repeat(64) }],
    mutation_events: mutations.map((row, index) => ({ sequence: index + 1, ...row })),
    readback_events: kinds.map((kind, index) => ({ sequence: index + 1, kind, resource_id_sha256: opaqueSha256(ids[index]), response_sha256: opaqueSha256(`${kind}-read`), occurrence_count: 1 })),
  };
}

function executionReceipt(kind, packetSha, endpointSha) {
  return {
    schema_version: "law-firm-os.private-staging.execution-receipt.v1",
    receipt_id: `lawos-private-staging-${kind}-20260801`,
    receipt_kind: kind,
    key_id: KEY_ID,
    approval_id: APPROVAL_ID,
    owner_instruction_sha256: packetSha,
    execution_state: "PASS",
    started_at: "2026-08-01T00:00:00.000Z",
    finished_at: "2026-08-01T00:01:00.000Z",
    command: `node scripts/run-${kind}.mjs --redacted-private-inputs`,
    exit_code: 0,
    profile: "matter-staging-admin",
    environment: "lawos-staging",
    data_scope: "synthetic-only",
    contact_scope: "synthetic-mailbox-only",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: API_ARTIFACT_SHA,
    safe_counts: { assertion_count: 1, real_data_count: 0 },
    digests: { evidence_sha256: "4".repeat(64), ...(["infrastructure-deployment", "cut-007"].includes(kind) ? { api_endpoint_sha256: endpointSha } : {}) },
    claims: { secret_material_returned: false, raw_pii_returned: false, production_contacted: false, real_data_contacted: false, synthetic_only_verified: true },
    blockers: [],
  };
}

export function createHandAuthoredRfd015PassBundle() {
  const root = mkdtempSync(join(tmpdir(), "rfd015-v3-fixture-"));
  chmodSync(root, 0o700);
  const artifact = write(root, "artifact.dmg", Buffer.from("formal-artifact"));
  const executable = write(root, "executed.bin", Buffer.from("formal-executable"));
  const manifest = write(root, "manifest.json", canonicalReceiptBytes(packageManifest()));
  const embedded = write(root, "embedded-manifest.json", manifest.bytes);
  const identities = write(root, "identities.json", canonicalReceiptBytes(syntheticManifest()));
  const packetValue = buildPrivateStagingExactHeadPacket({ packetId: "LAWOS-PRIVATE-STAGING-EXACT-HEAD-RFD015-20260801", baseMainSha: "8".repeat(40), baseMainTree: "9".repeat(40), sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, artifactSha256: API_ARTIFACT_SHA, artifactS3Key: `lawos-private-staging/${SOURCE_SHA}/${API_ARTIFACT_SHA}.zip`, artifactManifestSha256: "5".repeat(64), syntheticIdentityManifestSha256: identities.ref.sha256, monthlyEstimateKrw: 100000, monthlyEstimateUsd: 70, generatedAt: "2026-08-01T00:00:00.000Z", expiresAt: "2026-08-08T00:00:00.000Z", digests: { one_sha256: "1".repeat(64), two_sha256: "2".repeat(64), three_sha256: "3".repeat(64), four_sha256: "4".repeat(64) } });
  const packet = write(root, "packet.json", canonicalReceiptBytes(packetValue));
  const packetSha = privateStagingPacketSha256(packetValue);
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registryValue = { schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1", generated_at: "2026-08-01T00:00:00.000Z", keys: [{ key_id: KEY_ID, algorithm: "Ed25519", public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }).toString(), roles: ["owner"], actions: ["lawos-private-staging-exact-head-execution"], environments: ["staging", "lawos-staging"], valid_from: "2026-01-01T00:00:00.000Z", valid_until: "2030-01-01T00:00:00.000Z", revoked_at: null }] };
  const registry = write(root, "registry.json", canonicalReceiptBytes(registryValue));
  const approvalValue = { schema_version: "law-firm-os.runtime-safety.approval.v1", approval_id: APPROVAL_ID, key_id: KEY_ID, role: "owner", decision: "approved", packet_sha256: packetSha, source_sha: SOURCE_SHA, source_tree: SOURCE_TREE, action: "lawos-private-staging-exact-head-execution", environment: "staging", signed_at: "2026-08-01T00:00:00.000Z", expires_at: "2029-01-01T00:00:00.000Z", data_scope: ["synthetic-only"], contact_scope: ["synthetic-mailbox-only"] };
  const approval = write(root, "approval.json", canonicalReceiptBytes(approvalValue));
  const approvalSignature = write(root, "approval.sig", sign(null, Buffer.from(canonicalizeJson(approvalValue)), privateKey));
  const execution = PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS.map((kind) => {
    const value = executionReceipt(kind, packetSha, ENDPOINT_SHA);
    return { kind, receipt: write(root, `${kind}.json`, canonicalReceiptBytes(value)), signature: write(root, `${kind}.sig`, sign(null, Buffer.from(canonicalizeJson(value)), privateKey)) };
  });
  const qaTranscript = write(root, "package-qa-transcript.json", canonicalReceiptBytes(packageQaTranscript({ artifactSha: artifact.ref.sha256, manifestSha: manifest.ref.sha256, executableSha: executable.ref.sha256 })));
  const qa = write(root, "package-qa.json", canonicalReceiptBytes(packageQa({ artifactSha: artifact.ref.sha256, artifactBytes: artifact.ref.bytes, manifestSha: manifest.ref.sha256, manifestBytes: manifest.ref.bytes, executableSha: executable.ref.sha256, executableBytes: executable.ref.bytes, transcriptRef: { scope: "evidence", path: qaTranscript.ref.name, sha256: qaTranscript.ref.sha256, bytes: qaTranscript.ref.bytes } })));
  const executablePathSha = "6".repeat(64);
  const transcriptValue = validTranscript({ artifactSha: artifact.ref.sha256, manifestSha: manifest.ref.sha256, executableSha: executable.ref.sha256, executablePathSha });
  const transcript = write(root, "transcript.json", canonicalReceiptBytes(transcriptValue));
  const expectedUsers = syntheticManifest().accounts.map((item) => ({ userId: item.user_id, employeeId: item.employee_id }));
  const observations = validateFormalDeployedApiRawTranscript(transcriptValue, { platform: "macos", sourceSha: SOURCE_SHA, endpointSha256: ENDPOINT_SHA, artifactSha256: artifact.ref.sha256, manifestSha256: manifest.ref.sha256, executedPackageSha256: executable.ref.sha256, executablePathSha256: executablePathSha, expectedUsers, expectedTenantId: TENANT_ID });
  const setHash = createHash("sha256");
  execution.forEach((entry) => setHash.update(entry.receipt.bytes).update(entry.signature.bytes));
  const refs = { trust_registry: registry.ref, exact_head_packet: packet.ref, approval: { receipt: approval.ref, signature: approvalSignature.ref }, synthetic_identity_manifest: identities.ref, execution_receipts: execution.map((entry) => ({ kind: entry.kind, receipt: entry.receipt.ref, signature: entry.signature.ref })), package: { artifact: artifact.ref, manifest: manifest.ref, embedded_manifest: embedded.ref, executed_package: executable.ref, qa_receipt: qa.ref, qa_transcript: qaTranscript.ref }, raw_transcript: transcript.ref };
  const receipt = { schema_version: FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA, generated_at: "2026-08-01T00:02:00.000Z", verdict: "PASS", code_readiness: { status: "PASS" }, source: { expected_revision: SOURCE_SHA, source_tree: SOURCE_TREE, api_source_revision: SOURCE_SHA, api_artifact_sha256: API_ARTIFACT_SHA }, package: { platform: "macos", artifact_sha256: artifact.ref.sha256, artifact_bytes: artifact.ref.bytes, manifest_sha256: manifest.ref.sha256, manifest_bytes: manifest.ref.bytes, executed_package_sha256: executable.ref.sha256, executed_package_bytes: executable.ref.bytes, executable_path_sha256: executablePathSha, package_qa_receipt_sha256: qa.ref.sha256, package_qa_receipt_bytes: qa.ref.bytes, package_qa_transcript_sha256: qaTranscript.ref.sha256, package_qa_transcript_bytes: qaTranscript.ref.bytes }, deployment: { status: "PASS", executed: true, environment: "lawos-staging", account_id: "770880870480", region: "ap-northeast-2", api_id: API_ID, api_endpoint_sha256: ENDPOINT_SHA, exact_head_receipt_set_sha256: setHash.digest("hex"), production_contact_count: 0 }, execution: { classification: "ACTUAL_PRIVATE_STAGING", transcript_sha256: transcript.ref.sha256, transcript_bytes: transcript.ref.bytes }, observations, authority: refs, boundaries: { actual_deployment_pass: true, credential_material_returned: false, password_confirm_count: 0, password_reset_count: 0, production_contact_count: 0, production_write_count: 0, real_data_contact_count: 0, release_executed: false, staging_synthetic_mutation_count: 4 }, blockers: [] };
  const receiptFile = write(root, "rfd015-receipt.json", canonicalReceiptBytes(receipt));
  return { root, receiptPath: receiptFile.path, receipt, transcript: transcriptValue, expectedUsers, refs };
}
