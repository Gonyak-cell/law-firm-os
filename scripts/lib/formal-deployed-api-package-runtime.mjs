import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fail, privateRegularFile, privateReceiptTarget, sidecarRef, writePrivateFile } from "./formal-deployed-api-io.mjs";
import { PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS } from "./private-staging-execution-receipt.mjs";

function regularSource(candidate, rootDir, label, isPrivate = true) {
  if (isPrivate) return privateRegularFile(candidate, rootDir, label);
  const input = resolve(candidate ?? "");
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) fail("FORMAL_DEPLOYED_API_QA_PACKAGE", `${label} is missing or a symlink`);
  const path = realpathSync(input);
  if (!statSync(path).isFile()) fail("FORMAL_DEPLOYED_API_QA_PACKAGE", `${label} must be a regular file`);
  return path;
}

function copySource({ source, name, bundleDir, rootDir, label, isPrivate = true }) {
  const path = regularSource(source, rootDir, label, isPrivate);
  const bytes = readFileSync(path);
  writePrivateFile(join(bundleDir, name), bytes, rootDir);
  return Object.freeze({ path: join(bundleDir, name), ref: sidecarRef(name, bytes), value: bytes });
}

export function createFormalDeployedApiStaticBundle({ credential, receiptPath, rootDir, platform }) {
  const target = privateReceiptTarget(receiptPath, rootDir);
  const bundleDir = dirname(target);
  const authority = credential.authority;
  const trust = copySource({ source: authority.trust_registry_path, name: "rfd015-trust-registry.json", bundleDir, rootDir, label: "trust registry" });
  if (trust.ref.sha256 !== authority.trust_registry_sha256) fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "trust registry digest drifted");
  const packet = copySource({ source: authority.exact_head_packet_path, name: "rfd015-exact-head-packet.json", bundleDir, rootDir, label: "exact-head packet" });
  const approvalReceipt = copySource({ source: authority.approval_receipt_path, name: "rfd015-approval-receipt.json", bundleDir, rootDir, label: "approval receipt" });
  const approvalSignature = copySource({ source: authority.approval_signature_path, name: "rfd015-approval-signature.sig", bundleDir, rootDir, label: "approval signature" });
  const identity = copySource({ source: authority.synthetic_identity_manifest_path, name: "rfd015-synthetic-identities.json", bundleDir, rootDir, label: "synthetic identity manifest" });
  const packageQaSource = regularSource(authority.package_qa_receipt_path, rootDir, "formal package QA receipt");
  const packageQaValue = JSON.parse(readFileSync(packageQaSource, "utf8"));
  const transcriptReference = packageQaValue?.bindings?.runner_transcript;
  const transcriptRelative = String(transcriptReference?.path ?? "");
  const transcriptSource = resolve(dirname(packageQaSource), transcriptRelative);
  const escaped = relative(dirname(packageQaSource), transcriptSource);
  if (transcriptReference?.scope !== "evidence" || !transcriptRelative || escaped === ".." || escaped.startsWith(`..${sep}`) || isAbsolute(escaped)) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "formal package transcript reference escaped its evidence root");
  }
  const packageQa = copySource({ source: packageQaSource, name: `rfd015-${platform}-package-qa.json`, bundleDir, rootDir, label: "formal package QA receipt" });
  const packageQaTranscript = copySource({ source: transcriptSource, name: `rfd015-${platform}-package-qa-transcript.json`, bundleDir, rootDir, label: "formal package QA transcript" });
  if (packageQaTranscript.ref.sha256 !== transcriptReference.sha256 || packageQaTranscript.ref.bytes !== transcriptReference.bytes) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "formal package transcript raw bytes drifted from its receipt");
  }
  const artifact = copySource({ source: authority.package_artifact_path, name: `rfd015-${platform}-artifact.${platform === "macos" ? "dmg" : "exe"}`, bundleDir, rootDir, label: "formal package artifact", isPrivate: false });
  const manifest = copySource({ source: authority.package_manifest_path, name: `rfd015-${platform}-manifest.json`, bundleDir, rootDir, label: "formal package manifest", isPrivate: false });
  const byKind = new Map(authority.execution_receipts.map((entry) => [entry.kind, entry]));
  const execution = PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS.map((kind) => {
    const input = byKind.get(kind);
    const receipt = copySource({ source: input.receipt_path, name: `rfd015-exact-head-${kind}.json`, bundleDir, rootDir, label: `${kind} receipt` });
    const signature = copySource({ source: input.signature_path, name: `rfd015-exact-head-${kind}.sig`, bundleDir, rootDir, label: `${kind} signature` });
    return Object.freeze({ kind, receipt, signature });
  });
  return Object.freeze({
    target,
    bundleDir,
    packageQaAuthority: Object.freeze({ receiptPath: packageQaSource, evidenceRoot: dirname(packageQaSource) }),
    raw: Object.freeze({ trust, packet, approvalReceipt, approvalSignature, identity, packageQa, packageQaTranscript, artifact, manifest, execution }),
    refs: Object.freeze({
      trust_registry: trust.ref,
      exact_head_packet: packet.ref,
      approval: { receipt: approvalReceipt.ref, signature: approvalSignature.ref },
      synthetic_identity_manifest: identity.ref,
      execution_receipts: execution.map((entry) => ({ kind: entry.kind, receipt: entry.receipt.ref, signature: entry.signature.ref })),
      package: { artifact: artifact.ref, manifest: manifest.ref, qa_receipt: packageQa.ref, qa_transcript: packageQaTranscript.ref },
    }),
  });
}

