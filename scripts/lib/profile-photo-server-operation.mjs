import { cpSync, existsSync, lstatSync, readFileSync, renameSync, rmSync, statSync, unlinkSync } from "node:fs";
import { join, sep } from "node:path";
import { captureProfilePhotoManifest, inspectProfilePhotoDirectory, readProfilePhotoManifest, verifyProfilePhotoManifest } from "../validate-profile-photo-replacement-manifest.mjs";
import { writePrivateJsonExclusive } from "./profile-media-private-json.mjs";
import { interruptedProfilePhotoPointer, switchActiveProfilePhotoGeneration, syncProfilePhotoDirectory, syncProfilePhotoGeneration } from "./profile-photo-generation-pointer.mjs";
import {
  canonicalDirectory, canonicalRegularFile, candidateGenerationRef, operationFail, profilePhotoOperationPaths,
  resolveActiveGeneration, validateChangeRef, validateGenerationRef, validateProfilePhotoSafeRoot,
} from "./profile-photo-operation-root.mjs";

const OPERATION_RECORD_SCHEMA = "law-firm-os.profile-photo-generation-operation.v1";

function absent(path, label) {
  try {
    lstatSync(path);
    operationFail("OPERATION_STALE_PATH", `${label} already exists; recovery or cleanup is required`);
  } catch (error) {
    if (error instanceof Error && error.code !== "ENOENT") throw error;
  }
}

function sameFilesystem(root, paths) {
  const device = statSync(root).dev;
  if (paths.some((path) => statSync(path).dev !== device)) {
    operationFail("OPERATION_FILESYSTEM_MISMATCH", "operation paths must share one filesystem");
  }
}

function context(options) {
  const safeRoot = validateProfilePhotoSafeRoot(options.root, {
    testOnly: options.testOnly === true,
    now: options.rootValidationNow instanceof Date ? options.rootValidationNow : new Date(),
  });
  const paths = profilePhotoOperationPaths(safeRoot.root, options.changeRef);
  return { safeRoot, paths };
}

function safeCleanup(path, remove = rmSync) {
  if (existsSync(path)) remove(path, { recursive: true, force: false });
}

function exactRecord(value) {
  const keys = ["schema_version", "change_ref", "baseline_generation_ref", "candidate_generation_ref"];
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys.sort())) {
    operationFail("OPERATION_RECORD_INVALID", "operation record fields are invalid");
  }
  if (value.schema_version !== OPERATION_RECORD_SCHEMA) operationFail("OPERATION_RECORD_INVALID", "operation record schema is invalid");
  validateChangeRef(value.change_ref);
  validateGenerationRef(value.baseline_generation_ref);
  validateGenerationRef(value.candidate_generation_ref);
  if (value.candidate_generation_ref !== candidateGenerationRef(value.change_ref)
    || value.baseline_generation_ref === value.candidate_generation_ref) {
    operationFail("OPERATION_RECORD_INVALID", "operation generation references are invalid");
  }
  return Object.freeze({ ...value });
}

function readOperationRecord(paths) {
  canonicalRegularFile(paths.operationRecord, "operation record", { ownerOnly: true });
  let parsed;
  try { parsed = JSON.parse(readFileSync(paths.operationRecord, "utf8")); } catch {
    operationFail("OPERATION_RECORD_INVALID", "operation record JSON is invalid");
  }
  const record = exactRecord(parsed);
  return Object.freeze({
    ...record,
    baselineDirectory: join(paths.generations, record.baseline_generation_ref),
    candidateDirectory: join(paths.generations, record.candidate_generation_ref),
  });
}

function operationContext(options) {
  const { safeRoot, paths } = context(options);
  const record = readOperationRecord(paths);
  if (record.change_ref !== options.changeRef) operationFail("OPERATION_RECORD_INVALID", "operation record ref does not match request");
  canonicalDirectory(record.baselineDirectory, "baseline generation");
  canonicalDirectory(record.candidateDirectory, "candidate generation");
  const rootPrefix = `${paths.generations}${sep}`;
  if (![record.baselineDirectory, record.candidateDirectory].every((path) => path.startsWith(rootPrefix))) {
    operationFail("OPERATION_PATH_ESCAPE", "operation generation escaped the generation root");
  }
  const baselineManifest = readProfilePhotoManifest(paths.baselineManifest);
  const candidateManifest = readProfilePhotoManifest(paths.candidateManifest);
  verifyProfilePhotoManifest({ directory: record.baselineDirectory, manifestPath: paths.baselineManifest });
  verifyProfilePhotoManifest({ directory: record.candidateDirectory, manifestPath: paths.candidateManifest });
  sameFilesystem(safeRoot.root, [record.baselineDirectory, record.candidateDirectory]);
  return { safeRoot, paths: { ...paths, root: safeRoot.root }, record, baselineManifest, candidateManifest };
}

