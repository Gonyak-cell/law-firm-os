import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { inflateRawSync } from "node:zlib";
import {
  buildDesktopPrivateDataCorpus,
  scanDesktopPrivateDataBoundary,
} from "../lib/matter-desktop-private-data-boundary.mjs";

const VALIDATOR = fileURLToPath(new URL("../validate-matter-desktop-private-data-boundary.mjs", import.meta.url));
const FIXED_DEFLATE_ZIP = Buffer.from(
  "UEsDBBQAAAAIAAAAAACPJyX/tAAAAPDSAAATAAAAcHJpdmF0ZS1wYXlsb2FkLnR4dO3JsQmAMBAAwN5dvrGJ61h8IAgqIRHHdwb7u/Zqe8fsGeM68oxStjXu3p595FKVUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSiml1P/6AFBLAQIUABQAAAAIAAAAAACPJyX/tAAAAPDSAAATAAAAAAAAAAAAAAAAAAAAAABwcml2YXRlLXBheWxvYWQudHh0UEsFBgAAAAABAAEAQQAAAOUAAAAAAA==",
  "base64",
);
const CLEAN_CONTACT_ENV = Object.freeze({
  ...process.env,
  LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH: "",
});

function write(targetPath, contents) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, contents);
  return targetPath;
}

function fixedZipPayload(archive) {
  assert.equal(archive.readUInt32LE(0), 0x04034b50);
  assert.equal(archive.readUInt16LE(8), 8);
  const compressedSize = archive.readUInt32LE(18);
  const nameLength = archive.readUInt16LE(26);
  const extraLength = archive.readUInt16LE(28);
  const offset = 30 + nameLength + extraLength;
  return inflateRawSync(archive.subarray(offset, offset + compressedSize));
}

