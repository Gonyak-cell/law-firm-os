import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_OID = /^[a-f0-9]{40}$/u;
const PRODUCT_IDS = new Set([
  "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
  "952431be-51b8-42a2-9bf6-769a15934e85",
]);
const PROFILE_NAMES = ["inquiry-only", "matter-full"];
const PROFILE_CONTRACTS = {
  "8f3cc90d-56dd-4c1c-b9c2-0a1100500101": {
    profile: "matter-full",
    mailbox_min_version: "1.14",
    production_manifest: "apps/addin/manifest.production.xml",
    taskpane_html: "index.html",
    required_static_paths: ["event-runtime.html", "event-runtime.js", "index.html"],
  },
  "952431be-51b8-42a2-9bf6-769a15934e85": {
    profile: "inquiry-only",
    mailbox_min_version: "1.3",
    production_manifest: "apps/addin/manifest.inquiry.production.xml",
    taskpane_html: "outlook-addin/index.html",
    required_static_paths: ["outlook-addin/index.html"],
  },
};
const MANIFEST_PATHS = [
  "apps/addin/manifest.inquiry.production.xml",
  "apps/addin/manifest.inquiry.xml",
  "apps/addin/manifest.production.xml",
  "apps/addin/manifest.xml",
];
const CLIENT_GRAPH_SCOPES = ["Calendars.ReadWrite", "Mail.Read", "offline_access"];
const CLIENT_OAUTH_SCOPES = ["Calendars.ReadWrite", "email", "Mail.Read", "offline_access", "openid", "profile"];
const APPROVED_LICENSES = ["0BSD", "Apache-2.0", "BlueOak-1.0.0", "BSD-2-Clause", "BSD-3-Clause", "CC-BY-4.0", "ISC", "MIT"];
const REQUIRED_HOSTS = ["classic-outlook-windows", "new-outlook-windows", "outlook-macos", "owa"];
const REQUIRED_COMMON_HOST_SCENARIOS = ["auth-reconnect", "item-switch", "offline-recovery"];
const REQUIRED_PREREQUISITES = [
  "additive_migrations",
  "api_release",
  "approved_template_runtime",
  "docusign_endpoint_and_secret_reference",
  "graph_endpoint_and_secret_reference",
  "precedent_index_runtime",
  "static_release",
];
const REQUIRED_RELEASE_PATHS = [
  "apps/addin/src/inquiry-entry.jsx",
  "apps/addin/src/matter-entry.js",
  "apps/api/src/microsoft-delegated-oauth-client.js",
  "apps/api/src/outlook-graph-webhook.js",
  "apps/api/src/outlook-time-entry-draft-adapter.js",
  "packages/dms/src/search/postgres-precedent-repository.js",
  "packages/email-dms/src/email-filing-correction-service.js",
  "packages/email-dms/src/graph-subscription-service.js",
  "packages/email-dms/src/m365-connection-model.js",
  "packages/integrations-core/src/docusign-envelope-adapter.js",
  "packages/integrations-core/src/docusign-postgres-repository.js",
  "packages/matter/src/approved-document-builder-service.js",
  "packages/matter/src/outlook-task-adapter.js",
];
const REQUIRED_TEST_PATHS = [
  "apps/addin/test/outlook-profile-build-artifact.mjs",
  "apps/api/test/microsoft-delegated-oauth-client.test.js",
  "apps/api/test/outlook-graph-webhook.test.js",
  "apps/api/test/outlook-time-entry-draft-postgres.test.js",
  "packages/dms/test/postgres-precedent-search.test.js",
  "packages/email-dms/test/email-filing-correction-concurrency.test.js",
  "packages/email-dms/test/graph-notification-queue.test.js",
  "packages/integrations-core/test/docusign-concurrency.test.js",
  "packages/integrations-core/test/docusign-postgres-concurrency.test.js",
  "packages/matter/test/document-builder-docx.test.js",
  "packages/matter/test/outlook-task-adapter.test.js",
];
const REQUIRED_STATIC_PATHS = [
  "amic-law-icon.png",
  "event-runtime.html",
  "event-runtime.js",
  "index.html",
  "oauth-callback.html",
  "oauth-callback.js",
  "oauth-start.html",
  "oauth-start.js",
  "outlook-addin/index.html",
];
const FORBIDDEN_BUILD_SUFFIXES = [".key", ".map", ".p12", ".pem", ".pfx"];
const FORBIDDEN_BUILD_TEXT = [
  "-----BEGIN PRIVATE KEY-----",
  "-----BEGIN RSA PRIVATE KEY-----",
  "/Users/",
  "/home/runner/work/",
  "sourcesContent\"",
];
const STATIC_NAMESPACES = [
  {
    excluded_source_prefixes: ["outlook-addin/"],
    invalidation_path: "/addin/*",
    product_id: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
    profile: "matter-full",
    source_prefix: "",
    target_prefix: "addin/",
  },
  {
    excluded_source_prefixes: [],
    invalidation_path: "/outlook-addin/*",
    product_id: "952431be-51b8-42a2-9bf6-769a15934e85",
    profile: "inquiry-only",
    source_prefix: "outlook-addin/",
    target_prefix: "outlook-addin/",
  },
];
const SENSITIVE_KEY = /^(?:access_token|authorization|client_secret|cookie|environment_values|id_token|mime_bytes|raw_body|refresh_token|webhook_signature)$/iu;
const SECRET_VALUE = /-----BEGIN (?:RSA )?PRIVATE KEY-----|\b(?:access_token|client_secret|refresh_token)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{16,}/iu;
const CANDIDATE_ALLOWED_CLAIM = "Exact source, deterministic local build, four official manifest validations, frozen profile drift, rollback metadata, and dependency licenses passed.";
const CANDIDATE_BLOCKED_CLAIM = "This receipt is not API/static/M365 deployment, propagation, real Outlook host, Graph delivery, DocuSign sandbox, or go-live evidence.";

export function sha256(value, encoding = "hex") {
  return createHash("sha256").update(value).digest(encoding);
}

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function assertEqual(actual, expected, name) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertExactKeys(value, expected, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object with exact fields`);
  }
  assertEqual(sorted(Object.keys(value)), sorted(expected), `${name} fields`);
}

function assertSha256(value, name) {
  if (!SHA256.test(value ?? "")) throw new Error(`${name} must be an exact SHA-256`);
  return value;
}

function inventorySha256(inventory) {
  return sha256(`${JSON.stringify(inventory)}\n`);
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right), "en"));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(sorted(Object.keys(value)).map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function assertSafeRelativePath(value, name) {
  const candidate = requiredText(value, name);
  const segments = candidate.split("/");
  if (candidate.startsWith("/")
    || candidate.includes("\\")
    || candidate.includes("\0")
    || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${name} is unsafe`);
  }
  return candidate;
}

function utcMillis(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value ?? "")) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

export function validateApiArtifactEntries(entries, embeddedManifestPath) {
  const expected = assertSafeRelativePath(embeddedManifestPath, "embedded API manifest path");
  const seen = new Set();
  let embeddedCount = 0;
  for (const rawEntry of entries ?? []) {
    const entry = requiredText(rawEntry, "API artifact entry");
    const pathWithoutDirectorySlash = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    if (entry.includes("\\")
      || entry.includes("//")
      || pathWithoutDirectorySlash.split("/").includes(".")
      || assertSafeRelativePath(pathWithoutDirectorySlash, "API artifact entry") !== pathWithoutDirectorySlash
      || seen.has(entry)) {
      throw new Error(`API artifact contains an unsafe or duplicate entry: ${entry}`);
    }
    seen.add(entry);
    if (entry === expected) embeddedCount += 1;
  }
  if (!seen.size || embeddedCount !== 1) {
    throw new Error(`API artifact must contain exactly one ${expected}`);
  }
  return { entry_count: seen.size, embedded_manifest_path: expected };
}

