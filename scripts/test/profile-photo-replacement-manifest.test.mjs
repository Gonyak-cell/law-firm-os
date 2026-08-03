import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PNG_SIGNATURE } from "../lib/profile-photo-png.mjs";
import {
  PROFILE_PHOTO_EXPECTED_COUNT,
  ProfilePhotoManifestValidationError,
  captureProfilePhotoManifest,
  inspectProfilePhotoDirectory,
  validateProfilePhotoManifest,
  verifyProfilePhotoManifest,
  writeProfilePhotoManifest,
} from "../validate-profile-photo-replacement-manifest.mjs";
import {
  syntheticFilename,
  syntheticPng,
  pngWithUndecodableIdat,
  pngWithZeroWidth,
  pngWithoutIend,
  tempRoot,
  writePhotoDirectory,
} from "./profile-media-test-fixture.mjs";

const SCRIPT_PATH = fileURLToPath(new URL("../validate-profile-photo-replacement-manifest.mjs", import.meta.url));

function assertCode(callback, code) {
  assert.throws(callback, (error) => error instanceof ProfilePhotoManifestValidationError && error.code === code);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngWithRawChunkTypeByte(offset, value) {
  const bytes = Buffer.from(syntheticPng(1));
  bytes[12 + offset] = value;
  bytes.writeUInt32BE(crc32(bytes.subarray(12, 29)), 29);
  return bytes;
}

test("captures and verifies ten distinct structurally decodable PNG files", (testContext) => {
  const root = tempRoot(testContext);
  const directory = writePhotoDirectory(root, "photos");
  const manifestPath = join(root, "private.json");
  const result = captureProfilePhotoManifest({ directory, manifestPath });
  assert.deepEqual({
    verdict: result.verdict,
    pngs: result.png_structurally_valid_count,
    digests: result.distinct_content_digest_count,
    private: result.private_values_emitted,
  }, { verdict: "PASS", pngs: 10, digests: 10, private: false });
  assert.equal(statSync(manifestPath).mode & 0o777, 0o600);
  assert.equal(verifyProfilePhotoManifest({ directory, manifestPath }).content_hash_match_count, 10);
});

test("rejects signature-only, truncated, bad-CRC, trailing, and undecodable PNG attacks", (testContext) => {
  const root = tempRoot(testContext);
  const attacks = [
    ["signature-only", Buffer.concat([PNG_SIGNATURE, Buffer.from("not-a-png")]), "PHOTO_PNG_CHUNK_TRUNCATED"],
    ["truncated", syntheticPng(1).subarray(0, -5), "PHOTO_PNG_CHUNK_TRUNCATED"],
    ["bad-crc", (() => { const bytes = Buffer.from(syntheticPng(1)); bytes[29] ^= 1; return bytes; })(), "PHOTO_PNG_CRC_MISMATCH"],
    ["trailing", Buffer.concat([syntheticPng(1), Buffer.from([0])]), "PHOTO_PNG_TRAILING_DATA"],
    ["bad-zlib", pngWithUndecodableIdat(), "PHOTO_PNG_DECODE_FAILED"],
    ["zero-width", pngWithZeroWidth(), "PHOTO_PNG_DIMENSIONS_INVALID"],
    ["missing-iend", pngWithoutIend(), "PHOTO_PNG_STRUCTURE_INVALID"],
  ];
  for (const [name, bytes, code] of attacks) {
    const directory = writePhotoDirectory(root, name);
    writeFileSync(join(directory, syntheticFilename(1)), bytes);
    assertCode(() => inspectProfilePhotoDirectory(directory), code);
  }
});

test("rejects non-ASCII, non-letter, and lowercase reserved PNG chunk-type bytes before ASCII decoding", (testContext) => {
  const root = tempRoot(testContext);
  const attacks = [
    ["high-bit-type", pngWithRawChunkTypeByte(0, 0xc9)],
    ["digit-type", pngWithRawChunkTypeByte(1, 0x31)],
    ["reserved-bit", pngWithRawChunkTypeByte(2, 0x64)],
  ];
  for (const [name, bytes] of attacks) {
    const directory = writePhotoDirectory(root, name);
    writeFileSync(join(directory, syntheticFilename(1)), bytes);
    assertCode(() => inspectProfilePhotoDirectory(directory), "PHOTO_PNG_CHUNK_TYPE_INVALID");
  }
});

test("rejects ten filenames that reuse one photo content digest", (testContext) => {
  const root = tempRoot(testContext);
  const directory = writePhotoDirectory(root, "duplicates");
  const duplicate = syntheticPng(1);
  for (let index = 1; index <= PROFILE_PHOTO_EXPECTED_COUNT; index += 1) {
    writeFileSync(join(directory, syntheticFilename(index)), duplicate);
  }
  assertCode(() => inspectProfilePhotoDirectory(directory), "PHOTO_DUPLICATE_CONTENT");
});

test("rejects extras, non-files, misnames, filename drift, and content drift", (testContext) => {
  const root = tempRoot(testContext);
  const extra = writePhotoDirectory(root, "extra");
  writeFileSync(join(extra, ".extra"), "x");
  assertCode(() => inspectProfilePhotoDirectory(extra), "PHOTO_DIRECTORY_ENTRY_COUNT");

  const nested = writePhotoDirectory(root, "nested");
  const removed = join(nested, syntheticFilename(1));
  writeFileSync(removed, syntheticPng(1));
  renameSync(removed, join(nested, "not-a-hash.png"));
  assertCode(() => inspectProfilePhotoDirectory(nested), "PHOTO_FILENAME_INVALID");

  const baseline = writePhotoDirectory(root, "baseline", 1);
  const manifest = join(root, "baseline.json");
  captureProfilePhotoManifest({ directory: baseline, manifestPath: manifest });
  writeFileSync(join(baseline, syntheticFilename(1)), syntheticPng(1, 200));
  assertCode(() => verifyProfilePhotoManifest({ directory: baseline, manifestPath: manifest }), "PHOTO_CONTENT_HASH_MISMATCH");

  const nonFile = writePhotoDirectory(root, "non-file");
  const path = join(nonFile, syntheticFilename(1));
  writeFileSync(path, syntheticPng(1));
  renameSync(path, join(root, "saved.png"));
  mkdirSync(path);
  assertCode(() => inspectProfilePhotoDirectory(nonFile), "PHOTO_DIRECTORY_ENTRY_TYPE");
});

test("failed private-manifest creation removes partial temp data and permits a clean retry", (testContext) => {
  const root = tempRoot(testContext);
  const directory = writePhotoDirectory(root, "photos");
  const manifest = inspectProfilePhotoDirectory(directory);
  const manifestPath = join(root, "private.json");
  assertCode(() => writeProfilePhotoManifest(manifestPath, manifest, {
    io: {
      write(descriptor) {
        writeFileSync(descriptor, "partial", "utf8");
        throw new Error("synthetic write failure");
      },
    },
  }), "MANIFEST_WRITE_FAILED");
  assert.equal(existsSync(manifestPath), false);
  assert.equal(readdirSync(root).some((name) => name.includes(".tmp-")), false);
  writeProfilePhotoManifest(manifestPath, manifest);
  assert.equal(verifyProfilePhotoManifest({ directory, manifestPath }).content_hash_match_count, 10);
});

test("CLI output stays aggregate-only on success and failure", (testContext) => {
  const root = tempRoot(testContext);
  const marker = "private-path-marker-never-emit";
  const directory = writePhotoDirectory(root, marker);
  const manifestPath = join(root, "private.json");
  const capture = spawnSync(process.execPath, [SCRIPT_PATH, "--capture", "--directory", directory, "--manifest", manifestPath], { encoding: "utf8" });
  assert.equal(capture.status, 0, capture.stderr);
  const privateHash = JSON.parse(readFileSync(manifestPath, "utf8")).entries[0].content_sha256;
  assert.doesNotMatch(`${capture.stdout}${capture.stderr}`, new RegExp(`${marker}|${privateHash}`, "u"));
  writeFileSync(join(directory, syntheticFilename(1)), syntheticPng(1, 201));
  const failure = spawnSync(process.execPath, [SCRIPT_PATH, "--verify", "--directory", directory, "--manifest", manifestPath], { encoding: "utf8" });
  assert.equal(failure.status, 1);
  assert.doesNotMatch(`${failure.stdout}${failure.stderr}`, new RegExp(`${marker}|${privateHash}`, "u"));
  assert.match(failure.stderr, /PHOTO_CONTENT_HASH_MISMATCH/u);
});

test("production manifest validation accepts only opaque SHA-shaped PNG filenames", (testContext) => {
  const root = tempRoot(testContext);
  const manifest = inspectProfilePhotoDirectory(writePhotoDirectory(root, "production-filename-contract"));
  assert.ok(manifest.entries.every((entry) => /^[a-f0-9]{64}\.png$/u.test(entry.filename)));
  const entries = manifest.entries.map((entry, index) => index === 0 ? { ...entry, filename: "named-profile.png" } : entry);
  assertCode(() => validateProfilePhotoManifest({ ...manifest, entries }), "MANIFEST_FILENAME");
});