async function withFixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "matter-private-data-boundary-"));
  const protectedValues = Object.freeze({
    displayName: "Boundary Person 7782",
    employeeId: "employee-private-7782",
    userId: "user-private-7782",
    email: "private-7782@example.invalid",
    phone: "+82-10-7782-4400",
    tenantId: "tenant-private-7782",
    token: "fixture-token-7782-private",
    title: "Boundary Counsel 7782",
    startDate: "2024-07-17",
    affiliation: "Boundary Law Group 7782",
    department: "Boundary Disputes 7782",
    organizationGroup: "Boundary Professionals 7782",
    orgUnitId: "org-unit-private-7782",
    profilePractice: "Boundary Quantum Litigation 7782",
    profileEducation: "Boundary University 7782",
    profileShort: "LLM",
  });
  const ruleValues = Object.freeze({
    shortSensitive: "OU42",
    exactThreshold: "abcdefghijklmn",
    belowLengthThreshold: "abcdefghijklm",
    belowEntropyThreshold: "aaaaaaaaaaaaab",
  });
  const sources = {
    roster: write(path.join(root, "sources/roster.json"), `${JSON.stringify({
      tenant_id: protectedValues.tenantId,
      members: [{
        display_name: protectedValues.displayName,
        legal_name: protectedValues.displayName,
        employee_id: protectedValues.employeeId,
        user_id: protectedValues.userId,
        work_email: protectedValues.email,
        title: protectedValues.title,
        start_date: protectedValues.startDate,
        affiliation: protectedValues.affiliation,
        department: protectedValues.department,
        organization_group: protectedValues.organizationGroup,
        org_unit_id: protectedValues.orgUnitId,
        status: "active",
        professional_profile: {
          practice_areas: [protectedValues.profilePractice],
          education: [protectedValues.profileEducation],
          qualifications: [protectedValues.profileShort],
        },
      }, {
        org_unit_id: ruleValues.shortSensitive,
        title: ruleValues.exactThreshold,
        department: ruleValues.belowLengthThreshold,
        affiliation: ruleValues.belowEntropyThreshold,
      }],
    })}\n`),
    contact: write(path.join(root, "sources/contact.json"), `${JSON.stringify({
      contacts: [{ work_email: protectedValues.email, mobile_phone: protectedValues.phone }],
    })}\n`),
    registrationSeed: write(path.join(root, "sources/registration-seed.json"), `${JSON.stringify({
      tenant_id: protectedValues.tenantId,
      source: { sha256: "d".repeat(64), workbook: "private-registration-source.xlsx" },
      users: [{
        user_id: protectedValues.userId,
        email: protectedValues.email,
        display_name: protectedValues.displayName,
        local_dev: { clientSecret: protectedValues.token },
      }],
    })}\n`),
    photos: path.join(root, "sources/photos"),
  };
  const photoBytes = Buffer.from([0, 255, 33, 78, 120, 1, 2, 3, 222, 19, 44, 55]);
  write(path.join(sources.photos, "member.png"), photoBytes);
  try {
    const corpus = await buildDesktopPrivateDataCorpus({
      rosterSourcePath: sources.roster,
      contactSourcePath: sources.contact,
      registrationSeedSourcePath: sources.registrationSeed,
      photoSourcePath: sources.photos,
    });
    return await run({ root, protectedValues, ruleValues, sources, photoBytes, corpus });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function scan(root, bundleRoot, corpus) {
  return scanDesktopPrivateDataBoundary({ roots: [bundleRoot], corpus, displayBase: root });
}

function sourceArgs(sources, { contact = "source", contactPath = sources.contact } = {}) {
  const args = [
    "--roster-source", sources.roster,
    "--registration-seed-source", sources.registrationSeed,
    "--photo-source", sources.photos,
  ];
  if (contact === "source") args.push("--contact-source", contactPath);
  if (contact === "not_applicable") args.push("--contact-source-not-applicable");
  return args;
}

function cliArgs(sources, roots, options) {
  return [
    VALIDATOR,
    ...roots.flatMap((root) => ["--root", root]),
    ...sourceArgs(sources, options),
  ];
}

test("RFD-TUW-006 detects expanded roster, contact, seed, and camelCase credential values", () => withFixture(async ({
  root, protectedValues, ruleValues, corpus,
}) => {
  const bundleRoot = path.join(root, "bad-text-bundle");
  write(path.join(bundleRoot, "resources/app/main.js"), Object.values(protectedValues).join("\n"));
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  const findings = new Map(result.findings.map((finding) => [finding.kind, finding]));
  assert.ok(findings.get("roster_protected_value").count >= 12);
  assert.ok(findings.get("contact_protected_value").count >= 2);
  assert.ok(findings.get("registration_seed_protected_value").count >= 3);
  assert.equal(findings.get("credential_protected_value").count, 1);
  assert.equal(result.contact_corpus_status, "loaded");
  assert.equal(result.contact_protected_value_count, 2);
  for (const finding of result.findings) {
    assert.deepEqual(new Set(Object.keys(finding)), new Set(["count", "kind", "path"]));
  }

  const ruleRoot = path.join(root, "shared-corpus-rule-bundle");
  const ruleProbe = path.join(ruleRoot, "probe.bin");
  for (const value of [ruleValues.shortSensitive, ruleValues.exactThreshold]) {
    write(ruleProbe, value);
    const protectedResult = await scan(root, ruleRoot, corpus);
    assert.equal(protectedResult.verdict, "FAIL");
    assert.equal(protectedResult.findings.some(({ kind }) => kind === "roster_protected_value"), true);
  }
  for (const value of [ruleValues.belowLengthThreshold, ruleValues.belowEntropyThreshold]) {
    write(ruleProbe, value);
    const excludedResult = await scan(root, ruleRoot, corpus);
    assert.equal(excludedResult.verdict, "PASS");
    assert.deepEqual(excludedResult.findings, []);
  }
}));

test("RFD-TUW-006 detects a renamed private photo by whole-file SHA-256", () => withFixture(async ({
  root, photoBytes, corpus,
}) => {
  const bundleRoot = path.join(root, "renamed-photo-bundle");
  write(path.join(bundleRoot, "resources/app/assets/brand-logo.bin"), photoBytes);
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.deepEqual(result.findings, [{
    kind: "private_photo_hash",
    path: "renamed-photo-bundle/resources/app/assets/brand-logo.bin",
    count: 1,
  }]);
}));

test("RFD-TUW-006 detects forbidden private runtime and credential path basenames", () => withFixture(async ({
  root, corpus,
}) => {
  const bundleRoot = path.join(root, "forbidden-path-bundle");
  mkdirSync(path.join(bundleRoot, "resources/app/runtime"), { recursive: true });
  write(path.join(bundleRoot, "resources/app/config/credentials.json"), "{}\n");
  write(path.join(bundleRoot, "resources/app/hrx-member-roster-source-of-truth.json"), "{}\n");
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.deepEqual(new Set(result.findings.map(({ kind }) => kind)), new Set([
    "credential_private_path",
    "private_runtime_path",
    "roster_private_path",
  ]));
}));

test("RFD-TUW-006 detects protected bytes inside fake ZIP and DMG binaries", () => withFixture(async ({
  root, protectedValues, corpus,
}) => {
  const bundleRoot = path.join(root, "fake-archive-bundle");
  write(path.join(bundleRoot, "matter.zip"), Buffer.concat([
    Buffer.from([80, 75, 3, 4, 0]), Buffer.from(protectedValues.phone), Buffer.from([0, 1]),
  ]));
  write(path.join(bundleRoot, "matter.dmg"), Buffer.concat([
    Buffer.from([120, 1, 99]), Buffer.from(protectedValues.token), Buffer.from([2, 3]),
  ]));
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.findings.some(({ kind, path: findingPath }) =>
    kind === "contact_protected_value" && findingPath.endsWith("matter.zip")), true);
  assert.equal(result.findings.some(({ kind, path: findingPath }) =>
    kind === "credential_protected_value" && findingPath.endsWith("matter.dmg")), true);
  assert.equal(result.findings.filter(({ kind }) => kind === "uninspected_archive_container").length, 2);
}));

