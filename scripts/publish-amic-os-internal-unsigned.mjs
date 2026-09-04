#!/usr/bin/env node
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import {
  createAmicInternalDistributionAwsCliAdapter,
  executeAmicInternalDistributionPublication,
  sanitizeAmicInternalBaselinePublicationReceipt,
  sanitizeAmicInternalPublicationReceipt,
} from "./lib/amic-os-internal-distribution-publication.mjs";

function option(name, { required = true } = {}) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (required && (!value || value.startsWith("--"))) throw new Error(`${name} is required`);
  return value;
}

function readJson(path, label) {
  let value;
  try { value = JSON.parse(readFileSync(resolve(path), "utf8")); }
  catch { throw new Error(`${label} is not valid JSON`); }
  return value;
}

function newPrivateOutput(path, label) {
  const root = realpathSync(process.cwd());
  const target = resolve(path);
  const pathFromRoot = relative(root, target);
  if (!(pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`))) {
    throw new Error(`${label} must be outside the source worktree`);
  }
  if (existsSync(target)
      || (existsSync(dirname(target)) && lstatSync(dirname(target)).isSymbolicLink())) {
    throw new Error(`${label} must be a new non-symlink path`);
  }
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  chmodSync(dirname(target), 0o700);
  return target;
}

if (!process.argv.includes("--execute")) {
  throw new Error("publication is disabled without --execute");
}
const approvalRef = option("--approval-ref");
if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u.test(approvalRef)) {
  throw new Error("--approval-ref is invalid");
}
const publicationMode = option("--publication-mode");
if (!["baseline", "successor"].includes(publicationMode)) {
  throw new Error("--publication-mode must be baseline or successor");
}
if (process.env.GITHUB_ACTIONS !== "true"
    || process.env.GITHUB_REPOSITORY !== "Gonyak-cell/law-firm-os"
    || process.env.GITHUB_REF !== "refs/heads/main"
    || process.env.RUNNER_ENVIRONMENT !== "github-hosted") {
  throw new Error("internal-unsigned publication requires the protected exact-main GitHub runner");
}

const bindings = readJson(option("--bindings"), "distribution bindings");
const release = readJson(option("--release"), "release binding");
const revocations = publicationMode === "successor"
  ? readJson(option("--revocations"), "revocation document")
  : undefined;
const rollback = publicationMode === "successor"
  ? readJson(option("--rollback"), "rollback authorization")
  : undefined;
if (publicationMode === "baseline"
    && (process.argv.includes("--revocations") || process.argv.includes("--rollback"))) {
  throw new Error("baseline publication cannot include revocations or rollback authorization");
}
const receiptPath = newPrivateOutput(option("--private-receipt"), "private receipt");
const publicReceiptPath = newPrivateOutput(option("--public-receipt"), "public receipt");
const aws = createAmicInternalDistributionAwsCliAdapter({ region: bindings.region });
const signing = await aws.readMetadataSigningSecret(option("--metadata-signing-secret-arn"));
if (signing.keyId !== release.keyId) throw new Error("metadata signing key id differs from release");

const receipt = await executeAmicInternalDistributionPublication({
  aws,
  bindings,
  release,
  artifactPaths: {
    installer: resolve(option("--installer")),
    build_manifest: resolve(option("--build-manifest")),
    sbom: resolve(option("--sbom")),
    provenance: resolve(option("--provenance")),
  },
  revocations,
  rollback,
  privateKey: signing.privateKey,
  publicationMode,
});
const publicReceipt = {
  ...(publicationMode === "baseline"
    ? sanitizeAmicInternalBaselinePublicationReceipt(receipt)
    : sanitizeAmicInternalPublicationReceipt(receipt)),
  approval_ref: approvalRef,
};
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {
  flag: "wx",
  mode: 0o600,
});
writeFileSync(publicReceiptPath, `${JSON.stringify(publicReceipt, null, 2)}\n`, {
  flag: "wx",
  mode: 0o600,
});
chmodSync(receiptPath, 0o600);
chmodSync(publicReceiptPath, 0o600);
process.stdout.write(`${JSON.stringify({
  ...publicReceipt,
  private_receipt_path_included: false,
  public_receipt_path_included: false,
}, null, 2)}\n`);
