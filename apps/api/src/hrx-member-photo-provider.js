import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagedPhotoSourcePath = join(__dirname, "hrx-member-photos");
const packagedPhotoArtifactMetadataPath = join(__dirname, "hrx-member-photo-artifact-metadata.json");
const configuredPhotoSourcePath = String(process.env.LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH ?? "").trim();
const photoSourcePath = configuredPhotoSourcePath ? resolve(process.cwd(), configuredPhotoSourcePath) : null;

export const HRX_MEMBER_PHOTO_SOURCE_PATH = photoSourcePath ?? (
  existsSync(packagedPhotoSourcePath) ? packagedPhotoSourcePath : null
);
export const HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME = "hrx-member-photo-artifact-metadata.json";
export const HRX_MEMBER_PHOTO_ARTIFACT_METADATA_SCHEMA = "law-firm-os.profile-photo-artifact-metadata.v1";
export const HRX_MEMBER_PHOTO_ARTIFACT_METADATA_PATH = packagedPhotoArtifactMetadataPath;

const SAFE_MEMBER_PHOTO_REF = /^[A-Za-z0-9_-]{1,128}$/u;
const PROFILE_PHOTO_GENERATION_REF = /^profile_generation_[a-f0-9]{32}$/u;
const PROFILE_PHOTO_FILE_NAME = /^[a-f0-9]{64}\.png$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const VALIDATED_MEMBER_PHOTO_GENERATION = Symbol("validated-member-photo-generation");
const PROFILE_PHOTO_ARTIFACT_METADATA_KEYS = Object.freeze([
  "generation_ref",
  "git_source_photo_entry_count",
  "injected_photo_entry_count",
  "private_manifest_entry_count",
  "private_manifest_schema_version",
  "private_manifest_sha256",
  "schema_version",
]);
const PROFILE_PHOTO_PRIVATE_MANIFEST_SCHEMA = "law-firm-os.profile-photo-replacement-manifest.v2";
const PROFILE_PHOTO_ARTIFACT_ENTRY_COUNT = 10;
const PINNED_READ_FLAGS = fsConstants.O_RDONLY | (
  Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0
);

function sameFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function sameDirectoryIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function canonicalDirectorySnapshot(path) {
  try {
    const entry = lstatSync(path, { bigint: true });
    if (entry.isSymbolicLink() || !entry.isDirectory() || realpathSync(path) !== path) return null;
    return entry;
  } catch {
    return null;
  }
}

function canonicalRegularFileSnapshot(path) {
  try {
    const entry = lstatSync(path, { bigint: true });
    if (entry.isSymbolicLink() || !entry.isFile() || realpathSync(path) !== path) return null;
    return entry;
  } catch {
    return null;
  }
}

