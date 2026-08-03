import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  constants,
  existsSync,
  fchmodSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  statSync,
  symlinkSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";
import {
  JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
  JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY,
  JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA,
} from "../lib/json-postgres-production-artifact.mjs";
import {
  isExactJsonContentType,
  PROFILE_HTTP_RESPONSE_MAX_BYTES,
} from "../lib/profile-media-api-smoke.mjs";
import {
  PROFILE_PRODUCTION_API_SMOKE_SCHEMA,
  runProfileProductionApiSmoke,
} from "../lib/profile-production-api-smoke.mjs";
import { main } from "../run-profile-production-api-smoke.mjs";
import {
  PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION,
  PROFILE_PHOTO_SLOT_REFS,
  captureProfilePhotoManifest,
} from "../validate-profile-photo-replacement-manifest.mjs";
import {
  syntheticPng,
  tempRoot,
  writePhotoDirectory,
} from "./profile-media-test-fixture.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sealOuterManifest(value) {
  value.manifest_canonical_sha256 = sha256(stableJson({
    ...value,
    manifest_canonical_sha256: "",
  }));
  return value;
}

function makeOuterManifest(source, manifestSha256) {
  const generationRef = `profile_generation_${manifestSha256.slice(0, 32)}`;
  return sealOuterManifest({
    schema_version: JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
    source_sha: source.sha,
    source_tree: source.tree,
    source_timestamp: "2026-08-01T00:00:00.000Z",
    runtime: "nodejs22.x",
    node_version: "22.22.3",
    npm_version: "10.9.4",
    dependency_lock_sha256: "1".repeat(64),
    rds_ca_bundle: {
      source: "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem",
      retrieval_mode: "validated-truststore-bytes",
      sha256: "2".repeat(64),
      byte_size: 100,
      certificate_count: 1,
    },
    source_overrides: [
      {
        source_path: "packages/master-data/src/production-client-candidates.js",
        target_path: "packages/master-data/src/amic-client-candidates.js",
        purpose: "real-clients-loaded-from-approved-postgres-migration-only",
        sha256: "3".repeat(64),
        byte_size: 100,
      },
      {
        source_path: "apps/api/src/production-lawos-role-registry.js",
        target_path: "apps/api/src/lawos-role-registry.js",
        purpose: "roles-loaded-from-postgres-identity-membership-only",
        sha256: "4".repeat(64),
        byte_size: 100,
      },
    ],
    source_override_count: 2,
    source_redactions: [
      { target_path: "apps/api/src/lambda.js", purpose: "redaction", sha256: "5".repeat(64), byte_size: 100 },
      { target_path: "apps/api/src/outlook-addin-runtime-context.js", purpose: "redaction", sha256: "6".repeat(64), byte_size: 100 },
      { target_path: "packages/matter/src/worktree-template-model.js", purpose: "redaction", sha256: "7".repeat(64), byte_size: 100 },
    ],
    source_redaction_count: 3,
    scanned_source_count: 100,
    packaged_real_identity_count: 0,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
    packaged_private_profile_photo_count: 10,
    packaged_account_seed_count: 0,
    packaged_roster_count: 0,
    packaged_public_professional_profile_count: 10,
    data_scope: "approved-immutable-inputs-only",
    operational_authority: "postgres-v2",
    json_fallback: false,
    json_writer: false,
    dual_write: false,
    file_current_authority: false,
    offline_mutation: false,
    memory_fallback: false,
    secrets_in_environment: false,
    production_ready_claim: false,
    profile_photo_artifact: {
      metadata_path: JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY,
      metadata_schema_version: JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA,
      metadata_sha256: "8".repeat(64),
      generation_ref: generationRef,
      private_manifest_schema_version: PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION,
      private_manifest_sha256: manifestSha256,
      private_manifest_entry_count: 10,
      injected_photo_entry_count: 10,
      git_source_photo_entry_count: 0,
    },
    artifact_filename: `lawos-production-${source.sha}.zip`,
    artifact_sha256: "9".repeat(64),
    artifact_byte_size: 123_456,
    artifact_entry_count: 24,
    artifact_entries_sha256: "a".repeat(64),
    artifact_runtime_store_entry_count: 0,
    artifact_real_json_store_count: 0,
    artifact_private_staging_entry_count: 0,
    artifact_s3_key: `lawos-production/${source.sha}/${"9".repeat(64)}.zip`,
    manifest_canonical_sha256: "",
  });
}

function fixture(testContext, label = "pass") {
  const root = tempRoot(testContext, `lawos-profile-production-${label}-`);
  const repoRoot = join(root, "repository");
  const privateRoot = join(root, "private");
  mkdirSync(repoRoot, { mode: 0o700 });
  mkdirSync(privateRoot, { mode: 0o700 });
  const photoDirectory = writePhotoDirectory(privateRoot, "photos");
  const privateManifestPath = join(privateRoot, "profile-photo-manifest.json");
  captureProfilePhotoManifest({ directory: photoDirectory, manifestPath: privateManifestPath });
  const privateManifestBytes = readFileSync(privateManifestPath);
  const privateManifest = JSON.parse(privateManifestBytes);
  const privateManifestSha256 = sha256(privateManifestBytes);
  const source = Object.freeze({ sha: "b".repeat(40), tree: "c".repeat(40) });
  const outerManifest = makeOuterManifest(source, privateManifestSha256);
  const artifactManifestPath = join(privateRoot, "production-artifact.manifest.json");
  writeFileSync(artifactManifestPath, `${JSON.stringify(outerManifest, null, 2)}\n`, { mode: 0o600 });
  const receiptPath = join(privateRoot, `profile-production-${label}.receipt.json`);
  const sessionTokens = Array.from({ length: 10 }, (_, index) =>
    `session-${String(index + 1).padStart(2, "0")}-${"x".repeat(24)}`);
  const bytesBySlot = new Map(privateManifest.entries.map((entry) => [
    entry.slot_ref,
    readFileSync(join(photoDirectory, entry.filename)),
  ]));
  return {
    root,
    repoRoot,
    privateRoot,
    photoDirectory,
    privateManifest,
    privateManifestPath,
    privateManifestSha256,
    artifactManifestPath,
    receiptPath,
    source,
    sessionTokens,
    bytesBySlot,
    options: {
      repoRoot,
      source,
      baseUrl: "https://profile.example.test",
      privateManifestPath,
      artifactManifestPath,
      receiptPath,
      sessionTokens,
      nodeVersion: "22.22.3",
      now: () => new Date("2026-08-01T01:02:03.000Z"),
    },
  };
}

