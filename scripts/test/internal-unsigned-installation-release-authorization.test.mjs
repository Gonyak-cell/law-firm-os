import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { POSTGRES_TENANT_CONTEXT_SECRET } from "../../packages/persistence/src/postgres/pool.js";
import { createOutlookAssignmentAuthorityFixture } from "../../packages/email-dms/test/support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { canonicalizeJson, sha256Hex } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES, AMIC_INTERNAL_MANAGED_BOOTSTRAP_MANIFEST_SCHEMA,
  AMIC_INTERNAL_MANAGED_BOOTSTRAP_ENVELOPE_SCHEMA, amicInternalManagedBootstrapScopeKey,
} from "../lib/amic-os-internal-distribution-publication.mjs";
import { AMIC_INTERNAL_WINDOWS_STATE_SCHEMA } from "../validate-amic-os-internal-windows-state.mjs";
import {
  INTERNAL_INSTALLATION_AUTHORIZE_ACTION, INTERNAL_INSTALLATION_REVOKE_ACTION,
  INTERNAL_INSTALLATION_CONTROL_SCHEMA, createInternalUnsignedInstallationReleaseControl,
  internalUnsignedInstallationRequestSha256,
} from "../lib/internal-unsigned-installation-release-authorization.mjs";

const NOW = Date.parse("2026-09-05T12:00:00.000Z");
const canonicalBytes = (value) => Buffer.from(`${canonicalizeJson(value)}\n`);

