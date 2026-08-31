#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseOutlookManifest } from "./lib/outlook-manifest-projection.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..");
const defaultContractPath = "contracts/outlook-m365-canary-manifest-set.json";
const releaseContractPath = "contracts/outlook-addin-release-gates.json";
const PRODUCT_ID = "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
const INQUIRY_PRODUCT_ID = "952431be-51b8-42a2-9bf6-769a15934e85";
const ARTIFACT_VERSION = "1.3.0.3";
const PRIOR_KNOWN_MANIFEST_VERSION = "1.3.0.1";
const TASKPANE_MANIFEST_VERSION = "1.3.0.2";
const CANDIDATE_MANIFEST_VERSION = "1.3.0.3";
const ROLLBACK_MANIFEST_VERSION = "1.3.0.4";
const TASKPANE_SEMANTIC_SHA256 = "d1040be810b92308e1f7080b87d3a7d3bb88b96ff80d042586b3b266a439cd52";
const PINNED_V11_TASKPANES = [
  "VersionOverridesV1_1:MessageComposeCommandSurface:ShowTaskpane:true",
  "VersionOverridesV1_1:MessageReadCommandSurface:ShowTaskpane:true",
];
const ORIGIN = "https://d2mthcc8vp3cr2.cloudfront.net";
const TASKPANE = `${ORIGIN}/addin/index.html`;
const COMMANDS = `${TASKPANE}?commands=1`;
const TASKPANE_MANIFEST = "apps/addin/manifest.canary.taskpane.production.xml";
const CANDIDATE_MANIFEST = "apps/addin/manifest.production.xml";
const ROLLBACK_MANIFEST = "apps/addin/manifest.canary.rollback.production.xml";
const INQUIRY_MANIFEST = "apps/addin/manifest.inquiry.xml";
const INQUIRY_PRODUCTION_MANIFEST = "apps/addin/manifest.inquiry.production.xml";
const RETIRED_SOURCE_ARTIFACTS = [
  "apps/addin/manifest.canary.smart-alerts.production.xml",
  "apps/addin/src/outlook-event-entry.js",
  "apps/addin/src/outlook-event-runtime.js",
  "apps/addin/src/outlook-send-events.js",
];
const TRUSTED_EXECUTABLE_SOURCE_ARTIFACT_SHA256 = new Map([
  ["apps/addin/public/oauth-start.html", "8c8726ce00dfb24a7773025defc524b948237344da632ba9d49594191e0bc09e"],
  ["apps/addin/public/oauth-start.js", "59ca7c2645d54903615c125991e4e3b3aadd47b306b5c8b5bc528750e5c5f940"],
  ["apps/addin/public/oauth-callback.html", "c88310367397556776f500dbd762b971ff26f3cca60845df14de473af2752870"],
  ["apps/addin/public/oauth-callback.js", "1ae8a5d5131f967102078b990760039685d8f4634e013d896b9d727c915da4da"],
]);
const SOURCE_ARTIFACT_PATHS = [
  TASKPANE_MANIFEST,
  ROLLBACK_MANIFEST,
  CANDIDATE_MANIFEST,
  INQUIRY_MANIFEST,
  INQUIRY_PRODUCTION_MANIFEST,
  ...TRUSTED_EXECUTABLE_SOURCE_ARTIFACT_SHA256.keys(),
];

