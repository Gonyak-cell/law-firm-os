import assert from "node:assert/strict";
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DESKTOP_INSTALLED_TREE_DIGEST_ALGORITHM,
  DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA,
  DESKTOP_INSTALLED_TREE_SBOM_SCHEMA,
  buildMatterDesktopInstalledTreeSbom,
  directoryFileInventory,
} from "../lib/matter-desktop-provenance.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const packageLock = JSON.parse(readFileSync(path.join(ROOT, "package-lock.json"), "utf8"));
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));

function propertyMap(sbom) {
  return Object.fromEntries(sbom.metadata.component.properties.map(({ name, value }) => [name, value]));
}

function withNativeSnapshot(inventory, identitySha256 = "9".repeat(64)) {
  const fixedPointSequence = ["B0", "I1", "B1", "I2", "B2"];
  return {
    ...inventory,
    native: {
      schema_version: DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA,
      filesystem: "NTFS",
      powershell_version: "7.2.0",
      directory_count: 3,
      identity_sha256: identitySha256,
      fixed_point_sequence: fixedPointSequence,
      fixed_point_exact: true,
      equality_proof: "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY",
      phases: fixedPointSequence.map((name) => ({
        name,
        content_sha256: inventory.sha256,
        identity_sha256: identitySha256,
        file_count: inventory.file_count,
        directory_count: 3,
        bytes: inventory.bytes,
      })),
      reparse_point_count: 0,
      alternate_data_stream_count: 0,
      hard_link_count: 0,
    },
  };
}