// Synthetic host measurements exercise the actual installed-state and native-tree validators.
function installedReceipt(release, installer, trustSha256) {
  const fileNames = ["./matter.exe", "./resources/matter-build-manifest.json",
    "./resources/matter-internal-unsigned-release.json", "./resources/matter-internal-update-trust.json",
    "./resources/classic-outlook/AMIC.OS.Vault.Outlook.dll"];
  const records = fileNames.map((path, index) => {
    const body = index === 1 ? "synthetic-build_manifest" : path;
    return { path, bytes: Buffer.byteLength(body), sha256: sha256Hex(body) };
  });
  const fileRecord = (index) => ({ present: true, reparse_point: false, bytes: records[index].bytes,
    sha256: records[index].sha256, file_version: index === 0 ? release.version : null,
    product_version: index === 0 ? `${release.version}.0` : null });
  const rows = [...records].sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  const contentSha256 = sha256Hex(rows.map((row) => `${row.sha256} ${row.bytes} ${row.path}\n`).join(""));
  const snapshotCounts = { content_sha256: contentSha256, identity_sha256: "5".repeat(64),
    file_count: rows.length, directory_count: 3, bytes: rows.reduce((sum, row) => sum + row.bytes, 0) };
  return {
    schema_version: AMIC_INTERNAL_WINDOWS_STATE_SCHEMA, verdict: "PASS", stage: "installed",
    canary_id: "synthetic-canary-001", captured_at_utc: new Date(Date.parse(release.generatedAt) + 1800000).toISOString(),
    expected: { computer_name: "JWS-GALAXYBOOK", version: release.version, source_sha: release.sourceSha,
      source_tree: release.sourceTree, installer_sha256: installer.sha256, install_root: "C:\\Program Files\\matter",
      app_id: release.appId, distribution_profile: "internal-unsigned" },
    host: { windows: true, computer_name: "JWS-GALAXYBOOK", computer_name_exact: true,
      host_fingerprint_sha256: "4".repeat(64), os_version: "10.0.26100", os_build_number: "26100",
      os_architecture: "x64", process_architecture: "x64", system_drive: "C:",
      system_drive_total_bytes: 512000000000, system_drive_free_bytes: 256000000000 },
    checks: Object.fromEntries(["host_identity_exact", "windows_x64", "install_root_exact", "uninstall_entry_exact",
      "process_state_exact", "service_state_exact", "scheduled_task_state_exact", "update_cache_state_exact",
      "outlook_attachment_cache_state_exact", "desktop_registry_state_exact", "outlook_addin_registry_state_exact",
      "outlook_com_registry_state_exact", "protocol_handler_state_exact", "shortcut_state_exact", "build_identity_exact",
      "internal_unsigned_marker_exact", "update_trust_exact", "classic_outlook_file_exact", "native_installed_tree_exact",
      "stage_state_exact"].map((key) => [key, true])),
    observed: {
      install_root_present: true, executable: fileRecord(0), build_manifest_file: fileRecord(1),
      internal_unsigned_marker_file: fileRecord(2), update_trust_file: fileRecord(3), classic_outlook_addin_file: fileRecord(4),
      package_metadata: {
        build_manifest: { sha256: records[1].sha256, schema_version: "law-firm-os.matter-desktop-build-provenance.v1",
          version: release.version, source_sha: release.sourceSha, source_tree: release.sourceTree,
          renderer_sha256: "6".repeat(64), renderer_file_count: 20, channel: "internal", platform: "win32",
          architecture: "x64", app_id: release.appId, source_clean: true, public_release_claim: false,
          production_go_live_claim: false, exact: true },
        internal_unsigned_marker: { sha256: records[2].sha256, channel: "internal", distribution_profile: "internal-unsigned",
          local_api_default: "disabled", bundled_local_api: false, exact: true },
        update_trust: { sha256: records[3].sha256, schema_version: "law-firm-os.matter-desktop-internal-update-trust.v1",
          key_id: "matter-internal-update-key-v1", public_key_spki_sha256: trustSha256,
          private_key_material_included: false, public_release_allowed: false, exact: true },
      },
      uninstall_entry_count: 1, uninstall_exact_count: 1, product_process_count: 0, product_service_count: 0,
      product_scheduled_task_count: 0, update_cache_present: false, outlook_attachment_cache_present: false,
      registry: { desktop_entry_count: 2, desktop_exact_count: 2, outlook_addin_entry_count: 2,
        outlook_addin_exact_count: 2, outlook_com_entry_count: 2, outlook_com_exact_count: 2,
        protocol_handler_count: 2, protocol_handler_exact_count: 2 },
      shortcuts: { count: 2, exact_target_count: 2, aggregate_sha256: "8".repeat(64) },
      native_installed_tree: { schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1", platform: "win32",
        powershell_version: "7.5.2", filesystem: "NTFS", fixed_point_sequence: ["B0", "I1", "B1", "I2", "B2"],
        fixed_point_exact: true, ...snapshotCounts, reparse_point_count: 0, alternate_data_stream_count: 0,
        hard_link_count: 0, files: rows, phases: ["B0", "I1", "B1", "I2", "B2"].map((name) => ({ name, ...snapshotCounts })) },
    },
    safe_error_codes: [],
    boundaries: { host_state_read_only: true, evidence_file_write_count: 1, registry_write_count: 0,
      network_request_count: 0, installer_launch_count: 0, uninstall_launch_count: 0, application_launch_count: 0,
      destructive_action_count: 0, private_data_read_count: 0, download_verified: false, windows_warning_captured: false,
      human_sign_in_checked: false, hosted_data_checked: false, outlook_action_checked: false, update_checked: false,
      rollback_checked: false, hosted_data_preservation_checked: false, g9_complete_claim: false },
  };
}