function readPinnedRegularFile(path, {
  minimumBytes = 0,
  maximumBytes = null,
  expectedSnapshot = null,
} = {}) {
  if (typeof path !== "string" || !path || !Number.isSafeInteger(minimumBytes) || minimumBytes < 0
    || (maximumBytes !== null && (!Number.isSafeInteger(maximumBytes) || maximumBytes < minimumBytes))) {
    return null;
  }
  let descriptor = null;
  try {
    const target = resolve(path);
    const before = lstatSync(target, { bigint: true });
    if (target !== path || before.isSymbolicLink() || !before.isFile()
      || realpathSync(target) !== target || before.size < BigInt(minimumBytes)
      || (maximumBytes !== null && before.size > BigInt(maximumBytes))
      || (expectedSnapshot && !sameFileSnapshot(expectedSnapshot, before))) return null;
    descriptor = openSync(target, PINNED_READ_FLAGS);
    const opened = fstatSync(descriptor, { bigint: true });
    const afterOpen = lstatSync(target, { bigint: true });
    if (!opened.isFile() || afterOpen.isSymbolicLink() || !afterOpen.isFile()
      || !sameFileSnapshot(before, opened) || !sameFileSnapshot(opened, afterOpen)
      || realpathSync(target) !== target) return null;
    const bytes = readFileSync(descriptor);
    const afterRead = fstatSync(descriptor, { bigint: true });
    const current = lstatSync(target, { bigint: true });
    if (!afterRead.isFile() || current.isSymbolicLink() || !current.isFile()
      || !sameFileSnapshot(opened, afterRead) || !sameFileSnapshot(afterRead, current)
      || afterRead.size !== BigInt(bytes.byteLength) || realpathSync(target) !== target) return null;
    return bytes;
  } catch {
    return null;
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function memberPhotoFileName(employeeId) {
  const normalized = String(employeeId ?? "").trim();
  if (!SAFE_MEMBER_PHOTO_REF.test(normalized)) return null;
  return `${createHash("sha256").update(normalized).digest("hex")}.png`;
}

function canonicalPhotoDirectory(path, { rejectLeafSymlink = false } = {}) {
  if (typeof path !== "string" || !path.trim()) return null;
  try {
    const resolved = resolve(path);
    const entry = lstatSync(resolved);
    if (!entry.isDirectory() || (rejectLeafSymlink && entry.isSymbolicLink())) return null;
    return realpathSync(resolved);
  } catch {
    return null;
  }
}

function captureMemberPhotoBinding(directory, fileName, {
  expectedDirectoryIdentity = null,
  generationRef = null,
  activeGenerationRootPath = null,
  activeGenerationRootSnapshot = null,
} = {}) {
  if (!directory || !fileName) return null;
  const before = canonicalDirectorySnapshot(directory);
  if (!before || (expectedDirectoryIdentity && !sameDirectoryIdentity(expectedDirectoryIdentity, before))) return null;
  const fileSnapshot = canonicalRegularFileSnapshot(join(directory, fileName));
  const after = canonicalDirectorySnapshot(directory);
  if (!fileSnapshot || !after || !sameFileSnapshot(before, after)) return null;
  return Object.freeze({
    activeGenerationRootPath,
    activeGenerationRootSnapshot,
    directory,
    directorySnapshot: after,
    fileName,
    fileSnapshot,
    generationRef,
  });
}

function activeGenerationPointerMatches(binding) {
  if (!binding.activeGenerationRootPath) return true;
  const active = join(binding.activeGenerationRootPath, "active");
  try {
    const currentRoot = canonicalDirectorySnapshot(binding.activeGenerationRootPath);
    if (!currentRoot || !sameFileSnapshot(binding.activeGenerationRootSnapshot, currentRoot)
      || !lstatSync(active).isSymbolicLink()
      || readlinkSync(active) !== join("generations", binding.generationRef)
      || realpathSync(active) !== binding.directory) return false;
    return true;
  } catch {
    return false;
  }
}

function photoBindingIsCurrent(binding) {
  const currentDirectory = canonicalDirectorySnapshot(binding?.directory);
  return Boolean(currentDirectory
    && sameFileSnapshot(binding.directorySnapshot, currentDirectory)
    && activeGenerationPointerMatches(binding));
}

function readMemberPhotoResult(binding) {
  if (!binding || !photoBindingIsCurrent(binding)) return null;
  const bytes = readPinnedRegularFile(join(binding.directory, binding.fileName), {
    expectedSnapshot: binding.fileSnapshot,
  });
  if (!bytes || !photoBindingIsCurrent(binding)) return null;
  return Object.freeze({
    dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
    generationRef: binding.generationRef,
    [VALIDATED_MEMBER_PHOTO_GENERATION]: binding.generationRef !== null,
  });
}

function flatPhotoArtifactBinding(sourceDirectory, metadataPath, fileName, initialDirectoryIdentity) {
  if (!sourceDirectory || !fileName || typeof metadataPath !== "string" || !metadataPath.trim()) return null;
  const expectedMetadataPath = join(dirname(sourceDirectory), HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME);
  try {
    const directoryBefore = canonicalDirectorySnapshot(sourceDirectory);
    if (!directoryBefore || !sameDirectoryIdentity(initialDirectoryIdentity, directoryBefore)) return null;
    const resolvedMetadataPath = resolve(metadataPath);
    if (resolvedMetadataPath !== expectedMetadataPath) return null;
    const metadataSnapshot = canonicalRegularFileSnapshot(resolvedMetadataPath);
    if (!metadataSnapshot) return null;
    const photoEntries = readdirSync(sourceDirectory, { withFileTypes: true });
    if (photoEntries.length !== PROFILE_PHOTO_ARTIFACT_ENTRY_COUNT
      || photoEntries.some((entry) => entry.isSymbolicLink()
        || !entry.isFile()
        || !PROFILE_PHOTO_FILE_NAME.test(entry.name)
        || realpathSync(join(sourceDirectory, entry.name)) !== join(sourceDirectory, entry.name))) return null;
    const metadataBytes = readPinnedRegularFile(resolvedMetadataPath, {
      minimumBytes: 1,
      maximumBytes: 4096,
      expectedSnapshot: metadataSnapshot,
    });
    if (!metadataBytes) return null;
    const metadata = JSON.parse(metadataBytes.toString("utf8"));
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)
      || JSON.stringify(Object.keys(metadata).sort()) !== JSON.stringify(PROFILE_PHOTO_ARTIFACT_METADATA_KEYS)) return null;
    if (metadata.schema_version !== HRX_MEMBER_PHOTO_ARTIFACT_METADATA_SCHEMA
      || metadata.private_manifest_schema_version !== PROFILE_PHOTO_PRIVATE_MANIFEST_SCHEMA
      || !SHA256_HEX.test(metadata.private_manifest_sha256)
      || metadata.private_manifest_entry_count !== PROFILE_PHOTO_ARTIFACT_ENTRY_COUNT
      || metadata.injected_photo_entry_count !== PROFILE_PHOTO_ARTIFACT_ENTRY_COUNT
      || metadata.git_source_photo_entry_count !== 0
      || !PROFILE_PHOTO_GENERATION_REF.test(metadata.generation_ref)
      || metadata.generation_ref !== `profile_generation_${metadata.private_manifest_sha256.slice(0, 32)}`) return null;
    const binding = captureMemberPhotoBinding(sourceDirectory, fileName, {
      expectedDirectoryIdentity: directoryBefore,
      generationRef: metadata.generation_ref,
    });
    if (!binding || !sameFileSnapshot(directoryBefore, binding.directorySnapshot)) return null;
    return binding;
  } catch {
    return null;
  }
}

