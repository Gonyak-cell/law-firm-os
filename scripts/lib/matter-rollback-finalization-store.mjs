import { randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import {
  SHA256,
  fail,
  outsideRoot,
  resolvePrivateOutputPath,
  sha256Bytes,
} from "./matter-rollback-io.mjs";

function privateDirectory(candidate, label, repoRoot) {
  if (typeof candidate !== "string" || !isAbsolute(candidate)) {
    fail("MATTER_ROLLBACK_REPLAY_REGISTRY", `${label} must be an absolute private directory`);
  }
  const path = resolve(candidate);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !statSync(path).isDirectory()
    || realpathSync(path) !== path || (statSync(path).mode & 0o077) !== 0 || !outsideRoot(repoRoot, path)) {
    fail("MATTER_ROLLBACK_REPLAY_REGISTRY", `${label} must be canonical, 0700, and outside the worktree`);
  }
  return path;
}

function fsyncDirectory(path) {
  const handle = openSync(path, "r");
  try { fsyncSync(handle); } finally { closeSync(handle); }
}

function durableTemp(target, value) {
  const path = join(dirname(target), `.${basename(target)}.prepare-${process.pid}-${randomUUID()}`);
  let body;
  let handle = null;
  try {
    body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    handle = openSync(path, "wx", 0o600);
    writeFileSync(handle, body);
    fsyncSync(handle);
    chmodSync(path, 0o600);
    closeSync(handle);
    handle = null;
    const reread = readFileSync(path);
    JSON.parse(reread);
    if (!reread.equals(body)) throw new Error("temporary evidence byte mismatch");
  } catch {
    try { if (handle !== null) closeSync(handle); } catch {}
    if (!removeIfPresent(path, { durable: true })) {
      fail("MATTER_ROLLBACK_FINALIZATION_RECOVERY_REQUIRED", "temporary rollback evidence requires operator reconciliation", {
        evidence_commit_state: "partial_recovery_required",
      });
    }
    fail("MATTER_ROLLBACK_FINALIZATION_WRITE", "finalization temporary evidence could not be written", {
      evidence_commit_state: "rolled_back",
    });
  }
  return { path, body, sha256: sha256Bytes(body), bytes: body.length };
}

function removeIfPresent(path, { durable = false } = {}) {
  if (!path) return true;
  try {
    unlinkSync(path);
    if (durable) fsyncDirectory(dirname(path));
    return true;
  } catch (error) {
    return error?.code === "ENOENT";
  }
}

function promoteExclusive(temporary, target, state) {
  linkSync(temporary, target);
  state.promoted = true;
  unlinkSync(temporary);
  state.temporary_removed = true;
  fsyncDirectory(dirname(target));
}

function exactFile(path, expected) {
  try {
    const body = readFileSync(path);
    return body.length === expected.bytes && sha256Bytes(body) === expected.sha256;
  } catch {
    return false;
  }
}

function removeExactIfPresent(path, expected) {
  if (!existsSync(path)) return true;
  if (!exactFile(path, expected)) return false;
  return removeIfPresent(path);
}