export function assertNoSensitiveMaterial(value, name = "release receipt") {
  const visit = (node, pointer) => {
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      if (SENSITIVE_KEY.test(key)) throw new Error(`${name} contains forbidden field ${pointer}.${key}`);
      if (typeof child === "string" && SECRET_VALUE.test(child)) {
        throw new Error(`${name} contains secret-like material at ${pointer}.${key}`);
      }
      visit(child, `${pointer}.${key}`);
    }
  };
  visit(value, "$ ".trim());
}

export function validateReleaseContract(contract) {
  if (contract?.schema_version !== 1) throw new Error("Outlook release gate schema_version must be 1");
  if (contract.release_version !== "1.1.0.0" || contract.rollback_version !== "1.0.1.1") {
    throw new Error("Outlook release and rollback versions drifted");
  }
  const profiles = contract.profiles ?? [];
  assertEqual(sorted(profiles.map(({ product_id }) => product_id)), sorted(PRODUCT_IDS), "release ProductIds");
  assertEqual(sorted(profiles.map(({ profile }) => profile)), sorted(PROFILE_NAMES), "release profiles");
  if (profiles.some(({ permission }) => permission !== "ReadItem")) throw new Error("release permission broadened");
  for (const profile of profiles) {
    const expected = PROFILE_CONTRACTS[profile.product_id];
    if (!expected
      || profile.profile !== expected.profile
      || profile.mailbox_min_version !== expected.mailbox_min_version
      || profile.production_manifest !== expected.production_manifest
      || profile.taskpane_html !== expected.taskpane_html) {
      throw new Error(`release profile identity/path mapping drifted: ${profile.product_id}`);
    }
    assertEqual(sorted(profile.required_static_paths ?? []), sorted(expected.required_static_paths), `${profile.profile} required static paths`);
  }
  assertEqual(sorted(contract.manifests ?? []), sorted(MANIFEST_PATHS), "release manifests");
  assertEqual(sorted(contract.client_outlook_graph_connection_scopes ?? []), sorted(CLIENT_GRAPH_SCOPES), "Client Outlook Graph scopes");
  assertEqual(sorted(contract.client_outlook_oauth_scopes ?? []), sorted(CLIENT_OAUTH_SCOPES), "Client Outlook OAuth scopes");
  assertEqual(sorted(contract.allowed_dependency_licenses ?? []), sorted(APPROVED_LICENSES), "dependency license allowlist");
  assertEqual(contract.required_dependencies, { docx: "MIT", "docusign-esign": "MIT" }, "required release dependencies");
  assertEqual(sorted(contract.required_release_paths ?? []), sorted(REQUIRED_RELEASE_PATHS), "required release paths");
  assertEqual(sorted(contract.required_test_paths ?? []), sorted(REQUIRED_TEST_PATHS), "required release tests");
  if (contract.build?.root !== "apps/addin/dist") throw new Error("Add-in build root drifted");
  assertEqual(contract.build?.command, ["npm", "--workspace", "apps/addin", "run", "build"], "Add-in build command");
  assertEqual(sorted(contract.build?.required_static_paths ?? []), sorted(REQUIRED_STATIC_PATHS), "required Add-in artifacts");
  assertEqual(sorted(contract.build?.forbidden_path_suffixes ?? []), sorted(FORBIDDEN_BUILD_SUFFIXES), "forbidden Add-in suffixes");
  assertEqual(sorted(contract.build?.forbidden_text_patterns ?? []), sorted(FORBIDDEN_BUILD_TEXT), "forbidden Add-in content markers");
  if (contract.api?.function_name !== "matter-lawos-api-prod"
    || contract.api?.aws_account_id !== "770880870480"
    || contract.api?.region !== "ap-northeast-2"
    || contract.api?.embedded_manifest_path !== "deployment-manifest.json") {
    throw new Error("API release target drifted");
  }
  if (JSON.stringify(canonical(contract.static_deploy?.namespaces)) !== JSON.stringify(canonical(STATIC_NAMESPACES))
    || JSON.stringify(contract.static_deploy?.protected_prefixes) !== JSON.stringify(["addin/manifests/"])
    || contract.static_deploy?.delete !== false
    || contract.static_deploy?.default_mode !== "dry-run") {
    throw new Error("static deployment must default to additive /addin and /outlook-addin dry-run namespaces");
  }
  if (contract.m365?.default_status !== "awaiting_authorized_deployment"
    || contract.m365?.propagation_window_is_sla !== false) {
    throw new Error("M365 release must default to awaiting authorization and a non-SLA observation window");
  }
  assertEqual(contract.m365?.propagation_observation_hours, [0, 24, 48, 72], "M365 propagation schedule");
  assertEqual(sorted(contract.m365?.required_host_evidence ?? []), sorted(REQUIRED_HOSTS), "M365 Outlook hosts");
  assertEqual(sorted(contract.m365?.required_common_host_scenarios ?? []), sorted(REQUIRED_COMMON_HOST_SCENARIOS), "M365 common host scenarios");
  assertEqual(sorted(contract.m365?.required_prerequisites ?? []), sorted(REQUIRED_PREREQUISITES), "M365 prerequisites");
  assertEqual(contract.m365?.required_profile_scenarios, {
    "matter-full": ["read", "compose", "on-message-send"],
    "inquiry-only": ["read"],
  }, "M365 profile scenarios");
  return { profile_count: 2, manifest_count: 4, release_version: contract.release_version };
}

export function validateSurfaceSeparation(surface, baseline, contract) {
  const baselineById = profileMap(baseline?.profiles, "deployment baseline");
  const profiles = profileMap(surface?.profiles, "surface contract");
  if (surface.release_candidate_version !== contract.release_version) throw new Error("surface release version drifted");
  for (const expected of contract.profiles) {
    const profile = profiles.get(expected.product_id);
    const baselineProfile = baselineById.get(expected.product_id);
    if (!profile || !baselineProfile) throw new Error(`missing release profile ${expected.product_id}`);
    if (profile.profile !== expected.profile || profile.permission !== expected.permission) {
      throw new Error(`${expected.profile} identity or permission drifted`);
    }
    if (profile.assignment_count !== baselineProfile.assignment_count
      || profile.assignment_fingerprint_sha256 !== baselineProfile.assignment_fingerprint_sha256) {
      throw new Error(`${expected.profile} assignment drifted`);
    }
  }
  const matter = profiles.get("8f3cc90d-56dd-4c1c-b9c2-0a1100500101")?.manifest_fingerprint;
  const inquiry = profiles.get("952431be-51b8-42a2-9bf6-769a15934e85")?.manifest_fingerprint;
  if (!matter || !inquiry
    || matter.launch_events?.length !== 1
    || !matter.launch_events[0].startsWith("OnMessageSend:")
    || inquiry.launch_events?.length !== 0
    || inquiry.rule_fingerprints?.some((rule) => rule.endsWith(":Edit"))) {
    throw new Error("Matter and inquiry host/event profiles leaked across ProductIds");
  }
  return { permission_event_assignment_diff: "none", profile_count: 2 };
}

export function validateDependencyLicenses(packageLock, contract) {
  if (packageLock?.lockfileVersion !== 3 || !packageLock.packages) throw new Error("npm lockfile v3 is required");
  const allowed = new Set(contract.allowed_dependency_licenses ?? []);
  const inventory = {};
  for (const [name, descriptor] of Object.entries(packageLock.packages)) {
    if (!name.startsWith("node_modules/") || descriptor.link === true) continue;
    const license = requiredText(descriptor.license, `${name}.license`);
    if (!allowed.has(license)) throw new Error(`dependency license is not allowlisted: ${name} (${license})`);
    inventory[license] = (inventory[license] ?? 0) + 1;
  }
  for (const [dependency, expectedLicense] of Object.entries(contract.required_dependencies ?? {})) {
    const descriptor = packageLock.packages[`node_modules/${dependency}`];
    if (!descriptor || descriptor.link === true || descriptor.license !== expectedLicense) {
      throw new Error(`required dependency/license missing: ${dependency} (${expectedLicense})`);
    }
  }
  return {
    checked_package_count: Object.values(inventory).reduce((sum, count) => sum + count, 0),
    licenses: canonical(inventory),
    required_dependencies: canonical(contract.required_dependencies),
  };
}

