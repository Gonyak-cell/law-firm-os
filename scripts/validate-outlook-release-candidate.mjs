#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { collectBuildInventory, sha256, validateBuildInventories, validateCoveragePaths, validateDependencyLicenses, validateReleaseCandidateReceipt, validateReleaseContract, validateRollbackContract, validateSurfaceSeparation } from "./lib/outlook-release-gates.mjs";
import { createCommandRunner, exactGitIdentity, trackedGitPaths } from "./lib/outlook-release/cli-runtime.mjs";
import { CLIENT_SCOPE_FINGERPRINT_SHA256 } from "./lib/outlook-release/constants.mjs";
import { assertActiveScriptContext } from "./lib/outlook-release/profile-html.mjs";
import { validateOutlookAddinSurfaces } from "./validate-outlook-addin-surfaces.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const OFFICE_JS_SOURCE = "https://appsforoffice.microsoft.com/lib/1/hosted/office.js";
const CLASSIC_SCRIPT_TYPES = new Set(["text/javascript", "application/javascript"]);
const SCRIPT_ATTRIBUTE = /([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/giu;
const KNOWN_SCRIPT_ATTRIBUTE = /\b(?:type|src)\b\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/giu;

function parseScriptTag(tag) {
  const attributes = [...tag.matchAll(SCRIPT_ATTRIBUTE)];
  const values = (name) => attributes.filter(([, key]) => key.toLowerCase() === name)
    .map(([, , doubleQuoted, singleQuoted, unquoted]) => doubleQuoted ?? singleQuoted ?? unquoted);
  return { typeValues: values("type"), srcValues: values("src"), unknown: tag.replace(KNOWN_SCRIPT_ATTRIBUTE, "").replace(/\bcrossorigin\b/giu, "").trim() !== "", crossoriginCount: [...tag.matchAll(/\bcrossorigin\b/giu)].length, crossoriginValue: /\bcrossorigin\s*=/iu.test(tag) };
}

function option(name) {
  const index = process.argv.indexOf(name); const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function run(runCommand, command, args, environment = {}) {
  try {
    return runCommand(command, args, {
      encoding: "utf8", env: { ...process.env, CI: "1", ...environment }, maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim().slice(-4_000); throw new Error(`${command} ${args.join(" ")} failed${output ? `: ${output}` : ""}`);
  }
}

export async function profileArtifacts(contract, inventory, { root = repoRoot } = {}) {
  const byPath = new Map(inventory.map((entry) => [entry.path, entry]));
  const result = [];
  for (const profile of contract.profiles) {
    const namespaceRows = (contract.static_deploy?.namespaces ?? []).filter((namespace) => namespace?.profile === profile.profile && namespace?.product_id === profile.product_id);
    if (namespaceRows.length !== 1) {
      throw new Error(`${profile.profile} must have exactly one matching static namespace contract row`);
    }
    const { source_prefix: sourcePrefix, target_prefix: targetPrefix } = namespaceRows[0];
    if (typeof sourcePrefix !== "string" || typeof targetPrefix !== "string" || (!sourcePrefix.endsWith("/") && sourcePrefix !== "") || !targetPrefix.endsWith("/")
      || [sourcePrefix, targetPrefix].some((prefix) => prefix.startsWith("/") || /[?#%\\@\s\u0000-\u001f\u007f:]/u.test(prefix) || prefix.includes("//") || prefix.split("/").some((segment) => segment === "." || segment === ".."))) {
      throw new Error(`${profile.profile} static namespace contract prefixes are malformed`);
    }
    const expectedPrefix = `/${targetPrefix}`;
    const html = await readFile(path.join(root, contract.build.root, profile.taskpane_html), "utf8");
    assertActiveScriptContext(html, profile.profile);
    if (/<base\b/iu.test(html)) {
      throw new Error(`${profile.profile} task pane must not define a document base URL`);
    }
    const openingScripts = [...html.matchAll(/<script\b[^>]*>/giu)];
    const scriptElements = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)(<\/script\b[^>]*>)/giu)];
    const closingScripts = [...html.matchAll(/<\/script\b[^>]*>/giu)];
    if ([...html.matchAll(/<script\b/giu)].length !== openingScripts.length || scriptElements.length !== openingScripts.length
      || scriptElements.length !== closingScripts.length || scriptElements.length !== 2
      || scriptElements.some(([, , , closing]) => !/^<\/script\s*>$/iu.test(closing))) {
      throw new Error(`${profile.profile} task pane must contain exactly two closed script elements`);
    }
    const scripts = scriptElements.map(([, tag, body]) => ({ ...parseScriptTag(tag), body }));
    if (scripts.some(({ body }) => body.trim() !== "")) throw new Error(`${profile.profile} task pane scripts must not contain inline content`);
    const moduleIndexes = scripts.flatMap(({ typeValues }, index) => (
      typeValues.some((value) => value.trim().toLowerCase() === "module") ? [index] : []
    ));
    const officeIndexes = scripts.flatMap(({ typeValues }, index) => (
      typeValues.length === 0 || (typeValues.length === 1 && CLASSIC_SCRIPT_TYPES.has(typeValues[0].trim().toLowerCase()))
        ? [index] : []
    ));
    if (moduleIndexes.length !== 1 || officeIndexes.length !== 1 || moduleIndexes[0] === officeIndexes[0]) {
      throw new Error(`${profile.profile} task pane must contain one module entry and one approved Office.js script`);
    }
    const moduleScript = scripts[moduleIndexes[0]]; const officeScript = scripts[officeIndexes[0]];
    if (moduleScript.unknown || moduleScript.crossoriginCount !== 1 || moduleScript.crossoriginValue
      || moduleScript.typeValues.length !== 1 || moduleScript.srcValues.length !== 1
      || moduleScript.typeValues[0].trim().toLowerCase() !== "module") {
      throw new Error(`${profile.profile} module script type/src attributes are ambiguous`);
    }
    if (officeScript.unknown || officeScript.crossoriginCount !== 0 || officeScript.typeValues.length > 1 || officeScript.srcValues.length !== 1
      || (officeScript.typeValues.length === 1
        && !CLASSIC_SCRIPT_TYPES.has(officeScript.typeValues[0].trim().toLowerCase()))
      || officeScript.srcValues[0] !== OFFICE_JS_SOURCE) {
      throw new Error(`${profile.profile} task pane must use the exact approved Office.js script`);
    }
    const rawSource = moduleScript.srcValues[0];
    if (!rawSource.startsWith("/")) {
      throw new Error(`${profile.profile} module script source must be root-relative`);
    }
    if (/[?&#%\\@\s\u0000-\u001f\u007f:]/u.test(rawSource) || rawSource.includes("//")) {
      throw new Error(`${profile.profile} module script source contains unsafe URL syntax`);
    }
    if (!rawSource.startsWith(expectedPrefix)) {
      throw new Error(`${profile.profile} module script source uses the wrong static namespace`);
    }
    const sourcePath = rawSource.slice(expectedPrefix.length);
    const pathSegments = sourcePath.split("/");
    if (!sourcePath || !sourcePath.endsWith(".js") || pathSegments.some((segment) => !segment || segment === "." || segment === "..")) {
      throw new Error(`${profile.profile} module script source has an unsafe static path`);
    }
    const bundlePath = `${sourcePrefix}${sourcePath}`;
    const bundle = byPath.get(bundlePath);
    const taskpane = byPath.get(profile.taskpane_html);
    if (!bundle || !taskpane) throw new Error(`${profile.profile} task pane bundle is missing from the build inventory`);
    result.push({
      profile: profile.profile,
      product_id: profile.product_id,
      taskpane_html_path: taskpane.path,
      taskpane_html_sha256: taskpane.sha256,
      bundle_path: bundle.path,
      bundle_sha256: bundle.sha256,
    });
  }
  return result;
}

export async function graphScopeFingerprint(contract, { root = repoRoot } = {}) {
  const graphModel = await import(pathToFileURL(path.join(root, "packages/email-dms/src/m365-connection-model.js")));
  const oauthClient = await import(pathToFileURL(path.join(root, "apps/api/src/microsoft-delegated-oauth-client.js")));
  const graphScopes = [...graphModel.M365_GRAPH_REQUIRED_SCOPES].sort();
  // The Graph connection model canonicalizes granted scopes as a sorted set,
  // so the Graph release field intentionally remains order-insensitive. The
  // delegated OAuth client serializes its scope array directly into the
  // provider request; preserve and compare those bytes without sorting.
  const oauthScopes = [...oauthClient.CLIENT_OUTLOOK_OAUTH_SCOPES];
  if (JSON.stringify(graphScopes) !== JSON.stringify([...contract.client_outlook_graph_connection_scopes].sort())
    || JSON.stringify(oauthScopes) !== JSON.stringify(contract.client_outlook_oauth_scopes)) {
    throw new Error("Client Outlook delegated OAuth/Graph scope drifted");
  }
  return { graph_connection_scopes: graphScopes, oauth_scopes: oauthScopes, fingerprint_sha256: CLIENT_SCOPE_FINGERPRINT_SHA256, diff: "none" };
}

export async function createOutlookReleaseCandidateReceipt({
  expectedSourceSha,
  root = repoRoot,
  runCommand: providedRunCommand,
} = {}) {
  if (!expectedSourceSha) throw new TypeError("expectedSourceSha is required");
  const contractRef = "contracts/outlook-addin-release-gates.json";
  const contractBytes = await readFile(path.join(root, contractRef));
  const contract = JSON.parse(contractBytes);
  const baselineBytes = await readFile(path.join(root, contract.baseline_receipt));
  const surfaceBytes = await readFile(path.join(root, contract.surface_contract));
  const rollbackBytes = await readFile(path.join(root, contract.rollback_contract));
  const baseline = JSON.parse(baselineBytes);
  const surface = JSON.parse(surfaceBytes);
  const rollback = JSON.parse(rollbackBytes);
  const packageLockBytes = await readFile(path.join(root, "package-lock.json"));
  const packageLock = JSON.parse(packageLockBytes);

  validateReleaseContract(contract);
  const runCommand = providedRunCommand
    ?? createCommandRunner({ cwd: root, allowedCommands: ["git", "npm", "npx"] });
  const { sourceSha, sourceTree } = exactGitIdentity({ expectedSourceSha, runCommand });

  const trackedPaths = trackedGitPaths(runCommand);
  const coverage = validateCoveragePaths(trackedPaths, contract);
  const licenses = validateDependencyLicenses(packageLock, contract);
  const rollbackResult = validateRollbackContract(rollback, baseline, contract);
  const surfaceResult = validateSurfaceSeparation(surface, baseline, contract);
  const graphScopes = await graphScopeFingerprint(contract, { root });
  const candidateResult = await validateOutlookAddinSurfaces({ repoRoot: root, baseline, mode: "candidate" });
  if (candidateResult.permission_event_diff !== "none") throw new Error("candidate manifest drifted from frozen identity contract");

  const [buildCommand, ...buildArgs] = contract.build.command;
  const buildEnvironment = { LAWOS_OUTLOOK_ADDIN_BUILD_REVISION: sourceSha };
  run(runCommand, buildCommand, buildArgs, buildEnvironment);
  const first = await collectBuildInventory(path.join(root, contract.build.root), contract);
  run(runCommand, buildCommand, buildArgs, buildEnvironment);
  const second = await collectBuildInventory(path.join(root, contract.build.root), contract);
  const build = validateBuildInventories(first, second, contract);

  const manifests = [];
  for (const manifest of contract.manifests) {
    run(runCommand, "npx", ["--yes", "office-addin-manifest@2.1.6", "validate", manifest]);
    const bytes = await readFile(path.join(root, manifest));
    manifests.push({ path: manifest, sha256: sha256(bytes) });
  }
  const artifacts = await profileArtifacts(contract, build.inventory, { root });
  const eventRuntime = build.inventory.find(({ path: file }) => file === "event-runtime.js");
  if (!eventRuntime) throw new Error("event runtime is missing from the release inventory");
  const finalIdentity = exactGitIdentity({ expectedSourceSha: sourceSha, runCommand });
  if (finalIdentity.sourceTree !== sourceTree) {
    throw new Error("release validation changed or drifted from the exact source tree");
  }

  const contractArtifacts = {
    baseline: { ref: contract.baseline_receipt, sha256: sha256(baselineBytes) },
    release_gate: { ref: contractRef, sha256: sha256(contractBytes) },
    rollback: { ref: contract.rollback_contract, sha256: sha256(rollbackBytes) },
    surface: { ref: contract.surface_contract, sha256: sha256(surfaceBytes) },
  };
  const receipt = {
    schema_version: "amic-os.outlook-release-candidate.v1",
    verdict: "PASS",
    source_sha: sourceSha,
    source_tree: sourceTree,
    package_lock_sha256: sha256(packageLockBytes),
    exact_sha_bound: true,
    builds_identical: build.builds_identical,
    artifact_count: build.artifact_count,
    inventory_sha256: build.inventory_sha256,
    inventory: build.inventory,
    profile_artifacts: artifacts,
    event_runtime: eventRuntime,
    profiles: candidateResult.profiles,
    manifest_validation: {
      validator: "office-addin-manifest@2.1.6",
      official_validation_count: manifests.length,
      manifests,
    },
    coverage,
    licenses,
    rollback: rollbackResult,
    surface: surfaceResult,
    graph_scopes: graphScopes,
    contract_artifacts: contractArtifacts,
    runtime_provider_calls: 0,
    external_mutations: 0,
    allowed_claim: "Exact source, deterministic local build, four official manifest validations, frozen profile drift, rollback metadata, and dependency licenses passed.",
    blocked_claim: "This receipt is not API/static/M365 deployment, propagation, real Outlook host, Graph delivery, DocuSign sandbox, or go-live evidence.",
  };
  validateReleaseCandidateReceipt(receipt, contract, {
    baseline,
    contractArtifacts,
    existingPaths: trackedPaths,
    expectedSourceIdentity: {
      source_sha: sourceSha,
      source_tree: sourceTree,
      package_lock_sha256: sha256(packageLockBytes),
    },
    packageLock,
    packageLockBytes,
    manifestHashesByPath: Object.fromEntries(manifests.map(({ path: manifest, sha256: digest }) => [manifest, digest])),
    rollback,
    surface,
  });
  return receipt;
}

async function main() {
  const receipt = await createOutlookReleaseCandidateReceipt({ expectedSourceSha: option("--source-sha") });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