function syntheticResponseBytes(value) {
  return value.rawBytes ?? Buffer.from(value.rawText ?? JSON.stringify(value.payload), "utf8");
}

function syntheticResponseStream(value) {
  return {
    getReader() {
      let sent = false;
      return {
        async read() {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: syntheticResponseBytes(value) };
        },
        async cancel() { value.streamCancelled = true; },
      };
    },
  };
}

function profileBody(bytes) {
  return {
    request_id: "req_profile_production_smoke",
    outcome: "passed",
    item: {
      profile_ref: "profile:synthetic",
      actor_ref: "user_synthetic",
      tenant_ref: "tenant_synthetic",
      display_name: "Synthetic Profile",
      english_name: "Synthetic Profile",
      primary_role_label: "Attorney",
      employee_id: "employee_synthetic",
      work_email: "",
      mobile_phone: "",
      title: "Attorney",
      department: "Legal",
      affiliation: "Synthetic Firm",
      organization_group: "Synthetic Firm",
      start_date: "2026-01-01",
      country: "KR",
      professional_profile: {
        schema_version: "law-firm-os.people-professional-profile.v0.1",
        profile_kind: "attorney",
        public_role_labels: [],
        practice_areas: [],
        experience: [],
        education: [],
        qualifications: [],
        source_refs: [],
        source_notes: [],
        excluded_claim_refs: [],
      },
      photo_url: `data:image/png;base64,${bytes.toString("base64")}`,
      role_count: 1,
      contract_summary: {
        state: "connected",
        visible_contract_count: 0,
        source_ref: "synthetic_profile_smoke",
      },
      account_summary: {
        state: "connected",
        session_principal_source: "api_signed_session",
        session_source_ref: null,
        employee_user_link_resolved: true,
      },
      contact_policy: {
        visibility: "authenticated_internal",
        allowed_fields: ["work_email", "mobile_phone"],
        public_renderer_literals_allowed: false,
      },
      secret_material_included: false,
      direct_identifier_included: false,
      photo_included: true,
      production_ready_claim: false,
    },
    safe_error_codes: [],
    audit_hint_ref: "profile_media_operability",
    ui_state: "populated",
    count_leak_prevented: true,
    production_ready_claim: false,
  };
}

function response(bytes, generationRef, status = 200, url = "https://profile.example.test/api/profile/me") {
  let value;
  value = {
    status,
    redirected: false,
    url,
    payload: profileBody(bytes),
    rawBytes: null,
    rawText: null,
    jsonCalled: false,
    streamCancelled: false,
    headerOverrides: {},
    headers: {
      get(name) {
        const key = name.toLowerCase();
        if (Object.hasOwn(value.headerOverrides, key)) return value.headerOverrides[key];
        if (key === "content-type") return "application/json; charset=utf-8";
        if (key === "content-length") return String(syntheticResponseBytes(value).byteLength);
        return key === "x-lawos-profile-photo-generation" ? generationRef : null;
      },
    },
    async json() {
      this.jsonCalled = true;
      throw new Error("response.json must not be called");
    },
  };
  value.body = syntheticResponseStream(value);
  return value;
}

function healthResponse(state) {
  const url = new URL("/api/health", `${state.options.baseUrl}/`).href;
  let value;
  value = {
    status: 200,
    redirected: false,
    url,
    headerOverrides: {},
    rawBytes: null,
    rawText: null,
    textCalled: false,
    streamCancelled: false,
    payload: {
      status: "ok",
      time: "2026-08-01T01:00:00.000Z",
      source_revision: state.source.sha,
      runtime_profile: "operational",
      synthetic_login_enabled: false,
      persistence_authority: "postgres-v2",
      runtime_safety_policy: { offline_capability: "rejected" },
      auth_authority: { staff_auth_authority: "internal-password" },
      service: "@law-firm-os/api",
      version: "0.1.0",
      bounded_contexts: [],
      permission_gate: { default_decision: "deny" },
      enrichment: { mode: "synthetic_crosswalk" },
      synthetic_only: false,
      uses_real_client_data: true,
      persistence_authority_capabilities: { authority: "postgres-v2" },
    },
    headers: {
      get(name) {
        const key = name.toLowerCase();
        if (Object.hasOwn(value.headerOverrides, key)) return value.headerOverrides[key];
        if (key === "content-type") return "application/json";
        if (key === "content-length") return String(syntheticResponseBytes(value).byteLength);
        return null;
      },
    },
    async text() {
      this.textCalled = true;
      throw new Error("response.text must not be called");
    },
  };
  value.body = syntheticResponseStream(value);
  return value;
}

function attachOversizeStream(value, maxBytes) {
  value.headerOverrides["content-length"] = null;
  value.streamCancelled = false;
  let readCount = 0;
  value.body = {
    getReader: () => ({
      async read() {
        readCount += 1;
        if (readCount === 1) return { done: false, value: Buffer.alloc(maxBytes, 0x20) };
        return { done: false, value: Uint8Array.of(0x20) };
      },
      async cancel() { value.streamCancelled = true; },
    }),
  };
  return value;
}

function passingFetch(
  state,
  transform = (value) => value,
  transformHealth = (value) => value,
) {
  const calls = [];
  const expectedGenerationRef = `profile_generation_${state.privateManifestSha256.slice(0, 32)}`;
  const fetchImpl = async (url, init) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname === "/api/health") {
      const call = { url: parsedUrl, init, kind: "health", index: null, ref: null };
      calls.push(call);
      const value = healthResponse(state);
      call.response = value;
      return transformHealth(value, call, state);
    }
    const token = String(init?.headers?.authorization ?? "").replace(/^Bearer /u, "");
    const index = state.sessionTokens.indexOf(token);
    const ref = PROFILE_PHOTO_SLOT_REFS[index];
    const call = { url: parsedUrl, init, kind: "profile", index, ref };
    calls.push(call);
    const value = response(
      state.bytesBySlot.get(ref),
      expectedGenerationRef,
      200,
      parsedUrl.href,
    );
    call.response = value;
    return transform(value, call, state);
  };
  return { calls, fetchImpl };
}

