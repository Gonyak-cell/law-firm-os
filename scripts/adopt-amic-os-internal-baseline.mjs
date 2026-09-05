#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createPublicKey } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import {
  amicAdoptionSha256, createAmicInternalAdoptionAuthorityReader, parseAmicInternalAdoptionBundle,
  readAmicInternalAdoptionInstalledReceipt, verifyAmicInternalBaselineAdoption,
} from "./lib/amic-os-internal-baseline-adoption.mjs";
import {
  createAmicInternalDistributionAwsCliAdapter, executeAmicInternalManagedBootstrapAdoption,
  sanitizeAmicInternalBaselinePublicationReceipt, validateAmicInternalDistributionBindings,
} from "./lib/amic-os-internal-distribution-publication.mjs";

const env = process.env;
const preflight = process.argv.includes("--preflight");
assert.notEqual(preflight, process.argv.includes("--execute"), "choose exactly preflight or execute");
const allowed = preflight ? ["--preflight"] : ["--execute", "--private-receipt", "--public-receipt"];
for (let i = 2; i < process.argv.length; i += 1) {
  assert.ok(allowed.includes(process.argv[i]), "unknown adoption option");
  if (["--private-receipt", "--public-receipt"].includes(process.argv[i])) i += 1;
}
assert.equal(env.GITHUB_ACTIONS, "true");
assert.equal(env.GITHUB_REPOSITORY, "Gonyak-cell/law-firm-os");
assert.equal(env.GITHUB_REF, "refs/heads/main");
assert.equal(env.RUNNER_ENVIRONMENT, "github-hosted");
assert.equal(env.GITHUB_WORKFLOW_REF, "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-publish.yml@refs/heads/main");
const git = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sourceSha = git(["rev-parse", "HEAD"]);
const sourceTree = git(["rev-parse", "HEAD^{tree}"]);
assert.equal(sourceSha, env.GITHUB_SHA, "adoption executor is not exact event main");
assert.equal(git(["status", "--porcelain"]), "", "adoption executor source is dirty");
const { bundle, options, approved } = parseAmicInternalAdoptionBundle(env.AMIC_INTERNAL_ADOPTION_BUNDLE_B64, env);
assert.equal(approved.request.executorSourceSha, sourceSha);
assert.equal(approved.request.executorSourceTree, sourceTree);
const bindings = validateAmicInternalDistributionBindings({ accountId: "770880870480", region: "ap-northeast-2",
  bucket: env.ARTIFACT_BUCKET, accessLogBucket: env.ACCESS_LOG_BUCKET, kmsKeyArn: env.ARTIFACT_KMS_KEY_ARN, retainUntil: bundle.retainUntil });
const der = Buffer.from(env.METADATA_PUBLIC_KEY_SPKI_B64 ?? "", "base64");
assert.equal(der.toString("base64"), env.METADATA_PUBLIC_KEY_SPKI_B64);
assert.equal(amicAdoptionSha256(der), env.METADATA_PUBLIC_KEY_SHA256);
const publicKey = createPublicKey({ key: der, format: "der", type: "spki" });
assert.equal(publicKey.asymmetricKeyType, "ed25519");
assert.match(env.CLOUDFRONT_DOMAIN ?? "", /^d[a-z0-9]{3,62}\.cloudfront\.net$/u);
const summary = { state: "PASS", adoption: true, publication_mode: "baseline",
  source_sha: approved.request.bootstrapRelease.sourceSha, source_tree: approved.request.bootstrapRelease.sourceTree,
  executor_source_sha: sourceSha, executor_source_tree: sourceTree,
  retain_until: bindings.retainUntil, request_sha256: approved.requestSha256 };
if (preflight) {
  process.stdout.write(`${JSON.stringify(summary)}\n`);
} else {
  const output = (flag) => {
    const value = process.argv[process.argv.indexOf(flag) + 1];
    assert.ok(process.argv.includes(flag) && value && !value.startsWith("--"));
    const target = resolve(value);
    const rel = relative(realpathSync(process.cwd()), target);
    assert.ok(rel === ".." || rel.startsWith(`..${sep}`), "receipt must be outside the source worktree");
    assert.equal(existsSync(target), false, "receipt must be new");
    assert.ok(!existsSync(dirname(target)) || !lstatSync(dirname(target)).isSymbolicLink());
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    chmodSync(dirname(target), 0o700);
    return target;
  };
  const privatePath = output("--private-receipt");
  const publicPath = output("--public-receipt");
  assert.notEqual(privatePath, publicPath);
  const authority = createAmicInternalAdoptionAuthorityReader({ apiBaseUrl: env.AMIC_INTERNAL_CANONICAL_API_BASE_URL, sessionToken: env.AMIC_INTERNAL_ADOPTION_SESSION_TOKEN });
  assert.match(env.METADATA_SIGNING_SECRET_ARN ?? "", /^arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:[A-Za-z0-9/_+=.@-]+$/u);
  const aws = createAmicInternalDistributionAwsCliAdapter({ region: bindings.region });
  const installedReceiptBytes = await readAmicInternalAdoptionInstalledReceipt({ aws, bindings, bundle });
  const adoption = verifyAmicInternalBaselineAdoption({ ...options, installedReceiptBytes });
  const signing = await aws.readMetadataSigningSecret(env.METADATA_SIGNING_SECRET_ARN);
  assert.equal(signing.keyId, bundle.request.bootstrapRelease.keyId);
  const receipt = await executeAmicInternalManagedBootstrapAdoption({ aws, bindings, adoption, authority,
    privateKey: signing.privateKey, trustedPublicKey: publicKey, expectedPublicKeySha256: env.METADATA_PUBLIC_KEY_SHA256,
    cloudFrontDomain: env.CLOUDFRONT_DOMAIN });
  const sanitized = { ...sanitizeAmicInternalBaselinePublicationReceipt(receipt), ...summary,
    reused_artifact_count: 4, new_object_count: 5, approval_ref: env.APPROVAL_REF };
  writeFileSync(privatePath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600, flush: true });
  writeFileSync(publicPath, `${JSON.stringify(sanitized, null, 2)}\n`, { flag: "wx", mode: 0o600, flush: true });
  process.stdout.write(`${JSON.stringify(sanitized)}\n`);
}
