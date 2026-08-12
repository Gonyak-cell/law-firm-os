import assert from "node:assert/strict";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  prepareExternalPilotBundle,
  validateVerificationClosure,
  VERIFICATION_CLOSURE_SCHEMA,
} from "./lib/matter-desktop-external-pilot.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const usage = [
  "usage: /absolute/trusted/path/run-trusted-matter-desktop-external-pilot.sh prepare <approved closure flags> --",
  "  --formal-release-root <exact formal SHA-scoped release directory>",
  "  --decision <approved external-pilot decision JSON>",
  "  --tenant-config <firm/tenant-pinned config JSON>",
  "  --approval-evidence-root <root containing the signed approval receipt>",
  "  --private-key <0600 Ed25519 private key outside the worktree>",
  "  --output-dir <new local bundle directory>",
  "  [--electron-dist <Electron dist directory>]",
  "  [--unpdf-license <unpdf LICENSE file>]",
  "  [--package-lock <exact candidate package-lock.json>]",
  "  [--desktop-package <exact candidate apps/desktop/package.json>]",
].join("\n");

function options(argv) {
  if (argv.includes("--help")) {
    throw new Error(usage);
  }
  assert.equal(argv.length % 2, 0, usage);
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    assert.ok(flag.startsWith("--") && value && !value.startsWith("--"), `invalid option: ${flag ?? ""}\n${usage}`);
    const name = flag.slice(2);
    assert.equal(Object.hasOwn(parsed, name), false, `duplicate option: ${flag}`);
    parsed[name] = value;
  }
  const allowed = new Set([
    "formal-release-root",
    "decision",
    "tenant-config",
    "approval-evidence-root",
    "private-key",
    "output-dir",
    "electron-dist",
    "unpdf-license",
    "package-lock",
    "desktop-package",
    "node-executable",
    "expected-node-sha256",
    "expected-launcher-sha256",
    "expected-prepare-cli-sha256",
    "expected-generator-sha256",
    "expected-verifier-sha256",
    "expected-trust-resolver-sha256",
    "expected-trust-helper-sha256",
    "expected-updates-sha256",
    "expected-release-paths-sha256",
    "expected-provenance-sha256",
  ]);
  for (const name of Object.keys(parsed)) assert.equal(allowed.has(name), true, `unknown option: --${name}`);
  for (const name of [
    "formal-release-root",
    "decision",
    "tenant-config",
    "approval-evidence-root",
    "private-key",
    "output-dir",
  ]) {
    assert.ok(parsed[name], `--${name} is required\n${usage}`);
  }
  return parsed;
}

function verificationClosure(parsed) {
  return validateVerificationClosure({
    schema_version: VERIFICATION_CLOSURE_SCHEMA,
    launcher_sha256: parsed["expected-launcher-sha256"],
    node_executable: parsed["node-executable"],
    node_sha256: parsed["expected-node-sha256"],
    prepare_cli_sha256: parsed["expected-prepare-cli-sha256"],
    generator_sha256: parsed["expected-generator-sha256"],
    verifier_sha256: parsed["expected-verifier-sha256"],
    trust_resolver_sha256: parsed["expected-trust-resolver-sha256"],
    trust_helper_sha256: parsed["expected-trust-helper-sha256"],
    updates_sha256: parsed["expected-updates-sha256"],
    release_paths_sha256: parsed["expected-release-paths-sha256"],
    provenance_sha256: parsed["expected-provenance-sha256"],
  }, "trusted launcher verification closure");
}

export async function runExternalPilotPreparation(argv) {
  const input = options(argv);
  return prepareExternalPilotBundle({
    worktreeRoot: ROOT,
    formalReleaseRoot: input["formal-release-root"],
    decisionPath: input.decision,
    tenantConfigPath: input["tenant-config"],
    approvalEvidenceRoot: input["approval-evidence-root"],
    verificationClosure: verificationClosure(input),
    privateKeyPath: input["private-key"],
    electronDistPath: input["electron-dist"] ?? resolve(ROOT, "node_modules/electron/dist"),
    unpdfLicensePath: input["unpdf-license"] ?? resolve(ROOT, "node_modules/unpdf/LICENSE"),
    verifierPath: resolve(ROOT, "scripts/verify-matter-desktop-external-pilot-bundle.mjs"),
    trustHelperPath: resolve(ROOT, "scripts/lib/external-release-trust.mjs"),
    packageLockPath: input["package-lock"] ?? resolve(ROOT, "package-lock.json"),
    desktopPackagePath: input["desktop-package"] ?? resolve(ROOT, "apps/desktop/package.json"),
    outputDir: input["output-dir"],
  });
}

const invokedPath = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : null;
if (invokedPath === realpathSync(fileURLToPath(import.meta.url))) {
  process.stderr.write("UNSUPPORTED_DIRECT_ENTRY: use the trusted external-pilot launcher\n");
  process.exitCode = 1;
}