function resolveActiveMemberPhotoGeneration(rootPath, fileName, initialRootIdentity) {
  if (typeof rootPath !== "string" || !rootPath.trim() || !fileName) return null;
  const root = resolve(rootPath);
  const generations = join(root, "generations");
  const active = join(root, "active");
  try {
    const rootEntry = canonicalDirectorySnapshot(root);
    const generationsEntry = lstatSync(generations);
    if (!rootEntry || !sameDirectoryIdentity(initialRootIdentity, rootEntry)
      || generationsEntry.isSymbolicLink() || !generationsEntry.isDirectory()
      || realpathSync(generations) !== generations
      || !lstatSync(active).isSymbolicLink()) return null;
    const target = readlinkSync(active);
    if (isAbsolute(target)) return null;
    const parts = target.split(sep);
    if (parts.length !== 2 || parts[0] !== "generations" || !PROFILE_PHOTO_GENERATION_REF.test(parts[1])) return null;
    const generationRef = parts[1];
    const directory = join(generations, generationRef);
    const directoryBefore = canonicalDirectorySnapshot(directory);
    if (!directoryBefore || realpathSync(active) !== directory) return null;
    const binding = captureMemberPhotoBinding(directory, fileName, {
      expectedDirectoryIdentity: directoryBefore,
      generationRef,
      activeGenerationRootPath: root,
      activeGenerationRootSnapshot: rootEntry,
    });
    const rootAfter = canonicalDirectorySnapshot(root);
    if (!binding || !rootAfter || !sameFileSnapshot(rootEntry, rootAfter)
      || !sameFileSnapshot(directoryBefore, binding.directorySnapshot)
      || !activeGenerationPointerMatches(binding)) return null;
    return binding;
  } catch {
    return null;
  }
}

export function memberPhotoResultForEmployeeId(employeeId, sourcePath = HRX_MEMBER_PHOTO_SOURCE_PATH) {
  const directory = canonicalPhotoDirectory(sourcePath);
  const fileName = memberPhotoFileName(employeeId);
  return readMemberPhotoResult(captureMemberPhotoBinding(directory, fileName));
}

export function createHrxMemberPhotoProvider({
  sourcePath = HRX_MEMBER_PHOTO_SOURCE_PATH,
  generationRootPath = null,
  artifactMetadataPath,
} = {}) {
  const flatSourcePath = canonicalPhotoDirectory(sourcePath);
  const flatSourceInitialDirectoryIdentity = canonicalDirectorySnapshot(flatSourcePath);
  const flatArtifactSourcePath = canonicalPhotoDirectory(sourcePath, { rejectLeafSymlink: true });
  const flatArtifactInitialDirectoryIdentity = canonicalDirectorySnapshot(flatArtifactSourcePath);
  const activeGenerationRootPath = canonicalPhotoDirectory(generationRootPath, { rejectLeafSymlink: true });
  const activeGenerationRootInitialIdentity = canonicalDirectorySnapshot(activeGenerationRootPath);
  const flatArtifactMetadataPath = artifactMetadataPath === null
    ? null
    : artifactMetadataPath ?? (flatSourcePath
      ? join(dirname(flatSourcePath), HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME)
      : HRX_MEMBER_PHOTO_ARTIFACT_METADATA_PATH);
  const flatArtifactMode = flatArtifactMetadataPath !== null
    && (artifactMetadataPath !== undefined || existsSync(flatArtifactMetadataPath));
  return Object.freeze({
    readForEmployeeId(employeeId) {
      const fileName = memberPhotoFileName(employeeId);
      if (!fileName) return null;
      if (!activeGenerationRootPath) {
        const artifactBinding = flatPhotoArtifactBinding(
          flatArtifactSourcePath,
          flatArtifactMetadataPath,
          fileName,
          flatArtifactInitialDirectoryIdentity,
        );
        if (flatArtifactMode) return readMemberPhotoResult(artifactBinding);
        return readMemberPhotoResult(captureMemberPhotoBinding(flatSourcePath, fileName, {
          expectedDirectoryIdentity: flatSourceInitialDirectoryIdentity,
        }));
      }
      const activeGeneration = resolveActiveMemberPhotoGeneration(
        activeGenerationRootPath,
        fileName,
        activeGenerationRootInitialIdentity,
      );
      if (!activeGeneration) return null;
      return readMemberPhotoResult(activeGeneration);
    },
  });
}

export function validatedMemberPhotoGenerationRef(result) {
  return result?.[VALIDATED_MEMBER_PHOTO_GENERATION] === true
    && PROFILE_PHOTO_GENERATION_REF.test(result.generationRef)
    ? result.generationRef
    : null;
}

export function memberPhotoDataUrlForEmployeeId(employeeId, sourcePath = HRX_MEMBER_PHOTO_SOURCE_PATH) {
  return memberPhotoResultForEmployeeId(employeeId, sourcePath)?.dataUrl ?? null;
}