test("RFD-TUW-006 rejects a portable real deflate ZIP whose private bytes are not raw-visible", () => withFixture(async ({
  root, protectedValues, corpus,
}) => {
  assert.equal(FIXED_DEFLATE_ZIP.indexOf(Buffer.from(protectedValues.token)), -1);
  assert.equal(fixedZipPayload(FIXED_DEFLATE_ZIP).includes(Buffer.from(protectedValues.token)), true);
  const bundleRoot = path.join(root, "compressed-archive-bundle");
  write(path.join(bundleRoot, "matter-formal.zip"), FIXED_DEFLATE_ZIP);
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.deepEqual(result.findings, [{
    kind: "uninspected_archive_container",
    path: "compressed-archive-bundle/matter-formal.zip",
    count: 1,
  }]);
}));

test("RFD-TUW-006 recognizes space and hyphen Windows installers but not matter.exe", () => withFixture(async ({
  root, corpus,
}) => {
  const bundleRoot = path.join(root, "windows-installer-bundle");
  write(path.join(bundleRoot, "Matter Setup 0.1.17.exe"), FIXED_DEFLATE_ZIP);
  write(path.join(bundleRoot, "matter-internal-0.1.17-win-x64.exe"), FIXED_DEFLATE_ZIP);
  write(path.join(bundleRoot, "expanded/matter.exe"), Buffer.from([77, 90, 0, 1, 2, 3]));
  const result = await scan(root, bundleRoot, corpus);
  const archiveFindings = result.findings.filter(({ kind }) => kind === "uninspected_archive_container");
  assert.equal(result.verdict, "FAIL");
  assert.equal(archiveFindings.length, 2);
  assert.equal(archiveFindings.some(({ path: findingPath }) => findingPath.endsWith("Matter Setup 0.1.17.exe")), true);
  assert.equal(archiveFindings.some(({ path: findingPath }) => findingPath.endsWith("matter-internal-0.1.17-win-x64.exe")), true);
  assert.equal(result.findings.some(({ path: findingPath }) => findingPath.endsWith("expanded/matter.exe")), false);
}));

test("RFD-TUW-006 replaces protected roster and contact path values with opaque identifiers", () => withFixture(async ({
  root, protectedValues, corpus,
}) => {
  const bundleRoot = path.join(root, "protected-path-bundle");
  write(path.join(bundleRoot, `${protectedValues.displayName}.zip`), "unrelated\n");
  write(path.join(bundleRoot, `${protectedValues.phone}.msi`), "unrelated\n");
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.findings.length, 2);
  assert.equal(result.findings.every(({ path: findingPath }) => /^\[redacted-path-\d+\]$/u.test(findingPath)), true);
  const logged = JSON.stringify(result);
  assert.equal(logged.includes(protectedValues.displayName), false);
  assert.equal(logged.includes(protectedValues.phone), false);
}));