function fixture({ at = NOW } = {}) {
  const ownerKeys = generateKeyPairSync("ed25519");
  const bootstrapKeys = generateKeyPairSync("ed25519");
  const deviceKeys = generateKeyPairSync("ed25519");
  const keySha256 = sha256Hex(bootstrapKeys.publicKey.export({ type: "spki", format: "der" }));
  const release = { releaseId: "synthetic-internal-0.1.32", releaseSequence: 32, version: "0.1.32",
    lawosTenantId: "synthetic-tenant", appId: "com.amic.matter.desktop.internal", keyId: "matter-internal-update-key-v1",
    sourceSha: "1".repeat(40), sourceTree: "2".repeat(40), platform: "win32", architecture: "x64",
    generatedAt: new Date(at - 3600000).toISOString(), expiresAt: new Date(at + 7 * 86400000 - 3600000).toISOString() };
  const bindings = { accountId: "123456789012", region: "ap-northeast-2", bucket: "synthetic-artifacts",
    accessLogBucket: "synthetic-artifact-access",
    kmsKeyArn: "arn:aws:kms:ap-northeast-2:123456789012:key/11111111-1111-4111-8111-111111111111",
    retainUntil: new Date(at + 372 * 86400000).toISOString() };
  const objects = new Map();
  const add = (kind, body, key = `internal-unsigned/synthetic/${kind}`) => {
    const ref = { kind, key, bytes: body.length, sha256: sha256Hex(body), version_id: `version-${objects.size + 1}` };
    objects.set(`${key}\0${ref.version_id}`, { ref, body });
    return ref;
  };
  const artifacts = Object.fromEntries(["build_manifest", "installer", "provenance", "sbom"]
    .map((kind) => [kind, add(kind, Buffer.from(`synthetic-${kind}`))]));
  const manifest = {
    schema_version: AMIC_INTERNAL_MANAGED_BOOTSTRAP_MANIFEST_SCHEMA,
    release_id: release.releaseId, release_sequence: release.releaseSequence, version: release.version,
    channel: "internal-unsigned", lawos_tenant_id: release.lawosTenantId, app_id: release.appId,
    platform: release.platform, architecture: release.architecture, source_sha: release.sourceSha, source_tree: release.sourceTree,
    ...AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES, key_id: release.keyId,
    generated_at: release.generatedAt, expires_at: release.expiresAt, artifacts, authenticode_status: "not_signed",
    distribution: "private", managed_device_only: true, real_contact_seed_included: false, real_photo_seed_included: false,
    real_registration_seed_included: false, credentials_included: false,
  };
  const manifestBytes = canonicalBytes(manifest);
  const signatureBytes = sign(null, manifestBytes, bootstrapKeys.privateKey);
  const manifestRef = add("release_manifest", manifestBytes);
  const signatureRef = add("release_manifest_signature", signatureBytes);
  const marker = add("managed_bootstrap_marker", canonicalBytes({
    schema_version: AMIC_INTERNAL_MANAGED_BOOTSTRAP_ENVELOPE_SCHEMA, key_id: release.keyId,
    ...AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES, document_base64: manifestBytes.toString("base64"),
    signature_base64: signatureBytes.toString("base64"), document_object: manifestRef, signature_object: signatureRef,
    bootstrap_marker_written_after_all_object_readbacks: true,
  }), amicInternalManagedBootstrapScopeKey(release));
  const calls = { reads: [], queries: [], histories: 0, anonymous: 0, connects: 0, releases: 0 };
  let now = at;
  const aws = {
    async getObjectBody(args) {
      assert.equal(args.bucket, bindings.bucket);
      assert.equal(args.expectedOwner, bindings.accountId);
      calls.reads.push(args);
      const { ref, body } = objects.get(`${args.key}\0${args.versionId}`) ?? {};
      assert.ok(ref, "missing immutable object");
      return { body, VersionId: ref.version_id, ContentLength: ref.bytes, ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: bindings.kmsKeyArn, ChecksumSHA256: Buffer.from(ref.sha256, "hex").toString("base64"),
        ObjectLockMode: "COMPLIANCE", ObjectLockRetainUntilDate: bindings.retainUntil,
        Metadata: { "artifact-sha256": ref.sha256, "artifact-kind": ref.kind } };
    },
    async listObjectVersions(args) {
      calls.histories += 1;
      assert.equal(args.prefix, marker.key);
      return { Versions: [{ Key: marker.key, VersionId: marker.version_id, IsLatest: true }], DeleteMarkers: [] };
    },
    async probeAnonymousAccess() { calls.anonymous += 1; return { s3_status: 403, cloudfront_status: 403 }; },
  };
  const registry = { schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: new Date(at - 86400000).toISOString(), keys: [{ key_id: "synthetic-owner", algorithm: "Ed25519",
      public_key_spki_pem: ownerKeys.publicKey.export({ type: "spki", format: "pem" }), roles: ["owner"],
      actions: [INTERNAL_INSTALLATION_AUTHORIZE_ACTION, INTERNAL_INSTALLATION_REVOKE_ACTION], environments: ["synthetic-test"],
      valid_from: new Date(at - 86400000).toISOString(), valid_until: new Date(at + 30 * 86400000).toISOString(), revoked_at: null }] };
  const registryBytes = canonicalBytes(registry);
  const installed = installedReceipt(release, artifacts.installer, keySha256);
  const input = { request: {
    schema_version: INTERNAL_INSTALLATION_CONTROL_SCHEMA, action: INTERNAL_INSTALLATION_AUTHORIZE_ACTION,
    environment: "synthetic-test", authorization_id: "synthetic-authorization-001", tenant_id: release.lawosTenantId,
    user_id: "synthetic-user", entra_subject_id: "synthetic-subject",
    device_public_key_spki_pem: deviceKeys.publicKey.export({ type: "spki", format: "pem" }),
    device_key_fingerprint: sha256Hex(deviceKeys.publicKey.export({ type: "spki", format: "der" })),
    installed_receipt_sha256: sha256Hex(JSON.stringify(installed)), canary_id: installed.canary_id,
    bootstrap_release: release, bootstrap_marker: marker, installer_ref: artifacts.installer,
    executor_source_sha: "a".repeat(40), executor_source_tree: "b".repeat(40),
    valid_from: release.generatedAt, valid_until: release.expiresAt,
  }, installedReceiptBytes: Buffer.from(JSON.stringify(installed)) };
  function approve(request, overrides = {}) {
    const receipt = { schema_version: "law-firm-os.runtime-safety.approval.v1", approval_id: "synthetic-owner-approval",
      key_id: "synthetic-owner", role: "owner", decision: "approved", packet_sha256: internalUnsignedInstallationRequestSha256(request),
      source_sha: "a".repeat(40), source_tree: "b".repeat(40), action: request.action, environment: "synthetic-test",
      signed_at: new Date(at - 900000).toISOString(), expires_at: new Date(at + 900000).toISOString(),
      data_scope: ["internal-unsigned-installation-authority"], contact_scope: [], ...overrides };
    return { registryBytes, receiptBytes: canonicalBytes(receipt),
      signatureBytes: sign(null, Buffer.from(canonicalizeJson(receipt)), ownerKeys.privateKey) };
  }
  input.approval = approve(input.request);
  const config = {
    controlPool: { [POSTGRES_TENANT_CONTEXT_SECRET]: Buffer.alloc(32, 7), async connect() {
      calls.connects += 1;
      const context = new Map();
      return { async query(sql, values) {
        calls.queries.push({ sql, values });
        if (sql.includes("set_config(")) {
          context.set(sql.match(/set_config\('([^']+)'/u)[1], values[0]);
          return {};
        }
        if (sql === "SELECT lawos_security.current_tenant_id() AS tenant_id") {
          const tenantId = context.get("app.current_tenant_id");
          const nonce = context.get("app.tenant_context_nonce");
          assert.match(nonce, /^[A-Za-z0-9_-]{43}$/u);
          assert.equal(context.get("app.tenant_context_signature"), createHmac("sha256", Buffer.alloc(32, 7))
            .update(`${tenantId}\x1f${nonce}`).digest("hex"));
          return { rows: [{ tenant_id: tenantId }] };
        }
        if (!values) return {};
        const grant = JSON.parse(values[1]);
        assert.equal(values[0], release.lawosTenantId);
        return { rows: [{ result: sql.includes("authorize_internal")
          ? { authorization_id: grant.authorization_id, release_authority_sha256: grant.release_authority_sha256,
            authorized_at: new Date(now).toISOString() }
          : { authorization_id: grant.authorization_id, revocation_id: grant.revocation_id,
            revoked_at: new Date(now).toISOString() } }] };
      }, release() { calls.releases += 1; } };
    } },
    aws, bindings, cloudFrontDomain: "synthetic.example.invalid", trustedPublicKey: bootstrapKeys.publicKey,
    expectedPublicKeySha256: keySha256, expectedRegistrySha256: sha256Hex(registryBytes), expectedRole: "owner",
    environment: "synthetic-test", executorSourceSha: "a".repeat(40), executorSourceTree: "b".repeat(40), clock: () => now,
  };
  return { input, config, calls, objects, registry, approve, installed, setNow: (value) => { now = value; },
    control: () => createInternalUnsignedInstallationReleaseControl(config) };
}

test("owner-authorized exact bootstrap and measured installed receipt produce one control grant", async () => {
  const f = fixture();
  const result = await f.control().authorize(f.input);
  assert.equal(f.calls.reads.length, 7);
  assert.equal(new Set(f.calls.reads.map((row) => `${row.key}\0${row.versionId}`)).size, 7);
  assert.equal(f.calls.histories, 1);
  assert.equal(f.calls.anonymous, 2);
  assert.deepEqual(f.calls.queries.map(({ sql }) => sql), ["BEGIN ISOLATION LEVEL SERIALIZABLE",
    "SET LOCAL statement_timeout = 15000", "SELECT set_config('app.current_tenant_id', $1, true)",
    "SELECT set_config('app.tenant_context_nonce', $1, true)", "SELECT set_config('app.tenant_context_signature', $1, true)",
    "SELECT lawos_security.current_tenant_id() AS tenant_id",
    "SELECT lawos_email_dms.authorize_internal_unsigned_release($1::text, $2::jsonb) AS result", "COMMIT"]);
  const grant = JSON.parse(f.calls.queries[6].values[1]);
  const { release_authority_sha256: digest, ...material } = grant;
  assert.equal(digest, sha256Hex(canonicalizeJson(material)));
  assert.equal(grant.source_sha, f.input.request.bootstrap_release.sourceSha);
  assert.notEqual(grant.source_sha, f.config.executorSourceSha);
  assert.equal(grant.installer_version_id, f.input.request.installer_ref.version_id);
  assert.match(grant.owner_approval_sha256, /^[0-9a-f]{64}$/u);
  assert.equal(result.release_authority_sha256, digest);
  assert.equal(f.calls.releases, 1);
});

const requestCases = [
  ["wrong tenant", (r) => { r.tenant_id = "other-tenant"; }],
  ["wrong device", (r) => { r.device_key_fingerprint = "0".repeat(64); }],
  ["wrong canary", (r) => { r.canary_id = "other-canary-001"; }],
  ["wrong installer version", (r) => { r.installer_ref.version_id = "other-version"; }],
  ["wrong executor", (r) => { r.executor_source_sha = "0".repeat(40); }],
  ["grant outlives bootstrap", (r) => { r.valid_until = "2026-09-13T00:00:00.000Z"; }],
  ["grant predates bootstrap", (r) => { r.valid_from = "2026-09-05T10:00:00.000Z"; }],
  ["caller supplied trust flag", (r) => { r.release_trusted = true; }],
];
for (const [name, mutate] of requestCases) test(`rejects ${name} even with a real owner signature`, async () => {
  const f = fixture();
  mutate(f.input.request);
  f.input.approval = f.approve(f.input.request);
  await assert.rejects(f.control().authorize(f.input));
  assert.equal(f.calls.connects, 0);
});

for (const [name, overrides] of [
  ["expired approval", { expires_at: "2026-09-05T11:59:00.000Z" }],
  ["future approval", { signed_at: "2026-09-05T12:01:00.000Z" }],
  ["rejected approval", { decision: "rejected" }],
  ["wrong action", { action: INTERNAL_INSTALLATION_REVOKE_ACTION }],
  ["wrong role", { role: "publisher" }],
  ["missing data scope", { data_scope: [] }],
  ["wrong packet", { packet_sha256: "0".repeat(64) }],
]) test(`rejects ${name} before any storage or database access`, async () => {
  const f = fixture();
  f.input.approval = f.approve(f.input.request, overrides);
  await assert.rejects(f.control().authorize(f.input));
  assert.equal(f.calls.reads.length, 0);
  assert.equal(f.calls.connects, 0);
});

test("rejects forged signatures and unpinned or revoked owner registries", async () => {
  for (const mode of ["signature", "registry", "revoked"]) {
    const f = fixture();
    if (mode === "signature") f.input.approval.signatureBytes[0] ^= 1;
    else {
      f.registry.keys[0].revoked_at = "2026-09-05T11:00:00.000Z";
      f.input.approval.registryBytes = canonicalBytes(f.registry);
      if (mode === "revoked") f.config.expectedRegistrySha256 = sha256Hex(f.input.approval.registryBytes);
    }
    await assert.rejects(f.control().authorize(f.input));
    assert.equal(f.calls.connects, 0);
  }
});

test("rejects receipt byte tampering and structurally invalid installed measurements", async () => {
  for (const mode of ["bytes", "native-tree", "stage", "update-trust", "future-observation"]) {
    const f = fixture();
    if (mode === "bytes") f.input.installedReceiptBytes[10] ^= 1;
    else {
      if (mode === "native-tree") f.installed.observed.native_installed_tree.files[0].bytes += 1;
      if (mode === "stage") f.installed.stage = "preinstall";
      if (mode === "update-trust") f.installed.observed.package_metadata.update_trust.public_key_spki_sha256 = "0".repeat(64);
      if (mode === "future-observation") f.installed.captured_at_utc = "2026-09-05T12:01:00.000Z";
      f.input.installedReceiptBytes = Buffer.from(JSON.stringify(f.installed));
      f.input.request.installed_receipt_sha256 = sha256Hex(f.input.installedReceiptBytes);
      f.input.approval = f.approve(f.input.request);
    }
    await assert.rejects(f.control().authorize(f.input));
    assert.equal(f.calls.connects, 0);
  }
});

test("missing object, corrupt signature/body, nonunique marker history, or public access deny authorization", async () => {
  for (const mode of ["missing", "signature", "body", "history", "anonymous"]) {
    const f = fixture();
    if (mode === "history") f.config.aws.listObjectVersions = async () => ({ Versions: [], DeleteMarkers: [] });
    else if (mode === "anonymous") f.config.aws.probeAnonymousAccess = async () => ({ s3_status: 200, cloudfront_status: 403 });
    else {
      const target = [...f.objects.entries()].find(([, { ref }]) => ref.kind === (mode === "signature" ? "release_manifest_signature" : "sbom"));
      if (mode === "missing") f.objects.delete(target[0]);
      else target[1].body[0] ^= 1;
    }
    await assert.rejects(f.control().authorize(f.input));
    assert.equal(f.calls.connects, 0);
  }
});

test("self-consistent installed tree with a different build manifest cannot acquire release authority", async () => {
  const f = fixture();
  const observed = f.installed.observed;
  const body = "substituted-build-manifest";
  const sha256 = sha256Hex(body);
  observed.build_manifest_file.sha256 = sha256;
  observed.build_manifest_file.bytes = body.length;
  observed.package_metadata.build_manifest.sha256 = sha256;
  const tree = observed.native_installed_tree;
  Object.assign(tree.files.find(({ path }) => path.endsWith("matter-build-manifest.json")), { sha256, bytes: body.length });
  tree.bytes = tree.files.reduce((sum, row) => sum + row.bytes, 0);
  tree.content_sha256 = sha256Hex(tree.files.map((row) => `${row.sha256} ${row.bytes} ${row.path}\n`).join(""));
  for (const phase of tree.phases) Object.assign(phase, { bytes: tree.bytes, content_sha256: tree.content_sha256 });
  f.input.installedReceiptBytes = Buffer.from(JSON.stringify(f.installed));
  f.input.request.installed_receipt_sha256 = sha256Hex(f.input.installedReceiptBytes);
  f.input.approval = f.approve(f.input.request);
  await assert.rejects(f.control().authorize(f.input), /installed build manifest hash differs/u);
  assert.equal(f.calls.reads.length, 7);
  assert.equal(f.calls.connects, 0);
});

test("installed build manifest metadata must identify the measured and signed file", async () => {
  const f = fixture();
  f.installed.observed.package_metadata.build_manifest.sha256 = "0".repeat(64);
  f.input.installedReceiptBytes = Buffer.from(JSON.stringify(f.installed));
  f.input.request.installed_receipt_sha256 = sha256Hex(f.input.installedReceiptBytes);
  f.input.approval = f.approve(f.input.request);
  await assert.rejects(f.control().authorize(f.input), /metadata hash differs/u);
  assert.equal(f.calls.reads.length, 7);
  assert.equal(f.calls.connects, 0);
});

test("approval expiring during full readback rolls back before the grant write", async () => {
  const f = fixture();
  const probe = f.config.aws.probeAnonymousAccess;
  f.config.aws.probeAnonymousAccess = async (args) => {
    f.setNow(NOW + 16 * 60000);
    return probe(args);
  };
  await assert.rejects(f.control().authorize(f.input));
  assert.equal(f.calls.queries.at(-1).sql, "ROLLBACK");
  assert.equal(f.calls.queries.some(({ sql }) => sql.includes("authorize_internal_unsigned_release")), false);
  assert.equal(f.calls.releases, 1);
});

function revocationRequest(f) {
  return { schema_version: INTERNAL_INSTALLATION_CONTROL_SCHEMA, action: INTERNAL_INSTALLATION_REVOKE_ACTION,
    environment: f.config.environment, tenant_id: f.input.request.tenant_id, authorization_id: f.input.request.authorization_id,
    executor_source_sha: f.config.executorSourceSha, executor_source_tree: f.config.executorSourceTree,
    expected_release_authority_sha256: "e".repeat(64), revocation_id: "synthetic-revocation-001", reason: "owner_revoked" };
}

test("fresh signed revocation binds the exact authorization, digest, reason and revocation id", async () => {
  const f = fixture();
  const request = revocationRequest(f);
  const result = await f.control().revoke({ request, approval: f.approve(request) });
  assert.equal(result.revocation_id, request.revocation_id);
  assert.equal(f.calls.reads.length, 0);
  assert.equal(f.calls.queries[6].sql, "SELECT lawos_email_dms.revoke_internal_unsigned_release($1::text, $2::jsonb) AS result");
  const payload = JSON.parse(f.calls.queries[6].values[1]);
  assert.deepEqual(Object.keys(payload), ["authorization_id", "expected_release_authority_sha256", "revocation_id", "reason", "owner_approval_sha256"]);
  for (const field of ["authorization_id", "expected_release_authority_sha256", "revocation_id", "reason"]) {
    assert.equal(payload[field], request[field]);
  }
  request.reason = "different_reason";
  await assert.rejects(f.control().revoke({ request, approval: f.approve(revocationRequest(f)) }), /packet/u);
});

test("database rejection is sanitized, rolls back and releases the control connection", async () => {
  const f = fixture();
  const failure = Object.assign(new Error("authorization was already revoked"), { code: "RELEASE_REVOKED" });
  const connect = f.config.controlPool.connect;
  f.config.controlPool.connect = async () => {
    const client = await connect();
    const query = client.query;
    client.query = async (sql, values) => {
      if (sql.includes("authorize_internal_unsigned_release")) throw failure;
      return query(sql, values);
    };
    return client;
  };
  await assert.rejects(f.control().authorize(f.input), (error) => error.postgres_code === "RELEASE_REVOKED"
    && error.message === "PostgreSQL operation failed");
  assert.equal(f.calls.queries.at(-1).sql, "ROLLBACK");
  assert.equal(f.calls.releases, 1);
});

test("approval expiring while the control query runs is rolled back before commit", async () => {
  const f = fixture();
  const connect = f.config.controlPool.connect;
  f.config.controlPool.connect = async () => {
    const client = await connect();
    const query = client.query;
    client.query = async (sql, values) => {
      const result = await query(sql, values);
      if (sql.includes("authorize_internal_unsigned_release")) f.setNow(NOW + 16 * 60000);
      return result;
    };
    return client;
  };
  await assert.rejects(f.control().authorize(f.input));
  assert.equal(f.calls.queries.at(-1).sql, "ROLLBACK");
  assert.equal(f.calls.queries.some(({ sql }) => sql === "COMMIT"), false);
  assert.equal(f.calls.releases, 1);
});

test("actual PostgreSQL control role authenticates tenant context, replays once and revokes irreversibly", { concurrency: false }, async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "synthetic-tenant", userId: "synthetic-user", entraSubjectId: "synthetic-subject",
  });
  if (!authority) return;
  const f = fixture({ at: Date.now() });
  f.config.controlPool = authority.appPool;
  await assert.rejects(f.control().authorize(f.input), (error) => error.postgres_code === "42501");
  f.config.controlPool = authority.controlPool;
  const control = f.control();
  const authorized = await control.authorize(f.input);
  assert.equal(authorized.authorization_id, f.input.request.authorization_id);
  assert.deepEqual(await control.authorize(f.input), authorized);
  const request = revocationRequest(f);
  request.expected_release_authority_sha256 = authorized.release_authority_sha256;
  const approval = f.approve(request);
  const revoked = await control.revoke({ request, approval });
  assert.equal(revoked.authorization_id, authorized.authorization_id);
  assert.deepEqual(await control.revoke({ request, approval }), revoked);
  await assert.rejects(control.authorize(f.input), (error) => error.postgres_code === "LIU06");
});
