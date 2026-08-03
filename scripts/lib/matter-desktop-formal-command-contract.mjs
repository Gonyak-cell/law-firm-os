import { readFileSync } from "node:fs";
import path from "node:path";
import { buildFormalPackagePlan, validateFormalPackagePlan } from "../run-matter-desktop-formal-package.mjs";

const SCRIPT_NAME = /^[A-Za-z0-9][A-Za-z0-9:_-]*$/u;
const EXACT_ALIAS = /^npm run ([A-Za-z0-9][A-Za-z0-9:_-]*)$/u;
const UNSUPPORTED_SHELL = /["'`\\;&|<>$()]/u;

export const FORMAL_PACKAGE_SCRIPT = "matter-desktop:formal-package";
export const FORMAL_RELEASE_COMPATIBILITY_SCRIPT = "matter-desktop:formal-release";
export const FORMAL_REMOTE_SMOKE_SCRIPT = "matter-desktop:formal-remote-smoke";
export const FORMAL_PACKAGE_RUNNER = "node scripts/run-matter-desktop-formal-package.mjs";

export const FORMAL_PACKAGE_REQUIRED_FRAGMENTS = Object.freeze([
  "validate-pv003-clean-sha-build-gate.mjs",
  "validate-pv001-desktop-version.mjs",
  "validate-pv002-build-manifest.mjs",
  "validate-pv004-desktop-channels.mjs",
  "validate-pv005-release-artifact-paths.mjs",
  "build-matter-desktop-mac.mjs",
  "build-matter-desktop-win.mjs",
  "build-matter-desktop-win-installer.mjs",
  "validate-public-renderer-no-hrx-roster-pii.mjs",
  "validate-matter-desktop-private-data-boundary.mjs",
  "validate-pv006-legacy-assets.mjs",
  "stage-matter-desktop-release-artifacts.mjs",
  "release-matter-desktop-formal.mjs",
  "validate-matter-desktop-formal-release-bundle.mjs",
  "validate-matter-desktop-no-public-release-claim.mjs",
]);

const FORBIDDEN_SCRIPT_NAME_PATTERNS = Object.freeze([
  /aws/u,
  /deploy/u,
  /deployed[-:]?api/u,
  /formal[-:]?remote[-:]?smoke/u,
  /operator[-:]?token/u,
  /password/u,
  /reset/u,
  /confirm/u,
  /credential/u,
]);

const FORBIDDEN_COMMAND_PATTERNS = Object.freeze([
  /(?:^|\s)aws(?:\s|$)/u,
  /smoke-matter-desktop-aws-runtime/u,
  /run-formal-deployed-api-package-qa/u,
  /(?:^|[-_:])(?:deploy|deployed-api|remote-smoke|password-reset|password-confirm|reset-password|confirm-password)(?:$|[-_:])/u,
  /(?:^|\s)(?:AWS_[A-Z_]+|MATTER_(?:OPERATOR|R4_OPERATOR|DESKTOP_OPERATOR|DEPLOY|REMOTE|API|CUTOVER)_[A-Z_]+|(?:OPERATOR|DEPLOY|REMOTE)_[A-Z_]+)=/u,
  /(?:^|\s)(?:MATTER_NOTARY_KEYCHAIN|MATTER_NOTARY_KEYCHAIN_PROFILE|MATTER_DESKTOP_SIGN|MATTER_DESKTOP_NOTARIZE|MATTER_DESKTOP_AUTHENTICODE[A-Z_]*|APPLE_[A-Z_]+|CSC_[A-Z_]+|WIN_CSC_[A-Z_]+|(?:HTTP|HTTPS)_PROXY|ELECTRON_BUILDER_OFFLINE|SIGNTOOL_TIMEOUT|CSC_FOR_PULL_REQUEST|CSC_IDENTITY_AUTO_DISCOVERY)(?:=|\s|$)/iu,
]);

function scriptKey(workspace, name) { return workspace ? `${workspace}::${name}` : name; }

function scriptSource({ rootScripts, workspaceScripts }, workspace, name) { return (workspace ? workspaceScripts?.[workspace] : rootScripts)?.[name]; }

function unsupportedCommandError(command) { const error = new Error(`unsupported shell/npm command form: ${command}`); error.code = "UNSUPPORTED_COMMAND"; return error; }

export function parseNpmRunReferences(command) {
  const text = String(command ?? "").trim();
  if (!text) return [];
  if (UNSUPPORTED_SHELL.test(text)) throw unsupportedCommandError(text);
  const match = EXACT_ALIAS.exec(text);
  if (match) return [{ name: match[1], workspace: null, token_index: 0 }];
  if (/\bnpm\b/u.test(text) || /(?:^|\s)run(?:\s|$)/u.test(text)) throw unsupportedCommandError(text);
  return [];
}

export function resolveNpmScriptGraph({ rootScripts, workspaceScripts = {}, rootName }) {
  const visited = new Map();
  const edges = [];
  const errors = [];

  function visit(workspace, name, ancestry) {
    const key = scriptKey(workspace, name);
    const command = scriptSource({ rootScripts, workspaceScripts }, workspace, name);
    if (typeof command !== "string") {
      errors.push({ code: "UNDEFINED_ALIAS", key, ancestry: [...ancestry] });
      return;
    }
    if (ancestry.includes(key)) {
      errors.push({ code: "CYCLE", key, ancestry: [...ancestry, key] });
      return;
    }
    if (!visited.has(key)) visited.set(key, { key, workspace, name, command });
    let references;
    try {
      references = parseNpmRunReferences(command);
    } catch (error) {
      errors.push({ code: error.code ?? "UNSUPPORTED_COMMAND", key, command, ancestry: [...ancestry] });
      return;
    }
    const nextAncestry = [...ancestry, key];
    for (const reference of references) {
      const targetKey = scriptKey(reference.workspace, reference.name);
      edges.push({ from: key, to: targetKey });
      visit(reference.workspace, reference.name, nextAncestry);
    }
  }

  if (!SCRIPT_NAME.test(String(rootName ?? ""))) {
    errors.push({ code: "INVALID_ROOT_SCRIPT", key: rootName });
  } else {
    visit(null, rootName, []);
  }
  return Object.freeze({
    root: rootName,
    nodes: Object.freeze([...visited.values()]),
    edges: Object.freeze(edges),
    errors: Object.freeze(errors),
    commandText: [...visited.values()].map(({ command }) => command).join("\n"),
  });
}

export function readDesktopCommandPackages(repoRoot) {
  const rootPackage = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const desktopPackage = JSON.parse(readFileSync(path.join(repoRoot, "apps/desktop/package.json"), "utf8"));
  return Object.freeze({
    repoRoot,
    rootScripts: Object.freeze({ ...(rootPackage.scripts ?? {}) }),
    workspaceScripts: Object.freeze({
      "apps/desktop": Object.freeze({ ...(desktopPackage.scripts ?? {}) }),
    }),
  });
}

function forbiddenNodeReason(node) {
  const nameMatch = FORBIDDEN_SCRIPT_NAME_PATTERNS.find((pattern) => pattern.test(node.name));
  if (nameMatch) return `script alias ${node.key} matches ${nameMatch}`;
  const commandMatch = FORBIDDEN_COMMAND_PATTERNS.find((pattern) => pattern.test(node.command));
  if (commandMatch) return `script ${node.key} contains forbidden command ${commandMatch}`;
  return null;
}

export function forbiddenFormalPackageNodes(graph) {
  return graph.nodes.flatMap((node) => {
    const reason = forbiddenNodeReason(node);
    return reason ? [{ key: node.key, reason }] : [];
  });
}

function assertNoGraphErrors(graph, label) { if (graph.errors.length > 0) throw new Error(`${label} contains undefined aliases, cycles, or unsupported commands: ${JSON.stringify(graph.errors)}`); }

function lifecycleHooks(rootScripts, scriptNames) {
  const names = new Set(scriptNames ?? []);
  return [...names].flatMap((scriptName) => [
    `pre${scriptName}`,
    `post${scriptName}`,
  ]).filter((name) => Object.prototype.hasOwnProperty.call(rootScripts, name));
}

function reachableRootScriptNames(...graphs) {
  return graphs.flatMap((graph) => graph.nodes
    .filter((node) => node.workspace === null)
    .map((node) => node.name));
}

function forbiddenWorkspaceLifecycleHooks(workspaceScripts) {
  return Object.entries(workspaceScripts ?? {}).flatMap(([workspace, scripts]) => Object.entries(scripts ?? {})
    .filter(([name, command]) => /^pre(?:build|test)|^post(?:build|test)/u.test(name)
      && (FORBIDDEN_COMMAND_PATTERNS.some((pattern) => pattern.test(String(command)))
        || /\bnpm\b/u.test(String(command))))
    .map(([name, command]) => ({ workspace, name, command })));
}

function planText(plan) { return plan.map((step) => step.argv.join(" ")).join("\n"); }

function assertRequiredPlanFragments(plan) {
  const text = planText(plan);
  for (const fragment of FORMAL_PACKAGE_REQUIRED_FRAGMENTS) {
    if (!text.includes(fragment)) throw new Error(`formal package plan is missing ${fragment}`);
  }
}

function directRemoteGraph(rootScripts) {
  const command = rootScripts[FORMAL_REMOTE_SMOKE_SCRIPT];
  return Object.freeze({
    root: FORMAL_REMOTE_SMOKE_SCRIPT,
    nodes: Object.freeze(typeof command === "string" ? [{
      key: FORMAL_REMOTE_SMOKE_SCRIPT,
      workspace: null,
      name: FORMAL_REMOTE_SMOKE_SCRIPT,
      command,
    }] : []),
    edges: Object.freeze([]),
    errors: Object.freeze([]),
    commandText: typeof command === "string" ? command : "",
  });
}

export function assertFormalPackageCommandContract({
  rootScripts,
  workspaceScripts = {},
  repoRoot = process.cwd(),
} = {}) {
  const packageGraph = resolveNpmScriptGraph({
    rootScripts,
    workspaceScripts,
    rootName: FORMAL_PACKAGE_SCRIPT,
  });
  assertNoGraphErrors(packageGraph, FORMAL_PACKAGE_SCRIPT);
  const compatibilityGraph = resolveNpmScriptGraph({
    rootScripts,
    workspaceScripts,
    rootName: FORMAL_RELEASE_COMPATIBILITY_SCRIPT,
  });
  assertNoGraphErrors(compatibilityGraph, FORMAL_RELEASE_COMPATIBILITY_SCRIPT);
  const remoteGraph = directRemoteGraph(rootScripts ?? {});

  const packageForbidden = forbiddenFormalPackageNodes(packageGraph);
  const compatibilityForbidden = forbiddenFormalPackageNodes(compatibilityGraph);
  if (packageForbidden.length > 0 || compatibilityForbidden.length > 0) {
    throw new Error(`formal package graph crosses the remote or authority boundary: ${JSON.stringify({ packageForbidden, compatibilityForbidden })}`);
  }
  const rootLifecycleHooks = lifecycleHooks(rootScripts ?? {}, reachableRootScriptNames(packageGraph, compatibilityGraph));
  if (rootLifecycleHooks.length > 0) {
    throw new Error(`formal package cannot define root lifecycle hooks: ${rootLifecycleHooks.join(", ")}`);
  }
  const workspaceHooks = forbiddenWorkspaceLifecycleHooks(workspaceScripts);
  if (workspaceHooks.length > 0) {
    throw new Error(`formal package cannot reach forbidden workspace lifecycle hooks: ${JSON.stringify(workspaceHooks)}`);
  }
  if (rootScripts?.[FORMAL_PACKAGE_SCRIPT] !== FORMAL_PACKAGE_RUNNER) {
    throw new Error(`formal package must use the exact structured runner invocation: ${FORMAL_PACKAGE_RUNNER}`);
  }
  if (rootScripts?.[FORMAL_RELEASE_COMPATIBILITY_SCRIPT] !== `npm run ${FORMAL_PACKAGE_SCRIPT}`) {
    throw new Error("formal release must be the exact compatibility alias to formal package");
  }

  const plan = buildFormalPackagePlan({ repoRoot });
  const planValidation = validateFormalPackagePlan(plan, { rootScripts, repoRoot });
  assertRequiredPlanFragments(plan);

  const remoteText = remoteGraph.commandText;
  if (!remoteText.includes("matter-desktop:aws-runtime:smoke")
    || !remoteText.includes("run-formal-deployed-api-package-qa.mjs")) {
    throw new Error("formal remote smoke must explicitly own the AWS and deployed-package smoke calls");
  }
  if (packageTextIncludesRemote(packageGraph) || compatibilityGraph.nodes.some((node) => node.key === FORMAL_REMOTE_SMOKE_SCRIPT)) {
    throw new Error("formal package must not transitively reach formal remote smoke");
  }
  return Object.freeze({
    packageGraph,
    compatibilityGraph,
    remoteGraph,
    plan,
    planValidation,
    planText: planText(plan),
    package_nodes: packageGraph.nodes.length,
    package_edges: packageGraph.edges.length,
    remote_nodes: remoteGraph.nodes.length,
    package_forbidden_nodes: packageForbidden,
  });
}

function packageTextIncludesRemote(graph) {
  return graph.nodes.some((node) => node.key === FORMAL_REMOTE_SMOKE_SCRIPT)
    || graph.commandText.includes(FORMAL_REMOTE_SMOKE_SCRIPT)
    || graph.commandText.includes("matter-desktop:aws-runtime:smoke")
    || graph.commandText.includes("run-formal-deployed-api-package-qa.mjs");
}

export function assertNoForbiddenFormalPackageAliases({ rootScripts, workspaceScripts = {} } = {}) {
  const graph = resolveNpmScriptGraph({ rootScripts, workspaceScripts, rootName: FORMAL_PACKAGE_SCRIPT });
  assertNoGraphErrors(graph, FORMAL_PACKAGE_SCRIPT);
  const forbidden = forbiddenFormalPackageNodes(graph);
  if (forbidden.length > 0) throw new Error(`formal package graph contains forbidden nodes: ${JSON.stringify(forbidden)}`);
  const rootLifecycleHooks = lifecycleHooks(rootScripts ?? {}, reachableRootScriptNames(graph));
  if (rootLifecycleHooks.length > 0) throw new Error(`formal package graph contains forbidden root lifecycle hooks: ${JSON.stringify(rootLifecycleHooks)}`);
  const workspaceHooks = forbiddenWorkspaceLifecycleHooks(workspaceScripts);
  if (workspaceHooks.length > 0) throw new Error(`formal package graph contains forbidden workspace lifecycle hooks: ${JSON.stringify(workspaceHooks)}`);
  return graph;
}
