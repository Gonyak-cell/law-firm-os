#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { writePrivateJsonExclusive } from "./lib/profile-media-private-json.mjs";
import { ProfilePhotoPngError, validatePngBytes } from "./lib/profile-photo-png.mjs";

export const PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION = "law-firm-os.profile-photo-replacement-manifest.v2";
export const PROFILE_PHOTO_EXPECTED_COUNT = 10;
export const PROFILE_PHOTO_SLOT_REFS = Object.freeze(
  Array.from({ length: PROFILE_PHOTO_EXPECTED_COUNT }, (_, index) => `profile_slot_${String(index + 1).padStart(2, "0")}`),
);

const SHA256_PNG_FILENAME = /^[a-f0-9]{64}\.png$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;

export class ProfilePhotoManifestValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProfilePhotoManifestValidationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProfilePhotoManifestValidationError(code, message);
}

function plainObject(value, code, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, message);
}

function exactKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value);
  if (expectedKeys.some((key) => !actualKeys.includes(key))) fail("MANIFEST_FIELD_MISSING", "manifest field is missing");
  if (actualKeys.some((key) => !expectedKeys.includes(key))) fail("MANIFEST_FIELD_UNKNOWN", "manifest field is unknown");
}

function canonicalDirectory(path, code) {
  if (typeof path !== "string" || !isAbsolute(path) || resolve(path) !== path) fail(code, "directory path must be absolute and canonical");
  try {
    if (lstatSync(path).isSymbolicLink() || !statSync(path).isDirectory() || realpathSync(path) !== path) throw new Error();
  } catch {
    fail(code, "directory must be an existing symlink-free canonical directory");
  }
  return path;
}

function canonicalPrivateManifest(path, { existing }) {
  if (typeof path !== "string" || !isAbsolute(path) || resolve(path) !== path) {
    fail("MANIFEST_PATH_INVALID", "manifest path must be absolute and canonical");
  }
  if (!existing) {
    canonicalDirectory(dirname(path), "MANIFEST_PARENT_INVALID");
    if (existsSync(path)) fail("MANIFEST_ALREADY_EXISTS", "private manifest already exists");
    return path;
  }
  try {
    if (lstatSync(path).isSymbolicLink() || !statSync(path).isFile() || realpathSync(path) !== path) throw new Error();
    if ((statSync(path).mode & 0o077) !== 0) fail("MANIFEST_MODE_INVALID", "private manifest permissions must be owner-only");
  } catch (error) {
    if (error instanceof ProfilePhotoManifestValidationError) throw error;
    fail("MANIFEST_PATH_INVALID", "private manifest must be a canonical non-symlink regular file");
  }
  return path;
}

export function validateProfilePhotoManifest(manifest) {
  plainObject(manifest, "MANIFEST_INVALID", "profile photo manifest must be an object");
  exactKeys(manifest, ["schema_version", "entries"]);
  if (manifest.schema_version !== PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION) fail("MANIFEST_SCHEMA_VERSION", "manifest schema is invalid");
  if (!Array.isArray(manifest.entries) || manifest.entries.length !== PROFILE_PHOTO_EXPECTED_COUNT) {
    fail("MANIFEST_ENTRY_COUNT", "manifest must contain exactly ten entries");
  }

  const slots = new Set();
  const filenames = new Set();
  const contentDigests = new Set();
  for (const entry of manifest.entries) {
    plainObject(entry, "MANIFEST_ENTRY_INVALID", "manifest entry must be an object");
    exactKeys(entry, ["slot_ref", "filename", "media_type", "content_sha256"]);
    if (!PROFILE_PHOTO_SLOT_REFS.includes(entry.slot_ref) || slots.has(entry.slot_ref)) {
      fail("MANIFEST_SLOT_REF", "manifest slots must be the exact ten opaque references");
    }
    if (typeof entry.filename !== "string" || !SHA256_PNG_FILENAME.test(entry.filename) || filenames.has(entry.filename)) {
      fail("MANIFEST_FILENAME", "manifest filenames must be unique lowercase SHA-256 PNG names");
    }
    if (entry.media_type !== "image/png") fail("MANIFEST_MEDIA_TYPE", "manifest media type must be image/png");
    if (typeof entry.content_sha256 !== "string" || !SHA256_HEX.test(entry.content_sha256)) {
      fail("MANIFEST_CONTENT_HASH", "manifest content digest must be lowercase SHA-256");
    }
    if (contentDigests.has(entry.content_sha256)) fail("MANIFEST_DUPLICATE_CONTENT", "ten profile photos must have distinct content digests");
    slots.add(entry.slot_ref);
    filenames.add(entry.filename);
    contentDigests.add(entry.content_sha256);
  }
  if (PROFILE_PHOTO_SLOT_REFS.some((slot) => !slots.has(slot))) fail("MANIFEST_SLOT_SET", "manifest slot set is incomplete");
  return Object.freeze({
    schema_version: manifest.schema_version,
    entries: Object.freeze(manifest.entries.map((entry) => Object.freeze({ ...entry }))),
  });
}