export function validateRollbackContract(rollback, baseline, contract) {
  if (rollback?.schema_version !== 1
    || rollback.candidate_version !== contract.release_version
    || rollback.rollback_version !== contract.rollback_version
    || rollback.permission_event_assignment_diff !== "none") {
    throw new Error("rollback version or permission/event/assignment contract drifted");
  }
  if (rollback.raw_assignment_pii_included !== false
    || rollback.secret_material_included !== false
    || rollback.raw_manifest_xml_included !== false) {
    throw new Error("rollback contract contains protected material");
  }
  const baselineById = profileMap(baseline?.profiles, "deployment baseline");
  const rollbackById = profileMap(rollback?.profiles, "rollback contract");
  const refs = new Set();
  const urls = new Set();
  for (const expected of contract.profiles) {
    const profile = rollbackById.get(expected.product_id);
    const deployed = baselineById.get(expected.product_id);
    if (!profile || !deployed || profile.profile !== expected.profile) throw new Error(`missing independent rollback for ${expected.profile}`);
    if (profile.rollback_manifest_sha256 !== deployed.manifest_sha256
      || profile.assignment_count !== deployed.assignment_count
      || profile.sanitized_assignment_fingerprint_sha256 !== deployed.assignment_fingerprint_sha256) {
      throw new Error(`${expected.profile} rollback baseline drifted`);
    }
    const ref = assertSafeRelativePath(profile.protected_manifest_ref, `${expected.profile} protected_manifest_ref`);
    if (!ref.startsWith(".omo/evidence/") || refs.has(ref)) throw new Error(`${expected.profile} rollback reference is not independent`);
    refs.add(ref);
    const url = new URL(requiredText(profile.rollback_manifest_url, `${expected.profile} rollback_manifest_url`));
    if (url.protocol !== "https:" || url.search || url.hash
      || !url.pathname.includes(`/${expected.product_id}/${contract.rollback_version}/`)
      || !url.pathname.includes(profile.rollback_manifest_sha256)
      || urls.has(url.href)) {
      throw new Error(`${expected.profile} rollback URL is not immutable and identity-bound`);
    }
    urls.add(url.href);
  }
  if (refs.size !== 2 || urls.size !== 2) throw new Error("two independent rollback artifacts are required");
  return { rollback_profile_count: 2, permission_event_assignment_diff: "none" };
}

export function validateCoveragePaths(existingPaths, contract) {
  const existing = existingPaths instanceof Set ? existingPaths : new Set(existingPaths ?? []);
  const required = [...(contract.required_release_paths ?? []), ...(contract.required_test_paths ?? [])];
  const missing = required.filter((candidate) => !existing.has(candidate));
  if (missing.length) throw new Error(`Outlook release coverage paths are missing: ${missing.join(", ")}`);
  return { required_path_count: required.length };
}

function normalizeInventory(entries, contract) {
  const seen = new Set();
  const forbiddenSuffixes = contract.build?.forbidden_path_suffixes ?? [];
  return entries.map((entry) => {
    const file = assertSafeRelativePath(entry.path, "build inventory path");
    if (seen.has(file)) throw new Error(`duplicate build path: ${file}`);
    seen.add(file);
    if (forbiddenSuffixes.some((suffix) => file.endsWith(suffix))) throw new Error(`forbidden build artifact: ${file}`);
    if (!Number.isSafeInteger(entry.byte_size) || entry.byte_size < 1 || !SHA256.test(entry.sha256 ?? "")) {
      throw new Error(`invalid build artifact metadata: ${file}`);
    }
    return { path: file, byte_size: entry.byte_size, sha256: entry.sha256 };
  }).sort((left, right) => left.path.localeCompare(right.path, "en"));
}

export function validateBuildInventories(firstEntries, secondEntries, contract) {
  const first = normalizeInventory(firstEntries, contract);
  const second = normalizeInventory(secondEntries, contract);
  for (const required of contract.build?.required_static_paths ?? []) {
    if (!first.some(({ path: file }) => file === required)) throw new Error(`required build artifact missing: ${required}`);
  }
  assertEqual(second, first, "deterministic double-build inventory");
  return {
    builds_identical: true,
    artifact_count: first.length,
    inventory_sha256: sha256(`${JSON.stringify(first)}\n`),
    inventory: first,
  };
}

