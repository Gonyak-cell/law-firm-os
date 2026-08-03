import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { PROFILE_MEDIA_MEASUREMENT_SOURCE_PATHS } from "../lib/profile-media-measurement.mjs";
import {
  PROFILE_PHOTO_OPERATION_JOURNAL,
  PROFILE_PHOTO_SAFE_ROOT_SCHEMA,
  PROFILE_PHOTO_SAFE_ROOT_SENTINEL,
  resolveActiveGeneration,
} from "../lib/profile-photo-operation-root.mjs";
import { PNG_SIGNATURE } from "../lib/profile-photo-png.mjs";
import { PROFILE_PHOTO_EXPECTED_COUNT } from "../validate-profile-photo-replacement-manifest.mjs";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBytes.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return result;
}

export function syntheticFilename(index) {
  return `${createHash("sha256").update(`synthetic-profile-slot-${index}`).digest("hex")}.png`;
}

export function opaqueChangeRef(label) {
  return `profile_change_${createHash("sha256").update(`change:${label}`).digest("hex").slice(0, 32)}`;
}

export function opaqueGenerationRef(label) {
  return `profile_generation_${createHash("sha256").update(`generation:${label}`).digest("hex").slice(0, 32)}`;
}

export function syntheticPng(index, variant = 0) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = Buffer.from([
    0, index, variant, 10, 255, index + 1, variant + 1, 20, 255,
    0, index + 2, variant + 2, 30, 255, index + 3, variant + 3, 40, 255,
  ].map((value) => value % 256));
  return Buffer.concat([PNG_SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

export function pngWithUndecodableIdat(index = 1) {
  const bytes = Buffer.from(syntheticPng(index));
  const typeOffset = bytes.indexOf(Buffer.from("IDAT"));
  const length = bytes.readUInt32BE(typeOffset - 4);
  const data = bytes.subarray(typeOffset + 4, typeOffset + 4 + length);
  data.fill(0xa5);
  bytes.writeUInt32BE(crc32(Buffer.concat([Buffer.from("IDAT"), data])), typeOffset + 4 + length);
  return bytes;
}

export function pngWithZeroWidth(index = 1) {
  const bytes = Buffer.from(syntheticPng(index));
  bytes.writeUInt32BE(0, 16);
  bytes.writeUInt32BE(crc32(bytes.subarray(12, 29)), 29);
  return bytes;
}

export function pngWithoutIend(index = 1) {
  return syntheticPng(index).subarray(0, -12);
}

export function tempRoot(testContext, prefix = "lawos-profile-media-") {
  const root = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

export function writePhotoDirectory(root, name, variant = 0) {
  const directory = join(root, name);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  for (let index = 1; index <= PROFILE_PHOTO_EXPECTED_COUNT; index += 1) {
    writeFileSync(join(directory, syntheticFilename(index)), syntheticPng(index, variant), { mode: 0o600 });
  }
  return directory;
}

export function provisionOperationRoot(testContext, {
  initializedAt = "2026-07-01T00:00:00.000Z",
  changeRef = opaqueChangeRef("synthetic-01"),
  priorEvents = [],
} = {}) {
  const root = tempRoot(testContext, "lawos-profile-operation-");
  chmodSync(root, 0o700);
  writeFileSync(join(root, PROFILE_PHOTO_SAFE_ROOT_SENTINEL), `${JSON.stringify({
    schema_version: PROFILE_PHOTO_SAFE_ROOT_SCHEMA,
    environment: "TEST_ONLY",
    initialized_at: initializedAt,
  }, null, 2)}\n`, { mode: 0o600 });
  const journalBody = priorEvents.map((event) => JSON.stringify(event)).join("\n");
  writeFileSync(join(root, PROFILE_PHOTO_OPERATION_JOURNAL), journalBody ? `${journalBody}\n` : "", { mode: 0o600 });
  mkdirSync(join(root, "incoming"), { mode: 0o700 });
  mkdirSync(join(root, "generations"), { mode: 0o700 });
  mkdirSync(join(root, ".manifests"), { mode: 0o700 });
  mkdirSync(join(root, ".operations"), { mode: 0o700 });
  writePhotoDirectory(join(root, "incoming"), changeRef, 80);
  const baselineGenerationRef = opaqueGenerationRef(`baseline:${changeRef}`);
  writePhotoDirectory(join(root, "generations"), baselineGenerationRef, 10);
  symlinkSync(join("generations", baselineGenerationRef), join(root, "active"), "dir");
  return { root, changeRef, baselineGenerationRef };
}

export function createFixtureRepo(testContext) {
  const repoRoot = tempRoot(testContext, "lawos-profile-repo-");
  for (const relativePath of PROFILE_MEDIA_MEASUREMENT_SOURCE_PATHS) {
    const path = join(repoRoot, relativePath);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, `// synthetic source binding for ${relativePath}\n`, { mode: 0o600 });
  }
  mkdirSync(join(repoRoot, ".omo", "evidence"), { recursive: true, mode: 0o700 });
  mkdirSync(join(repoRoot, "workbook"), { recursive: true, mode: 0o700 });
  return repoRoot;
}

export function sequenceClock(values) {
  let index = 0;
  return () => {
    if (index >= values.length) throw new Error("synthetic clock exhausted");
    return new Date(values[index++]);
  };
}

export function passingProfileResponse({ bytes, generationRef }) {
  return {
    status: 200,
    generation_ref: generationRef,
    body: {
      outcome: "passed",
      ui_state: "populated",
      item: { photo_included: true, photo_url: `data:image/png;base64,${bytes.toString("base64")}` },
    },
  };
}

export function createPassingProfileReader({ directory, manifest, generationRef, transform = (value) => value }) {
  const entries = new Map(manifest.entries.map((entry) => [entry.slot_ref, entry]));
  return (ref) => {
    const entry = entries.get(ref);
    const response = passingProfileResponse({
      bytes: readFileSync(join(directory, entry.filename)),
      generationRef,
    });
    return transform(response, ref);
  };
}

export function createActiveProfileReader({ root, state, transform = (value) => value }) {
  return (ref) => {
    const active = resolveActiveGeneration(root);
    const candidate = active.generationRef === state.candidateGenerationRef;
    return createPassingProfileReader({
      directory: active.directory,
      manifest: candidate ? state.candidateManifest : state.baselineManifest,
      generationRef: active.generationRef,
      transform,
    })(ref);
  };
}