export function readProfilePhotoManifest(path) {
  const canonical = canonicalPrivateManifest(path, { existing: true });
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(canonical, "utf8"));
  } catch {
    fail("MANIFEST_JSON_INVALID", "private manifest JSON is invalid");
  }
  return validateProfilePhotoManifest(parsed);
}

export function writeProfilePhotoManifest(path, manifest, options = {}) {
  const canonical = canonicalPrivateManifest(path, { existing: false });
  const validated = validateProfilePhotoManifest(manifest);
  try {
    writePrivateJsonExclusive(canonical, validated, options);
  } catch {
    fail("MANIFEST_WRITE_FAILED", "private manifest could not be created atomically");
  }
}

export function inspectProfilePhotoDirectory(directory, { expectedManifest = null } = {}) {
  const canonical = canonicalDirectory(directory, "PHOTO_DIRECTORY_INVALID");
  let dirEntries;
  try {
    dirEntries = readdirSync(canonical, { withFileTypes: true });
  } catch {
    fail("PHOTO_DIRECTORY_READ_FAILED", "profile photo directory could not be read");
  }
  if (dirEntries.length !== PROFILE_PHOTO_EXPECTED_COUNT) fail("PHOTO_DIRECTORY_ENTRY_COUNT", "directory must contain exactly ten entries");
  if (dirEntries.some((entry) => !entry.isFile() || entry.isSymbolicLink())) {
    fail("PHOTO_DIRECTORY_ENTRY_TYPE", "directory entries must be regular non-symlink files");
  }
  const filenames = dirEntries.map((entry) => entry.name).sort();
  if (filenames.some((name) => !SHA256_PNG_FILENAME.test(name)) || new Set(filenames).size !== filenames.length) {
    fail("PHOTO_FILENAME_INVALID", "filenames must be unique lowercase SHA-256 PNG names");
  }

  const expected = expectedManifest ? validateProfilePhotoManifest(expectedManifest) : null;
  const expectedNames = expected?.entries.map((entry) => entry.filename).sort();
  if (expectedNames && filenames.some((name, index) => name !== expectedNames[index])) {
    fail("PHOTO_FILENAME_SET_MISMATCH", "directory does not match the expected filename set");
  }
  const expectedByName = new Map(expected?.entries.map((entry) => [entry.filename, entry]) ?? []);
  const digests = new Set();
  const entries = filenames.map((filename, index) => {
    let bytes;
    try {
      bytes = readFileSync(resolve(canonical, filename));
      validatePngBytes(bytes);
    } catch (error) {
      if (error instanceof ProfilePhotoPngError) fail(error.code, error.message);
      fail("PHOTO_FILE_READ_FAILED", "profile photo file could not be read");
    }
    const contentSha256 = createHash("sha256").update(bytes).digest("hex");
    if (digests.has(contentSha256)) fail("PHOTO_DUPLICATE_CONTENT", "ten profile photos must contain distinct PNG content");
    digests.add(contentSha256);
    return Object.freeze({
      slot_ref: expectedByName.get(filename)?.slot_ref ?? PROFILE_PHOTO_SLOT_REFS[index],
      filename,
      media_type: "image/png",
      content_sha256: contentSha256,
    });
  });
  return validateProfilePhotoManifest({ schema_version: PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION, entries });
}