test("installed-tree SBOM satisfies the local CycloneDX 1.5 structural boundary and binds exact release identity", () => {
  assert.deepEqual(
    Object.keys(packageLock.packages).filter((name) => /cyclonedx/iu.test(name)),
    [],
    "a local CycloneDX schema/dependency is now available; replace structural checks with official 1.5 schema validation",
  );
  const root = mkdtempSync(path.join(tmpdir(), "matter-installed-tree-sbom-"));
  try {
    mkdirSync(path.join(root, "resources", "app"), { recursive: true });
    writeFileSync(path.join(root, "matter.exe"), "signed-executable");
    writeFileSync(path.join(root, "resources", "app", "app.asar"), "packaged-application");
    writeFileSync(path.join(root, "resources", "app", "empty.marker"), "");

    const inventory = withNativeSnapshot(directoryFileInventory(root));
    assert.equal(inventory.algorithm, DESKTOP_INSTALLED_TREE_DIGEST_ALGORITHM);
    assert.equal(inventory.file_count, 3);
    assert.equal(inventory.bytes, Buffer.byteLength("signed-executablepackaged-application"));
    assert.deepEqual(inventory.files.map(({ path: filePath }) => filePath), [
      "./matter.exe",
      "./resources/app/app.asar",
      "./resources/app/empty.marker",
    ]);

    const sbom = buildMatterDesktopInstalledTreeSbom({
      packageLock,
      desktopPackage,
      inventory,
      sourceSha: "a".repeat(40),
      sourceTree: "b".repeat(40),
      installerSha256: "c".repeat(64),
      packagedExecutableSha256: inventory.files.find(({ path: filePath }) => filePath === "./matter.exe").sha256,
      installedExecutableSha256: inventory.files.find(({ path: filePath }) => filePath === "./matter.exe").sha256,
      installedExecutableRelativePath: "./matter.exe",
      authenticodeValid: true,
      signerCertificateSha1: "E".repeat(40),
      timestampCertificateSha1s: ["F".repeat(40)],
      generatedAt: "2026-08-14T00:00:00.000Z",
    });
    assert.equal(sbom.bomFormat, "CycloneDX");
    assert.equal(sbom.specVersion, "1.5");
    assert.equal(sbom.components.filter(({ type }) => type === "file").length, 3);
    assert.equal(sbom.components.some(({ name }) => name === "electron"), true);
    assert.equal(sbom.components.some(({ name }) => name === "unpdf"), true);
    assert.equal(JSON.stringify(sbom).includes(root), false, "SBOM cannot disclose the host install path");
    const properties = propertyMap(sbom);
    assert.equal(properties["law-firm-os:schema-version"], DESKTOP_INSTALLED_TREE_SBOM_SCHEMA);
    assert.equal(properties["law-firm-os:source-sha"], "a".repeat(40));
    assert.equal(properties["law-firm-os:installer-sha256"], "c".repeat(64));
    assert.equal(properties["law-firm-os:installed-tree-sha256"], inventory.sha256);
    assert.equal(properties["law-firm-os:installed-file-content-complete"], "true");
    assert.equal(properties["law-firm-os:installed-directory-identity-complete"], "true");
    assert.equal(properties["law-firm-os:native-snapshot-schema-version"], DESKTOP_INSTALLED_TREE_NATIVE_SNAPSHOT_SCHEMA);
    assert.equal(properties["law-firm-os:native-filesystem"], "NTFS");
    assert.equal(properties["law-firm-os:native-directory-count"], "3");
    assert.equal(properties["law-firm-os:native-identity-sha256"], "9".repeat(64));
    assert.equal(properties["law-firm-os:native-fixed-point-sequence"], "B0->I1->B1->I2->B2");
    assert.equal(properties["law-firm-os:native-fixed-point-exact"], "true");
    assert.equal(properties["law-firm-os:dependency-inventory-complete"], "false");
    assert.equal(properties["law-firm-os:dependency-inventory-scope"], "direct-runtime-declarations");
    assert.equal(properties["law-firm-os:reparse-point-count"], "0");
    assert.equal(properties["law-firm-os:alternate-data-stream-count"], "0");
    assert.equal(properties["law-firm-os:authenticode-valid"], "true");
    assert.equal(properties["law-firm-os:signer-certificate-sha1"], "E".repeat(40));
    assert.equal(properties["law-firm-os:installed-executable-path"], "./matter.exe");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("installed-tree inventory rejects links and executable byte drift", () => {
  const root = mkdtempSync(path.join(tmpdir(), "matter-installed-tree-reject-"));
  const outside = mkdtempSync(path.join(tmpdir(), "matter-installed-tree-outside-"));
  const rootLink = path.join(tmpdir(), `matter-installed-tree-root-link-${process.pid}-${Date.now()}`);
  try {
    writeFileSync(path.join(outside, "outside.bin"), "outside");
    if (process.platform !== "win32") {
      symlinkSync(root, rootLink, "dir");
      assert.throws(() => directoryFileInventory(rootLink), /root cannot be a symbolic link/u);
      rmSync(rootLink);
      symlinkSync(path.join(outside, "outside.bin"), path.join(root, "linked.bin"));
      assert.throws(() => directoryFileInventory(root), /symbolic links/u);
      rmSync(path.join(root, "linked.bin"));
    }
    writeFileSync(path.join(root, "matter.exe"), "bytes");
    linkSync(path.join(root, "matter.exe"), path.join(root, "matter-copy.exe"));
    assert.throws(() => directoryFileInventory(root), /hard-linked/u);
    rmSync(path.join(root, "matter-copy.exe"));
    const inventory = withNativeSnapshot(directoryFileInventory(root));
    assert.throws(() => buildMatterDesktopInstalledTreeSbom({
      packageLock,
      desktopPackage,
      inventory,
      sourceSha: "a".repeat(40),
      sourceTree: "b".repeat(40),
      installerSha256: "c".repeat(64),
      packagedExecutableSha256: "d".repeat(64),
      installedExecutableSha256: "e".repeat(64),
      installedExecutableRelativePath: "./matter.exe",
      authenticodeValid: false,
      generatedAt: "2026-08-14T00:00:00.000Z",
    }), /installed executable bytes differ/u);
    assert.throws(() => buildMatterDesktopInstalledTreeSbom({
      packageLock,
      desktopPackage,
      inventory,
      sourceSha: "a".repeat(40),
      sourceTree: "b".repeat(40),
      installerSha256: "c".repeat(64),
      packagedExecutableSha256: inventory.files[0].sha256,
      installedExecutableSha256: inventory.files[0].sha256,
      installedExecutableRelativePath: "./missing.exe",
      authenticodeValid: true,
      signerCertificateSha1: "E".repeat(40),
      timestampCertificateSha1s: ["f".repeat(40)],
      generatedAt: "2026-08-14T00:00:00.000Z",
    }), /installed executable is missing/u);
  } finally {
    rmSync(rootLink, { force: true });
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