function findMacApp(mountPoint) {
  const name = readdirSync(mountPoint).find((entry) => entry.toLowerCase() === "matter.app");
  if (!name) fail("FORMAL_DEPLOYED_API_QA_PACKAGE", "mounted DMG has no matter.app");
  return join(mountPoint, name);
}

export function prepareFormalArtifactExecution({ platform, artifactPath, bundleDir, rootDir }) {
  const scratch = mkdtempSync(join(tmpdir(), "rfd015-formal-artifact-"));
  let executablePath;
  let embeddedManifestPath;
  let executedRootPath;
  let cleanup;
  try {
    if (platform === "macos") {
      const mountPoint = join(scratch, "mounted");
      mkdirSync(mountPoint);
      execFileSync("hdiutil", ["attach", "-readonly", "-nobrowse", "-mountpoint", mountPoint, artifactPath], { stdio: "ignore" });
      const app = findMacApp(mountPoint);
      executedRootPath = app;
      executablePath = join(app, "Contents", "MacOS", "matter");
      embeddedManifestPath = join(app, "Contents", "Resources", "matter-build-manifest.json");
      cleanup = () => execFileSync("hdiutil", ["detach", mountPoint], { stdio: "ignore" });
    } else if (platform === "windows") {
      const installDir = join(scratch, "installed");
      execFileSync(artifactPath, ["/S", `/D=${installDir}`], { stdio: "ignore" });
      executedRootPath = installDir;
      executablePath = join(installDir, "matter.exe");
      embeddedManifestPath = join(installDir, "resources", "matter-build-manifest.json");
      cleanup = () => {
        const uninstaller = join(installDir, "Uninstall matter.exe");
        if (existsSync(uninstaller)) execFileSync(uninstaller, ["/S"], { stdio: "ignore" });
      };
    } else {
      fail("FORMAL_DEPLOYED_API_QA_PLATFORM", "platform must be macos or windows");
    }
    for (const [candidate, label] of [[executablePath, "artifact executable"], [embeddedManifestPath, "embedded manifest"]]) {
      if (!existsSync(candidate) || lstatSync(candidate).isSymbolicLink() || !statSync(candidate).isFile()) fail("FORMAL_DEPLOYED_API_QA_PACKAGE", `${label} is missing or invalid`);
    }
    const executable = copySource({ source: executablePath, name: `rfd015-${platform}-executed-package${platform === "windows" ? ".exe" : ".bin"}`, bundleDir, rootDir, label: "executed package", isPrivate: false });
    const embeddedManifest = copySource({ source: embeddedManifestPath, name: `rfd015-${platform}-embedded-manifest.json`, bundleDir, rootDir, label: "embedded package manifest", isPrivate: false });
    return Object.freeze({ executedRootPath: realpathSync(executedRootPath), executablePath: realpathSync(executablePath), executable, embeddedManifest, cleanup, scratch });
  } catch (error) {
    try { cleanup?.(); } catch {}
    rmSync(scratch, { recursive: true, force: true });
    throw error;
  }
}
