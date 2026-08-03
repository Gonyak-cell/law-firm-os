#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import path from "node:path";
import {
  RFD010_DEFAULT_OUTPUT,
  captureRfd010SourcePrecondition,
  cleanupRfd010GitObjectSnapshot,
  markRfd010ReceiptSnapshotDrift,
  markRfd010ReceiptSourceDrift,
  preflightRfd010ReleaseCandidate,
  rfd010SnapshotManifestPath,
  renderRfd010ReceiptMarkdown,
  sameRfd010SourcePrecondition,
  validateRfd010GitObjectSnapshot,
  validateRfd010PersistedReceiptFile,
  validateRfd010Receipt,
} from "./lib/rfd010-release-candidate.mjs";

const USAGE = [
  "usage: node scripts/prepare-rfd010-release-candidate.mjs",
  "  --expected-sha <full-sha> --expected-tree <full-tree>",
  "  --version <semver> [--release-id <id>] [--tag <tag>] [--channel formal]",
  "  [--repo-root <path>] [--output <json-or-md-path>] [--authoritative-receipt <path>]",
].join("\n");

function optionValue(args, names) {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index >= 0) return args[index + 1];
  }
  return undefined;
}

function readGit(repoRoot, args) {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}

function pathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function outputPathError() {
  return new Error("RFD010 output must be a non-symlink file under .omo/evidence/rfd010-release-candidate");
}

function assertEvidenceOutputPath(repoRoot, requestedOutput) {
  if (requestedOutput === "-") return null;
  const resolvedRepo = path.resolve(repoRoot);
  const evidenceRoot = path.resolve(resolvedRepo, ".omo/evidence/rfd010-release-candidate");
  const outputPath = path.resolve(resolvedRepo, requestedOutput);
  if (!pathInside(evidenceRoot, outputPath)) throw outputPathError();
  let canonicalRepo;
  try {
    canonicalRepo = realpathSync(resolvedRepo);
  } catch {
    throw outputPathError();
  }
  try {
    const repoInfo = lstatSync(resolvedRepo);
    if (repoInfo.isSymbolicLink()) throw outputPathError();
  } catch (error) {
    if (error.message === "RFD010 output must be a non-symlink file under .omo/evidence/rfd010-release-candidate") throw error;
    throw outputPathError();
  }

  const relativeToRepo = path.relative(resolvedRepo, outputPath);
  let current = resolvedRepo;
  for (const segment of relativeToRepo.split(path.sep)) {
    if (!segment || segment === ".") continue;
    current = path.join(current, segment);
    let info;
    try {
      info = lstatSync(current);
    } catch {
      continue;
    }
    if (info.isSymbolicLink() || (info.isFile() && current !== outputPath)) throw outputPathError();
    try {
      const canonicalCurrent = realpathSync(current);
      if (!pathInside(canonicalRepo, canonicalCurrent) && canonicalCurrent !== canonicalRepo) throw outputPathError();
    } catch (error) {
      if (error.message === "RFD010 output must be a non-symlink file under .omo/evidence/rfd010-release-candidate") throw error;
      throw outputPathError();
    }
    if (current === outputPath && info.isDirectory()) throw outputPathError();
  }

  // Never write through an existing inode. A regular file with another link
  // can alias tracked source (the classic `receipt.json -> package.json`
  // hardlink exploit) even though the lexical path itself is ignored.
  let outputInfo;
  try {
    outputInfo = lstatSync(outputPath);
  } catch {
    outputInfo = null;
  }
  if (outputInfo?.isFile()) {
    if (outputInfo.nlink > 1) throw outputPathError();
    const outputStat = statSync(outputPath);
    let trackedEntries;
    try {
      trackedEntries = execFileSync("git", ["ls-files", "-z"], {
        cwd: resolvedRepo,
        encoding: "buffer",
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 16 * 1024 * 1024,
      }).toString("utf8").split("\0").filter(Boolean);
    } catch {
      throw outputPathError();
    }
    for (const relativeTrackedPath of trackedEntries) {
      const trackedPath = path.resolve(resolvedRepo, relativeTrackedPath);
      if (trackedPath === outputPath) throw outputPathError();
      let trackedInfo;
      try {
        trackedInfo = lstatSync(trackedPath);
      } catch {
        continue;
      }
      if (trackedInfo.isSymbolicLink() || !trackedInfo.isFile()) continue;
      let trackedStat;
      try {
        trackedStat = statSync(trackedPath);
      } catch {
        throw outputPathError();
      }
      if (trackedStat.dev === outputStat.dev && trackedStat.ino === outputStat.ino) throw outputPathError();
    }
  }

  const relativeForGit = path.relative(resolvedRepo, outputPath).split(path.sep).join("/");
  const tracked = readGit(resolvedRepo, ["ls-files", "--error-unmatch", "--", relativeForGit]);
  if (tracked) throw outputPathError();
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--no-index", "--", relativeForGit], {
      cwd: resolvedRepo,
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    throw outputPathError();
  }
  return outputPath;
}

