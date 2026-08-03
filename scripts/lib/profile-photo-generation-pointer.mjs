import {
  closeSync,
  fsyncSync,
  lstatSync,
  openSync,
  readlinkSync,
  readdirSync,
  renameSync,
  symlinkSync,
} from "node:fs";
import { join, sep } from "node:path";
import { operationFail, validateGenerationRef } from "./profile-photo-operation-root.mjs";

export function syncProfilePhotoDirectory(path, io = {}) {
  const open = io.open ?? openSync;
  const fsync = io.fsync ?? fsyncSync;
  const close = io.close ?? closeSync;
  let descriptor;
  try {
    descriptor = open(path, "r");
    fsync(descriptor);
  } catch {
    operationFail("OPERATION_DURABILITY_FAILED", "generation pointer directory could not be synchronized");
  } finally {
    if (descriptor !== undefined) close(descriptor);
  }
}

export function syncProfilePhotoGeneration(directory, io = {}) {
  const open = io.open ?? openSync;
  const fsync = io.fsync ?? fsyncSync;
  const close = io.close ?? closeSync;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || entry.isSymbolicLink()) operationFail("OPERATION_PATH_INVALID", "candidate generation contains a non-file entry");
    let descriptor;
    try {
      descriptor = open(join(directory, entry.name), "r");
      fsync(descriptor);
    } catch {
      operationFail("OPERATION_DURABILITY_FAILED", "candidate generation file could not be synchronized");
    } finally {
      if (descriptor !== undefined) close(descriptor);
    }
  }
  syncProfilePhotoDirectory(directory, io);
}

function pointerTarget(generationRef) {
  return `generations${sep}${validateGenerationRef(generationRef)}`;
}

export function interruptedProfilePhotoPointer(paths, allowedRefs) {
  let target;
  try {
    if (!lstatSync(paths.pointerTemp).isSymbolicLink()) throw new Error();
    target = readlinkSync(paths.pointerTemp);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    operationFail("OPERATION_POINTER_TEMP_INVALID", "interrupted pointer is not a symlink");
  }
  const generationRef = [...allowedRefs].find((ref) => target === pointerTarget(ref));
  if (!generationRef) operationFail("OPERATION_POINTER_TEMP_INVALID", "interrupted pointer target is not part of this operation");
  return generationRef;
}

export function switchActiveProfilePhotoGeneration(paths, generationRef, options = {}) {
  try {
    lstatSync(paths.pointerTemp);
    operationFail("OPERATION_STALE_PATH", "temporary active pointer already exists; recovery or cleanup is required");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const symlink = options.io?.symlink ?? symlinkSync;
  const rename = options.io?.rename ?? renameSync;
  options.crashHook?.("before_pointer_prepare");
  symlink(pointerTarget(generationRef), paths.pointerTemp, "dir");
  syncProfilePhotoDirectory(paths.root, options.io);
  options.crashHook?.("pointer_prepared");
  rename(paths.pointerTemp, paths.active);
  options.crashHook?.("pointer_switched");
  syncProfilePhotoDirectory(paths.root, options.io);
  options.crashHook?.("pointer_durable");
}
