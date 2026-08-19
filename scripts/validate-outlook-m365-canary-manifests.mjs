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
const ARTIFACT_VERSION = "1.1.0.0";
const PRIOR_KNOWN_MANIFEST_VERSION = "1.1.0.0";
const TASKPANE_MANIFEST_VERSION = "1.2.0.0";
const SMART_ALERTS_MANIFEST_VERSION = "1.2.0.1";
const ROLLBACK_MANIFEST_VERSION = "1.2.0.2";
const TASKPANE_SEMANTIC_SHA256 = "323542ab35c10cca6053cc166802e0a4a118f1771cb730ac0fa99804453a148d";
const SMART_ALERTS_SEMANTIC_SHA256 = "5e5ef0fad03c89db802cfb2c4af47916526528dea3896850d79ea7f886b674b0";
const ORIGIN = "https://d2mthcc8vp3cr2.cloudfront.net";
const TASKPANE = `${ORIGIN}/addin/index.html`;
const COMMANDS = `${TASKPANE}?commands=1`;
const TASKPANE_MANIFEST = "apps/addin/manifest.canary.taskpane.production.xml";
const SMART_ALERTS_MANIFEST = "apps/addin/manifest.canary.smart-alerts.production.xml";
const ROLLBACK_MANIFEST = "apps/addin/manifest.canary.rollback.production.xml";
const CANONICAL_SMART_ALERTS_MANIFEST = "apps/addin/manifest.production.xml";
const TRUSTED_EXECUTABLE_SOURCE_ARTIFACT_SHA256 = new Map([
  ["apps/addin/public/oauth-start.html", "8c8726ce00dfb24a7773025defc524b948237344da632ba9d49594191e0bc09e"],
  ["apps/addin/public/oauth-start.js", "59ca7c2645d54903615c125991e4e3b3aadd47b306b5c8b5bc528750e5c5f940"],
  ["apps/addin/public/oauth-callback.html", "c88310367397556776f500dbd762b971ff26f3cca60845df14de473af2752870"],
  ["apps/addin/public/oauth-callback.js", "1ae8a5d5131f967102078b990760039685d8f4634e013d896b9d727c915da4da"],
  ["apps/addin/public/event-runtime.html", "868944d2a2c2114bed40be663632dfb5eb17a9475f3ec00cffe31de6f9467e70"],
  ["apps/addin/public/event-runtime.js", "31219926e4830e8a544ede0ffe3312ca18f4600f8715e209e14ff422ef8e33f1"],
]);
const SOURCE_ARTIFACT_PATHS = [
  TASKPANE_MANIFEST,
  SMART_ALERTS_MANIFEST,
  ROLLBACK_MANIFEST,
  CANONICAL_SMART_ALERTS_MANIFEST,
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
    "prior_known_manifest_version", "schema_version", "source_artifacts", "stages",
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
    event_webview_runtime: `${ORIGIN}/addin/event-runtime.html`,
    event_javascript_runtime: `${ORIGIN}/addin/event-runtime.js`,
    entra_authority_host: "login.microsoftonline.com",
  }, "production URL contract");
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
        "provider_manifest_absent_or_version_below_1_2_0_0",
      ],
    },
    {
      id: "smart_alerts",
      order: 2,
      manifest_path: SMART_ALERTS_MANIFEST,
      manifest_version: SMART_ALERTS_MANIFEST_VERSION,
      launch_events: ["OnMessageSend:onMessageSendHandler:PromptUser"],
      requires: [
        "taskpane_real_outlook_pass",
        "oauth_callback_connected_pass",
        "assignment_readback_unchanged",
        "smart_alert_runtime_pass",
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
  exact(manifest.url_resources, [
    `Commands.Url=${COMMANDS}`, `Commands.Url=${COMMANDS}`,
    `Taskpane.Url=${TASKPANE}`, `Taskpane.Url=${TASKPANE}`,
  ], `${label} URLs`);
}

function validateManifestSemantics(taskpane, smartAlerts, rollback, canonicalSmartAlerts, contract) {
  const common = [
    "product_id", "provider_name", "display_name", "description", "permission",
    "mailbox_versions", "top_level_hosts", "override_host_types", "version_override_types",
    "form_types", "rule_fingerprints", "rule_collection_modes", "requested_heights",
    "disable_entity_highlighting", "action_types", "office_tab_ids", "group_ids",
    "control_fingerprints", "string_resources", "image_resources", "form_source_locations",
    "icon_url", "high_resolution_icon_url", "support_url", "app_domains",
  ];
  for (const field of common) {
    exact(taskpane[field], smartAlerts[field], `forward manifest ${field}`);
    exact(taskpane[field], rollback[field], `rollback manifest ${field}`);
  }
  if (
    taskpane.product_id !== PRODUCT_ID
    || smartAlerts.product_id !== PRODUCT_ID
    || rollback.product_id !== PRODUCT_ID
    || canonicalSmartAlerts.product_id !== PRODUCT_ID
    || taskpane.version !== TASKPANE_MANIFEST_VERSION
    || smartAlerts.version !== SMART_ALERTS_MANIFEST_VERSION
    || rollback.version !== ROLLBACK_MANIFEST_VERSION
    || canonicalSmartAlerts.version !== ARTIFACT_VERSION
    || taskpane.provider_name !== "AMIC OS"
    || taskpane.display_name !== "AMIC OS"
    || taskpane.permission !== "ReadItem"
  ) fail("manifest identity or least-privilege permission drifted");
  exact(taskpane.app_domains, [ORIGIN], "manifest AppDomains");
  exact(taskpane.form_source_locations, [TASKPANE], "manifest taskpane SourceLocation");
  validateTaskpaneOnlyManifest(taskpane, "taskpane-only");
  validateTaskpaneOnlyManifest(rollback, "rollback taskpane-only");
  exact(smartAlerts.extension_points, [
    "LaunchEvent", "MessageComposeCommandSurface", "MessageComposeCommandSurface",
    "MessageReadCommandSurface", "MessageReadCommandSurface",
  ], "Smart Alerts extension points");
  exact(smartAlerts.launch_events, ["OnMessageSend:onMessageSendHandler:PromptUser"], "Smart Alerts launch events");
  exact(smartAlerts.semantic_manifest_sha256, SMART_ALERTS_SEMANTIC_SHA256, "Smart Alerts semantic capabilities");
  exact(smartAlerts.url_resources, [
    `Commands.Url=${COMMANDS}`, `Commands.Url=${COMMANDS}`,
    `JSRuntime.Url=${ORIGIN}/addin/event-runtime.js`,
    `Taskpane.Url=${TASKPANE}`, `Taskpane.Url=${TASKPANE}`,
    `WebViewRuntime.Url=${ORIGIN}/addin/event-runtime.html`,
  ], "Smart Alerts URLs");
  for (const field of Object.keys(smartAlerts)) {
    if (field !== "version") {
      exact(smartAlerts[field], canonicalSmartAlerts[field], `canonical Smart Alerts ${field}`);
    }
  }
  exact(contract.stages[0].launch_events, taskpane.launch_events, "taskpane stage event binding");
  exact(contract.stages[1].launch_events, smartAlerts.launch_events, "Smart Alerts stage event binding");
  if (contract.rollback_removal.rollback_to_taskpane_only.manifest_version !== rollback.version) {
    fail("rollback manifest version binding drifted");
  }
}

async function validateReleaseBinding(repoRoot) {
  const release = JSON.parse(await readFile(path.join(repoRoot, releaseContractPath), "utf8"));
  if (release.release_version !== ARTIFACT_VERSION) fail("release artifact version is not shared");
  const matter = release.profiles?.find((profile) => profile.product_id === PRODUCT_ID);
  if (!matter || matter.production_manifest !== CANONICAL_SMART_ALERTS_MANIFEST || matter.permission !== "ReadItem") {
    fail("Smart Alerts stage is not the canonical Matter release manifest");
  }
  const requiredStatic = new Set(release.build?.required_static_paths ?? []);
  for (const relativePath of [
    "oauth-start.html", "oauth-start.js", "oauth-callback.html", "oauth-callback.js",
    "event-runtime.html", "event-runtime.js", "index.html",
  ]) if (!requiredStatic.has(relativePath)) fail(`release artifact omits ${relativePath}`);
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
  let smartAlerts;
  let rollback;
  let canonicalSmartAlerts;
  try {
    taskpane = parseOutlookManifest((await bytes(repoRoot, TASKPANE_MANIFEST, fileOverrides)).toString("utf8"));
    smartAlerts = parseOutlookManifest((await bytes(repoRoot, SMART_ALERTS_MANIFEST, fileOverrides)).toString("utf8"));
    rollback = parseOutlookManifest((await bytes(repoRoot, ROLLBACK_MANIFEST, fileOverrides)).toString("utf8"));
    canonicalSmartAlerts = parseOutlookManifest((await bytes(repoRoot, CANONICAL_SMART_ALERTS_MANIFEST, fileOverrides)).toString("utf8"));
  } catch (error) {
    fail(`manifest XML is invalid: ${error.message}`);
  }
  validateManifestSemantics(taskpane, smartAlerts, rollback, canonicalSmartAlerts, contract);
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
