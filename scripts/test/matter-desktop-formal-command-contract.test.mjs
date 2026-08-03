import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolveMatterDesktopAuthenticodeConfiguration } from "../lib/matter-desktop-authenticode.mjs";
import {
  FORMAL_PACKAGE_RUNNER,
  FORMAL_PACKAGE_SCRIPT,
  FORMAL_RELEASE_COMPATIBILITY_SCRIPT,
  FORMAL_REMOTE_SMOKE_SCRIPT,
  assertFormalPackageCommandContract,
  assertNoForbiddenFormalPackageAliases,
  readDesktopCommandPackages,
  resolveNpmScriptGraph,
} from "../lib/matter-desktop-formal-command-contract.mjs";
import {
  buildFormalPackagePlan,
  sanitizeFormalPackageEnvironment,
  validateFormalPackagePlan,
} from "../run-matter-desktop-formal-package.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RUNNER = path.join(ROOT, "scripts/run-matter-desktop-formal-package.mjs");

function fixture(rootCommand, extra = {}, workspaceScripts = {}) {
  return {
    rootScripts: {
      [FORMAL_PACKAGE_SCRIPT]: rootCommand,
      [FORMAL_RELEASE_COMPATIBILITY_SCRIPT]: `npm run ${FORMAL_PACKAGE_SCRIPT}`,
      [FORMAL_REMOTE_SMOKE_SCRIPT]: "npm run matter-desktop:aws-runtime:smoke && node scripts/run-formal-deployed-api-package-qa.mjs",
      ...extra,
    },
    workspaceScripts: {
      "apps/desktop": {
        "build:mac": "node ../../scripts/build-matter-desktop-mac.mjs",
        ...workspaceScripts,
      },
    },
  };
}

test("RFD-TUW-011 formal-package owns the structured local plan and formal-release is its exact compatibility alias", () => {
  const packages = readDesktopCommandPackages(ROOT);
  const result = assertFormalPackageCommandContract(packages);
  assert.equal(packages.rootScripts[FORMAL_PACKAGE_SCRIPT], FORMAL_PACKAGE_RUNNER);
  assert.equal(packages.rootScripts[FORMAL_RELEASE_COMPATIBILITY_SCRIPT], `npm run ${FORMAL_PACKAGE_SCRIPT}`);
  assert.equal(result.packageGraph.nodes.length, 1);
  assert.deepEqual(result.compatibilityGraph.edges, [{
    from: FORMAL_RELEASE_COMPATIBILITY_SCRIPT,
    to: FORMAL_PACKAGE_SCRIPT,
  }]);
  assert.equal(result.planValidation.step_count, 21);
  assert.equal(result.planValidation.stage_index < result.planValidation.pv005_package_index, true);
  assert.equal(result.planValidation.pv005_package_index < result.planValidation.release_index, true);
  assert.equal(result.planValidation.release_index < result.planValidation.bundle_index, true);
  assert.equal(result.package_forbidden_nodes.length, 0);
  assert.equal(result.packageGraph.nodes.some(({ key }) => key === FORMAL_REMOTE_SMOKE_SCRIPT), false);
  assert.match(result.remoteGraph.commandText, /matter-desktop:aws-runtime:smoke/u);
  assert.match(result.remoteGraph.commandText, /run-formal-deployed-api-package-qa\.mjs/u);
});

test("RFD-TUW-011 rejects an indirectly aliased AWS/reset/deploy package path", () => {
  const packages = fixture("npm run local", {
    local: "npm run second-hop",
    "second-hop": "npm run password-reset-wrapper",
    "password-reset-wrapper": "node scripts/smoke-matter-desktop-aws-runtime.mjs",
  });
  assert.throws(
    () => assertNoForbiddenFormalPackageAliases(packages),
    /formal package graph contains|password|aws/u,
  );
});

test("RFD-TUW-011 rejects an indirect deployed API and operator credential alias", () => {
  const packages = fixture("npm run local", {
    local: "npm run approval-hop",
    "approval-hop": "npm run local-remote",
    "local-remote": "MATTER_OPERATOR_TOKEN=bad node scripts/run-formal-deployed-api-package-qa.mjs",
  });
  assert.throws(
    () => assertNoForbiddenFormalPackageAliases(packages),
    /formal package graph contains|deployed|operator|credential/u,
  );
});