function aggregate(mode, contentHashMatchCount = null) {
  return Object.freeze({
    validator: "profile-photo-replacement-manifest",
    verdict: "PASS",
    mode,
    expected_file_count: 10,
    observed_file_count: 10,
    png_structurally_valid_count: 10,
    distinct_content_digest_count: 10,
    exact_filename_set_match: true,
    content_hash_match_count: contentHashMatchCount,
    private_manifest_written: mode === "capture",
    private_values_emitted: false,
    external_mutation_executed: false,
  });
}

export function captureProfilePhotoManifest({ directory, manifestPath, expectedManifestPath = null } = {}) {
  if (!directory || !manifestPath) fail("INVALID_ARGUMENT", "capture requires directory and manifest paths");
  const expected = expectedManifestPath ? readProfilePhotoManifest(expectedManifestPath) : null;
  const manifest = inspectProfilePhotoDirectory(directory, { expectedManifest: expected });
  writeProfilePhotoManifest(manifestPath, manifest);
  return aggregate("capture");
}

export function verifyProfilePhotoManifest({ directory, manifestPath } = {}) {
  if (!directory || !manifestPath) fail("INVALID_ARGUMENT", "verify requires directory and manifest paths");
  const expected = readProfilePhotoManifest(manifestPath);
  const observed = inspectProfilePhotoDirectory(directory, { expectedManifest: expected });
  const hashes = new Map(expected.entries.map((entry) => [entry.filename, entry.content_sha256]));
  const matches = observed.entries.filter((entry) => hashes.get(entry.filename) === entry.content_sha256).length;
  if (matches !== PROFILE_PHOTO_EXPECTED_COUNT) fail("PHOTO_CONTENT_HASH_MISMATCH", "directory content does not match the private manifest");
  return aggregate("verify", matches);
}

function parseArgs(argv) {
  const options = { capture: false, verify: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (["--capture", "--verify"].includes(argument)) {
      options[argument.slice(2)] = true;
      continue;
    }
    if (["--help", "-h"].includes(argument)) {
      options.help = true;
      continue;
    }
    const equals = argument.indexOf("=");
    const flag = equals === -1 ? argument : argument.slice(0, equals);
    const value = equals === -1 ? argv[++index] : argument.slice(equals + 1);
    if (!["--directory", "--manifest", "--expected-manifest"].includes(flag) || !value || value.startsWith("--")) {
      fail("INVALID_ARGUMENT", "profile photo validator arguments are invalid");
    }
    options[flag.slice(2).replaceAll("-", "_")] = resolve(value);
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write("Usage: node scripts/validate-profile-photo-replacement-manifest.mjs (--capture|--verify) --directory DIR --manifest PRIVATE_JSON [--expected-manifest PRIVATE_JSON]\n");
      return 0;
    }
    if (options.capture === options.verify || (options.verify && options.expected_manifest)) fail("INVALID_ARGUMENT", "choose exactly one valid mode");
    const result = options.capture
      ? captureProfilePhotoManifest({ directory: options.directory, manifestPath: options.manifest, expectedManifestPath: options.expected_manifest })
      : verifyProfilePhotoManifest({ directory: options.directory, manifestPath: options.manifest });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      validator: "profile-photo-replacement-manifest",
      verdict: "FAIL",
      code: error instanceof ProfilePhotoManifestValidationError ? error.code : "PROFILE_PHOTO_VALIDATION_FAILED",
    })}\n`);
    return 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exitCode = main();