export function validateReleaseCandidateReceipt(receipt, contract, context) {
  validateReleaseContract(contract);
  assertExactKeys(receipt, [
    "allowed_claim",
    "artifact_count",
    "blocked_claim",
    "builds_identical",
    "contract_artifacts",
    "coverage",
    "event_runtime",
    "exact_sha_bound",
    "external_mutations",
    "graph_scopes",
    "inventory",
    "inventory_sha256",
    "licenses",
    "manifest_validation",
    "package_lock_sha256",
    "profile_artifacts",
    "profiles",
    "rollback",
    "runtime_provider_calls",
    "schema_version",
    "source_sha",
    "source_tree",
    "surface",
    "verdict",
  ], "release candidate receipt");
  if (receipt.schema_version !== "amic-os.outlook-release-candidate.v1"
    || receipt.verdict !== "PASS"
    || receipt.exact_sha_bound !== true
    || receipt.builds_identical !== true
    || !GIT_OID.test(receipt.source_sha ?? "")
    || !GIT_OID.test(receipt.source_tree ?? "")
    || !SHA256.test(receipt.package_lock_sha256 ?? "")
    || receipt.runtime_provider_calls !== 0
    || receipt.external_mutations !== 0
    || receipt.allowed_claim !== CANDIDATE_ALLOWED_CLAIM
    || receipt.blocked_claim !== CANDIDATE_BLOCKED_CLAIM) {
    throw new Error("a passing zero-mutation exact-SHA release candidate receipt is required");
  }
  if (!context?.packageLock
    || !context.packageLockBytes
    || !context.baseline
    || !context.rollback
    || !context.surface
    || !context.contractArtifacts
    || !context.existingPaths
    || !context.manifestHashesByPath) {
    throw new Error("release candidate validation requires the exact lockfile and frozen proof contracts");
  }
  if (receipt.package_lock_sha256 !== sha256(context.packageLockBytes)) {
    throw new Error("release candidate package lock binding drifted");
  }
  if (context.expectedSourceIdentity
    && (receipt.source_sha !== context.expectedSourceIdentity.source_sha
      || receipt.source_tree !== context.expectedSourceIdentity.source_tree
      || receipt.package_lock_sha256 !== context.expectedSourceIdentity.package_lock_sha256)) {
    throw new Error("release candidate is stale for the exact current source SHA/tree/lock");
  }
  const artifactRefs = {
    baseline: contract.baseline_receipt,
    release_gate: "contracts/outlook-addin-release-gates.json",
    rollback: contract.rollback_contract,
    surface: contract.surface_contract,
  };
  assertExactKeys(receipt.contract_artifacts, Object.keys(artifactRefs), "release candidate contract_artifacts");
  assertEqual(canonical(receipt.contract_artifacts), canonical(context.contractArtifacts), "release candidate contract artifact bindings");
  for (const [name, ref] of Object.entries(artifactRefs)) {
    assertExactKeys(receipt.contract_artifacts[name], ["ref", "sha256"], `${name} contract artifact`);
    if (receipt.contract_artifacts[name].ref !== ref
      || assertSafeRelativePath(receipt.contract_artifacts[name].ref, `${name} contract artifact ref`) !== ref) {
      throw new Error(`${name} contract artifact reference drifted`);
    }
    assertSha256(receipt.contract_artifacts[name].sha256, `${name} contract artifact`);
  }
  for (const entry of receipt.inventory ?? []) assertExactKeys(entry, ["byte_size", "path", "sha256"], "release candidate inventory entry");
  const build = validateBuildInventories(receipt.inventory ?? [], receipt.inventory ?? [], contract);
  if (receipt.artifact_count !== build.artifact_count || receipt.inventory_sha256 !== build.inventory_sha256) {
    throw new Error("release candidate inventory summary drifted");
  }
  const artifacts = profileMap(receipt.profile_artifacts, "release candidate artifacts");
  const bundleHashes = new Set();
  for (const expected of contract.profiles) {
    const artifact = artifacts.get(expected.product_id);
    assertExactKeys(artifact, [
      "bundle_path",
      "bundle_sha256",
      "product_id",
      "profile",
      "taskpane_html_path",
      "taskpane_html_sha256",
    ], `${expected.profile} release candidate artifact`);
    const taskpane = build.inventory.find(({ path: file }) => file === expected.taskpane_html);
    const bundle = build.inventory.find(({ path: file }) => file === artifact.bundle_path);
    if (artifact.profile !== expected.profile
      || artifact.taskpane_html_path !== expected.taskpane_html
      || artifact.taskpane_html_sha256 !== taskpane?.sha256
      || !assertSafeRelativePath(artifact.bundle_path, `${expected.profile} bundle_path`)
      || artifact.bundle_sha256 !== bundle?.sha256) {
      throw new Error(`${expected.profile} release candidate artifact binding drifted`);
    }
    bundleHashes.add(artifact.bundle_sha256);
  }
  if (bundleHashes.size !== 2) throw new Error("release candidate task-pane bundles must remain independent");
  assertExactKeys(receipt.event_runtime, ["byte_size", "path", "sha256"], "release candidate event runtime");
  const eventRuntime = build.inventory.find(({ path: file }) => file === "event-runtime.js");
  if (JSON.stringify(receipt.event_runtime) !== JSON.stringify(eventRuntime)) {
    throw new Error("release candidate event runtime binding drifted");
  }
  assertExactKeys(receipt.manifest_validation, ["manifests", "official_validation_count", "validator"], "manifest validation receipt");
  if (receipt.manifest_validation.validator !== "office-addin-manifest@2.1.6"
    || receipt.manifest_validation.official_validation_count !== 4) {
    throw new Error("four official manifest validations are required");
  }
  const manifestByPath = new Map();
  for (const manifest of receipt.manifest_validation.manifests ?? []) {
    assertExactKeys(manifest, ["path", "sha256"], "manifest validation entry");
    if (!contract.manifests.includes(manifest.path)
      || manifestByPath.has(manifest.path)
      || !SHA256.test(manifest.sha256 ?? "")
      || manifest.sha256 !== context.manifestHashesByPath[manifest.path]) {
      throw new Error(`release candidate manifest receipt is invalid: ${manifest.path}`);
    }
    manifestByPath.set(manifest.path, manifest);
  }
  if (manifestByPath.size !== 4 || contract.manifests.some((manifest) => !manifestByPath.has(manifest))) {
    throw new Error("release candidate receipt must contain all four manifest hashes");
  }
  const candidateProfiles = profileMap(receipt.profiles, "release candidate manifest profiles");
  for (const expected of contract.profiles) {
    const profile = candidateProfiles.get(expected.product_id);
    assertExactKeys(profile, [
      "mailbox_min_version",
      "manifest_sha256",
      "permission",
      "product_id",
      "profile",
      "version",
    ], `${expected.profile} release candidate manifest profile`);
    if (profile.profile !== expected.profile
      || profile.version !== contract.release_version
      || profile.permission !== expected.permission
      || profile.mailbox_min_version !== expected.mailbox_min_version
      || profile.manifest_sha256 !== manifestByPath.get(expected.production_manifest)?.sha256) {
      throw new Error(`${expected.profile} manifest profile binding drifted`);
    }
  }
  assertExactKeys(receipt.coverage, ["required_path_count"], "release candidate coverage");
  assertEqual(receipt.coverage, validateCoveragePaths(context.existingPaths, contract), "release candidate coverage");
  assertEqual(canonical(receipt.licenses), canonical(validateDependencyLicenses(context.packageLock, contract)), "release candidate licenses");
  assertEqual(receipt.rollback, validateRollbackContract(context.rollback, context.baseline, contract), "release candidate rollback proof");
  assertEqual(receipt.surface, validateSurfaceSeparation(context.surface, context.baseline, contract), "release candidate surface proof");
  const graphScopes = [...contract.client_outlook_graph_connection_scopes].sort();
  const oauthScopes = [...contract.client_outlook_oauth_scopes].sort();
  assertExactKeys(receipt.graph_scopes, ["diff", "fingerprint_sha256", "graph_connection_scopes", "oauth_scopes"], "release candidate graph scopes");
  assertEqual(receipt.graph_scopes, {
    graph_connection_scopes: graphScopes,
    oauth_scopes: oauthScopes,
    fingerprint_sha256: sha256(JSON.stringify({ graphScopes, oauthScopes })),
    diff: "none",
  }, "release candidate Graph scope proof");
  return build;
}

export async function collectBuildInventory(root, contract) {
  const output = [];
  const walk = async (directory, prefix = "") => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) throw new Error(`build artifact must not be a symlink: ${relative}`);
      if (metadata.isDirectory()) await walk(absolute, relative);
      else if (metadata.isFile()) {
        const bytes = await readFile(absolute);
        const text = bytes.includes(0) ? "" : bytes.toString("utf8");
        for (const pattern of contract.build?.forbidden_text_patterns ?? []) {
          if (text.includes(pattern)) throw new Error(`build artifact contains forbidden source/secret marker: ${relative}`);
        }
        if (SECRET_VALUE.test(text)
          || (/MIME-Version:/iu.test(text) && /(?:^|\r?\n)Content-Type:/iu.test(text))) {
          throw new Error(`build artifact contains secret-like or raw MIME material: ${relative}`);
        }
        output.push({ path: relative, byte_size: bytes.byteLength, sha256: sha256(bytes) });
      }
    }
  };
  await walk(root);
  return normalizeInventory(output, contract);
}

function environmentProjection(configuration) {
  const variables = configuration?.Environment?.Variables;
  if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
    throw new Error("Lambda configuration Environment.Variables is required");
  }
  const keys = sorted(Object.keys(variables));
  return {
    key_count: keys.length,
    keys_sha256: sha256(JSON.stringify(keys)),
    values_sha256: sha256(JSON.stringify(canonical(variables))),
  };
}

function validateLambdaTarget(configuration, contract, name) {
  const expectedArn = `arn:aws:lambda:${contract.api.region}:${contract.api.aws_account_id}:function:${contract.api.function_name}`;
  if (configuration?.FunctionName !== contract.api.function_name || configuration?.FunctionArn !== expectedArn) {
    throw new Error(`${name} Lambda target drifted`);
  }
}