test("RFD-TUW-011 fails closed on quoted, concatenated, dynamic, and compound npm aliases", () => {
  for (const rootCommand of [
    '"npm" run hidden',
    "n''pm run hidden",
    'n"pm" run hidden',
    "npm run hidden && node scripts/smoke-matter-desktop-aws-runtime.mjs",
    "npm run $HIDDEN",
  ]) {
    const packages = fixture(rootCommand, {
      hidden: "node scripts/smoke-matter-desktop-aws-runtime.mjs",
    });
    assert.throws(
      () => assertNoForbiddenFormalPackageAliases(packages),
      /unsupported shell\/npm command form|undefined aliases|cycles/u,
      rootCommand,
    );
  }
});

const FULL_FORMAL_LIFECYCLE_HOOKS = [
  "prematter-desktop:formal-package",
  "postmatter-desktop:formal-package",
  "prematter-desktop:formal-release",
  "postmatter-desktop:formal-release",
];

test("RFD-TUW-011 rejects root and workspace lifecycle authority hooks", () => {
  for (const hook of FULL_FORMAL_LIFECYCLE_HOOKS) {
    const rootHook = fixture(FORMAL_PACKAGE_RUNNER, {
      [hook]: "node scripts/smoke-matter-desktop-aws-runtime.mjs",
    });
    assert.throws(
      () => assertFormalPackageCommandContract(rootHook),
      /lifecycle hooks|aws/u,
      hook,
    );
  }

  const workspaceHook = fixture(FORMAL_PACKAGE_RUNNER, {}, {
    "prebuild:mac": "aws sts get-caller-identity",
  });
  assert.throws(
    () => assertFormalPackageCommandContract(workspaceHook),
    /workspace|aws|authority/u,
  );
});