test("RFD-TUW-006 accepts an unrelated formal-like tree and generic status", () => withFixture(async ({ root, corpus }) => {
  const bundleRoot = path.join(root, "formal-like-bundle");
  write(path.join(bundleRoot, "resources/app/src/renderer/web/index.html"), "<!doctype html><div id=\"root\">active</div>\n");
  write(path.join(bundleRoot, "resources/matter-build-manifest.json"), `${JSON.stringify({
    channel: "formal",
    source_sha: "a".repeat(40),
    source_dirty: false,
    status: "active",
  })}\n`);
  const result = await scan(root, bundleRoot, corpus);
  assert.deepEqual(result, {
    verdict: "PASS",
    root_count: 1,
    scanned_file_count: 2,
    finding_count: 0,
    contact_corpus_status: "loaded",
    contact_protected_value_count: 2,
    findings: [],
  });
}));

test("RFD-TUW-006 is deterministic across repeats and requested-root order", () => withFixture(async ({
  root, protectedValues, corpus,
}) => {
  const firstRoot = path.join(root, "deterministic-a");
  const secondRoot = path.join(root, "deterministic-b");
  write(path.join(firstRoot, `${protectedValues.displayName}.zip`), "unrelated\n");
  mkdirSync(path.join(secondRoot, "runtime"), { recursive: true });
  const scanRoots = (roots) => scanDesktopPrivateDataBoundary({ roots, corpus, displayBase: root });
  const first = await scanRoots([secondRoot, firstRoot]);
  const second = await scanRoots([firstRoot, secondRoot]);
  const repeated = await scanRoots([secondRoot, firstRoot]);
  assert.deepEqual(first, second);
  assert.deepEqual(first, repeated);
  assert.equal(first.root_count, 2);
}));

test("RFD-TUW-006 detects a protected value crossing a stream chunk boundary", () => withFixture(async ({
  root, protectedValues, corpus,
}) => {
  const token = Buffer.from(protectedValues.token);
  const prefix = Buffer.alloc((64 * 1024) - Math.floor(token.length / 2), 65);
  const bundleRoot = path.join(root, "chunk-boundary-bundle");
  write(path.join(bundleRoot, "boundary.bin"), Buffer.concat([prefix, token, Buffer.from([0, 1, 2])]));
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.findings.some(({ kind }) => kind === "credential_protected_value"), true);
}));

test("RFD-TUW-006 scans a requested root symlink target instead of returning zero-file PASS", () => withFixture(async ({
  root, protectedValues, corpus,
}) => {
  const targetRoot = path.join(root, "root-symlink-target");
  write(path.join(targetRoot, "private.txt"), protectedValues.token);
  const requestedRoot = path.join(root, "requested-root-link");
  symlinkSync("root-symlink-target", requestedRoot, "dir");
  const result = await scan(root, requestedRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.scanned_file_count, 1);
  assert.equal(result.findings.some(({ kind, path: findingPath }) =>
    kind === "credential_protected_value" && findingPath.includes("requested-root-link/private.txt")), true);

  const emptyTarget = path.join(root, "empty-root-symlink-target");
  mkdirSync(emptyTarget, { recursive: true });
  const emptyRequestedRoot = path.join(root, "empty-requested-root-link");
  symlinkSync("empty-root-symlink-target", emptyRequestedRoot, "dir");
  const emptyResult = await scan(root, emptyRequestedRoot, corpus);
  assert.equal(emptyResult.verdict, "FAIL");
  assert.equal(emptyResult.findings.some(({ kind }) => kind === "empty_scan_root"), true);
}));

test("RFD-TUW-006 follows in-root file and directory symlinks exactly once", () => withFixture(async ({
  root, protectedValues, corpus,
}) => {
  const fileRoot = path.join(root, "file-symlink-bundle");
  write(path.join(fileRoot, "z-private.txt"), protectedValues.token);
  symlinkSync("z-private.txt", path.join(fileRoot, "a-linked.txt"), "file");
  const directoryRoot = path.join(root, "directory-symlink-bundle");
  write(path.join(directoryRoot, "z-target/private.txt"), protectedValues.phone);
  symlinkSync("z-target", path.join(directoryRoot, "a-alias"), "dir");
  const result = await scanDesktopPrivateDataBoundary({
    roots: [fileRoot, directoryRoot],
    corpus,
    displayBase: root,
  });
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.scanned_file_count, 2);
  assert.equal(result.findings.some(({ path: findingPath }) => findingPath.endsWith("a-linked.txt")), true);
  assert.equal(result.findings.some(({ path: findingPath }) => findingPath.endsWith("a-alias/private.txt")), true);
}));