export function validateApiArtifactRelease({
  receipt,
  artifactBytes,
  embeddedManifest,
  expectedSourceSha,
  expectedSourceTree,
  packageLockBytes,
  beforeConfiguration,
  afterConfiguration,
  contract,
}) {
  validateReleaseContract(contract);
  assertNoSensitiveMaterial(receipt, "API release receipt");
  assertNoSensitiveMaterial(embeddedManifest, "embedded API deployment manifest");
  if (!GIT_OID.test(expectedSourceSha ?? "") || !GIT_OID.test(expectedSourceTree ?? "")) throw new Error("exact source SHA/tree is invalid");
  if (receipt?.schema_version !== "amic-os.outlook-api-release.v1") throw new Error("API release receipt schema is invalid");
  assertEqual(sorted(Object.keys(receipt)), [
    "artifact_sha256",
    "authorization_ref",
    "aws_account_id",
    "deployed_code_sha256",
    "environment",
    "function_name",
    "lambda_code_sha256",
    "mode",
    "mutation_count",
    "package_lock_sha256",
    "region",
    "schema_version",
    "source_sha",
    "source_tree",
    "status",
  ], "API release receipt fields");
  assertEqual(sorted(Object.keys(embeddedManifest ?? {})), [
    "artifact_kind",
    "package_lock_sha256",
    "schema_version",
    "source_sha",
    "source_tree",
  ], "embedded API deployment manifest fields");
  const artifact = Buffer.isBuffer(artifactBytes) ? artifactBytes : Buffer.from(artifactBytes ?? "");
  if (!artifact.byteLength) throw new Error("API artifact must not be empty");
  const artifactSha = sha256(artifact);
  const lambdaCodeSha = sha256(artifact, "base64");
  const lockSha = sha256(packageLockBytes);
  if (receipt.source_sha !== expectedSourceSha
    || receipt.source_tree !== expectedSourceTree
    || receipt.package_lock_sha256 !== lockSha
    || receipt.artifact_sha256 !== artifactSha
    || receipt.lambda_code_sha256 !== lambdaCodeSha) {
    throw new Error("API artifact exact-SHA binding failed");
  }
  if (embeddedManifest?.schema_version !== "amic-os.api-deployment-manifest.v1"
    || embeddedManifest?.source_sha !== expectedSourceSha
    || embeddedManifest?.source_tree !== expectedSourceTree
    || embeddedManifest?.package_lock_sha256 !== lockSha
    || embeddedManifest?.artifact_kind !== "matter-lawos-api-prod") {
    throw new Error("embedded API deployment manifest exact-SHA binding failed");
  }
  if (receipt.function_name !== contract.api.function_name
    || receipt.aws_account_id !== contract.api.aws_account_id
    || receipt.region !== contract.api.region) {
    throw new Error("API deployment target drifted");
  }
  validateLambdaTarget(beforeConfiguration, contract, "before-deploy");
  const before = environmentProjection(beforeConfiguration);
  assertEqual(receipt.environment?.before, before, "API before-environment fingerprint");
  if (receipt.mode === "dry-run") {
    assertEqual(sorted(Object.keys(receipt.environment ?? {})), ["before", "preservation_status"], "API dry-run environment receipt fields");
    if (receipt.authorization_ref != null
      || afterConfiguration !== undefined
      || receipt.status !== "artifact_verified_awaiting_authorized_deployment"
      || receipt.environment?.preservation_status !== "planned"
      || receipt.mutation_count !== 0
      || receipt.deployed_code_sha256 != null) {
      throw new Error("API dry-run receipt overclaims deployment or environment preservation");
    }
  } else if (receipt.mode === "post-deploy-readback") {
    assertEqual(sorted(Object.keys(receipt.environment ?? {})), ["after", "before", "preservation_status"], "API post-deploy environment receipt fields");
    validateLambdaTarget(afterConfiguration, contract, "after-deploy");
    const after = environmentProjection(afterConfiguration);
    assertEqual(after, before, "API Lambda environment preservation");
    assertEqual(receipt.environment?.after, after, "API after-environment fingerprint");
    if (!requiredText(receipt.authorization_ref, "API deployment authorization_ref")
      || receipt.status !== "deployed_readback_verified"
      || receipt.environment?.preservation_status !== "verified"
      || receipt.mutation_count !== 1
      || receipt.deployed_code_sha256 !== lambdaCodeSha
      || afterConfiguration?.CodeSha256 !== lambdaCodeSha) {
      throw new Error("API post-deploy code/environment readback is incomplete");
    }
  } else {
    throw new Error(`unsupported API release mode: ${receipt.mode}`);
  }
  return {
    status: receipt.status,
    source_sha: expectedSourceSha,
    artifact_sha256: artifactSha,
    lambda_code_sha256: lambdaCodeSha,
    environment: before,
  };
}

function inventoryForNamespace(inventory, namespace) {
  return inventory.filter(({ path: file }) => file.startsWith(namespace.source_prefix)
    && !(namespace.excluded_source_prefixes ?? []).some((prefix) => file.startsWith(prefix)));
}

function validateSourceLocations(locations, namespace, profile) {
  if (!Array.isArray(locations) || !locations.length) throw new Error(`${profile} SourceLocation is required`);
  for (const value of locations) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.pathname.startsWith(`/${namespace.target_prefix}`)) {
      throw new Error(`${profile} SourceLocation escaped /${namespace.target_prefix}`);
    }
  }
  return locations;
}

export function buildStaticDryRunPlan({ releaseReceipt, releaseContext, sourceLocations, contract, bucketRef }) {
  const releaseBuild = validateReleaseCandidateReceipt(releaseReceipt, contract, releaseContext);
  if (!/^[A-Z][A-Z0-9_]{2,63}$/u.test(bucketRef ?? "")) throw new Error("static bucket_ref must be symbolic");
  const protectedPrefixes = contract.static_deploy.protected_prefixes ?? [];
  const artifacts = profileMap(releaseReceipt.profile_artifacts, "static release artifacts");
  const manifestByPath = new Map(releaseReceipt.manifest_validation.manifests.map((manifest) => [manifest.path, manifest]));
  const profiles = contract.profiles.map((expected) => {
    const namespace = contract.static_deploy.namespaces.find(({ product_id }) => product_id === expected.product_id);
    const artifact = artifacts.get(expected.product_id);
    const inventory = inventoryForNamespace(releaseBuild.inventory, namespace);
    if (!inventory.length
      || !inventory.some(({ path: file }) => file === artifact.taskpane_html_path)
      || !inventory.some(({ path: file }) => file === artifact.bundle_path)
      || expected.required_static_paths.some((file) => !inventory.some(({ path: candidate }) => candidate === file))) {
      throw new Error(`${expected.profile} static namespace is missing its complete task pane/runtime inventory`);
    }
    const operations = inventory.map((entry) => {
      const relative = assertSafeRelativePath(entry.path.slice(namespace.source_prefix.length), `${expected.profile} static target path`);
      const targetKey = `${namespace.target_prefix}${relative}`;
      if (targetKey.endsWith(".xml") || protectedPrefixes.some((prefix) => targetKey.startsWith(prefix))) {
        throw new Error(`static dry-run attempted to overwrite a manifest object: ${targetKey}`);
      }
      return {
        byte_size: entry.byte_size,
        sha256: entry.sha256,
        source_path: `${contract.build.root}/${entry.path}`,
        target_key: targetKey,
      };
    });
    return {
      profile: expected.profile,
      product_id: expected.product_id,
      target_prefix: namespace.target_prefix,
      invalidation_path: namespace.invalidation_path,
      manifest_ref: expected.production_manifest,
      manifest_sha256: manifestByPath.get(expected.production_manifest)?.sha256,
      manifest_publish_mode: "m365_central_deployment_only",
      taskpane_html_path: artifact.taskpane_html_path,
      taskpane_html_sha256: artifact.taskpane_html_sha256,
      bundle_path: artifact.bundle_path,
      bundle_sha256: artifact.bundle_sha256,
      inventory_sha256: inventorySha256(inventory),
      inventory,
      operations,
      source_locations: validateSourceLocations(sourceLocations?.[expected.profile], namespace, expected.profile),
      source_location_coverage: true,
    };
  });
  return {
    schema_version: "amic-os.outlook-static-deploy-plan.v1",
    status: "dry_run_only_awaiting_authorization",
    mode: "dry-run",
    execution_performed: false,
    mutation_count: 0,
    delete: false,
    source_sha: releaseReceipt.source_sha,
    source_tree: releaseReceipt.source_tree,
    package_lock_sha256: releaseReceipt.package_lock_sha256,
    candidate_inventory_sha256: releaseReceipt.inventory_sha256,
    bucket_ref: bucketRef,
    protected_prefixes: protectedPrefixes,
    invalidation_paths: contract.static_deploy.namespaces.map(({ invalidation_path }) => invalidation_path),
    profiles,
    allowed_claim: "This is an additive dual-namespace object and invalidation plan only; no AWS operation was executed.",
    blocked_claim: "This is not static deployment, cache propagation, central deployment, or Outlook runtime evidence.",
  };
}