test("RFD-TUW-011 observes npm PRE/MAIN/POST behavior for full script names", () => {
  const root = mkdtempSync(path.join(tmpdir(), "matter-formal-npm-hooks-"));
  try {
    const emit = (label) => `${process.execPath} -e ${JSON.stringify(`console.log(${JSON.stringify(label)})`)}`;
    const scripts = {
      [FORMAL_PACKAGE_SCRIPT]: emit("MAIN_PACKAGE"),
      [FORMAL_RELEASE_COMPATIBILITY_SCRIPT]: `npm run ${FORMAL_PACKAGE_SCRIPT}`,
      "prematter-desktop:formal-package": emit("PRE_PACKAGE"),
      "postmatter-desktop:formal-package": emit("POST_PACKAGE"),
      "prematter-desktop:formal-release": emit("PRE_RELEASE"),
      "postmatter-desktop:formal-release": emit("POST_RELEASE"),
    };
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "formal-hook-fixture", private: true, scripts }, null, 2));
    const result = spawnSync("npm", ["run", FORMAL_RELEASE_COMPATIBILITY_SCRIPT], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, npm_config_loglevel: "silent", npm_config_update_notifier: "false" },
    });
    assert.equal(result.status, 0, result.stderr);
    const markers = result.stdout.split(/\r?\n/u).filter((line) => /^\w+_(?:PACKAGE|RELEASE)$/u.test(line));
    assert.deepEqual(markers, ["PRE_RELEASE", "PRE_PACKAGE", "MAIN_PACKAGE", "POST_PACKAGE", "POST_RELEASE"]);
    assert.throws(
      () => assertNoForbiddenFormalPackageAliases(fixture(FORMAL_PACKAGE_RUNNER, Object.fromEntries(
        FULL_FORMAL_LIFECYCLE_HOOKS.map((hook) => [hook, "aws sts get-caller-identity"]),
      ))),
      /root lifecycle hooks/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-011 strips consumer signing, timestamp, proxy, remote, AWS, and deployment authority", () => {
  const injected = {
    AWS_PROFILE: "injected-profile",
    AWS_ACCESS_KEY_ID: "injected-access-key",
    AWS_SECRET_ACCESS_KEY: "injected-secret",
    AWS_SESSION_TOKEN: "injected-session",
    MATTER_OPERATOR_TOKEN: "injected-operator-token",
    MATTER_DEPLOY_API_URL: "https://injected.invalid",
    MATTER_REMOTE_SMOKE: "1",
    DEPLOY_TOKEN: "injected-deploy-token",
    MATTER_DESKTOP_AUTHENTICODE: "1",
    MATTER_DESKTOP_AUTHENTICODE_CERTIFICATE_SHA1: "A".repeat(40),
    MATTER_DESKTOP_AUTHENTICODE_TIMESTAMP_URL: "https://timestamp.digicert.com",
    MATTER_DESKTOP_SIGN: "developer-id",
    MATTER_DESKTOP_SIGN_IDENTITY: "Developer ID Application: injected",
    MATTER_DESKTOP_NOTARIZE: "1",
    MATTER_NOTARY_KEYCHAIN: "injected-keychain",
    MATTER_NOTARY_KEYCHAIN_PROFILE: "injected-profile",
    CSC_LINK: "injected-cert",
    CSC_KEY_PASSWORD: "injected-password",
    WIN_CSC_LINK: "injected-win-cert",
    csc_link: "lowercase-cert",
    csc_key_password: "lowercase-password",
    cSc_Key_Password: "mixed-password",
    win_csc_link: "lowercase-win-cert",
    win_csc_key_password: "lowercase-win-password",
    WiN_CsC_KeY_PaSsWoRd: "mixed-win-password",
    APPLE_ID: "injected@example.invalid",
    APPLE_APP_SPECIFIC_PASSWORD: "injected-password",
    APPLE_TEAM_ID: "INJECTEDTEAM",
    APPLE_API_KEY: "injected-key",
    APPLE_KEYCHAIN: "injected-keychain",
    APPLE_KEYCHAIN_PROFILE: "injected-profile",
    KEYCHAIN_PROFILE: "injected-keychain",
    CERTIFICATE_PATH: "injected-cert",
    SIGNING_IDENTITY: "injected-identity",
    npm_config_csc_link: "injected-lowercase-cert",
    AZURE_CLIENT_SECRET: "injected-secret",
    SIGNTOOL_TIMEOUT: "1",
    ELECTRON_BUILDER_OFFLINE: "false",
    HTTPS_PROXY: "https://proxy.invalid",
    HTTP_PROXY: "http://proxy.invalid",
    https_proxy: "https://proxy.invalid",
    http_proxy: "http://proxy.invalid",
    CSC_NAME: "injected-name",
    CSC_IDENTITY_AUTO_DISCOVERY: "true",
    CSC_FOR_PULL_REQUEST: "true",
    CSC_INSTALLER_LINK: "injected-installer-cert",
    CSC_INSTALLER_KEY_PASSWORD: "injected-installer-password",
    CSC_KEYCHAIN: "injected-keychain",
    WIN_CSC_KEY_PASSWORD: "injected-win-password",
  };
  const caseVariantKeys = [
    "csc_link",
    "csc_key_password",
    "cSc_Key_Password",
    "win_csc_link",
    "win_csc_key_password",
    "WiN_CsC_KeY_PaSsWoRd",
  ];
  assert.deepEqual(caseVariantKeys.filter((key) => Object.hasOwn(injected, key)), caseVariantKeys);
  const childEnv = sanitizeFormalPackageEnvironment(injected);
  const probe = spawnSync(process.execPath, ["-e", "console.log(JSON.stringify(Object.keys(process.env).filter((key) => /^(?:AWS_|MATTER_(?:OPERATOR|R4_OPERATOR|DESKTOP_OPERATOR|DEPLOY|REMOTE|API|CUTOVER)_|(?:OPERATOR|DEPLOY|REMOTE)_|MATTER_DESKTOP_AUTHENTICODE|MATTER_DESKTOP_SIGN|MATTER_DESKTOP_NOTAR|MATTER_NOTARY|CSC_|WIN_CSC_|APPLE_|KEYCHAIN|CERTIFICATE|SIGNING_|npm_config_(?:csc|win_csc|apple|notary|sign)|AZURE_|https?_proxy$|SIGNTOOL_TIMEOUT$|ELECTRON_BUILDER_OFFLINE$)/iu.test(key))))"], {
    env: childEnv,
    encoding: "utf8",
  });
  assert.equal(probe.status, 0, probe.stderr);
  assert.deepEqual(JSON.parse(probe.stdout), []);
  assert.equal(caseVariantKeys.some((key) => Object.hasOwn(childEnv, key)), false);
  const windowsAuthenticode = resolveMatterDesktopAuthenticodeConfiguration({
    env: childEnv,
    platform: "win32",
    formalRelease: true,
  });
  const macAuthenticode = resolveMatterDesktopAuthenticodeConfiguration({
    env: childEnv,
    platform: "darwin",
    formalRelease: true,
  });
  assert.equal(windowsAuthenticode, null, "scrubbed Windows plan must not enable signing or timestamping");
  assert.equal(macAuthenticode, null, "scrubbed macOS plan must not enable Authenticode");
  const plan = buildFormalPackagePlan({ repoRoot: ROOT });
  assert.equal(validateFormalPackagePlan(plan).step_count, 21);
  assert.equal(plan.some(({ env }) => Object.keys(env).some((key) => Object.hasOwn(injected, key))), false);
  assert.equal(plan.some(({ env }) => caseVariantKeys.some((key) => Object.hasOwn(env, key))), false);
  assert.equal(Object.hasOwn(childEnv, "MATTER_DESKTOP_RELEASE_CHANNEL"), Object.hasOwn(process.env, "MATTER_DESKTOP_RELEASE_CHANNEL"));
});