function rewriteOuter(state, mutate) {
  const value = JSON.parse(readFileSync(state.artifactManifestPath, "utf8"));
  mutate(value);
  sealOuterManifest(value);
  writeFileSync(state.artifactManifestPath, `${JSON.stringify(value, null, 2)}\n`);
}

function leafSwapIo(target, outside, phase = "open") {
  const observation = { swapped: false, noFollowObserved: constants.O_NOFOLLOW === undefined };
  let targetDescriptor;
  const swap = () => {
    renameSync(target, `${target}.pre-swap`);
    symlinkSync(outside, target, "file");
    observation.swapped = true;
  };
  return {
    observation,
    io: {
      openSync(path, flags) {
        if (path === target) {
          observation.noFollowObserved = observation.noFollowObserved
            || (flags & constants.O_NOFOLLOW) === constants.O_NOFOLLOW;
          if (phase === "open") {
            swap();
            return openSync(path, flags & ~(constants.O_NOFOLLOW ?? 0));
          }
          targetDescriptor = openSync(path, flags);
          return targetDescriptor;
        }
        return openSync(path, flags);
      },
      readSync(descriptor, buffer, offset, length, position) {
        if (phase === "read" && descriptor === targetDescriptor && !observation.swapped) swap();
        return readSync(descriptor, buffer, offset, length, position);
      },
    },
  };
}

function directorySwapIo(target, directory, outsideDirectory, phase = "open") {
  const observation = { swapped: false, noFollowObserved: constants.O_NOFOLLOW === undefined };
  let targetDescriptor;
  const swap = () => {
    renameSync(directory, `${directory}.pre-swap`);
    symlinkSync(outsideDirectory, directory, "dir");
    observation.swapped = true;
  };
  return {
    observation,
    io: {
      openSync(path, flags) {
        if (path === target) {
          observation.noFollowObserved = observation.noFollowObserved
            || (flags & constants.O_NOFOLLOW) === constants.O_NOFOLLOW;
          if (phase === "open") {
            swap();
            return openSync(path, flags);
          }
          targetDescriptor = openSync(path, flags);
          return targetDescriptor;
        }
        return openSync(path, flags);
      },
      readSync(descriptor, buffer, offset, length, position) {
        if (phase === "read" && descriptor === targetDescriptor && !observation.swapped) swap();
        return readSync(descriptor, buffer, offset, length, position);
      },
    },
  };
}

function receiptParentSwap(state, phase) {
  const movedParent = `${state.privateRoot}.receipt-${phase}-original`;
  const replacementParent = join(state.repoRoot, `receipt-${phase}-replacement`);
  mkdirSync(replacementParent, { mode: 0o700 });
  const observation = { swapped: false };
  return {
    movedParent,
    replacementParent,
    observation,
    hook() {
      renameSync(state.privateRoot, movedParent);
      symlinkSync(replacementParent, state.privateRoot, "dir");
      observation.swapped = true;
    },
  };
}

function cliArgs(state, execute = false) {
  return [
    ...(execute ? ["--execute"] : []),
    "--base-url", state.options.baseUrl,
    "--profile-photo-manifest", state.privateManifestPath,
    "--artifact-manifest", state.artifactManifestPath,
    "--receipt", state.receiptPath,
  ];
}

function tokenEnvironment(tokens) {
  return Object.fromEntries(tokens.map((token, index) => [
    `LAWOS_PROFILE_SESSION_${String(index + 1).padStart(2, "0")}`,
    token,
  ]));
}

function sink() {
  return { value: "", write(chunk) { this.value += chunk; } };
}

test("dry-run validates bindings but performs zero fetches and writes no receipt", async (testContext) => {
  const state = fixture(testContext, "dry-run");
  let fetchCount = 0;
  const result = await runProfileProductionApiSmoke({
    ...state.options,
    execute: false,
    fetchImpl() { fetchCount += 1; throw new Error("must not fetch"); },
  });
  assert.equal(result.verdict, "DRY_RUN");
  assert.equal(result.health_get_count, 0);
  assert.equal(result.authenticated_get_count, 0);
  assert.equal(result.total_get_count, 0);
  assert.equal(fetchCount, 0);
  assert.equal(existsSync(state.receiptPath), false);
});

test("non-HTTPS origins and non-Node-22 execution fail before fetch", async (testContext) => {
  const http = fixture(testContext, "http");
  await assert.rejects(
    runProfileProductionApiSmoke({ ...http.options, baseUrl: "http://profile.example.test" }),
    (error) => error.code === "PROFILE_API_URL_INVALID",
  );
  const wrongNode = fixture(testContext, "node-version");
  await assert.rejects(
    runProfileProductionApiSmoke({ ...wrongNode.options, nodeVersion: "26.0.0" }),
    (error) => error.code === "PROFILE_PRODUCTION_NODE_VERSION",
  );
});

