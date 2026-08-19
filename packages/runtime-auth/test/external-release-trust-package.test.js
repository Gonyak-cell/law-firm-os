import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import * as packageTrust from "@law-firm-os/runtime-auth/external-release-trust";
import * as scriptTrust from "../../../scripts/lib/external-release-trust.mjs";
import { syntheticTrustFixture } from "./external-release-trust-fixture.js";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const moduleRelativeConfigRoot = `${path.join(repoRoot, "config/external-release")}${path.sep}`;
const packageSourceNames = [
  "external-release-trust-common.js",
  "external-release-trust-receipt.js",
  "external-release-trust-registry.js",
  "external-release-trust.js",
];

test("package subpath and script shim share one implementation", () => {
  const packageNames = Object.keys(packageTrust).sort();
  assert.deepEqual(Object.keys(scriptTrust).sort(), packageNames);
  for (const name of packageNames) assert.strictEqual(scriptTrust[name], packageTrust[name], name);
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(repoRoot, "packages/runtime-auth/package.json"), "utf8")).exports,
    {
      ".": "./src/index.js",
      "./external-release-trust": "./src/external-release-trust.js",
    },
  );
  assert.match(
    readFileSync(path.join(repoRoot, "packages/runtime-auth/src/index.js"), "utf8"),
    /^export \* from "\.\/external-release-trust\.js";$/mu,
  );
  assert.equal(
    readFileSync(path.join(repoRoot, "scripts/lib/external-release-trust.mjs"), "utf8"),
    'export * from "../../packages/runtime-auth/src/external-release-trust.js";\n',
  );
});

test("production policy is module-relative, fixed, unconfigured, and environment independent", () => {
  const policy = packageTrust.PRODUCTION_TRUST_ROOT_POLICY;
  assert.equal(policy.configured, false);
  assert.equal(policy.installation_root, moduleRelativeConfigRoot);
  assert.equal(policy.root_public_key_path, path.join(moduleRelativeConfigRoot, "root-public-key.spki.pem"));
  assert.equal(policy.registry_installation_path, path.join(moduleRelativeConfigRoot, "trust-registry.json"));
  assert.equal(policy.registry_signature_installation_path, path.join(moduleRelativeConfigRoot, "trust-registry.json.sig"));
  assert.throws(
    () => packageTrust.verifyProductionTrustedRegistry(),
    (error) => error?.code === "TRUST_ROOT_NOT_CONFIGURED",
  );

  const child = spawnSync(process.execPath, [
    "--input-type=module",
    "--eval",
    `import { verifyProductionTrustedRegistry } from ${JSON.stringify(pathToFileURL(path.join(repoRoot, "packages/runtime-auth/src/external-release-trust.js")).href)};
     try { verifyProductionTrustedRegistry(); } catch (error) { process.stdout.write(error.code); }`,
  ], {
    cwd: tmpdir(),
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "test",
      LAWOS_EXTERNAL_RELEASE_TRUST_POLICY: JSON.stringify({ configured: true }),
      LAWOS_EXTERNAL_RELEASE_TRUST_ROOT: tmpdir(),
      LAWOS_TEST_ALLOW_EXTERNAL_RELEASE_TRUST_ROOT: "1",
    },
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  assert.equal(child.stdout, "TRUST_ROOT_NOT_CONFIGURED");
});

test("production verification rejects caller-selected paths and digests", (t) => {
  const fixture = syntheticTrustFixture(t);
  assert.throws(
    () => packageTrust.verifyProductionTrustedRegistry({
      rootDir: fixture.testOnlyPolicy.installation_root,
      rootPublicKeyPath: fixture.testOnlyPolicy.root_public_key_path,
      rootPublicKeySpkiSha256: fixture.testOnlyPolicy.root_public_key_spki_sha256,
      registryPath: fixture.testOnlyPolicy.registry_installation_path,
      registrySha256: fixture.testOnlyPolicy.registry_sha256,
      registrySignaturePath: fixture.testOnlyPolicy.registry_signature_installation_path,
      registrySignatureSha256: fixture.testOnlyPolicy.registry_signature_sha256,
    }),
    (error) => error?.code === "TRUST_ROOT_OVERRIDE_FORBIDDEN",
  );
});

test("artifact staging preserves the package graph and fixed config layout", (t) => {
  const artifactRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "lawos-shared-trust-artifact-")));
  t.after(() => rmSync(artifactRoot, { recursive: true, force: true }));
  const packageRoot = path.join(artifactRoot, "packages/runtime-auth");
  const packageSourceRoot = path.join(packageRoot, "src");
  const configRoot = path.join(artifactRoot, "config/external-release");
  mkdirSync(packageSourceRoot, { recursive: true });
  mkdirSync(configRoot, { recursive: true });
  copyFileSync(path.join(repoRoot, "packages/runtime-auth/package.json"), path.join(packageRoot, "package.json"));
  for (const name of packageSourceNames) {
    copyFileSync(path.join(repoRoot, "packages/runtime-auth/src", name), path.join(packageSourceRoot, name));
  }
  for (const name of ["root-public-key.spki.pem", "trust-registry.json", "trust-registry.json.sig"]) {
    writeFileSync(path.join(configRoot, name), "staged-by-governance\n");
  }
  const probePath = path.join(packageRoot, "artifact-probe.mjs");
  writeFileSync(probePath, `
    import { PRODUCTION_TRUST_ROOT_POLICY, verifyProductionTrustedRegistry } from "@law-firm-os/runtime-auth/external-release-trust";
    let code = null;
    try { verifyProductionTrustedRegistry(); } catch (error) { code = error.code; }
    process.stdout.write(JSON.stringify({ policy: PRODUCTION_TRUST_ROOT_POLICY, code }));
  `);
  const child = spawnSync(process.execPath, [probePath], {
    cwd: artifactRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", LAWOS_EXTERNAL_RELEASE_TRUST_ROOT: tmpdir() },
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  const result = JSON.parse(child.stdout);
  assert.equal(result.code, "TRUST_ROOT_NOT_CONFIGURED");
  assert.equal(result.policy.installation_root, `${configRoot}${path.sep}`);
  assert.equal(result.policy.root_public_key_path, path.join(configRoot, "root-public-key.spki.pem"));
  assert.equal(result.policy.registry_installation_path, path.join(configRoot, "trust-registry.json"));
  assert.equal(result.policy.registry_signature_installation_path, path.join(configRoot, "trust-registry.json.sig"));
  for (const target of [
    path.join(packageRoot, "package.json"),
    ...packageSourceNames.map((name) => path.join(packageSourceRoot, name)),
    ...["root-public-key.spki.pem", "trust-registry.json", "trust-registry.json.sig"].map((name) => path.join(configRoot, name)),
  ]) assert.equal(lstatSync(target).isFile(), true, target);
});