test("RFD-TUW-011 rejects cycles and undefined aliases before evaluating command safety", () => {
  const cycle = resolveNpmScriptGraph({
    rootScripts: { [FORMAL_PACKAGE_SCRIPT]: "npm run alias", alias: "npm run loop", loop: "npm run alias" },
    rootName: FORMAL_PACKAGE_SCRIPT,
  });
  assert.equal(cycle.errors.some(({ code }) => code === "CYCLE"), true);
  assert.throws(
    () => assertNoForbiddenFormalPackageAliases({ rootScripts: { [FORMAL_PACKAGE_SCRIPT]: "npm run missing-alias" } }),
    /undefined aliases|cycles/u,
  );
});

test("RFD-TUW-011 rejects a formal plan that validates PV005 before staging", () => {
  const plan = [...buildFormalPackagePlan({ repoRoot: ROOT })];
  const stageIndex = plan.findIndex(({ id }) => id === "stage-release-artifacts");
  const packageIndex = plan.findIndex(({ id }) => id === "pv005-package");
  [plan[stageIndex], plan[packageIndex]] = [plan[packageIndex], plan[stageIndex]];
  assert.throws(
    () => validateFormalPackagePlan(plan),
    /step order is invalid|stage before PV005 package validation/u,
  );
  const trailing = [...buildFormalPackagePlan({ repoRoot: ROOT })];
  trailing[0] = { ...trailing[0], argv: [...trailing[0].argv, "unexpected"] };
  assert.throws(
    () => validateFormalPackagePlan(trailing),
    /exact declared argv\/cwd\/env signature/u,
  );
});

test("RFD-TUW-011 runner rejects every CLI or trailing argument", () => {
  for (const argument of ["--help", "unexpected", "--plan=local"]) {
    const result = spawnSync(process.execPath, [RUNNER, argument], { encoding: "utf8" });
    assert.equal(result.status, 2, argument);
    assert.match(result.stderr, /usage: node scripts\/run-matter-desktop-formal-package\.mjs/u);
  }
});

test("RFD-TUW-011 rejects hardcoded macOS signing, notarization, and credential authority", () => {
  const packages = fixture("npm run local", {
    local: "MATTER_DESKTOP_RELEASE_CHANNEL=formal MATTER_DESKTOP_SIGN=developer-id node scripts/build-matter-desktop-mac.mjs",
  });
  assert.throws(
    () => assertNoForbiddenFormalPackageAliases(packages),
    /formal package graph contains|MATTER_DESKTOP_SIGN|authority/u,
  );
});