export function commitMatterRollbackEvidenceTransaction({
  replayRegistryPath,
  executionIdentitySha256,
  marker,
  sidecarPath = null,
  sidecar = null,
  repoRoot = process.cwd(),
} = {}) {
  if (!SHA256.test(executionIdentitySha256 ?? "")) {
    fail("MATTER_ROLLBACK_EXECUTION_IDENTITY", "stable execution identity SHA-256 is invalid");
  }
  const replayRoot = privateDirectory(replayRegistryPath, "replay registry", repoRoot);
  const markerPath = join(replayRoot, `${executionIdentitySha256}.consumed.json`);
  if (existsSync(markerPath)) {
    fail("MATTER_ROLLBACK_REPLAY_DETECTED", "stable rollback execution identity was already finalized", {
      evidence_commit_state: "already_committed",
    });
  }
  if ((sidecarPath === null) !== (sidecar === null)) {
    fail("MATTER_ROLLBACK_FINALIZATION_WRITE", "sidecar path and body must be supplied together");
  }
  const resolvedSidecar = sidecarPath === null
    ? null
    : resolvePrivateOutputPath(sidecarPath, { repoRoot });
  if (resolvedSidecar && (statSync(dirname(resolvedSidecar)).mode & 0o077) !== 0) {
    fail("MATTER_ROLLBACK_OUTPUT_PATH", "rollback sidecar parent must be a private directory");
  }
  let sidecarTemp = null;
  let markerTemp = null;
  const sidecarState = { promoted: false, temporary_removed: false };
  const markerState = { promoted: false, temporary_removed: false };
  let sidecarDescriptor = null;
  let markerDescriptor = null;
  try {
    if (resolvedSidecar) sidecarTemp = durableTemp(resolvedSidecar, sidecar);
    sidecarDescriptor = sidecarTemp && {
      path: resolvedSidecar,
      sha256: sidecarTemp.sha256,
      bytes: sidecarTemp.bytes,
    };
    const markerBody = {
      ...marker,
      execution_identity_sha256: executionIdentitySha256,
      sidecar: sidecarDescriptor,
    };
    markerTemp = durableTemp(markerPath, markerBody);
    markerDescriptor = { path: markerPath, sha256: markerTemp.sha256, bytes: markerTemp.bytes };
    if (sidecarTemp) {
      promoteExclusive(sidecarTemp.path, resolvedSidecar, sidecarState);
      sidecarTemp = null;
    }
    promoteExclusive(markerTemp.path, markerPath, markerState);
    markerTemp = null;
    if (!exactFile(markerPath, markerDescriptor)
      || (sidecarDescriptor && !exactFile(resolvedSidecar, sidecarDescriptor))) {
      fail("MATTER_ROLLBACK_FINALIZATION_RECOVERY_REQUIRED", "committed rollback evidence failed durable readback", {
        evidence_commit_state: "committed_recovery_required",
      });
    }
    return Object.freeze({
      replay_marker_path: markerPath,
      replay_marker_sha256: markerDescriptor.sha256,
      replay_marker_bytes: markerDescriptor.bytes,
      rf13_dist_sidecar_path: resolvedSidecar,
      rf13_dist_sidecar_sha256: sidecarDescriptor?.sha256 ?? null,
      rf13_dist_sidecar_bytes: sidecarDescriptor?.bytes ?? null,
      evidence_commit_state: "committed",
    });
  } catch (error) {
    if (markerState.promoted || (markerDescriptor && exactFile(markerPath, markerDescriptor))) {
      fail("MATTER_ROLLBACK_FINALIZATION_RECOVERY_REQUIRED", "replay commit completed but final durability confirmation failed", {
        evidence_commit_state: "committed_recovery_required",
      });
    }
    let sidecarRecovered = true;
    if (sidecarState.promoted) {
      sidecarRecovered = removeExactIfPresent(resolvedSidecar, sidecarDescriptor);
      try {
        if (sidecarRecovered) fsyncDirectory(dirname(resolvedSidecar));
      } catch {
        sidecarRecovered = false;
      }
    }
    if (!sidecarRecovered) {
      fail("MATTER_ROLLBACK_FINALIZATION_RECOVERY_REQUIRED", "sidecar publication failed before replay commit and could not be rolled back", {
        evidence_commit_state: "partial_recovery_required",
      });
    }
    if (existsSync(markerPath)) {
      fail("MATTER_ROLLBACK_REPLAY_DETECTED", "stable rollback execution identity was finalized concurrently", {
        evidence_commit_state: "already_committed",
      });
    }
    if (error?.code === "EEXIST" && resolvedSidecar && existsSync(resolvedSidecar)) {
      fail("MATTER_ROLLBACK_OUTPUT_EXISTS", "rollback sidecar was created concurrently", {
        evidence_commit_state: "rolled_back",
      });
    }
    if (typeof error?.code === "string" && error.code.startsWith("MATTER_ROLLBACK_")) {
      error.evidence_commit_state ??= "rolled_back";
      throw error;
    }
    fail("MATTER_ROLLBACK_FINALIZATION_WRITE", "rollback finalization could not be committed", {
      evidence_commit_state: "rolled_back",
    });
  } finally {
    const sidecarTempRemoved = removeIfPresent(sidecarTemp?.path, { durable: true });
    const markerTempRemoved = removeIfPresent(markerTemp?.path, { durable: true });
    if (!sidecarTempRemoved || !markerTempRemoved) {
      fail("MATTER_ROLLBACK_FINALIZATION_RECOVERY_REQUIRED", "temporary rollback evidence requires operator reconciliation", {
        evidence_commit_state: "partial_recovery_required",
      });
    }
  }
}