test("RFD-TUW-006 rejects out-of-root symlink targets without scanning them", () => withFixture(async ({
  root, protectedValues, corpus,
}) => {
  write(path.join(root, "outside-target/private.txt"), protectedValues.token);
  const bundleRoot = path.join(root, "out-of-root-bundle");
  mkdirSync(bundleRoot, { recursive: true });
  symlinkSync("../outside-target/private.txt", path.join(bundleRoot, "external-link.txt"), "file");
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.scanned_file_count, 0);
  assert.deepEqual(result.findings, [{
    kind: "out_of_root_symlink",
    path: "out-of-root-bundle/external-link.txt",
    count: 1,
  }]);
}));

test("RFD-TUW-006 rejects broken internal and requested-root symlinks", () => withFixture(async ({
  root, corpus,
}) => {
  const bundleRoot = path.join(root, "broken-symlink-bundle");
  mkdirSync(bundleRoot, { recursive: true });
  symlinkSync("missing.txt", path.join(bundleRoot, "broken.txt"), "file");
  const brokenRoot = path.join(root, "broken-requested-root");
  symlinkSync("missing-root", brokenRoot, "dir");
  const result = await scanDesktopPrivateDataBoundary({
    roots: [bundleRoot, brokenRoot],
    corpus,
    displayBase: root,
  });
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.scanned_file_count, 0);
  assert.equal(result.findings.filter(({ kind }) => kind === "broken_symlink").length, 2);
}));

test("RFD-TUW-006 rejects a symlink loop with an explicit finding", () => withFixture(async ({ root, corpus }) => {
  const bundleRoot = path.join(root, "loop-symlink-bundle");
  mkdirSync(bundleRoot, { recursive: true });
  symlinkSync(".", path.join(bundleRoot, "loop"), "dir");
  const result = await scan(root, bundleRoot, corpus);
  assert.equal(result.verdict, "FAIL");
  assert.deepEqual(result.findings, [{
    kind: "symlink_loop",
    path: "loop-symlink-bundle/loop",
    count: 1,
  }]);
}));

test("RFD-TUW-006 accepts ordinary in-root macOS framework symlink aliases", () => withFixture(async ({
  root, corpus,
}) => {
  const frameworkRoot = path.join(root, "framework-bundle/MatterKit.framework");
  write(path.join(frameworkRoot, "Versions/A/MatterKit"), "framework-binary\n");
  write(path.join(frameworkRoot, "Versions/A/Resources/Info.plist"), "unrelated\n");
  symlinkSync("A", path.join(frameworkRoot, "Versions/Current"), "dir");
  symlinkSync("Versions/Current/MatterKit", path.join(frameworkRoot, "MatterKit"), "file");
  symlinkSync("Versions/Current/Resources", path.join(frameworkRoot, "Resources"), "dir");
  const result = await scan(root, path.join(root, "framework-bundle"), corpus);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.scanned_file_count, 2);
}));

