import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE,
  WINDOWS_INSTALLED_TREE_FIXED_POINT_EQUALITY_PROOF,
  WINDOWS_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA,
  validateWindowsInstalledTreeNativeSnapshot,
} from "../lib/windows-installed-tree-native-snapshot.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fixture() {
  const files = [
    { path: "./matter.exe", bytes: 5, sha256: sha256("bytes") },
    { path: "./resources/empty.marker", bytes: 0, sha256: sha256("") },
  ];
  const contentSha256 = sha256(files.map((file) => `${file.sha256} ${file.bytes} ${file.path}\n`).join(""));
  const identitySha256 = "9".repeat(64);
  return {
    schema_version: WINDOWS_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA,
    platform: "win32",
    powershell_version: "7.2.0",
    filesystem: "NTFS",
    fixed_point_sequence: [...WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE],
    fixed_point_exact: true,
    content_sha256: contentSha256,
    identity_sha256: identitySha256,
    file_count: files.length,
    directory_count: 2,
    bytes: 5,
    reparse_point_count: 0,
    alternate_data_stream_count: 0,
    hard_link_count: 0,
    files,
    phases: WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE.map((name) => ({
      name,
      content_sha256: contentSha256,
      identity_sha256: identitySha256,
      file_count: files.length,
      directory_count: 2,
      bytes: 5,
    })),
  };
}

test("native installed-tree parser exposes portable content and only the private identity digest", () => {
  const inventory = validateWindowsInstalledTreeNativeSnapshot(fixture());
  assert.equal(inventory.sha256, fixture().content_sha256);
  assert.equal(inventory.bytes, 5);
  assert.equal(inventory.files[1].bytes, 0);
  assert.equal(inventory.native.identity_sha256, "9".repeat(64));
  assert.equal(JSON.stringify(inventory).includes("VolumeSerial"), false);
  assert.equal(JSON.stringify(inventory).includes("FileId"), false);
  assert.deepEqual(inventory.native.fixed_point_sequence, WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE);
  assert.equal(inventory.native.equality_proof, WINDOWS_INSTALLED_TREE_FIXED_POINT_EQUALITY_PROOF);
  assert.equal(inventory.native.phases.length, 5);
  assert.deepEqual(inventory.native.phases.map(({ name }) => name), WINDOWS_INSTALLED_TREE_FIXED_POINT_SEQUENCE);
});

test("native installed-tree parser rejects trust-boundary and fixed-point mutations", () => {
  const mutations = [
    ["PowerShell downgrade", (value) => { value.powershell_version = "7.1.9"; }, /PowerShell 7\.2\+/u],
    ["filesystem change", (value) => { value.filesystem = "ReFS"; }, /requires NTFS/u],
    ["reparse point", (value) => { value.reparse_point_count = 1; }, /reparse point/u],
    ["alternate data stream", (value) => { value.alternate_data_stream_count = 1; }, /alternate data stream/u],
    ["hard link", (value) => { value.hard_link_count = 1; }, /hard link/u],
    ["content mutation", (value) => { value.files[0].sha256 = "a".repeat(64); }, /content digest differs/u],
    ["noncanonical path", (value) => { value.files[0].path = "./resources/../matter.exe"; }, /not canonical/u],
    ["control path", (value) => { value.files[0].path = "./matter\u0001.exe"; }, /control character/u],
    ["trailing dot", (value) => { value.files[0].path = "./matter."; }, /trailing dot or space/u],
    ["DOS device", (value) => { value.files[0].path = "./CON.txt"; }, /DOS device name/u],
    ["Win32 alias character", (value) => { value.files[0].path = "./matter?.exe"; }, /Win32 alias character/u],
    ["identity mutation", (value) => { value.phases[3].identity_sha256 = "8".repeat(64); }, /identity changed at I2/u],
    ["phase omission", (value) => { value.phases.pop(); }, /fixed-point phases differ/u],
  ];
  for (const [label, mutate, expected] of mutations) {
    const value = fixture();
    mutate(value);
    assert.throws(() => validateWindowsInstalledTreeNativeSnapshot(value), expected, label);
  }
});

test("native scanner source pins Windows handle, metadata, ADS, Win32 names, and five-pass semantics", async () => {
  const source = await readFile(path.join(ROOT, "scripts/windows-installed-tree-native-snapshot.ps1"), "utf8");
  assert.match(source, /PowerShell 7\.2\+/u);
  assert.match(source, /installed-tree volume must be NTFS/u);
  assert.match(source, /CreateFileW/u);
  assert.match(source, /FILE_SHARE_READ/u);
  assert.match(source, /FILE_FLAG_OPEN_REPARSE_POINT/u);
  assert.match(source, /FileIdInfo/u);
  assert.match(source, /FileBasicInfo/u);
  assert.match(source, /FileStandardInfo/u);
  assert.match(source, /FileAttributeTagInfo/u);
  assert.match(source, /FileStreamInfo/u);
  assert.match(source, /ReadFile/u);
  assert.match(source, /HASH_BUFFER_BYTES = 1024 \* 1024/u);
  assert.match(source, /new string\[\] \{ "B0", "I1", "B1", "I2", "B2" \}/u);
  assert.match(source, /ContentManifest, current\.ContentManifest, StringComparison\.Ordinal/u);
  assert.match(source, /IdentityManifest, current\.IdentityManifest, StringComparison\.Ordinal/u);
  assert.match(source, /installed tree contains an alternate data stream/u);
  assert.match(source, /installed tree contains a hard-linked file/u);
  assert.match(source, /installed tree contains a non-regular device entry/u);
  assert.match(source, /installed-tree handle resolved to a non-canonical path/u);
  assert.match(source, /installed-tree entry escapes the root/u);
  assert.match(source, /installed-tree native identity changed at fixed-point phase/u);
  assert.doesNotMatch(source, /metadata\.LastAccessTime/u);
  assert.match(source, /name\.EndsWith\("\."/u);
  assert.match(source, /name\.EndsWith\(" "/u);
  assert.match(source, /name\.IndexOfAny\(new char\[\] \{ '<', '>', '"', '\|', '\?', '\*' \}\)/u);
  assert.match(source, /IsReservedDosDeviceName/u);
  assert.match(source, /String\.Equals\(stem, "CON"/u);
  assert.match(source, /stem\.StartsWith\("COM"/u);
  assert.match(source, /stem\.StartsWith\("LPT"/u);
});