export function validateStaticDryRunPlan(plan, { contract, releaseReceipt, releaseContext, sourceLocations }) {
  assertNoSensitiveMaterial(plan, "static deploy plan");
  assertExactKeys(plan, [
    "allowed_claim",
    "blocked_claim",
    "bucket_ref",
    "candidate_inventory_sha256",
    "delete",
    "execution_performed",
    "invalidation_paths",
    "mode",
    "mutation_count",
    "package_lock_sha256",
    "profiles",
    "protected_prefixes",
    "schema_version",
    "source_sha",
    "source_tree",
    "status",
  ], "static deploy plan");
  const releaseBuild = validateReleaseCandidateReceipt(releaseReceipt, contract, releaseContext);
  if (plan.schema_version !== "amic-os.outlook-static-deploy-plan.v1"
    || plan.status !== "dry_run_only_awaiting_authorization"
    || plan.mode !== "dry-run"
    || plan.execution_performed !== false
    || plan.mutation_count !== 0
    || plan.delete !== false
    || plan.source_sha !== releaseReceipt.source_sha
    || plan.source_tree !== releaseReceipt.source_tree
    || plan.package_lock_sha256 !== releaseReceipt.package_lock_sha256
    || plan.candidate_inventory_sha256 !== releaseBuild.inventory_sha256
    || !/^[A-Z][A-Z0-9_]{2,63}$/u.test(plan.bucket_ref ?? "")
    || JSON.stringify(plan.protected_prefixes) !== JSON.stringify(contract.static_deploy.protected_prefixes)
    || JSON.stringify(plan.invalidation_paths) !== JSON.stringify(contract.static_deploy.namespaces.map(({ invalidation_path }) => invalidation_path))
    || plan.allowed_claim !== "This is an additive dual-namespace object and invalidation plan only; no AWS operation was executed."
    || plan.blocked_claim !== "This is not static deployment, cache propagation, central deployment, or Outlook runtime evidence.") {
    throw new Error("static deploy plan escaped the exact dual-namespace dry-run boundary");
  }
  const planProfiles = profileMap(plan.profiles, "static deploy plan profiles");
  const artifacts = profileMap(releaseReceipt.profile_artifacts, "static release artifacts");
  const manifestByPath = new Map(releaseReceipt.manifest_validation.manifests.map((manifest) => [manifest.path, manifest]));
  const allInventory = [];
  const targetKeys = new Set();
  let operationCount = 0;
  for (const expected of contract.profiles) {
    const profile = planProfiles.get(expected.product_id);
    const namespace = contract.static_deploy.namespaces.find(({ product_id }) => product_id === expected.product_id);
    const artifact = artifacts.get(expected.product_id);
    assertExactKeys(profile, [
      "bundle_path",
      "bundle_sha256",
      "invalidation_path",
      "inventory",
      "inventory_sha256",
      "manifest_publish_mode",
      "manifest_ref",
      "manifest_sha256",
      "operations",
      "product_id",
      "profile",
      "source_location_coverage",
      "source_locations",
      "target_prefix",
      "taskpane_html_path",
      "taskpane_html_sha256",
    ], `${expected.profile} static plan profile`);
    const expectedInventory = inventoryForNamespace(releaseBuild.inventory, namespace);
    for (const entry of profile.inventory ?? []) assertExactKeys(entry, ["byte_size", "path", "sha256"], `${expected.profile} static inventory entry`);
    if (profile.profile !== expected.profile
      || profile.target_prefix !== namespace.target_prefix
      || profile.invalidation_path !== namespace.invalidation_path
      || profile.manifest_ref !== expected.production_manifest
      || profile.manifest_sha256 !== manifestByPath.get(expected.production_manifest)?.sha256
      || profile.manifest_publish_mode !== "m365_central_deployment_only"
      || profile.taskpane_html_path !== artifact.taskpane_html_path
      || profile.taskpane_html_sha256 !== artifact.taskpane_html_sha256
      || profile.bundle_path !== artifact.bundle_path
      || profile.bundle_sha256 !== artifact.bundle_sha256
      || profile.inventory_sha256 !== inventorySha256(expectedInventory)
      || JSON.stringify(profile.inventory) !== JSON.stringify(expectedInventory)
      || profile.source_location_coverage !== true
      || JSON.stringify(profile.source_locations) !== JSON.stringify(sourceLocations?.[expected.profile])) {
      throw new Error(`${expected.profile} static namespace binding drifted`);
    }
    validateSourceLocations(profile.source_locations, namespace, expected.profile);
    if (!Array.isArray(profile.operations) || profile.operations.length !== expectedInventory.length) {
      throw new Error(`${expected.profile} static operation inventory is incomplete`);
    }
    for (const [index, operation] of profile.operations.entries()) {
      assertExactKeys(operation, ["byte_size", "sha256", "source_path", "target_key"], `${expected.profile} static operation`);
      const entry = expectedInventory[index];
      const relative = assertSafeRelativePath(entry.path.slice(namespace.source_prefix.length), `${expected.profile} static target path`);
      const targetKey = `${namespace.target_prefix}${relative}`;
      if (operation.source_path !== `${contract.build.root}/${entry.path}`
        || operation.target_key !== targetKey
        || operation.sha256 !== entry.sha256
        || operation.byte_size !== entry.byte_size
        || targetKeys.has(targetKey)
        || targetKey.endsWith(".xml")
        || contract.static_deploy.protected_prefixes.some((prefix) => targetKey.startsWith(prefix))) {
        throw new Error(`${expected.profile} static source/target mapping drifted: ${operation.target_key}`);
      }
      targetKeys.add(targetKey);
      operationCount += 1;
    }
    allInventory.push(...profile.inventory);
  }
  validateBuildInventories(allInventory, releaseBuild.inventory, contract);
  return { operation_count: operationCount, mutation_count: 0, execution_performed: false };
}

function profileMap(profiles, name) {
  const byId = new Map();
  for (const profile of profiles ?? []) {
    if (!PRODUCT_IDS.has(profile.product_id) || byId.has(profile.product_id)) throw new Error(`${name} ProductIds are invalid or duplicated`);
    byId.set(profile.product_id, profile);
  }
  if (byId.size !== 2) throw new Error(`${name} must contain both ProductIds`);
  return byId;
}

function staticReleaseProjection(plan, planSha256) {
  assertSha256(planSha256, "static release plan");
  return {
    plan_sha256: planSha256,
    source_sha: plan.source_sha,
    source_tree: plan.source_tree,
    package_lock_sha256: plan.package_lock_sha256,
    target_namespaces: plan.profiles.map(({ target_prefix }) => target_prefix),
    profiles: plan.profiles.map((profile) => ({
      profile: profile.profile,
      product_id: profile.product_id,
      target_prefix: profile.target_prefix,
      inventory_sha256: profile.inventory_sha256,
      manifest_sha256: profile.manifest_sha256,
      taskpane_html_sha256: profile.taskpane_html_sha256,
      bundle_sha256: profile.bundle_sha256,
      source_location_coverage: profile.source_location_coverage,
    })),
  };
}

