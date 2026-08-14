import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DESKTOP_INSTALLED_TREE_DIGEST_ALGORITHM,
  DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA,
} from "./matter-desktop-provenance.mjs";

export const WINDOWS_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA =
  DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA;
export const WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE = Object.freeze([
  "B0",
  "I1",
  "B1",
  "I2",
  "B2",
]);
export const WINDOWS_INSTALLED_TREE_FIXED_POINT_EQUALITY_PROOF =
  "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SCRIPT_PATH = fileURLToPath(new URL("../windows-installed-tree-native-snapshot.ps1", import.meta.url));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertPowerShellVersion(version) {
  const match = /^(?<major>\d+)\.(?<minor>\d+)(?:\.\d+){0,2}$/u.exec(version ?? "");
  assert.ok(match, "native installed-tree snapshot PowerShell version is invalid");
  const major = Number(match.groups.major);
  const minor = Number(match.groups.minor);
  assert.ok(major > 7 || (major === 7 && minor >= 2), "native installed-tree snapshot requires PowerShell 7.2+");
}

function assertPortablePath(filePath) {
  assert.match(filePath ?? "", /^\.\/(?!\.\.\/)[^\\:\0\r\n]+$/u, "native installed-tree file path is invalid");
  assert.equal(filePath, filePath.normalize("NFC"), "native installed-tree file path must use NFC");
  assert.doesNotMatch(filePath, /\p{Cc}/u, "native installed-tree file path contains a control character");
  const body = filePath.slice(2);
  assert.equal(path.posix.normalize(body), body, "native installed-tree file path is not canonical");
  assert.ok(body && body !== "." && !body.startsWith("../"), "native installed-tree file path escapes the root");
  for (const segment of body.split("/")) {
    assert.doesNotMatch(segment, /[<>"|?*]/u, "native installed-tree file path contains a Win32 alias character");
    assert.doesNotMatch(segment, /[. ]$/u, "native installed-tree file path has a trailing dot or space");
    const stem = segment.split(".", 1)[0].replace(/[. ]+$/u, "");
    assert.doesNotMatch(stem, /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/iu, "native installed-tree file path uses a DOS device name");
  }
}

function utf8Compare(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function validateWindowsInstalledTreeNativeSnapshot(input) {
  assert.ok(input && typeof input === "object" && !Array.isArray(input), "native installed-tree snapshot must be an object");
  assert.equal(input.schema_version, WINDOWS_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA);
  assert.equal(input.platform, "win32");
  assertPowerShellVersion(input.powershell_version);
  assert.equal(input.filesystem, "NTFS", "native installed-tree snapshot requires NTFS");
  assert.deepEqual(input.fixed_point_sequence, WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE);
  assert.equal(input.fixed_point_exact, true, "native installed-tree fixed point was not exact");
  assert.equal(input.reparse_point_count, 0, "native installed tree contains a reparse point");
  assert.equal(input.alternate_data_stream_count, 0, "native installed tree contains an alternate data stream");
  assert.equal(input.hard_link_count, 0, "native installed tree contains a hard link");
  assert.match(input.content_sha256 ?? "", SHA256_PATTERN, "native installed-tree content digest is invalid");
  assert.match(input.identity_sha256 ?? "", SHA256_PATTERN, "native installed-tree identity digest is invalid");
  assert.ok(Number.isInteger(input.file_count) && input.file_count > 0, "native installed-tree snapshot requires files");
  assert.ok(Number.isInteger(input.directory_count) && input.directory_count > 0, "native installed-tree snapshot requires directories");
  assert.ok(Number.isSafeInteger(input.bytes) && input.bytes >= 0, "native installed-tree byte count is invalid");
  assert.ok(Array.isArray(input.files) && input.files.length === input.file_count, "native installed-tree file count differs");

  let totalBytes = 0;
  const files = input.files.map((entry) => {
    assert.ok(entry && typeof entry === "object" && !Array.isArray(entry), "native installed-tree file entry is invalid");
    assertPortablePath(entry.path);
    assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0, `native installed-tree file size is invalid: ${entry.path}`);
    assert.match(entry.sha256 ?? "", SHA256_PATTERN, `native installed-tree file digest is invalid: ${entry.path}`);
    totalBytes += entry.bytes;
    assert.ok(Number.isSafeInteger(totalBytes), "native installed-tree byte count exceeds the safe integer range");
    return Object.freeze({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
  });
  assert.equal(totalBytes, input.bytes, "native installed-tree byte total differs");
  const sortedFiles = [...files].sort((left, right) => utf8Compare(left.path, right.path));
  assert.deepEqual(files, sortedFiles, "native installed-tree files are not UTF-8 byte sorted");
  assert.equal(new Set(files.map(({ path: filePath }) => filePath)).size, files.length, "native installed-tree paths are not unique");
  assert.equal(
    new Set(files.map(({ path: filePath }) => filePath.toUpperCase())).size,
    files.length,
    "native installed-tree paths collide under Windows case folding",
  );
  const manifest = files.map((entry) => `${entry.sha256} ${entry.bytes} ${entry.path}\n`).join("");
  assert.equal(sha256(manifest), input.content_sha256, "native installed-tree content digest differs");

  assert.ok(
    Array.isArray(input.phases) && input.phases.length === WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE.length,
    "native installed-tree fixed-point phases differ",
  );
  const phases = input.phases.map((phase, index) => {
    assert.equal(phase?.name, WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE[index]);
    assert.equal(phase?.content_sha256, input.content_sha256, `native installed-tree content changed at ${phase?.name}`);
    assert.equal(phase?.identity_sha256, input.identity_sha256, `native installed-tree identity changed at ${phase?.name}`);
    assert.equal(phase?.file_count, input.file_count, `native installed-tree file count changed at ${phase?.name}`);
    assert.equal(phase?.directory_count, input.directory_count, `native installed-tree directory count changed at ${phase?.name}`);
    assert.equal(phase?.bytes, input.bytes, `native installed-tree byte count changed at ${phase?.name}`);
    return Object.freeze({
      name: phase.name,
      content_sha256: phase.content_sha256,
      identity_sha256: phase.identity_sha256,
      file_count: phase.file_count,
      directory_count: phase.directory_count,
      bytes: phase.bytes,
    });
  });

  return Object.freeze({
    sha256: input.content_sha256,
    file_count: input.file_count,
    bytes: input.bytes,
    algorithm: DESKTOP_INSTALLED_TREE_DIGEST_ALGORITHM,
    files: Object.freeze(files),
    native: Object.freeze({
      schema_version: input.schema_version,
      filesystem: input.filesystem,
      powershell_version: input.powershell_version,
      directory_count: input.directory_count,
      identity_sha256: input.identity_sha256,
      fixed_point_sequence: WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE,
      fixed_point_exact: true,
      equality_proof: WINDOWS_INSTALLED_TREE_FIXED_POINT_EQUALITY_PROOF,
      phases: Object.freeze(phases),
      reparse_point_count: 0,
      alternate_data_stream_count: 0,
      hard_link_count: 0,
    }),
  });
}

export function captureWindowsInstalledTreeNativeSnapshot(directoryPath) {
  assert.equal(process.platform, "win32", "native installed-tree snapshot requires Windows");
  assert.equal(typeof directoryPath, "string", "native installed-tree root must be a path");
  assert.ok(directoryPath && !directoryPath.includes("\0"), "native installed-tree root must be a non-empty path");
  const stdout = execFileSync("pwsh.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    SCRIPT_PATH,
  ], {
    encoding: "utf8",
    env: { ...process.env, MATTER_INSTALLED_TREE_ROOT: path.resolve(directoryPath) },
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  return validateWindowsInstalledTreeNativeSnapshot(JSON.parse(stdout));
}