export function readPreparedProfilePhotoChange(options = {}) {
  const state = operationContext(options);
  const active = resolveActiveGeneration(state.safeRoot.root);
  return Object.freeze({
    baselineGenerationRef: state.record.baseline_generation_ref,
    candidateGenerationRef: state.record.candidate_generation_ref,
    baselineDirectory: state.record.baselineDirectory,
    candidateDirectory: state.record.candidateDirectory,
    baselineManifestPath: state.paths.baselineManifest,
    candidateManifestPath: state.paths.candidateManifest,
    baselineManifest: state.baselineManifest,
    candidateManifest: state.candidateManifest,
    activeGenerationRef: active.generationRef,
  });
}

export function prepareProfilePhotoChange(options = {}) {
  const { safeRoot, paths: derivedPaths } = context(options);
  const paths = { ...derivedPaths, root: safeRoot.root };
  canonicalDirectory(paths.sourceParent, "incoming source parent");
  canonicalDirectory(paths.source, "incoming candidate");
  canonicalDirectory(paths.generations, "generation directory");
  canonicalDirectory(paths.manifests, "private manifest directory");
  canonicalDirectory(paths.operations, "private operation directory");
  const active = resolveActiveGeneration(safeRoot.root);
  absent(paths.preparing, "preparing directory");
  absent(paths.pointerTemp, "temporary active pointer");
  absent(paths.candidateGeneration, "candidate generation");
  absent(paths.baselineManifest, "baseline manifest");
  absent(paths.candidateManifest, "candidate manifest");
  absent(paths.operationRecord, "operation record");
  sameFilesystem(safeRoot.root, [paths.sourceParent, paths.source, paths.generations, active.directory]);

  const baseline = inspectProfilePhotoDirectory(active.directory);
  inspectProfilePhotoDirectory(paths.source, { expectedManifest: baseline });
  if (options.execute !== true) return operationResult("prepare", false);

  const copy = options.io?.copy ?? cpSync;
  const rename = options.io?.rename ?? renameSync;
  const remove = options.io?.remove ?? rmSync;
  const created = [];
  try {
    copy(paths.source, paths.preparing, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true });
    created.push(paths.preparing);
    canonicalDirectory(paths.preparing, "prepared candidate generation");
    inspectProfilePhotoDirectory(paths.preparing, { expectedManifest: baseline });
    options.crashHook?.("candidate_copied");
    syncProfilePhotoGeneration(paths.preparing, options.io);
    options.crashHook?.("candidate_files_durable");
    rename(paths.preparing, paths.candidateGeneration);
    created.splice(created.indexOf(paths.preparing), 1, paths.candidateGeneration);
    syncProfilePhotoDirectory(paths.generations, options.io);
    options.crashHook?.("candidate_generation_published");
    captureProfilePhotoManifest({ directory: active.directory, manifestPath: paths.baselineManifest });
    created.push(paths.baselineManifest);
    captureProfilePhotoManifest({
      directory: paths.candidateGeneration,
      manifestPath: paths.candidateManifest,
      expectedManifestPath: paths.baselineManifest,
    });
    created.push(paths.candidateManifest);
    syncProfilePhotoDirectory(paths.manifests, options.io);
    writePrivateJsonExclusive(paths.operationRecord, {
      schema_version: OPERATION_RECORD_SCHEMA,
      change_ref: options.changeRef,
      baseline_generation_ref: active.generationRef,
      candidate_generation_ref: candidateGenerationRef(options.changeRef),
    });
    created.push(paths.operationRecord);
    syncProfilePhotoDirectory(paths.operations, options.io);
  } catch (error) {
    for (const path of created.reverse()) {
      try {
        if (existsSync(path)) (statSync(path).isDirectory() ? safeCleanup(path, remove) : unlinkSync(path));
      } catch {}
    }
    throw error;
  }
  return operationResult("prepare", true);
}