test("real CLI source resolver accepts clean exact source and rejects dirty source before fetch", async (testContext) => {
  const state = fixture(testContext, "exact-source");
  const git = (...args) => execFileSync("git", args, {
    cwd: state.repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  writeFileSync(join(state.repoRoot, "tracked.txt"), "exact source\n", { mode: 0o600 });
  git("init", "-q");
  git("add", "tracked.txt");
  git("-c", "user.name=Profile Smoke Test", "-c", "user.email=profile-smoke@example.test",
    "commit", "-q", "-m", "test: exact source fixture");
  const source = { sha: git("rev-parse", "HEAD"), tree: git("rev-parse", "HEAD^{tree}") };
  rewriteOuter(state, (value) => {
    value.source_sha = source.sha;
    value.source_tree = source.tree;
    value.artifact_filename = `lawos-production-${source.sha}.zip`;
    value.artifact_s3_key = `lawos-production/${source.sha}/${value.artifact_sha256}.zip`;
  });

  let fetchCount = 0;
  const cleanStdout = sink();
  assert.equal(await main(cliArgs(state), {
    repoRoot: state.repoRoot,
    fetchImpl() { fetchCount += 1; throw new Error("must not fetch"); },
    stdout: cleanStdout,
    stderr: sink(),
  }), 0);
  assert.equal(JSON.parse(cleanStdout.value).verdict, "DRY_RUN");
  assert.equal(fetchCount, 0);

  writeFileSync(join(state.repoRoot, "tracked.txt"), "dirty source\n", { mode: 0o600 });
  const dirtyStdout = sink();
  const dirtyStderr = sink();
  assert.equal(await main(cliArgs(state, true), {
    repoRoot: state.repoRoot,
    env: tokenEnvironment(state.sessionTokens),
    fetchImpl() { fetchCount += 1; throw new Error("must not fetch"); },
    stdout: dirtyStdout,
    stderr: dirtyStderr,
  }), 1);
  assert.equal(fetchCount, 0);
  assert.equal(dirtyStdout.value, "");
  assert.equal(JSON.parse(dirtyStderr.value).code, "PROFILE_PRODUCTION_SMOKE_FAILED");
  assert.equal(existsSync(state.receiptPath), false);

  writeFileSync(join(state.repoRoot, "tracked.txt"), "exact source\n", { mode: 0o600 });
  writeFileSync(join(state.repoRoot, "untracked.txt"), "untracked source\n", { mode: 0o600 });
  const untrackedStderr = sink();
  assert.equal(await main(cliArgs(state, true), {
    repoRoot: state.repoRoot,
    env: tokenEnvironment(state.sessionTokens),
    fetchImpl() { fetchCount += 1; throw new Error("must not fetch"); },
    stdout: sink(),
    stderr: untrackedStderr,
  }), 1);
  assert.equal(fetchCount, 0);
  assert.equal(JSON.parse(untrackedStderr.value).code, "PROFILE_PRODUCTION_SMOKE_FAILED");
  assert.equal(existsSync(state.receiptPath), false);
});

test("execute requires ten distinct environment sessions before any network read", async (testContext) => {
  for (const [label, tokens] of [
    ["missing-token", Array.from({ length: 9 }, (_, index) => `session-${index}-${"m".repeat(24)}`)],
    ["duplicate-token", Array(10).fill(`same-session-${"d".repeat(24)}`)],
  ]) {
    const state = fixture(testContext, label);
    let fetchCount = 0;
    const stdout = sink();
    const stderr = sink();
    const status = await main(cliArgs(state, true), {
      repoRoot: state.repoRoot,
      source: state.source,
      nodeVersion: "22.22.3",
      env: tokenEnvironment(tokens),
      fetchImpl() { fetchCount += 1; throw new Error("must not fetch"); },
      stdout,
      stderr,
    });
    assert.equal(status, 1);
    assert.equal(fetchCount, 0);
    assert.equal(stdout.value, "");
    assert.equal(JSON.parse(stderr.value).code, "PROFILE_SESSION_SET_INVALID");
    assert.equal(existsSync(state.receiptPath), false);
  }
});

test("private inputs reject broad permissions, symlinks, and worktree paths", async (testContext) => {
  for (const kind of ["profile", "artifact"]) {
    const broad = fixture(testContext, `${kind}-broad`);
    const broadPath = kind === "profile" ? broad.privateManifestPath : broad.artifactManifestPath;
    chmodSync(broadPath, 0o644);
    await assert.rejects(
      runProfileProductionApiSmoke(broad.options),
      (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
    );

    const linked = fixture(testContext, `${kind}-link`);
    const sourcePath = kind === "profile" ? linked.privateManifestPath : linked.artifactManifestPath;
    const linkPath = join(linked.privateRoot, `${kind}-link.json`);
    symlinkSync(sourcePath, linkPath, "file");
    await assert.rejects(
      runProfileProductionApiSmoke({
        ...linked.options,
        [kind === "profile" ? "privateManifestPath" : "artifactManifestPath"]: linkPath,
      }),
      (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
    );

    const inside = fixture(testContext, `${kind}-inside`);
    const insidePath = join(inside.repoRoot, `${kind}.json`);
    const outsidePath = kind === "profile" ? inside.privateManifestPath : inside.artifactManifestPath;
    writeFileSync(insidePath, readFileSync(outsidePath), { mode: 0o600 });
    await assert.rejects(
      runProfileProductionApiSmoke({
        ...inside.options,
        [kind === "profile" ? "privateManifestPath" : "artifactManifestPath"]: insidePath,
      }),
      (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
    );
  }
});

test("descriptor-pinned reads reject deterministic leaf-to-outside symlink swaps for both manifests", async (testContext) => {
  const profile = fixture(testContext, "profile-leaf-swap");
  const outsidePhotoDirectory = writePhotoDirectory(profile.privateRoot, "outside-photos", 91);
  const outsidePrivateManifest = join(profile.privateRoot, "outside-profile-manifest.json");
  captureProfilePhotoManifest({
    directory: outsidePhotoDirectory,
    manifestPath: outsidePrivateManifest,
  });
  const outsidePrivateSha256 = sha256(readFileSync(outsidePrivateManifest));
  writeFileSync(
    profile.artifactManifestPath,
    `${JSON.stringify(makeOuterManifest(profile.source, outsidePrivateSha256), null, 2)}\n`,
  );
  const profileSwap = leafSwapIo(profile.privateManifestPath, outsidePrivateManifest);
  await assert.rejects(
    runProfileProductionApiSmoke({ ...profile.options, testPrivateInputIo: profileSwap.io }),
    (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
  );
  assert.deepEqual(profileSwap.observation, { swapped: true, noFollowObserved: true });
  assert.equal(existsSync(profile.receiptPath), false);

  const artifact = fixture(testContext, "artifact-leaf-swap");
  const outsideArtifactManifest = join(artifact.privateRoot, "outside-artifact-manifest.json");
  const outsideOuter = makeOuterManifest(artifact.source, artifact.privateManifestSha256);
  outsideOuter.artifact_sha256 = "e".repeat(64);
  outsideOuter.artifact_s3_key = `lawos-production/${artifact.source.sha}/${"e".repeat(64)}.zip`;
  sealOuterManifest(outsideOuter);
  writeFileSync(outsideArtifactManifest, `${JSON.stringify(outsideOuter, null, 2)}\n`, { mode: 0o600 });
  const artifactSwap = leafSwapIo(artifact.artifactManifestPath, outsideArtifactManifest, "read");
  await assert.rejects(
    runProfileProductionApiSmoke({ ...artifact.options, testPrivateInputIo: artifactSwap.io }),
    (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
  );
  assert.deepEqual(artifactSwap.observation, { swapped: true, noFollowObserved: true });
  assert.equal(existsSync(artifact.receiptPath), false);
});

test("descriptor snapshots reject deterministic whole-parent-directory swaps for both manifests", async (testContext) => {
  const profile = fixture(testContext, "profile-directory-swap");
  const outsideProfileTree = join(profile.root, "outside-profile-tree");
  mkdirSync(outsideProfileTree, { mode: 0o700 });
  const outsidePhotos = writePhotoDirectory(outsideProfileTree, "photos", 92);
  const outsideProfileManifest = join(outsideProfileTree, basename(profile.privateManifestPath));
  captureProfilePhotoManifest({ directory: outsidePhotos, manifestPath: outsideProfileManifest });
  const outsideProfileSha256 = sha256(readFileSync(outsideProfileManifest));
  writeFileSync(
    join(outsideProfileTree, basename(profile.artifactManifestPath)),
    `${JSON.stringify(makeOuterManifest(profile.source, outsideProfileSha256), null, 2)}\n`,
    { mode: 0o600 },
  );
  const profileSwap = directorySwapIo(
    profile.privateManifestPath,
    profile.privateRoot,
    outsideProfileTree,
  );
  await assert.rejects(
    runProfileProductionApiSmoke({ ...profile.options, testPrivateInputIo: profileSwap.io }),
    (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
  );
  assert.deepEqual(profileSwap.observation, { swapped: true, noFollowObserved: true });
  assert.equal(existsSync(profile.receiptPath), false);
  assert.equal(existsSync(join(`${profile.privateRoot}.pre-swap`, basename(profile.receiptPath))), false);

  const artifact = fixture(testContext, "artifact-directory-swap");
  const outsideArtifactTree = join(artifact.root, "outside-artifact-tree");
  mkdirSync(outsideArtifactTree, { mode: 0o700 });
  writeFileSync(
    join(outsideArtifactTree, basename(artifact.privateManifestPath)),
    readFileSync(artifact.privateManifestPath),
    { mode: 0o600 },
  );
  const outsideOuter = makeOuterManifest(artifact.source, artifact.privateManifestSha256);
  outsideOuter.artifact_sha256 = "d".repeat(64);
  outsideOuter.artifact_s3_key = `lawos-production/${artifact.source.sha}/${"d".repeat(64)}.zip`;
  sealOuterManifest(outsideOuter);
  writeFileSync(
    join(outsideArtifactTree, basename(artifact.artifactManifestPath)),
    `${JSON.stringify(outsideOuter, null, 2)}\n`,
    { mode: 0o600 },
  );
  const artifactSwap = directorySwapIo(
    artifact.artifactManifestPath,
    artifact.privateRoot,
    outsideArtifactTree,
    "read",
  );
  await assert.rejects(
    runProfileProductionApiSmoke({ ...artifact.options, testPrivateInputIo: artifactSwap.io }),
    (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
  );
  assert.deepEqual(artifactSwap.observation, { swapped: true, noFollowObserved: true });
  assert.equal(existsSync(artifact.receiptPath), false);
  assert.equal(existsSync(join(`${artifact.privateRoot}.pre-swap`, basename(artifact.receiptPath))), false);
});

test("private input caps are enforced while owner-readable 0400 files remain valid", async (testContext) => {
  const ownerReadOnly = fixture(testContext, "owner-read-only");
  chmodSync(ownerReadOnly.privateManifestPath, 0o400);
  chmodSync(ownerReadOnly.artifactManifestPath, 0o400);
  assert.equal((await runProfileProductionApiSmoke(ownerReadOnly.options)).verdict, "DRY_RUN");

  const profileOversize = fixture(testContext, "profile-oversize");
  writeFileSync(profileOversize.privateManifestPath, Buffer.alloc(256 * 1024 + 1, 0x20));
  await assert.rejects(
    runProfileProductionApiSmoke(profileOversize.options),
    (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
  );
  assert.equal(existsSync(profileOversize.receiptPath), false);

  const artifactOversize = fixture(testContext, "artifact-oversize");
  writeFileSync(artifactOversize.artifactManifestPath, Buffer.alloc(2 * 1024 * 1024 + 1, 0x20));
  await assert.rejects(
    runProfileProductionApiSmoke(artifactOversize.options),
    (error) => error.code === "PROFILE_PRODUCTION_PRIVATE_INPUT",
  );
  assert.equal(existsSync(artifactOversize.receiptPath), false);
});

test("outer artifact manifest rejects v1, extra fields, descriptor drift, and source drift", async (testContext) => {
  for (const [label, mutate] of [
    ["v1", (value) => { value.schema_version = "law-firm-os.json-postgres-production-artifact.v1"; }],
    ["extra", (value) => { value.unapproved_extra = true; }],
    ["filename", (value) => { value.artifact_filename = "wrong.zip"; }],
    ["hash", (value) => { value.artifact_sha256 = "d".repeat(64); }],
    ["size", (value) => { value.artifact_byte_size = 0; }],
    ["photo-count", (value) => { value.profile_photo_artifact.injected_photo_entry_count = 9; }],
    ["source-tree", (value) => { value.source_tree = "d".repeat(40); }],
  ]) {
    const state = fixture(testContext, `outer-${label}`);
    rewriteOuter(state, mutate);
    await assert.rejects(runProfileProductionApiSmoke(state.options));
    assert.equal(existsSync(state.receiptPath), false);
  }
});

test("raw private-manifest SHA and derived generation must match the artifact binding", async (testContext) => {
  const rawDrift = fixture(testContext, "raw-manifest-drift");
  writeFileSync(rawDrift.privateManifestPath, Buffer.concat([
    readFileSync(rawDrift.privateManifestPath),
    Buffer.from("\n"),
  ]));
  await assert.rejects(
    runProfileProductionApiSmoke(rawDrift.options),
    (error) => error.code === "PROFILE_PRODUCTION_BINDING_MISMATCH",
  );

  const generationDrift = fixture(testContext, "generation-drift");
  rewriteOuter(generationDrift, (value) => {
    value.profile_photo_artifact.generation_ref = `profile_generation_${"e".repeat(32)}`;
  });
  await assert.rejects(
    runProfileProductionApiSmoke(generationDrift.options),
    (error) => error.code === "PROFILE_PRODUCTION_ARTIFACT_INVALID",
  );
});

test("health GET rejects source drift, MIME confusion, malformed JSON, length drift, and oversize bodies", async (testContext) => {
  for (const contentType of [
    "application/json",
    "application/json; charset=utf-8",
    "Application/JSON; CHARSET=\"UTF-8\"",
  ]) assert.equal(isExactJsonContentType(contentType), true);
  for (const [label, transformHealth, expectedCode] of [
    ["wrong-source", (value) => {
      value.payload.source_revision = "f".repeat(40);
      return value;
    }, "PROFILE_API_HEALTH_SOURCE_MISMATCH"],
    ["missing-source", (value) => {
      delete value.payload.source_revision;
      return value;
    }, "PROFILE_API_HEALTH_INVALID"],
    ["non-200", (value) => ({ ...value, status: 503 }), "PROFILE_API_HEALTH_INVALID"],
    ["redirect", (value) => ({
      ...value,
      redirected: true,
      url: "https://redirected.example.test/api/health",
    }), "PROFILE_API_HEALTH_INVALID"],
    ...[
      ["text", "text/plain"],
      ["jsonp", "application/jsonp"],
      ["json-seq", "application/json-seq"],
      ["malformed-charset", "application/json; charset"],
      ["wrong-charset", "application/json; charset=latin1"],
      ["duplicate-charset", "application/json; charset=utf-8; charset=utf-8"],
      ["comma-joined", "application/json, application/json"],
    ].map(([label, contentType]) => [label, (value) => {
      value.headerOverrides["content-type"] = contentType;
      return value;
    }, "PROFILE_API_HEALTH_INVALID"]),
    ["invalid-utf8", (value) => {
      value.rawBytes = Buffer.from([0xc3, 0x28]);
      return value;
    }, "PROFILE_API_HEALTH_INVALID"],
    ["trailing-json", (value) => {
      value.rawText = `${JSON.stringify(value.payload)}\n{}`;
      return value;
    }, "PROFILE_API_HEALTH_INVALID"],
    ["length-mismatch", (value) => {
      value.headerOverrides["content-length"] = String(
        Buffer.byteLength(JSON.stringify(value.payload), "utf8") + 1,
      );
      return value;
    }, "PROFILE_API_HEALTH_INVALID"],
    ["declared-oversize", (value) => {
      value.headerOverrides["content-length"] = String(256 * 1024 + 1);
      return value;
    }, "PROFILE_API_HEALTH_INVALID"],
    ["streamed-oversize", (value) =>
      attachOversizeStream(value, 256 * 1024), "PROFILE_API_HEALTH_INVALID"],
    ["extra-field", (value) => {
      value.payload.unexpected = true;
      return value;
    }, "PROFILE_API_HEALTH_INVALID"],
    ["timeout", () => { throw new DOMException("timed out", "TimeoutError"); }, "PROFILE_API_HEALTH_FAILED"],
  ]) {
    const state = fixture(testContext, `health-${label}`);
    const adapter = passingFetch(state, undefined, transformHealth);
    await assert.rejects(
      runProfileProductionApiSmoke({ ...state.options, execute: true, fetchImpl: adapter.fetchImpl }),
      (error) => error.code === expectedCode,
    );
    assert.equal(adapter.calls.filter((call) => call.kind === "health").length, 1);
    assert.equal(adapter.calls.filter((call) => call.kind === "profile").length, 0);
    if (label === "streamed-oversize") {
      assert.equal(adapter.calls[0].response.streamCancelled, true);
    }
    assert.equal(adapter.calls[0].response.textCalled, false);
    assert.equal(existsSync(state.receiptPath), false);
  }
});

test("profile GET rejects MIME confusion, redirects, length drift, oversize, malformed JSON, and extra fields", async (testContext) => {
  for (const [label, transform] of [
    ...[
      ["text", "text/plain"],
      ["jsonp", "application/jsonp"],
      ["json-seq", "application/json-seq"],
      ["malformed-charset", "application/json; charset"],
      ["wrong-charset", "application/json; charset=latin1"],
      ["duplicate-charset", "application/json; charset=utf-8; charset=utf-8"],
      ["comma-joined", "application/json, application/json"],
    ].map(([label, contentType]) => [label, (value) => {
      value.headerOverrides["content-type"] = contentType;
      return value;
    }]),
    ["redirect", (value) => ({ ...value, redirected: true })],
    ["url", (value) => ({ ...value, url: "https://redirected.example.test/api/profile/me" })],
    ["length-mismatch", (value) => {
      value.headerOverrides["content-length"] = String(
        Buffer.byteLength(JSON.stringify(value.payload), "utf8") + 1,
      );
      return value;
    }],
    ["declared-oversize", (value) => {
      value.headerOverrides["content-length"] = String(PROFILE_HTTP_RESPONSE_MAX_BYTES + 1);
      return value;
    }],
    ["streamed-oversize", (value) =>
      attachOversizeStream(value, PROFILE_HTTP_RESPONSE_MAX_BYTES)],
    ["invalid-utf8", (value) => {
      value.rawBytes = Buffer.from([0xc3, 0x28]);
      return value;
    }],
    ["trailing", (value) => {
      value.rawText = `${JSON.stringify(value.payload)}\n{}`;
      return value;
    }],
    ["extra-top-level", (value) => {
      value.payload.unexpected = true;
      return value;
    }],
    ["extra-item", (value) => {
      value.payload.item.unexpected = true;
      return value;
    }],
  ]) {
    const state = fixture(testContext, `profile-transport-${label}`);
    const adapter = passingFetch(state, transform);
    await assert.rejects(
      runProfileProductionApiSmoke({ ...state.options, execute: true, fetchImpl: adapter.fetchImpl }),
      (error) => error.code === "PROFILE_API_READ_FAILED",
    );
    assert.equal(adapter.calls.filter((call) => call.kind === "health").length, 1);
    assert.equal(adapter.calls.filter((call) => call.kind === "profile").length, 1);
    if (label === "streamed-oversize") {
      assert.equal(adapter.calls.find((call) => call.kind === "profile").response.streamCancelled, true);
    }
    assert.equal(existsSync(state.receiptPath), false);
  }
});

test("swapped and wrong valid PNGs fail closed without a partial receipt", async (testContext) => {
  for (const [label, transform] of [
    ["swapped", (value, call, state) => call.index === 0
      ? response(
        state.bytesBySlot.get(PROFILE_PHOTO_SLOT_REFS[1]),
        `profile_generation_${state.privateManifestSha256.slice(0, 32)}`,
        200,
        call.url.href,
      )
      : value],
    ["wrong", (value, call, state) => call.index === 0
      ? response(
        syntheticPng(99, 44),
        `profile_generation_${state.privateManifestSha256.slice(0, 32)}`,
        200,
        call.url.href,
      )
      : value],
  ]) {
    const state = fixture(testContext, label);
    const adapter = passingFetch(state, transform);
    await assert.rejects(
      runProfileProductionApiSmoke({ ...state.options, execute: true, fetchImpl: adapter.fetchImpl }),
      (error) => error.code === "PROFILE_API_COHORT_FAILED",
    );
    assert.equal(existsSync(state.receiptPath), false);
  }
});

test("generation header mismatch and failed HTTP leave no receipt", async (testContext) => {
  for (const [label, transform] of [
    ["header", (value) => {
      value.headerOverrides["x-lawos-profile-photo-generation"] =
        `profile_generation_${"f".repeat(32)}`;
      return value;
    }],
    ["http", (value) => ({ ...value, status: 503 })],
  ]) {
    const state = fixture(testContext, label);
    const adapter = passingFetch(state, transform);
    await assert.rejects(
      runProfileProductionApiSmoke({ ...state.options, execute: true, fetchImpl: adapter.fetchImpl }),
    );
    assert.equal(existsSync(state.receiptPath), false);
  }
});

test("CLI failure output redacts thrown secrets, identities, response text, and private paths", async (testContext) => {
  const state = fixture(testContext, "redaction");
  const stdout = sink();
  const stderr = sink();
  const leaked = `${state.privateManifestPath} person@example.test ${state.sessionTokens[0]} employee_amic_private`;
  const status = await main(cliArgs(state, true), {
    repoRoot: state.repoRoot,
    source: state.source,
    nodeVersion: "22.22.3",
    env: tokenEnvironment(state.sessionTokens),
    fetchImpl() { throw new Error(leaked); },
    stdout,
    stderr,
  });
  assert.equal(status, 1);
  assert.equal(stdout.value, "");
  assert.equal(JSON.parse(stderr.value).code, "PROFILE_API_HEALTH_FAILED");
  assert.doesNotMatch(stderr.value, /person@example\.test|employee_amic_private|session-01|profile-photo-manifest/u);
  assert.equal(existsSync(state.receiptPath), false);
});

test("complete PASS makes exactly ten authenticated GETs and one sanitized 0600 receipt", async (testContext) => {
  const state = fixture(testContext, "pass");
  const adapter = passingFetch(state);
  const stdout = sink();
  const stderr = sink();
  const status = await main(cliArgs(state, true), {
    repoRoot: state.repoRoot,
    source: state.source,
    nodeVersion: "22.22.3",
    env: tokenEnvironment(state.sessionTokens),
    fetchImpl: adapter.fetchImpl,
    now: state.options.now,
    stdout,
    stderr,
  });
  assert.equal(status, 0);
  assert.equal(stderr.value, "");
  const healthCalls = adapter.calls.filter((call) => call.kind === "health");
  const profileCalls = adapter.calls.filter((call) => call.kind === "profile");
  assert.equal(adapter.calls.length, 11);
  assert.equal(healthCalls.length, 1);
  assert.equal(profileCalls.length, 10);
  assert.deepEqual(adapter.calls.map((call) => call.init.method), Array(11).fill("GET"));
  assert.deepEqual(adapter.calls.map((call) => call.init.redirect), Array(11).fill("error"));
  assert.deepEqual(
    profileCalls.map((call) => call.init.headers.authorization),
    state.sessionTokens.map((token) => `Bearer ${token}`),
  );
  assert.equal(healthCalls[0].url.pathname, "/api/health");
  assert.equal(Object.hasOwn(healthCalls[0].init.headers, "authorization"), false);
  assert.ok(profileCalls.every((call) => call.url.pathname === "/api/profile/me"));
  assert.ok(profileCalls.every((call) => call.url.searchParams.get("permission_ref") === "ui_profile_me"));
  assert.ok(profileCalls.every((call) => call.response.jsonCalled === false));
  assert.equal(statSync(state.receiptPath).mode & 0o777, 0o600);

  const aggregate = JSON.parse(stdout.value);
  assert.deepEqual({
    verdict: aggregate.verdict,
    passed: aggregate.passed_profile_reads,
    health: aggregate.health_get_count,
    gets: aggregate.authenticated_get_count,
    total: aggregate.total_get_count,
    receipt: aggregate.receipt_written,
    mutations: aggregate.external_mutation_count,
  }, { verdict: "PASS", passed: 10, health: 1, gets: 10, total: 11, receipt: true, mutations: 0 });

  const receiptText = readFileSync(state.receiptPath, "utf8");
  const receipt = JSON.parse(receiptText);
  assert.deepEqual(Object.keys(receipt).sort(), [
    "api_artifact",
    "boundary",
    "generated_at",
    "private_values_emitted",
    "producer",
    "profile_photo",
    "profile_reads",
    "schema_version",
    "source",
    "verdict",
  ]);
  assert.equal(receipt.schema_version, PROFILE_PRODUCTION_API_SMOKE_SCHEMA);
  assert.deepEqual(receipt.source, { ...state.source, api_source_revision: state.source.sha });
  assert.equal(receipt.api_artifact.filename, `lawos-production-${state.source.sha}.zip`);
  assert.deepEqual(receipt.profile_photo, {
    generation_verified: true,
    expected_profile_count: 10,
    passed_profile_count: 10,
  });
  assert.ok(Object.values(receipt.profile_reads).every((value) => value === 10));
  assert.deepEqual(Object.keys(receipt.boundary).sort(), [
    "api_write_request_count",
    "authenticated_get_count",
    "authorized_production_read_only",
    "aws_control_plane_call_count",
    "database_mutation_count",
    "deployment_count",
    "desktop_deploy_count",
    "desktop_reinstall_count",
    "external_mutation_count",
    "health_get_count",
    "local_receipt_write_count",
    "total_get_count",
  ]);
  assert.deepEqual({
    writes: receipt.boundary.api_write_request_count,
    health: receipt.boundary.health_get_count,
    gets: receipt.boundary.authenticated_get_count,
    total: receipt.boundary.total_get_count,
    mutations: receipt.boundary.external_mutation_count,
    database: receipt.boundary.database_mutation_count,
    deployments: receipt.boundary.deployment_count,
    desktopDeploys: receipt.boundary.desktop_deploy_count,
    reinstalls: receipt.boundary.desktop_reinstall_count,
  }, {
    writes: 0,
    health: 1,
    gets: 10,
    total: 11,
    mutations: 0,
    database: 0,
    deployments: 0,
    desktopDeploys: 0,
    reinstalls: 0,
  });
  for (const forbidden of [
    ...state.sessionTokens,
    state.privateManifestPath,
    state.artifactManifestPath,
    state.privateManifestSha256,
    `profile_generation_${state.privateManifestSha256.slice(0, 32)}`,
    ...state.privateManifest.entries.flatMap((entry) => [entry.filename, entry.content_sha256]),
    "photo_url",
    "response",
    "employee_id",
    "email",
  ]) assert.equal(receiptText.includes(forbidden), false);
  assert.equal(stdout.value.includes(state.privateManifestSha256), false);
  assert.equal(
    stdout.value.includes(`profile_generation_${state.privateManifestSha256.slice(0, 32)}`),
    false,
  );
  assert.doesNotMatch(stdout.value, /profile_generation_|[a-f0-9]{64}|session-/u);
});

test("receipt parent must remain owner-only and a failed run never creates its target", async (testContext) => {
  const publicParent = fixture(testContext, "public-receipt-parent");
  chmodSync(publicParent.privateRoot, 0o755);
  await assert.rejects(
    runProfileProductionApiSmoke(publicParent.options),
    (error) => error.code === "PROFILE_PRODUCTION_RECEIPT_PATH",
  );
  assert.equal(existsSync(publicParent.receiptPath), false);

  const failed = fixture(testContext, "no-partial");
  const adapter = passingFetch(failed, () => { throw new Error("private response body"); });
  await assert.rejects(
    runProfileProductionApiSmoke({ ...failed.options, execute: true, fetchImpl: adapter.fetchImpl }),
    (error) => error.code === "PROFILE_API_READ_FAILED",
  );
  assert.equal(existsSync(failed.receiptPath), false);

  const partial = fixture(testContext, "partial-receipt-write");
  const partialAdapter = passingFetch(partial);
  let writeCount = 0;
  await assert.rejects(
    runProfileProductionApiSmoke({
      ...partial.options,
      execute: true,
      fetchImpl: partialAdapter.fetchImpl,
      testReceiptIo: {
        writeSync(descriptor, bytes, offset, length, position) {
          writeCount += 1;
          if (writeCount > 1) throw new Error("forced partial receipt write");
          return writeSync(descriptor, bytes, offset, Math.min(length, 32), position);
        },
      },
    }),
    (error) => error.code === "PROFILE_PRODUCTION_RECEIPT_WRITE",
  );
  assert.equal(writeCount, 2);
  assert.equal(existsSync(partial.receiptPath), false);
});

test("receipt creation rejects before-open, after-open, and during-write parent swaps without a partial file", async (testContext) => {
  for (const phase of ["beforeOpen", "afterOpen", "duringWrite"]) {
    const state = fixture(testContext, `receipt-${phase}-swap`);
    const adapter = passingFetch(state);
    const swap = receiptParentSwap(state, phase);
    await assert.rejects(
      runProfileProductionApiSmoke({
        ...state.options,
        execute: true,
        fetchImpl: adapter.fetchImpl,
        testReceiptIo: { [phase]: () => swap.hook() },
      }),
      (error) => error.code === "PROFILE_PRODUCTION_RECEIPT_WRITE",
    );
    assert.equal(swap.observation.swapped, true);
    assert.equal(adapter.calls.length, 11);
    assert.equal(existsSync(state.receiptPath), false);
    assert.equal(existsSync(join(swap.replacementParent, basename(state.receiptPath))), false);
    assert.equal(existsSync(join(swap.movedParent, basename(state.receiptPath))), false);
  }
});

test("receipt creation uses numeric no-follow exclusive flags and exact 0600 under umask 0777", async (testContext) => {
  const state = fixture(testContext, "receipt-umask");
  const adapter = passingFetch(state);
  const observation = {};
  const priorUmask = process.umask(0o777);
  let result;
  try {
    result = await runProfileProductionApiSmoke({
      ...state.options,
      execute: true,
      fetchImpl: adapter.fetchImpl,
      testReceiptIo: {
        openSync(path, flags, mode) {
          observation.path = path;
          observation.flags = flags;
          observation.openMode = mode;
          return openSync(path, flags, mode);
        },
        fchmodSync(descriptor, mode) {
          observation.fchmodMode = mode;
          return fchmodSync(descriptor, mode);
        },
      },
    });
  } finally {
    process.umask(priorUmask);
  }
  assert.equal(result.verdict, "PASS");
  assert.equal(observation.path, state.receiptPath);
  assert.equal(observation.openMode, 0o600);
  assert.equal(observation.fchmodMode, 0o600);
  assert.equal((observation.flags & constants.O_CREAT), constants.O_CREAT);
  assert.equal((observation.flags & constants.O_EXCL), constants.O_EXCL);
  assert.equal((observation.flags & constants.O_NOFOLLOW), constants.O_NOFOLLOW);
  assert.equal(statSync(state.receiptPath).mode & 0o777, 0o600);
});