test("RFD-TUW-006 CLI exits nonzero without printing protected values, hashes, or paths", () => withFixture(async ({
  root, protectedValues, sources, photoBytes,
}) => {
  const bundleRoot = path.join(root, protectedValues.email, "cli-bad-bundle");
  write(path.join(bundleRoot, "resources/app/archive.bin"), Buffer.concat([
    Buffer.from(protectedValues.token), photoBytes,
  ]));
  const result = spawnSync(process.execPath, cliArgs(sources, [bundleRoot]), {
    encoding: "utf8",
    env: CLEAN_CONTACT_ENV,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.verdict, "FAIL");
  assert.equal(receipt.contact_corpus_status, "loaded");
  assert.equal(receipt.contact_protected_value_count, 2);
  const logged = `${result.stdout}${result.stderr}`;
  for (const protectedValue of Object.values(protectedValues)) assert.equal(logged.includes(protectedValue), false);
  assert.equal(logged.includes(createHash("sha256").update(photoBytes).digest("hex")), false);
  assert.equal(receipt.findings.every(({ path: findingPath }) => /^\[redacted-path-\d+\]$/u.test(findingPath)), true);
}));

test("RFD-TUW-006 CLI exits zero for an explicit-authority clean tree", () => withFixture(async ({
  root, sources,
}) => {
  const bundleRoot = path.join(root, "cli-formal-clean");
  write(path.join(bundleRoot, "resources/app/index.js"), "export const channel = 'formal';\n");
  const result = spawnSync(process.execPath, cliArgs(sources, [bundleRoot]), {
    encoding: "utf8",
    env: CLEAN_CONTACT_ENV,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.verdict, "PASS");
  assert.equal(receipt.contact_corpus_status, "loaded");
  assert.equal(receipt.contact_protected_value_count, 2);
}));

test("RFD-TUW-006 requires one contact authority and rejects malformed or conflicting input", () => withFixture(async ({
  root, sources,
}) => {
  await assert.rejects(
    buildDesktopPrivateDataCorpus({
      rosterSourcePath: sources.roster,
      registrationSeedSourcePath: sources.registrationSeed,
      photoSourcePath: sources.photos,
    }),
    ({ kind }) => kind === "missing_contact_source_authority",
  );
  const notApplicable = await buildDesktopPrivateDataCorpus({
    rosterSourcePath: sources.roster,
    contactSourceNotApplicable: true,
    registrationSeedSourcePath: sources.registrationSeed,
    photoSourcePath: sources.photos,
  });
  assert.equal(notApplicable.contact_corpus_status, "not_applicable");
  assert.equal(notApplicable.contact_protected_value_count, 0);

  const bundleRoot = path.join(root, "contact-authority-bundle");
  write(path.join(bundleRoot, "clean.js"), "unrelated\n");
  const notApplicableCli = spawnSync(process.execPath, cliArgs(sources, [bundleRoot], {
    contact: "not_applicable",
  }), { encoding: "utf8", env: CLEAN_CONTACT_ENV });
  assert.equal(notApplicableCli.status, 0);
  assert.equal(JSON.parse(notApplicableCli.stdout).contact_corpus_status, "not_applicable");

  const missing = spawnSync(process.execPath, cliArgs(sources, [bundleRoot], { contact: "missing" }), {
    encoding: "utf8",
    env: CLEAN_CONTACT_ENV,
  });
  assert.equal(missing.status, 2);
  assert.equal(JSON.parse(missing.stderr).findings[0].kind, "missing_contact_source_authority");

  const conflictArgs = cliArgs(sources, [bundleRoot]);
  conflictArgs.push("--contact-source-not-applicable");
  const conflict = spawnSync(process.execPath, conflictArgs, { encoding: "utf8", env: CLEAN_CONTACT_ENV });
  assert.equal(conflict.status, 2);
  assert.equal(JSON.parse(conflict.stderr).findings[0].kind, "conflicting_contact_source_authority");

  const malformedContact = write(path.join(root, "sources/malformed-contact.json"), "{not-json\n");
  const malformed = spawnSync(process.execPath, cliArgs(sources, [bundleRoot], {
    contactPath: malformedContact,
  }), { encoding: "utf8", env: CLEAN_CONTACT_ENV });
  assert.equal(malformed.status, 2);
  assert.equal(JSON.parse(malformed.stderr).findings[0].kind, "invalid_contact_json");
}));

test("RFD-TUW-006 CLI fails closed when a requested scan root is missing", () => withFixture(async ({
  root, sources,
}) => {
  const missingRoot = path.join(root, "missing-bundle");
  const result = spawnSync(process.execPath, cliArgs(sources, [missingRoot]), {
    encoding: "utf8",
    env: CLEAN_CONTACT_ENV,
  });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  const receipt = JSON.parse(result.stderr);
  assert.equal(receipt.verdict, "FAIL");
  assert.deepEqual(receipt.findings, [{
    kind: "missing_scan_root",
    path: path.relative(process.cwd(), missingRoot).replaceAll(path.sep, "/"),
    count: 1,
  }]);
}));