export function promoteProfilePhotoChange(options = {}) {
  const state = operationContext(options);
  const active = resolveActiveGeneration(state.safeRoot.root);
  if (active.generationRef !== state.record.baseline_generation_ref) {
    operationFail("OPERATION_STATE_INVALID", "promotion requires the baseline generation to be active");
  }
  if (interruptedProfilePhotoPointer(state.paths, new Set([state.record.baseline_generation_ref, state.record.candidate_generation_ref]))) {
    operationFail("OPERATION_INTERRUPTED_SWITCH", "an interrupted switch must be rolled back before promotion");
  }
  if (options.execute !== true) return operationResult("promote", false);
  try {
    switchActiveProfilePhotoGeneration(state.paths, state.record.candidate_generation_ref, options);
    const promoted = resolveActiveGeneration(state.safeRoot.root);
    if (promoted.generationRef !== state.record.candidate_generation_ref) throw new Error();
    verifyProfilePhotoManifest({ directory: promoted.directory, manifestPath: state.paths.candidateManifest });
  } catch (error) {
    try {
      const interrupted = interruptedProfilePhotoPointer(state.paths, new Set([state.record.baseline_generation_ref, state.record.candidate_generation_ref]));
      if (interrupted) unlinkSync(state.paths.pointerTemp);
      const current = resolveActiveGeneration(state.safeRoot.root);
      if (current.generationRef === state.record.candidate_generation_ref) {
        switchActiveProfilePhotoGeneration(state.paths, state.record.baseline_generation_ref, { ...options, crashHook: undefined });
      }
      verifyProfilePhotoManifest({ directory: state.record.baselineDirectory, manifestPath: state.paths.baselineManifest });
    } catch {
      operationFail("OPERATION_AUTOMATIC_RESTORE_FAILED", "promotion failed and baseline pointer restoration failed");
    }
    throw error;
  }
  return operationResult("promote", true);
}

export function rollbackProfilePhotoChange(options = {}) {
  const state = operationContext(options);
  const allowed = new Set([state.record.baseline_generation_ref, state.record.candidate_generation_ref]);
  const interrupted = interruptedProfilePhotoPointer(state.paths, allowed);
  const active = resolveActiveGeneration(state.safeRoot.root);
  if (!allowed.has(active.generationRef)) operationFail("OPERATION_STATE_INVALID", "active generation is outside this operation");
  if (options.execute !== true) return operationResult("rollback", false);

  if (interrupted) {
    (options.io?.unlink ?? unlinkSync)(state.paths.pointerTemp);
    syncProfilePhotoDirectory(state.safeRoot.root, options.io);
  }
  if (active.generationRef === state.record.candidate_generation_ref) {
    switchActiveProfilePhotoGeneration(state.paths, state.record.baseline_generation_ref, options);
  }
  const restored = resolveActiveGeneration(state.safeRoot.root);
  if (restored.generationRef !== state.record.baseline_generation_ref) operationFail("OPERATION_STATE_INVALID", "rollback did not restore baseline generation");
  verifyProfilePhotoManifest({ directory: restored.directory, manifestPath: state.paths.baselineManifest });
  return operationResult("rollback", true);
}

export function cleanupRolledBackProfilePhotoChange(options = {}) {
  const state = operationContext(options);
  const active = resolveActiveGeneration(state.safeRoot.root);
  if (active.generationRef !== state.record.baseline_generation_ref) operationFail("OPERATION_STATE_INVALID", "cleanup requires baseline generation to be active");
  verifyProfilePhotoManifest({ directory: active.directory, manifestPath: state.paths.baselineManifest });
  verifyProfilePhotoManifest({ directory: state.record.candidateDirectory, manifestPath: state.paths.candidateManifest });
  const interrupted = interruptedProfilePhotoPointer(state.paths, new Set([state.record.baseline_generation_ref, state.record.candidate_generation_ref]));
  if (options.execute === true) {
    if (interrupted) (options.io?.unlink ?? unlinkSync)(state.paths.pointerTemp);
    safeCleanup(state.record.candidateDirectory, options.io?.remove ?? rmSync);
    options.crashHook?.("candidate_generation_removed");
    for (const path of [state.paths.candidateManifest, state.paths.baselineManifest, state.paths.operationRecord]) {
      (options.io?.unlink ?? unlinkSync)(path);
    }
    options.crashHook?.("operation_metadata_removed");
    syncProfilePhotoDirectory(state.paths.manifests, options.io);
    syncProfilePhotoDirectory(state.paths.operations, options.io);
    syncProfilePhotoDirectory(state.safeRoot.root, options.io);
    options.crashHook?.("cleanup_durable");
  }
  return operationResult("cleanup-rolled-back", options.execute === true);
}

function operationResult(mode, mutationExecuted) {
  return Object.freeze({
    operation: "profile-photo-versioned-generation-switch",
    mode,
    verdict: mutationExecuted ? "PASS" : "DRY_RUN",
    expected_profile_count: 10,
    approved_test_root_validated: true,
    canonical_paths_validated: true,
    versioned_generation: true,
    single_atomic_active_pointer_switch: mode === "promote" || mode === "rollback",
    active_pointer_never_removed: true,
    data_symlinks_rejected: true,
    mutation_executed: mutationExecuted,
    private_values_emitted: false,
  });
}
