#!/usr/bin/env node
import { createHash, createPublicKey } from "node:crypto";
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
import { createAmicInternalDistributionAwsCliAdapter } from "./lib/amic-os-internal-distribution-publication.mjs";
import {
  verifyAmicInternalBaselineReadback,
  verifyAmicInternalDistributionReadback,
} from "./lib/amic-os-internal-distribution-readback.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} is required`);
  return value;
}

function readJson(filePath, label) {
  try { return JSON.parse(readFileSync(resolve(filePath), "utf8")); }
  catch { throw new Error(`${label} is not valid JSON`); }
}

function newOutput(filePath) {
  const worktree = realpathSync(process.cwd());
  const target = resolve(filePath);
  const pathFromWorktree = relative(worktree, target);
  if (!(pathFromWorktree === ".." || pathFromWorktree.startsWith(`..${sep}`))) {
    throw new Error("readback receipt must be outside the source worktree");
  }
  if (existsSync(target)
      || (existsSync(dirname(target)) && lstatSync(dirname(target)).isSymbolicLink())) {
    throw new Error("readback receipt must use a new non-symlink path");
  }
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  chmodSync(dirname(target), 0o700);
  return target;
}

function canonicalBase64(value, label) {
  const bytes = Buffer.from(value ?? "", "base64");
  if (bytes.byteLength === 0 || bytes.toString("base64") !== value) {
    throw new Error(`${label} is not canonical base64`);
  }
  return bytes;
}

if (!process.argv.includes("--execute")) {
  throw new Error("independent readback is disabled without --execute");
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
  throw new Error("internal-unsigned readback requires the protected exact-main GitHub runner");
}

const bindings = readJson(option("--bindings"), "distribution bindings");
const locator = readJson(option("--locator"), "publication locator");
const publicDer = canonicalBase64(
  option("--trusted-public-key-spki-base64"),
  "trusted public key",
);
const expectedPublicKeySha256 = option("--trusted-public-key-sha256");
if (!/^[0-9a-f]{64}$/u.test(expectedPublicKeySha256)
    || createHash("sha256").update(publicDer).digest("hex") !== expectedPublicKeySha256) {
  throw new Error("trusted public key fingerprint differs");
}
const trustedPublicKey = createPublicKey({ key: publicDer, type: "spki", format: "der" });
if (trustedPublicKey.asymmetricKeyType !== "ed25519") {
  throw new Error("trusted public key must be Ed25519");
}
const receiptPath = newOutput(option("--receipt"));
const aws = createAmicInternalDistributionAwsCliAdapter({ region: bindings.region });
const common = {
  aws,
  bindings,
  trustedPublicKey,
  expectedPublicKeySha256,
  cloudFrontDomain: option("--cloudfront-domain"),
};
const receipt = publicationMode === "baseline"
  ? await verifyAmicInternalBaselineReadback({ ...common, baselineMarker: locator })
  : await verifyAmicInternalDistributionReadback({ ...common, channelPointer: locator });
const result = Object.freeze({ ...receipt, approval_ref: approvalRef });
writeFileSync(receiptPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
chmodSync(receiptPath, 0o600);
process.stdout.write(`${JSON.stringify({
  ...result,
  receipt_path_included: false,
}, null, 2)}\n`);