export function validateM365ReleaseReceipt(receipt, {
  contract,
  baseline,
  rollback,
  releaseCandidate,
  releaseContext,
  candidateManifestHashes,
  candidateManifestProjections,
  expectedSourceIdentity,
  staticPlan,
  staticPlanSha256,
}) {
  assertNoSensitiveMaterial(receipt, "M365 release receipt");
  assertExactKeys(receipt, [
    "authorization_ref",
    "claims",
    "go_live_approval_ref",
    "graph_delegated_scope_diff",
    "host_evidence",
    "mutation_count",
    "operations",
    "package_lock_sha256",
    "permission_event_assignment_diff",
    "prerequisites",
    "profiles",
    "propagation_observations",
    "propagation_window_is_sla",
    "readbacks",
    "schema_version",
    "source_sha",
    "source_tree",
    "static_readbacks",
    "static_release",
    "status",
    "version",
  ], "M365 release receipt");
  if (receipt.schema_version !== "amic-os.outlook-m365-release.v1"
    || !GIT_OID.test(receipt.source_sha ?? "")
    || !GIT_OID.test(receipt.source_tree ?? "")
    || !SHA256.test(receipt.package_lock_sha256 ?? "")
    || receipt.version !== contract.release_version
    || receipt.permission_event_assignment_diff !== "none"
    || receipt.graph_delegated_scope_diff !== "none"
    || receipt.propagation_window_is_sla !== false) {
    throw new Error("M365 release receipt identity, source, scope, or propagation contract drifted");
  }
  if (!expectedSourceIdentity
    || receipt.source_sha !== expectedSourceIdentity.source_sha
    || receipt.source_tree !== expectedSourceIdentity.source_tree
    || receipt.package_lock_sha256 !== expectedSourceIdentity.package_lock_sha256) {
    throw new Error("M365 release receipt is stale for the exact current source SHA/tree/lock");
  }
  const receiptProfiles = profileMap(receipt.profiles, "M365 receipt");
  const baselineProfiles = profileMap(baseline.profiles, "deployment baseline");
  const rollbackProfiles = profileMap(rollback.profiles, "rollback contract");
  validateReleaseCandidateReceipt(releaseCandidate, contract, releaseContext);
  if (releaseCandidate.source_sha !== receipt.source_sha
    || releaseCandidate.source_tree !== receipt.source_tree
    || releaseCandidate.package_lock_sha256 !== receipt.package_lock_sha256
    || releaseCandidate.builds_identical !== true) {
    throw new Error("M365 receipt is not bound to a passing exact-SHA release candidate");
  }
  const bundleHashes = new Set();
  for (const expected of contract.profiles) {
    const current = receiptProfiles.get(expected.product_id);
    const deployed = baselineProfiles.get(expected.product_id);
    const fallback = rollbackProfiles.get(expected.product_id);
    const artifact = releaseCandidate.profile_artifacts?.find(({ product_id }) => product_id === expected.product_id);
    const manifestReceipt = releaseCandidate.manifest_validation?.manifests
      ?.find(({ path: manifestPath }) => manifestPath === expected.production_manifest);
    const candidateManifestSha = candidateManifestHashes?.[expected.profile];
    const projection = candidateManifestProjections?.[expected.profile];
    assertExactKeys(current, [
      "assignment_count",
      "assignment_fingerprint_sha256",
      "bundle_sha256",
      "candidate_manifest_sha256",
      "deployment_mode",
      "permission",
      "product_id",
      "profile",
      "rollback_manifest_ref",
      "rollback_manifest_sha256",
      "source_locations",
    ], `${expected.profile} M365 profile`);
    if (current.profile !== expected.profile
      || current.permission !== expected.permission
      || current.deployment_mode !== "fixed"
      || !SHA256.test(current.candidate_manifest_sha256 ?? "")
      || !SHA256.test(current.bundle_sha256 ?? "")
      || current.candidate_manifest_sha256 !== candidateManifestSha
      || manifestReceipt?.sha256 !== candidateManifestSha
      || current.bundle_sha256 !== artifact?.bundle_sha256
      || current.candidate_manifest_sha256 === fallback.rollback_manifest_sha256
      || JSON.stringify(current.source_locations) !== JSON.stringify(projection?.form_source_locations)
      || current.assignment_count !== deployed.assignment_count
      || current.assignment_fingerprint_sha256 !== deployed.assignment_fingerprint_sha256
      || current.rollback_manifest_sha256 !== fallback.rollback_manifest_sha256
      || current.rollback_manifest_ref !== fallback.protected_manifest_ref) {
      throw new Error(`${expected.profile} M365 candidate/assignment/rollback binding drifted`);
    }
    bundleHashes.add(current.bundle_sha256);
  }
  if (bundleHashes.size !== 2) throw new Error("Matter and inquiry task-pane bundles must remain independent");
  const prerequisites = receipt.prerequisites ?? {};
  assertEqual(sorted(Object.keys(prerequisites)), sorted(contract.m365.required_prerequisites ?? []), "M365 prerequisite names");
  for (const name of contract.m365.required_prerequisites ?? []) {
    const prerequisite = prerequisites[name];
    assertExactKeys(prerequisite, [
      "artifact_sha256",
      "evidence_ref",
      "evidence_sha256",
      "package_lock_sha256",
      "source_sha",
      "source_tree",
      "status",
    ], `${name} prerequisite`);
    if (!prerequisite || !["pending", "verified"].includes(prerequisite.status)) {
      throw new Error(`M365 release prerequisite status is missing: ${name}`);
    }
    if (prerequisite.status === "verified"
      && (!SHA256.test(prerequisite.evidence_sha256 ?? "")
        || !SHA256.test(prerequisite.artifact_sha256 ?? "")
        || prerequisite.source_sha !== receipt.source_sha
        || prerequisite.source_tree !== receipt.source_tree
        || prerequisite.package_lock_sha256 !== receipt.package_lock_sha256
        || !requiredText(prerequisite.evidence_ref, `${name}.evidence_ref`)
        || assertSafeRelativePath(prerequisite.evidence_ref, `${name}.evidence_ref`) !== prerequisite.evidence_ref)) {
      throw new Error(`M365 release prerequisite evidence is incomplete: ${name}`);
    }
    if (prerequisite.status === "pending" && [
      prerequisite.artifact_sha256,
      prerequisite.evidence_sha256,
      prerequisite.evidence_ref,
      prerequisite.package_lock_sha256,
      prerequisite.source_sha,
      prerequisite.source_tree,
    ].some((value) => value != null)) {
      throw new Error(`pending M365 release prerequisite must not imply evidence: ${name}`);
    }
  }
  const claims = receipt.claims ?? {};
  const claimNames = [
    "central_deployment_verified",
    "go_live_approved",
    "propagation_verified",
    "real_outlook_verified",
  ];
  assertExactKeys(claims, claimNames, "M365 claims");
  if (Object.values(claims).some((claim) => typeof claim !== "boolean")) {
    throw new Error("M365 completion claims must be boolean");
  }
  if (receipt.status === "awaiting_authorized_deployment") {
    if (receipt.authorization_ref != null
      || receipt.go_live_approval_ref != null
      || receipt.mutation_count !== 0
      || receipt.static_release != null
      || (receipt.operations ?? []).length
      || (receipt.static_readbacks ?? []).length
      || (receipt.readbacks ?? []).length
      || (receipt.propagation_observations ?? []).length
      || (receipt.host_evidence ?? []).length
      || Object.values(claims).some(Boolean)) {
      throw new Error("awaiting M365 receipt overclaims external execution or verification");
    }
    return { status: receipt.status, external_mutation_performed: false, blocked_external: true };
  }
  if (!["pilot_deployed", "propagation_observing", "deployment_verified", "go_live_approved"].includes(receipt.status)
    || receipt.mutation_count !== 2) {
    throw new Error("executed M365 receipt status or mutation count is invalid");
  }
  const pendingPrerequisites = (contract.m365.required_prerequisites ?? [])
    .filter((name) => prerequisites[name].status !== "verified");
  if (pendingPrerequisites.length) {
    throw new Error(`executed M365 receipt has pending prerequisites: ${pendingPrerequisites.join(", ")}`);
  }
  if (!requiredText(receipt.authorization_ref, "M365 authorization_ref")) throw new Error("M365 deployment authorization is required");
  if (!staticPlan || !staticPlanSha256) throw new Error("executed M365 receipt requires the exact dual-namespace static plan");
  const sourceLocations = Object.fromEntries(contract.profiles.map((profile) => [
    profile.profile,
    candidateManifestProjections?.[profile.profile]?.form_source_locations,
  ]));
  validateStaticDryRunPlan(staticPlan, {
    contract,
    releaseReceipt: releaseCandidate,
    releaseContext,
    sourceLocations,
  });
  const expectedStaticRelease = staticReleaseProjection(staticPlan, staticPlanSha256);
  assertExactKeys(receipt.static_release, [
    "package_lock_sha256",
    "plan_sha256",
    "profiles",
    "source_sha",
    "source_tree",
    "target_namespaces",
  ], "M365 static_release evidence");
  for (const profile of receipt.static_release.profiles ?? []) {
    assertExactKeys(profile, [
      "bundle_sha256",
      "inventory_sha256",
      "manifest_sha256",
      "product_id",
      "profile",
      "source_location_coverage",
      "target_prefix",
      "taskpane_html_sha256",
    ], "M365 static_release profile");
  }
  assertEqual(canonical(receipt.static_release), canonical(expectedStaticRelease), "M365 static release exact inventory binding");
  const staticPrerequisite = prerequisites.static_release;
  if (staticPrerequisite.evidence_sha256 !== staticPlanSha256
    || staticPrerequisite.artifact_sha256 !== releaseCandidate.inventory_sha256
    || staticPrerequisite.evidence_ref !== "protected/prerequisites/static-release-plan.json") {
    throw new Error("M365 static_release prerequisite is not bound to the exact dual-namespace plan");
  }
  const operations = profileMap(receipt.operations, "M365 operations");
  const staticReadbacks = profileMap(receipt.static_readbacks, "static readbacks");
  const readbacks = profileMap(receipt.readbacks, "M365 readbacks");
  const operationRefs = new Set();
  for (const expected of contract.profiles) {
    const profile = receiptProfiles.get(expected.product_id);
    const artifact = releaseCandidate.profile_artifacts.find(({ product_id }) => product_id === expected.product_id);
    const operation = operations.get(expected.product_id);
    const staticReadback = staticReadbacks.get(expected.product_id);
    const readback = readbacks.get(expected.product_id);
    const staticProfile = staticPlan.profiles.find(({ product_id }) => product_id === expected.product_id);
    assertExactKeys(operation, ["operation_ref", "operation_type", "product_id", "result"], `${expected.profile} M365 operation`);
    assertExactKeys(staticReadback, [
      "bundle_sha256",
      "http_status",
      "inventory_sha256",
      "product_id",
      "result",
      "source_locations",
      "target_prefix",
      "taskpane_html_sha256",
    ], `${expected.profile} static readback`);
    assertExactKeys(readback, [
      "assignment_count",
      "assignment_fingerprint_sha256",
      "deployment_mode",
      "enabled",
      "manifest_sha256",
      "product_id",
      "source_locations",
      "version",
    ], `${expected.profile} M365 readback`);
    const operationRef = requiredText(operation.operation_ref, "M365 operation_ref");
    if (operation.operation_type !== "central_manifest_update"
      || operation.result !== "success"
      || operationRefs.has(operationRef)) {
      throw new Error(`${expected.profile} central update operation is incomplete`);
    }
    operationRefs.add(operationRef);
    if (staticReadback.result !== "exact_hash"
      || staticReadback.http_status !== 200
      || staticReadback.target_prefix !== staticProfile.target_prefix
      || staticReadback.inventory_sha256 !== staticProfile.inventory_sha256
      || staticReadback.taskpane_html_sha256 !== artifact.taskpane_html_sha256
      || staticReadback.bundle_sha256 !== profile.bundle_sha256
      || JSON.stringify(staticReadback.source_locations) !== JSON.stringify(profile.source_locations)) {
      throw new Error(`${expected.profile} static asset readback is incomplete`);
    }
    if (readback.version !== contract.release_version
      || readback.manifest_sha256 !== profile.candidate_manifest_sha256
      || readback.deployment_mode !== "fixed"
      || JSON.stringify(readback.source_locations) !== JSON.stringify(profile.source_locations)
      || readback.assignment_count !== profile.assignment_count
      || readback.assignment_fingerprint_sha256 !== profile.assignment_fingerprint_sha256
      || readback.enabled !== true) {
      throw new Error(`${expected.profile} central deployment readback drifted`);
    }
  }
  if (claims.central_deployment_verified !== true) throw new Error("central deployment readback claim is missing");
  const propagationKeys = new Set();
  for (const entry of receipt.propagation_observations ?? []) {
    assertExactKeys(entry, [
      "assignment_fingerprint_sha256",
      "hour",
      "manifest_sha256",
      "observed_at_utc",
      "product_id",
      "result",
      "version",
    ], "M365 propagation observation");
    const profile = receiptProfiles.get(entry.product_id);
    const key = `${entry.product_id}:${entry.hour}`;
    if (!profile
      || !contract.m365.propagation_observation_hours.includes(entry.hour)
      || propagationKeys.has(key)
      || entry.result !== "exact_readback"
      || entry.version !== contract.release_version
      || entry.manifest_sha256 !== profile.candidate_manifest_sha256
      || entry.assignment_fingerprint_sha256 !== profile.assignment_fingerprint_sha256
      || utcMillis(entry.observed_at_utc) == null) {
      throw new Error(`M365 propagation observation is invalid or duplicated: ${key}`);
    }
    propagationKeys.add(key);
  }
  if (claims.propagation_verified === true) {
    for (const productId of PRODUCT_IDS) {
      const observations = (receipt.propagation_observations ?? [])
        .filter((entry) => entry.product_id === productId);
      const observed = observations
        .map(({ hour }) => hour).sort((a, b) => a - b);
      assertEqual(observed, contract.m365.propagation_observation_hours, `${productId} propagation observations`);
      const base = utcMillis(observations.find(({ hour }) => hour === 0)?.observed_at_utc);
      if (observations.some((entry) => utcMillis(entry.observed_at_utc) - base < entry.hour * 60 * 60 * 1_000)) {
        throw new Error(`${productId} propagation observations were recorded before their stated window`);
      }
    }
  }
  const hostKeys = new Set();
  for (const evidence of receipt.host_evidence ?? []) {
    assertExactKeys(evidence, [
      "accessibility_check",
      "bundle_sha256",
      "evidence_kind",
      "evidence_ref",
      "executed",
      "host",
      "host_dom_manipulation",
      "host_version",
      "manifest_sha256",
      "observed_at_utc",
      "product_id",
      "result",
      "scenarios",
    ], "M365 host evidence");
    const expected = contract.profiles.find(({ product_id }) => product_id === evidence.product_id);
    const profile = receiptProfiles.get(evidence.product_id);
    const key = `${evidence.product_id}:${evidence.host}`;
    const requiredScenarios = expected ? [
      ...(contract.m365.required_common_host_scenarios ?? []),
      ...contract.m365.required_profile_scenarios[expected.profile],
    ] : [];
    if (!expected
      || !contract.m365.required_host_evidence.includes(evidence.host)
      || hostKeys.has(key)
      || evidence.evidence_kind !== "real_outlook_host"
      || evidence.executed !== true
      || evidence.result !== "pass"
      || evidence.manifest_sha256 !== profile.candidate_manifest_sha256
      || evidence.bundle_sha256 !== profile.bundle_sha256
      || JSON.stringify(sorted(evidence.scenarios ?? [])) !== JSON.stringify(sorted(requiredScenarios))
      || new Set(evidence.scenarios ?? []).size !== requiredScenarios.length
      || !requiredText(evidence.host_version, `${expected?.profile ?? "unknown"}/${evidence.host} host_version`)
      || utcMillis(evidence.observed_at_utc) == null
      || evidence.accessibility_check !== "pass"
      || evidence.host_dom_manipulation !== false
      || !requiredText(evidence.evidence_ref, `${expected?.profile ?? "unknown"}/${evidence.host} evidence_ref`)) {
      throw new Error(`real Outlook evidence is incomplete or duplicated: ${key}`);
    }
    hostKeys.add(key);
  }
  if (claims.real_outlook_verified === true) {
    for (const expected of contract.profiles) {
      for (const host of contract.m365.required_host_evidence) {
        if (!hostKeys.has(`${expected.product_id}:${host}`)) {
          throw new Error(`${expected.profile} real Outlook evidence is incomplete for ${host}`);
        }
      }
    }
  }
  if (receipt.status === "deployment_verified"
    && (claims.propagation_verified !== true || claims.real_outlook_verified !== true)) {
    throw new Error("deployment_verified requires propagation and real Outlook evidence");
  }
  if ((receipt.status === "go_live_approved") !== (claims.go_live_approved === true)) {
    throw new Error("go-live status and claim must advance together");
  }
  if (receipt.status !== "go_live_approved" && receipt.go_live_approval_ref != null) {
    throw new Error("go-live approval evidence is not allowed before go_live_approved status");
  }
  if (claims.go_live_approved === true
    && (receipt.status !== "go_live_approved"
      || claims.propagation_verified !== true
      || claims.real_outlook_verified !== true
      || !requiredText(receipt.go_live_approval_ref, "go_live_approval_ref"))) {
    throw new Error("go-live claim is not backed by propagation, real Outlook, and approval evidence");
  }
  return {
    status: receipt.status,
    external_mutation_performed: true,
    central_deployment_verified: true,
    propagation_verified: claims.propagation_verified === true,
    real_outlook_verified: claims.real_outlook_verified === true,
    go_live_approved: claims.go_live_approved === true,
  };
}