function fail(message) {
  throw new Error(`OUTLOOK_M365_CANARY_MANIFEST_SET_INVALID: ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} drifted`);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  exact(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function contractDigest(contract) {
  const { manifest_set_sha256: _omitted, ...projection } = contract;
  return sha256(JSON.stringify(projection));
}

function validateUrl(value, { origin = ORIGIN, pathname, search = "" }, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} is not a URL`);
  }
  if (
    parsed.origin !== origin
    || parsed.pathname !== pathname
    || parsed.search !== search
    || parsed.hash
    || parsed.username
    || parsed.password
  ) fail(`${label} is outside the exact production URL boundary`);
}

async function bytes(repoRoot, relativePath, fileOverrides) {
  if (Object.hasOwn(fileOverrides, relativePath)) {
    const value = fileOverrides[relativePath];
    return Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  }
  return readFile(path.join(repoRoot, relativePath));
}

function validateContractShape(contract) {
  exactKeys(contract, [
    "artifact_version", "canary_assignment", "claims",
    "manifest_set_sha256", "product_id", "production_urls", "rollback_removal",
    "prior_known_manifest_version", "retired_source_artifacts", "schema_version", "source_artifacts", "stages",
  ], "contract");
  if (contract.schema_version !== "amic-os.outlook-m365-canary-manifest-set.v1") fail("schema version drifted");
  if (
    contract.product_id !== PRODUCT_ID
    || contract.artifact_version !== ARTIFACT_VERSION
    || contract.prior_known_manifest_version !== PRIOR_KNOWN_MANIFEST_VERSION
  ) fail("product, artifact, or prior known manifest version drifted");
  if (!/^[0-9a-f]{64}$/u.test(contract.manifest_set_sha256)
    || contract.manifest_set_sha256 !== contractDigest(contract)) fail("manifest set digest drifted");

  exact(contract.production_urls, {
    origin: ORIGIN,
    app_domains: [ORIGIN],
    taskpane: TASKPANE,
    commands: COMMANDS,
    oauth_start: `${ORIGIN}/addin/oauth-start.html`,
    oauth_callbacks: [`${ORIGIN}/addin/oauth-callback.html`],
    naa_redirects: [TASKPANE],
    entra_authority_host: "login.microsoftonline.com",
  }, "production URL contract");
  exact(contract.retired_source_artifacts, RETIRED_SOURCE_ARTIFACTS, "retired automatic-send source artifacts");
  exact(contract.canary_assignment, {
    eligible_user_count: 1,
    excluded_user_count: 0,
    raw_principal_included: false,
    assignment_authority: "signed_exact_canary_principal_ref",
    trusted_active_non_revoked_installation_required: true,
    nested_groups_allowed: false,
    tenant_wide_assignment_allowed: false,
    assign_to_everyone: false,
    max_visible_addins_per_user: 1,
  }, "single-canary assignment contract");
  exact(contract.claims, {
    provider_mutation_performed: false,
    m365_deployment_performed: false,
    automatic_send_interception_authorized: false,
    broad_rollout_authorized: false,
    go_live_proved: false,
  }, "non-execution claims");
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(JSON.stringify(contract))) {
    fail("raw canary principal must not be stored in source");
  }
}

async function validateArtifacts(contract, repoRoot, fileOverrides) {
  if (!Array.isArray(contract.source_artifacts)) fail("source artifacts must be an array");
  exact(contract.source_artifacts.map((artifact) => artifact?.path), SOURCE_ARTIFACT_PATHS, "source artifact paths");
  const hashes = new Map();
  for (const artifact of contract.source_artifacts) {
    exactKeys(artifact, ["path", "sha256"], `source artifact ${artifact?.path ?? "unknown"}`);
    if (!/^[0-9a-f]{64}$/u.test(artifact.sha256)) fail(`source artifact digest is invalid: ${artifact.path}`);
    const trustedExecutableDigest = TRUSTED_EXECUTABLE_SOURCE_ARTIFACT_SHA256.get(artifact.path);
    if (trustedExecutableDigest && artifact.sha256 !== trustedExecutableDigest) {
      fail(`trusted source artifact digest drifted: ${artifact.path}`);
    }
    const actual = sha256(await bytes(repoRoot, artifact.path, fileOverrides));
    if (actual !== artifact.sha256) fail(`source artifact bytes drifted: ${artifact.path}`);
    hashes.set(artifact.path, actual);
  }
  return hashes;
}

function validateStages(contract, hashes) {
  if (!Array.isArray(contract.stages) || contract.stages.length !== 2) fail("exactly two forward stages are required");
  const expected = [
    {
      id: "taskpane_only",
      order: 1,
      manifest_path: TASKPANE_MANIFEST,
      manifest_version: TASKPANE_MANIFEST_VERSION,
      launch_events: [],
      requires: [
        "exact_one_signed_canary_assignment",
        "exact_one_trusted_active_non_revoked_installation",
        "provider_pre_assignment_zero_readback",
        "provider_manifest_absent_or_version_below_1_3_0_2",
      ],
    },
    {
      id: "candidate_taskpane",
      order: 2,
      manifest_path: CANDIDATE_MANIFEST,
      manifest_version: CANDIDATE_MANIFEST_VERSION,
      launch_events: [],
      requires: [
        "taskpane_real_outlook_pass",
        "oauth_callback_connected_pass",
        "assignment_readback_unchanged",
        "automatic_send_zero_readback",
      ],
    },
  ];
  for (const [index, stage] of contract.stages.entries()) {
    exactKeys(stage, ["id", "launch_events", "manifest_path", "manifest_sha256", "manifest_version", "order", "requires"], `stage ${index + 1}`);
    const { manifest_sha256: _hash, ...projection } = stage;
    exact(projection, expected[index], `stage ${index + 1}`);
    if (stage.manifest_sha256 !== hashes.get(stage.manifest_path)) fail(`stage ${stage.id} manifest digest drifted`);
  }

  exactKeys(contract.rollback_removal, ["remove_canary", "rollback_to_taskpane_only"], "rollback/removal");
  exact(contract.rollback_removal.rollback_to_taskpane_only, {
    manifest_path: ROLLBACK_MANIFEST,
    manifest_sha256: hashes.get(ROLLBACK_MANIFEST),
    manifest_version: ROLLBACK_MANIFEST_VERSION,
    operations: ["central_update_to_taskpane_only", "readback_launch_events_zero"],
  }, "taskpane rollback");
  exact(contract.rollback_removal.remove_canary, {
    operations: [
      "rollback_to_taskpane_only",
      "unassign_exact_canary_principal",
      "readback_assignment_count_zero",
    ],
    delete_product_id_allowed: false,
    restore_assign_to_everyone: false,
    reenable_requires_new_manifest_version: true,
  }, "canary removal");
}

function validateTaskpaneOnlyManifest(manifest, label) {
  exact(manifest.extension_points, [
    "MessageComposeCommandSurface", "MessageComposeCommandSurface",
    "MessageReadCommandSurface", "MessageReadCommandSurface",
  ], `${label} extension points`);
  exact(manifest.launch_events, [], `${label} launch events`);
  exact(manifest.semantic_manifest_sha256, TASKPANE_SEMANTIC_SHA256, `${label} semantic capabilities`);
  exact(manifest.supports_pinning, PINNED_V11_TASKPANES, `${label} pinned taskpanes`);
  exact(manifest.url_resources, [
    `Commands.Url=${COMMANDS}`, `Commands.Url=${COMMANDS}`,
    `Taskpane.Url=${TASKPANE}`, `Taskpane.Url=${TASKPANE}`,
  ], `${label} URLs`);
}

function validateManifestSemantics(
  taskpane,
  candidate,
  rollback,
  inquiry,
  inquiryProduction,
  contract,
) {
  const common = [
    "product_id", "provider_name", "display_name", "description", "permission",
    "mailbox_versions", "top_level_hosts", "override_host_types", "version_override_types",
    "form_types", "rule_fingerprints", "rule_collection_modes", "requested_heights",
    "disable_entity_highlighting", "action_types", "office_tab_ids", "group_ids",
    "control_fingerprints", "string_resources", "image_resources", "form_source_locations",
    "icon_url", "high_resolution_icon_url", "support_url", "app_domains",
  ];
  for (const field of common) {
    exact(taskpane[field], candidate[field], `forward manifest ${field}`);
    exact(taskpane[field], rollback[field], `rollback manifest ${field}`);
  }
  if (
    taskpane.product_id !== PRODUCT_ID
    || candidate.product_id !== PRODUCT_ID
    || rollback.product_id !== PRODUCT_ID
    || taskpane.version !== TASKPANE_MANIFEST_VERSION
    || candidate.version !== CANDIDATE_MANIFEST_VERSION
    || rollback.version !== ROLLBACK_MANIFEST_VERSION
    || taskpane.provider_name !== "AMIC OS"
    || taskpane.display_name !== "AMIC OS"
    || taskpane.permission !== "ReadWriteItem"
  ) fail("manifest identity or least-privilege permission drifted");
  exact(taskpane.app_domains, [ORIGIN], "manifest AppDomains");
  exact(taskpane.form_source_locations, [TASKPANE], "manifest taskpane SourceLocation");
  validateTaskpaneOnlyManifest(taskpane, "taskpane-only");
  validateTaskpaneOnlyManifest(candidate, "candidate taskpane-only");
  exact(rollback.extension_points, [
    "MessageComposeCommandSurface", "MessageComposeCommandSurface",
    "MessageReadCommandSurface", "MessageReadCommandSurface",
  ], "rollback taskpane-only extension points");
  exact(rollback.launch_events, [], "rollback taskpane-only launch events");
  exact(rollback.semantic_manifest_sha256, "2a3a0c41baac81e64bd414f9b53dee828aff8624414103077a2849100e25c411", "rollback taskpane-only semantic capabilities");
  exact(rollback.supports_pinning, [], "rollback pinned taskpanes");
  exact(rollback.url_resources, [
    `Commands.Url=${COMMANDS}`, `Commands.Url=${COMMANDS}`,
    `Taskpane.Url=${TASKPANE}`, `Taskpane.Url=${TASKPANE}`,
  ], "rollback taskpane-only URLs");
  for (const [label, manifest] of [["local", inquiry], ["production", inquiryProduction]]) {
    if (manifest.product_id !== INQUIRY_PRODUCT_ID || manifest.version !== "1.1.0.0") {
      fail(`inquiry-only ${label} manifest identity drifted`);
    }
    exact(manifest.version_override_types, ["VersionOverridesV1_0"], `inquiry-only ${label} VersionOverrides`);
    exact(manifest.launch_events, [], `inquiry-only ${label} launch events`);
    exact(manifest.supports_pinning, [], `inquiry-only ${label} pinned taskpanes`);
  }
  exact(contract.stages[0].launch_events, taskpane.launch_events, "taskpane stage event binding");
  exact(contract.stages[1].launch_events, candidate.launch_events, "candidate stage event binding");
  if (contract.rollback_removal.rollback_to_taskpane_only.manifest_version !== rollback.version) {
    fail("rollback manifest version binding drifted");
  }
}

async function validateReleaseBinding(repoRoot) {
  const release = JSON.parse(await readFile(path.join(repoRoot, releaseContractPath), "utf8"));
  if (release.release_version !== ARTIFACT_VERSION) fail("release artifact version is not shared");
  const matter = release.profiles?.find((profile) => profile.product_id === PRODUCT_ID);
  if (!matter || matter.production_manifest !== CANDIDATE_MANIFEST || matter.permission !== "ReadWriteItem") {
    fail("taskpane-only candidate is not the canonical Matter release manifest");
  }
  const requiredStatic = new Set(release.build?.required_static_paths ?? []);
  for (const relativePath of [
    "oauth-start.html", "oauth-start.js", "oauth-callback.html", "oauth-callback.js",
    "index.html",
  ]) if (!requiredStatic.has(relativePath)) fail(`release artifact omits ${relativePath}`);
  for (const relativePath of ["event-runtime.html", "event-runtime.js"]) {
    if (requiredStatic.has(relativePath)) fail(`release artifact still requires retired ${relativePath}`);
  }
  exact(release.automatic_send_policy, {
    active_launch_events: [],
    active_event_runtime_required: false,
    legacy_smart_alert_manifest_status: "retired_source_only",
    legacy_eventful_rollback_activation_allowed: false,
    forward_rollback_contract: "contracts/outlook-addin-forward-static-rollback.json",
    forward_rollback_launch_event_count: 0,
  }, "release automatic Send policy");
  const namespace = release.static_deploy?.namespaces?.find((entry) => entry.product_id === PRODUCT_ID);
  if (!namespace || namespace.target_prefix !== "addin/" || namespace.source_prefix !== "") {
    fail("Matter static namespace drifted");
  }
}

function validateCallbackBoundary(contract) {
  validateUrl(contract.production_urls.taskpane, { pathname: "/addin/index.html" }, "taskpane URL");
  validateUrl(contract.production_urls.commands, { pathname: "/addin/index.html", search: "?commands=1" }, "commands URL");
  validateUrl(contract.production_urls.oauth_start, { pathname: "/addin/oauth-start.html" }, "OAuth start URL");
  validateUrl(contract.production_urls.oauth_callbacks[0], { pathname: "/addin/oauth-callback.html" }, "OAuth callback URL");
  validateUrl(contract.production_urls.naa_redirects[0], { pathname: "/addin/index.html" }, "NAA redirect URL");
}

export async function validateOutlookM365CanaryManifestSet({
  repoRoot = defaultRepoRoot,
  contractPath = defaultContractPath,
  contractOverride,
  fileOverrides = {},
} = {}) {
  const contract = contractOverride ?? JSON.parse(await readFile(path.join(repoRoot, contractPath), "utf8"));
  validateContractShape(contract);
  const hashes = await validateArtifacts(contract, repoRoot, fileOverrides);
  validateStages(contract, hashes);
  let taskpane;
  let candidate;
  let rollback;
  let inquiry;
  let inquiryProduction;
  try {
    taskpane = parseOutlookManifest((await bytes(repoRoot, TASKPANE_MANIFEST, fileOverrides)).toString("utf8"));
    candidate = parseOutlookManifest((await bytes(repoRoot, CANDIDATE_MANIFEST, fileOverrides)).toString("utf8"));
    rollback = parseOutlookManifest((await bytes(repoRoot, ROLLBACK_MANIFEST, fileOverrides)).toString("utf8"));
    inquiry = parseOutlookManifest((await bytes(repoRoot, INQUIRY_MANIFEST, fileOverrides)).toString("utf8"));
    inquiryProduction = parseOutlookManifest((await bytes(repoRoot, INQUIRY_PRODUCTION_MANIFEST, fileOverrides)).toString("utf8"));
  } catch (error) {
    fail(`manifest XML is invalid: ${error.message}`);
  }
  validateManifestSemantics(
    taskpane,
    candidate,
    rollback,
    inquiry,
    inquiryProduction,
    contract,
  );
  await validateReleaseBinding(repoRoot);
  validateCallbackBoundary(contract);
  return {
    schema_version: "amic-os.outlook-m365-canary-manifest-set-validation.v1",
    verdict: "PASS",
    product_id: PRODUCT_ID,
    artifact_version: ARTIFACT_VERSION,
    prior_known_manifest_version: PRIOR_KNOWN_MANIFEST_VERSION,
    manifest_set_sha256: contract.manifest_set_sha256,
    stages: contract.stages.map(({ id, manifest_path, manifest_sha256, manifest_version, launch_events }) => ({
      id, manifest_path, manifest_sha256, manifest_version, launch_events,
    })),
    rollback_manifest: {
      manifest_path: ROLLBACK_MANIFEST,
      manifest_sha256: hashes.get(ROLLBACK_MANIFEST),
      manifest_version: ROLLBACK_MANIFEST_VERSION,
      launch_events: [],
    },
    canary_user_count: 1,
    rollback_before_removal: true,
    provider_mutation_performed: false,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let contractPath = defaultContractPath;
  if (args.length > 0) {
    if (args.length !== 2 || args[0] !== "--contract" || !args[1]) fail("usage: validate-outlook-m365-canary-manifests.mjs [--contract <path>]");
    contractPath = args[1];
  }
  const result = await validateOutlookM365CanaryManifestSet({ contractPath });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