function writeFully(fileDescriptor, content) {
  const buffer = Buffer.from(content, "utf8");
  let offset = 0;
  while (offset < buffer.length) offset += writeSync(fileDescriptor, buffer, offset, buffer.length - offset);
}

function writeEvidenceAtomically(repoRoot, outputPath, content) {
  const parent = path.dirname(outputPath);
  mkdirSync(parent, { recursive: true });
  assertEvidenceOutputPath(repoRoot, outputPath);
  let temporaryPath;
  let fileDescriptor = null;
  for (let attempt = 0; attempt < 8 && !temporaryPath; attempt += 1) {
    const candidate = path.join(parent, `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`);
    try {
      fileDescriptor = openSync(candidate, "wx", 0o600);
      temporaryPath = candidate;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
  if (!temporaryPath || fileDescriptor === null) throw new Error("RFD010 evidence temporary path could not be reserved");
  try {
    writeFully(fileDescriptor, content);
    fsyncSync(fileDescriptor);
    closeSync(fileDescriptor);
    fileDescriptor = null;

    // Revalidate the destination immediately before atomic replacement. The
    // target is never opened for writing and a newly-created sibling cannot
    // mutate a tracked source inode.
    assertEvidenceOutputPath(repoRoot, outputPath);
    renameSync(temporaryPath, outputPath);
    temporaryPath = null;
    return true;
  } finally {
    if (fileDescriptor !== null) {
      try { closeSync(fileDescriptor); } catch { /* best effort cleanup */ }
    }
    if (temporaryPath) {
      try { unlinkSync(temporaryPath); } catch { /* best effort cleanup */ }
    }
  }
}

function runRfd010TestCheckpoint(repoRoot, checkpoint) {
  const hook = process.env.RFD010_TEST_CHECKPOINT_HOOK;
  if (!hook) return;
  try {
    execFileSync(hook, [checkpoint, repoRoot], {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "pipe"],
      maxBuffer: 1024 * 1024,
    });
  } catch {
    throw new Error("RFD010 checkpoint hook failed");
  }
}

function parseArguments(argv) {
  if (argv.includes("--help")) {
    console.log(USAGE);
    process.exit(0);
  }
  const recognized = new Set([
    "--expected-sha",
    "--expected-source-sha",
    "--expected-tree",
    "--expected-source-tree",
    "--version",
    "--release-id",
    "--tag",
    "--channel",
    "--repo-root",
    "--output",
    "--authoritative-receipt",
  ]);
  for (const arg of argv) {
    if (arg.startsWith("--") && !recognized.has(arg)) throw new Error("unsupported RFD010 option");
  }
  const withValues = [
    ["--expected-sha", "--expected-source-sha"],
    ["--expected-tree", "--expected-source-tree"],
    ["--version"],
    ["--release-id"],
    ["--tag"],
    ["--channel"],
    ["--repo-root"],
    ["--output"],
    ["--authoritative-receipt"],
  ];
  for (const names of withValues) {
    const selected = names.find((name) => argv.includes(name));
    if (!selected) continue;
    const value = optionValue(argv, names);
    if (!value || value.startsWith("--")) throw new Error("RFD010 option value is missing");
  }
  return {
    repoRoot: optionValue(argv, ["--repo-root"]),
    expectedSourceSha: optionValue(argv, ["--expected-sha", "--expected-source-sha"])
      ?? process.env.RFD010_EXPECTED_SOURCE_SHA
      ?? process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA,
    expectedSourceTree: optionValue(argv, ["--expected-tree", "--expected-source-tree"])
      ?? process.env.RFD010_EXPECTED_SOURCE_TREE
      ?? process.env.MATTER_DESKTOP_EXPECTED_SOURCE_TREE,
    version: optionValue(argv, ["--version"])
      ?? process.env.RFD010_VERSION
      ?? process.env.MATTER_DESKTOP_VERSION,
    releaseId: optionValue(argv, ["--release-id"])
      ?? process.env.RFD010_RELEASE_ID
      ?? process.env.MATTER_DESKTOP_GITHUB_RELEASE_TAG,
    tag: optionValue(argv, ["--tag"])
      ?? process.env.RFD010_TAG
      ?? process.env.MATTER_DESKTOP_GITHUB_RELEASE_TAG,
    channel: optionValue(argv, ["--channel"])
      ?? process.env.RFD010_CHANNEL
      ?? process.env.MATTER_DESKTOP_RELEASE_CHANNEL
      ?? "formal",
    output: optionValue(argv, ["--output"]),
    authoritativeReceipt: optionValue(argv, ["--authoritative-receipt"]),
  };
}

const argv = process.argv.slice(2);
let args;
try {
  args = parseArguments(argv);
} catch {
  console.error("RFD010 preflight input is invalid. Use --help for usage.");
  process.exitCode = 2;
}

if (args) {
  const inferredRoot = args.repoRoot
    ? path.resolve(args.repoRoot)
    : readGit(process.cwd(), ["rev-parse", "--show-toplevel"]) ?? process.cwd();
  // The preflight captures the original worktree only as a precondition, then
  // seals an independent Git-object candidate. No later origin status probe is
  // used as a release claim.
  const version = args.version;
  const expectedSourceSha = args.expectedSourceSha;
  const expectedSourceTree = args.expectedSourceTree;
  const releaseId = args.releaseId ?? (version ? `matter-desktop-v${version}` : undefined);
  const tag = args.tag ?? releaseId;
  let outputPath;
  try {
    outputPath = assertEvidenceOutputPath(
      inferredRoot,
      args.output ?? RFD010_DEFAULT_OUTPUT,
    );
  } catch {
    console.error("RFD010 output path is invalid; use .omo/evidence/rfd010-release-candidate/<file> or '-'.");
    process.exitCode = 2;
  }
  if (process.exitCode !== 2) {
    const receipt = preflightRfd010ReleaseCandidate({
      repoRoot: inferredRoot,
      expectedSourceSha,
      expectedSourceTree,
      version,
      releaseId,
      tag,
      channel: args.channel,
      authoritativeReceipt: args.authoritativeReceipt,
    });
    const candidateSnapshot = receipt.candidateSnapshot;
    const sourcePrecondition = receipt.sourcePrecondition;
    const canWriteEvidence = Boolean(outputPath);
    const snapshotManifestPath = canWriteEvidence && candidateSnapshot
      ? rfd010SnapshotManifestPath(outputPath)
      : null;
    const snapshotManifestContent = candidateSnapshot
      ? `${JSON.stringify({
        schema_version: candidateSnapshot.schema_version,
        source_sha: candidateSnapshot.source_sha,
        source_tree: candidateSnapshot.source_tree,
        version: candidateSnapshot.version,
        channel: candidateSnapshot.channel,
        relative_root: candidateSnapshot.relative_root,
        manifest: candidateSnapshot.manifest,
        manifest_sha256: candidateSnapshot.manifest_sha256,
        file_count: candidateSnapshot.file_count,
        read_only: candidateSnapshot.read_only,
      }, null, 2)}\n`
      : null;
    const attachCapabilities = (value) => {
      Object.defineProperty(value, "candidateSnapshot", {
        value: candidateSnapshot,
        enumerable: false,
        configurable: false,
      });
      Object.defineProperty(value, "sourcePrecondition", {
        value: sourcePrecondition,
        enumerable: false,
        configurable: false,
      });
      return value;
    };
    const withEvidenceState = (value, performed) => attachCapabilities({
      ...value,
      mutation_guard: {
        ...value.mutation_guard,
        evidence_write_by_cli: performed,
      },
      evidence_write: {
        requested: Boolean(outputPath),
        performed,
        source_status_unchanged: null,
        output_path: performed ? "[repo-relative-redacted]" : null,
      },
    });
    const sourceDriftReceipt = (value, sourceAfter, performed) => withEvidenceState({
      ...markRfd010ReceiptSourceDrift(value, sourceAfter),
      mutation_guard: {
        ...value.mutation_guard,
        source_files_changed: true,
        snapshot_files_changed: false,
      },
    }, performed);
    const snapshotDriftReceipt = (value, reasonCode, performed) => withEvidenceState({
      ...markRfd010ReceiptSnapshotDrift(value, reasonCode),
      mutation_guard: {
        ...value.mutation_guard,
        source_files_changed: false,
        snapshot_files_changed: true,
      },
    }, performed);
    let finalReceipt = withEvidenceState(receipt, canWriteEvidence);
    let sourceDrifted = false;
    let evidenceWriteCompleted = false;
    let snapshotManifestWriteCompleted = false;
    const checkpoint = (name) => {
      runRfd010TestCheckpoint(inferredRoot, name);
      if (sourceDrifted || sourcePrecondition?.complete !== true) return;
      const sourceAfter = captureRfd010SourcePrecondition(inferredRoot);
      if (!sameRfd010SourcePrecondition(sourcePrecondition, sourceAfter)) {
        finalReceipt = sourceDriftReceipt(finalReceipt, sourceAfter, evidenceWriteCompleted);
        sourceDrifted = true;
        process.exitCode = 2;
      }
    };
    checkpoint("after_preflight");
    validateRfd010Receipt(finalReceipt);
    if (canWriteEvidence) {
      checkpoint("before_evidence_rename");
      validateRfd010Receipt(finalReceipt);
      const content = outputPath.endsWith(".md")
        ? renderRfd010ReceiptMarkdown(finalReceipt)
        : `${JSON.stringify(finalReceipt, null, 2)}\n`;
      try {
        if (snapshotManifestPath && snapshotManifestContent) {
          writeEvidenceAtomically(inferredRoot, snapshotManifestPath, snapshotManifestContent);
          snapshotManifestWriteCompleted = true;
        }
        writeEvidenceAtomically(inferredRoot, outputPath, content);
        evidenceWriteCompleted = true;
      } catch (error) {
        console.error(error?.message ?? "RFD010 evidence write failed; receipt was not replaced.");
        process.exitCode = 2;
      }
      if (evidenceWriteCompleted) {
        finalReceipt = withEvidenceState(finalReceipt, true);
        checkpoint("after_evidence_rename");
      }
      if (evidenceWriteCompleted && candidateSnapshot && !sourceDrifted) {
        try {
          validateRfd010GitObjectSnapshot(candidateSnapshot, {
            expectedManifestSha256: finalReceipt.observed.candidate_snapshot_manifest_sha256,
          });
        } catch (error) {
          finalReceipt = snapshotDriftReceipt(finalReceipt, error?.message, true);
          process.exitCode = 2;
        }
        if (finalReceipt.verdict === "BLOCKED") {
          try {
            const diagnosticContent = outputPath.endsWith(".md")
              ? renderRfd010ReceiptMarkdown(finalReceipt)
              : `${JSON.stringify(finalReceipt, null, 2)}\n`;
            writeEvidenceAtomically(inferredRoot, outputPath, diagnosticContent);
          } catch (rewriteError) {
            console.error(rewriteError?.message ?? "RFD010 diagnostic receipt rewrite failed.");
          }
        }
      } else if (!evidenceWriteCompleted) {
        finalReceipt = withEvidenceState(finalReceipt, false);
      }
    }
    checkpoint("before_return");
    if (finalReceipt.verdict === "BLOCKED" && canWriteEvidence && evidenceWriteCompleted) {
      try {
        const diagnosticContent = outputPath.endsWith(".md")
          ? renderRfd010ReceiptMarkdown(finalReceipt)
          : `${JSON.stringify(finalReceipt, null, 2)}\n`;
        writeEvidenceAtomically(inferredRoot, outputPath, diagnosticContent);
      } catch (rewriteError) {
        console.error(rewriteError?.message ?? "RFD010 diagnostic receipt rewrite failed.");
      }
    }
    if (evidenceWriteCompleted && snapshotManifestWriteCompleted && outputPath.endsWith(".json")) {
      try {
        validateRfd010PersistedReceiptFile(outputPath, { repoRoot: inferredRoot });
      } catch (error) {
        finalReceipt = snapshotDriftReceipt(finalReceipt, "snapshot_manifest_mismatch", true);
        process.exitCode = 2;
        try {
          writeEvidenceAtomically(inferredRoot, outputPath, `${JSON.stringify(finalReceipt, null, 2)}\n`);
        } catch (rewriteError) {
          console.error(rewriteError?.message ?? "RFD010 persisted diagnostic rewrite failed.");
        }
      }
    }
    validateRfd010Receipt(finalReceipt);
    process.stdout.write(`${JSON.stringify({
    verdict: finalReceipt.verdict,
    local_verdict: finalReceipt.local_verdict,
    release_authority_status: finalReceipt.release_authority_status,
    receipt_path: finalReceipt.evidence_write.performed ? path.relative(process.cwd(), outputPath) || "." : null,
    source_sha: finalReceipt.observed.source_sha,
    source_tree: finalReceipt.observed.source_tree,
    version: finalReceipt.input.version,
    release_id: finalReceipt.input.release_id,
    channel: finalReceipt.input.channel,
    local_blocking_check_count: finalReceipt.summary.local_blocking_check_count,
    external_deferred_check_count: finalReceipt.summary.external_deferred_check_count,
    release_ready: finalReceipt.summary.release_ready,
    evidence_write: finalReceipt.evidence_write.performed,
    network_contacted: false,
    refs_mutated: false,
  }, null, 2)}\n`);
    if (finalReceipt.verdict !== "PASS") process.exitCode = 2;
    if (candidateSnapshot) {
      // The receipt is bound to the digest, not to a mutable origin path. The
      // disposable snapshot is removed after the CLI has validated it.
      const cleanupRoot = candidateSnapshot.cleanup_root;
      if (cleanupRoot) {
        try {
          cleanupRfd010GitObjectSnapshot(candidateSnapshot);
        } catch {
          // Best effort; cleanup never changes the receipt verdict.
        }
      }
    }
  }
}
