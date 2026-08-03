import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES,
  buildDesktopPrivateDataCorpus,
  desktopPrivateDataCorpusNeedles,
} from "../lib/matter-desktop-private-data-corpus.mjs";
import { scanDesktopPrivateDataBoundary } from "../lib/matter-desktop-private-data-boundary.mjs";
import { AMIC_CURRENT_CLIENT_CANDIDATES } from "../../packages/master-data/src/amic-client-candidates.js";
import {
  AMIC_CURRENT_MATTER_CLIENTS,
  AMIC_CURRENT_MATTER_CODE_CANDIDATES,
} from "../../packages/matter/src/amic-matter-code-candidates.js";

const VALIDATOR = fileURLToPath(new URL("../validate-public-renderer-no-hrx-roster-pii.mjs", import.meta.url));
const ARTIFACT_VALIDATOR = fileURLToPath(new URL("../validate-matter-desktop-private-data-boundary.mjs", import.meta.url));

function write(targetPath, contents) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, contents);
  return targetPath;
}

async function withFixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "public-renderer-private-data-"));
  const values = Object.freeze({
    displayName: "Renderer Boundary Person 8028",
    employeeId: "employee-renderer-private-8028",
    userId: "user-renderer-private-8028",
    email: "renderer-private-8028@example.invalid",
    phone: "+82-10-8028-1199",
    tenantId: "tenant-renderer-private-8028",
    credential: "renderer-private-token-8028",
    title: "Renderer Boundary Counsel 8028",
    startDate: "2026-07-30",
    affiliation: "Renderer Boundary Law Group 8028",
    department: "Renderer Boundary Disputes 8028",
    organizationGroup: "Renderer Boundary Professionals 8028",
    orgUnitId: "org-unit-renderer-private-8028",
    profilePractice: "Renderer Quantum Litigation 8028",
    profileEducation: "Renderer Boundary University 8028",
    profileQualification: "Renderer LLM 8028",
    registrationSheet: "Renderer Private Sheet 8028",
    registrationWorkbook: "renderer-private-workbook-8028.xlsx",
  });
  const ruleValues = Object.freeze({
    shortSensitive: "OU42",
    exactThreshold: "abcdefghijklmn",
    belowLengthThreshold: "abcdefghijklm",
    belowEntropyThreshold: "aaaaaaaaaaaaab",
  });
  const sources = {
    roster: write(path.join(root, "sources/roster.json"), `${JSON.stringify({
      tenant_id: values.tenantId,
      members: [{
        display_name: values.displayName,
        legal_name: values.displayName,
        employee_id: values.employeeId,
        user_id: values.userId,
        work_email: values.email,
        title: values.title,
        start_date: values.startDate,
        affiliation: values.affiliation,
        department: values.department,
        organization_group: values.organizationGroup,
        org_unit_id: values.orgUnitId,
        professional_profile: {
          practice_areas: [values.profilePractice],
          education: [values.profileEducation],
          qualifications: [values.profileQualification],
        },
      }, {
        org_unit_id: ruleValues.shortSensitive,
        title: ruleValues.exactThreshold,
        department: ruleValues.belowLengthThreshold,
        affiliation: ruleValues.belowEntropyThreshold,
      }],
    })}\n`),
    contact: write(path.join(root, "sources/contact.json"), `${JSON.stringify({
      contacts: [{ tenant_id: values.tenantId, work_email: values.email, mobile_phone: values.phone }],
    })}\n`),
    registrationSeed: write(path.join(root, "sources/registration-seed.json"), `${JSON.stringify({
      tenant_id: values.tenantId,
      source: { sheet: values.registrationSheet, workbook: values.registrationWorkbook },
      users: [{
        user_id: values.userId,
        email: values.email,
        client_secret: values.credential,
      }],
    })}\n`),
    photos: path.join(root, "sources/photos"),
  };
  const photoBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x80, 0x28, 0x02, 0x08]);
  write(path.join(sources.photos, "private-photo.png"), photoBytes);
  write(path.join(root, "apps/web/dist/index.html"), "<!doctype html><div id=\"root\"></div>\n");
  write(path.join(root, "apps/desktop/src/renderer/web/index.html"), "<!doctype html><div id=\"root\"></div>\n");
  try {
    return await run({ root, values, ruleValues, sources, photoBytes });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function validatorEnvironment(sources, { contact = "source", extra = {} } = {}) {
  return {
    ...process.env,
    LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: sources.roster,
    LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH: contact === "source" ? sources.contact : "",
    LAWOS_MATTER_VAULT_USER_REGISTRATION_SEED_PATH: sources.registrationSeed,
    LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH: sources.photos,
    LAWOS_HRX_MEMBER_CONTACT_SOURCE_NOT_APPLICABLE: "",
    LAWOS_HRX_MEMBER_CONTACT_SOURCE_NOT_APPLICABLE_REASON: "",
    ...extra,
  };
}

function runValidator(root, sources, { args = [], contact = "source", extraEnvironment = {} } = {}) {
  return spawnSync(process.execPath, [VALIDATOR, ...args], {
    cwd: root,
    encoding: "utf8",
    env: validatorEnvironment(sources, { contact, extra: extraEnvironment }),
  });
}

function runArtifactValidator(root, sources) {
  return spawnSync(process.execPath, [
    ARTIFACT_VALIDATOR,
    "--root", path.join(root, "apps/web/dist"),
    "--root", path.join(root, "apps/desktop/src/renderer/web"),
    "--roster-source", sources.roster,
    "--contact-source", sources.contact,
    "--registration-seed-source", sources.registrationSeed,
    "--photo-source", sources.photos,
  ], { cwd: root, encoding: "utf8", env: validatorEnvironment(sources) });
}

function receipt(result) {
  return JSON.parse((result.stdout.trim() || result.stderr.trim()));
}

test("RFD-TUW-008 accepts a clean generated renderer fixture deterministically", () => withFixture(({
  root, values, sources,
}) => {
  const first = runValidator(root, sources);
  const second = runValidator(root, sources);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const parsed = receipt(first);
  assert.equal(parsed.verdict, "PASS");
  assert.equal(parsed.renderer_root_count, 2);
  assert.equal(parsed.expected_renderer_root_count, 2);
  assert.equal(parsed.scanned_files, 2);
  assert.equal(parsed.finding_count, 0);
  assert.equal(parsed.scanner_finding_count, 0);
  assert.equal(parsed.omitted_directories, 0);
  assert.ok(parsed.protected_value_count >= Object.keys(values).length);
  assert.equal(parsed.protected_photo_count, 1);
  assert.equal(parsed.contact_corpus_status, "loaded");
  assert.equal(parsed.contact_protected_value_count, 3);
  assert.equal(parsed.contact_authority_reason_recorded, false);
  assert.equal(parsed.release_claim_eligible, true);
  assert.equal(parsed.scanner_corpus_shared, true);
  assert.equal(parsed.protected_values_printed, false);
  assert.deepEqual(parsed.findings, []);
}));

test("RFD-TUW-008 gives every shared corpus entry and photo the artifact scanner verdict", () => withFixture(async ({
  root, values, ruleValues, sources, photoBytes,
}) => {
  const corpus = await buildDesktopPrivateDataCorpus({
    rosterSourcePath: sources.roster,
    contactSourcePath: sources.contact,
    registrationSeedSourcePath: sources.registrationSeed,
    photoSourcePath: sources.photos,
  });
  const needles = desktopPrivateDataCorpusNeedles(corpus);
  assert.ok(needles.length > 0);
  assert.deepEqual(new Set(needles.map(({ kind }) => kind)), new Set([
    "contact_protected_value",
    "credential_protected_value",
    "registration_seed_protected_value",
    "roster_protected_value",
  ]));

  const probe = path.join(root, "apps/web/dist/assets/corpus-parity.bin");
  for (const { bytes } of needles) {
    write(probe, bytes);
    const artifact = runArtifactValidator(root, sources);
    const renderer = runValidator(root, sources);
    assert.equal(artifact.status, 1, artifact.stderr);
    assert.equal(renderer.status, 1, renderer.stderr);
    const artifactReceipt = receipt(artifact);
    const rendererReceipt = receipt(renderer);
    assert.equal(rendererReceipt.scanner_finding_count, artifactReceipt.finding_count);
    assert.deepEqual(
      rendererReceipt.findings.map(({ kind, count }) => ({ kind, count })),
      artifactReceipt.findings.map(({ kind, count }) => ({ kind, count })),
    );
    rmSync(probe);
  }

  write(probe, photoBytes);
  const artifactPhoto = runArtifactValidator(root, sources);
  const rendererPhoto = runValidator(root, sources);
  assert.equal(artifactPhoto.status, 1, artifactPhoto.stderr);
  assert.equal(rendererPhoto.status, 1, rendererPhoto.stderr);
  assert.deepEqual(
    receipt(rendererPhoto).findings.map(({ kind, count }) => ({ kind, count })),
    receipt(artifactPhoto).findings.map(({ kind, count }) => ({ kind, count })),
  );
  const output = `${rendererPhoto.stdout}${rendererPhoto.stderr}`;
  for (const value of Object.values(values)) assert.equal(output.includes(value), false);
  assert.equal(output.includes(createHash("sha256").update(photoBytes).digest("hex")), false);

  for (const [value, kind] of [
    [values.orgUnitId, "roster_protected_value"],
    [values.phone, "contact_protected_value"],
    [values.credential, "credential_protected_value"],
    [ruleValues.shortSensitive, "roster_protected_value"],
    [ruleValues.exactThreshold, "roster_protected_value"],
  ]) {
    write(probe, value);
    const artifact = runArtifactValidator(root, sources);
    const renderer = runValidator(root, sources);
    assert.equal(artifact.status, 1, artifact.stderr);
    assert.equal(renderer.status, 1, renderer.stderr);
    assert.equal(receipt(artifact).findings.some((finding) => finding.kind === kind), true);
    assert.equal(receipt(renderer).findings.some((finding) => finding.kind === kind), true);
  }
  for (const value of [ruleValues.belowLengthThreshold, ruleValues.belowEntropyThreshold]) {
    write(probe, value);
    const artifact = runArtifactValidator(root, sources);
    const renderer = runValidator(root, sources);
    assert.equal(artifact.status, 0, artifact.stderr);
    assert.equal(renderer.status, 0, renderer.stderr);
    assert.deepEqual(receipt(artifact).findings, []);
    assert.deepEqual(receipt(renderer).findings, []);
  }
}));

test("RFD-TUW-008 preserves authoritative Client and Matter needles while excluding 36 generic pairs", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "public-renderer-candidate-corpus-"));
  try {
    const corpus = await buildDesktopPrivateDataCorpus({
      rosterSourcePath: DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster,
      contactSourceNotApplicable: true,
      registrationSeedSourcePath: DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.registrationSeed,
      photoSourcePath: DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.photos,
      clientCandidateSourcePath: "packages/master-data/src/amic-client-candidates.js",
      matterCandidateSourcePath: "packages/matter/src/amic-matter-code-candidates.js",
    });
    const needles = desktopPrivateDataCorpusNeedles(corpus);
    const byKind = new Map();
    for (const { kind, bytes } of needles) {
      if (!byKind.has(kind)) byKind.set(kind, new Set());
      byKind.get(kind).add(bytes.toString("hex"));
    }
    const candidateCases = [
      ["client_candidate_protected_value", AMIC_CURRENT_CLIENT_CANDIDATES,
        ["canonical_display_name", "display_name"], 99, 100],
      ["matter_client_candidate_protected_value", AMIC_CURRENT_MATTER_CLIENTS,
        ["canonical_display_name", "client_display_name", "client_id", "client_short_name"], 198, 200],
      ["matter_candidate_protected_value", AMIC_CURRENT_MATTER_CODE_CANDIDATES,
        ["client_display_name", "client_id", "client_short_name", "matter_code", "matter_id", "matter_name", "matter_number"], 636, 818],
    ];
    for (const [kind, records, keys, expectedSensitiveCount, expectedNeedleCount] of candidateCases) {
      const expected = new Set(records.flatMap((record) => keys.map((key) => record[key]))
        .filter((value) => (typeof value === "string" || typeof value === "number")
          && Buffer.byteLength(String(value).trim()) >= 4)
        .map((value) => Buffer.from(String(value).trim()).toString("hex")));
      const actual = byKind.get(kind) ?? new Set();
      assert.equal(expected.size, expectedSensitiveCount);
      assert.equal([...expected].filter((value) => !actual.has(value)).length, 0);
      assert.equal(actual.size, expectedNeedleCount);
    }
    assert.equal(corpus.candidate_corpus_status, "loaded");
    assert.equal(corpus.client_candidate_record_count, 99);
    assert.equal(corpus.matter_client_candidate_record_count, 99);
    assert.equal(corpus.matter_candidate_record_count, 148);
    assert.equal(corpus.protected_value_count, 1287);
    assert.equal(corpus.protected_photo_count, 5);

    const roster = JSON.parse(readFileSync(DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster, "utf8"));
    const registration = JSON.parse(readFileSync(DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.registrationSeed, "utf8"));
    const genericValues = [
      roster.members[0].affiliation,
      roster.members[0].department,
      roster.members[0].professional_profile.public_role_labels[2],
      roster.members[0].professional_profile.practice_areas[1],
      roster.members[0].professional_profile.source_refs[0].source_priority,
      roster.members[1].professional_profile.profile_kind,
      roster.members[2].professional_profile.practice_areas[1],
      roster.members[3].affiliation,
      roster.members[3].department,
      roster.members[3].professional_profile.profile_kind,
      roster.members[7].professional_profile.public_role_labels[1],
      roster.members[8].department,
      roster.members[9].title,
      registration.source.sheet,
    ];
    const genericHex = new Set(genericValues.map((value) => Buffer.from(String(value).trim()).toString("hex")));
    const retainedHex = new Set(needles.map(({ bytes }) => bytes.toString("hex")));
    assert.equal(genericHex.size, 14);
    assert.equal([...genericHex].filter((value) => retainedHex.has(value)).length, 0);

    const rendererRoots = [path.join(root, "web"), path.join(root, "desktop")];
    const genericFiles = [];
    for (const rendererRoot of rendererRoots) {
      genericFiles.push(write(path.join(rendererRoot, "assets/index.js"), genericValues.join("\n")));
      for (const relativePath of ["assets/index.css", "fonts/a.txt", "fonts/b.txt", "fonts/c.txt"]) {
        genericFiles.push(write(path.join(rendererRoot, relativePath), genericValues[4]));
      }
    }
    const pairCount = genericValues.reduce((count, value) => {
      const bytes = Buffer.from(String(value).trim());
      return count + genericFiles.filter((file) => readFileSync(file).includes(bytes)).length;
    }, 0);
    assert.equal(pairCount, 36);
    const result = await scanDesktopPrivateDataBoundary({ roots: rendererRoots, corpus, displayBase: root });
    assert.equal(result.verdict, "PASS");
    assert.equal(result.finding_count, 0);
    assert.deepEqual(result.findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-008 requires explicit contact authority and blocks an explicit N/A release claim", () => withFixture(({
  root, sources,
}) => {
  const missing = runValidator(root, sources, { contact: "missing" });
  assert.equal(missing.status, 2);
  assert.equal(receipt(missing).findings[0].kind, "missing_contact_source_authority");

  const conflict = runValidator(root, sources, {
    args: [
      "--contact-source-not-applicable",
      "--contact-source-not-applicable-reason", "fixture-has-no-authoritative-contact-source",
    ],
  });
  assert.equal(conflict.status, 2);
  assert.equal(receipt(conflict).findings[0].kind, "conflicting_contact_source_authority");

  const missingReason = runValidator(root, sources, {
    contact: "missing",
    args: ["--contact-source-not-applicable"],
  });
  assert.equal(missingReason.status, 2);
  assert.equal(receipt(missingReason).findings[0].kind, "missing_contact_source_not_applicable_reason");

  const reason = "fixture-has-no-authoritative-contact-source";
  const notApplicable = runValidator(root, sources, {
    contact: "missing",
    extraEnvironment: {
      LAWOS_HRX_MEMBER_CONTACT_SOURCE_NOT_APPLICABLE: "true",
      LAWOS_HRX_MEMBER_CONTACT_SOURCE_NOT_APPLICABLE_REASON: reason,
    },
  });
  const notApplicableReceipt = receipt(notApplicable);
  assert.equal(notApplicable.status, 1);
  assert.equal(notApplicableReceipt.verdict, "FAIL");
  assert.equal(notApplicableReceipt.contact_corpus_status, "not_applicable");
  assert.equal(notApplicableReceipt.contact_authority_reason_recorded, true);
  assert.equal(notApplicableReceipt.release_claim_eligible, false);
  assert.equal(notApplicableReceipt.scanner_finding_count, 0);
  assert.equal(notApplicableReceipt.findings.some(({ kind }) => kind === "contact_source_not_applicable"), true);
  assert.equal(`${notApplicable.stdout}${notApplicable.stderr}`.includes(reason), false);
}));

test("RFD-TUW-008 rejects a contact-only protected value when contact authority is loaded", () => withFixture(({
  root, values, sources,
}) => {
  write(path.join(root, "apps/web/dist/assets/contact-only.private"), values.phone);
  const result = runValidator(root, sources);
  const parsed = receipt(result);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(parsed.contact_corpus_status, "loaded");
  assert.equal(parsed.findings.some(({ kind }) => kind === "contact_protected_value"), true);
  assert.equal(`${result.stdout}${result.stderr}`.includes(values.phone), false);
}));

test("RFD-TUW-008 rejects untracked generated roster, contact, tenant, credential, and photo bytes in every file type", () => withFixture(({
  root, values, sources, photoBytes,
}) => {
  const initialized = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" });
  assert.equal(initialized.status, 0, initialized.stderr);
  const staged = spawnSync("git", ["add", "--all"], { cwd: root, encoding: "utf8" });
  assert.equal(staged.status, 0, staged.stderr);

  const badFiles = [
    write(path.join(root, "apps/web/dist/assets/untracked-roster.blob"), values.displayName),
    write(path.join(root, "apps/web/dist/assets/untracked-contact.cache"), values.phone),
    write(path.join(root, "apps/web/dist/assets/untracked-tenant"), values.tenantId),
    write(path.join(root, "apps/web/dist/assets/untracked-credential.data"), values.credential),
    write(path.join(root, "apps/web/dist/assets/untracked-photo.asset"), photoBytes),
  ];
  const status = spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(status.status, 0, status.stderr);
  for (const badFile of badFiles) {
    assert.match(status.stdout, new RegExp(`\\?\\? ${path.relative(root, badFile).replaceAll(".", "\\.")}`));
  }

  const result = runValidator(root, sources);
  const parsed = receipt(result);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(parsed.verdict, "FAIL");
  assert.equal(parsed.scanned_files, 7);
  assert.deepEqual(new Set(parsed.findings.map(({ kind }) => kind)), new Set([
    "contact_protected_value",
    "credential_protected_value",
    "private_photo_hash",
    "registration_seed_protected_value",
    "roster_protected_value",
  ]));
  for (const name of ["untracked-roster.blob", "untracked-contact.cache", "untracked-tenant", "untracked-credential.data", "untracked-photo.asset"]) {
    assert.equal(parsed.findings.some(({ path: findingPath }) => findingPath.endsWith(name)), true);
  }
}));

test("RFD-TUW-008 follows a safe in-root renderer symlink exactly once", () => withFixture(({
  root, values, sources,
}) => {
  const rendererRoot = path.join(root, "apps/web/dist");
  write(path.join(rendererRoot, "z-target/private.payload"), values.email);
  symlinkSync("z-target/private.payload", path.join(rendererRoot, "a-private-link.payload"), "file");
  const result = runValidator(root, sources);
  const parsed = receipt(result);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(parsed.scanned_files, 3);
  assert.equal(parsed.findings.some(({ kind, path: findingPath }) =>
    kind === "roster_protected_value" && findingPath.endsWith("a-private-link.payload")), true);
  assert.equal(parsed.findings.some(({ path: findingPath }) => findingPath.includes("z-target/private.payload")), false);
}));

test("RFD-TUW-008 reports a missing expected renderer root as red", () => withFixture(({
  root, sources,
}) => {
  rmSync(path.join(root, "apps/desktop/src/renderer/web"), { recursive: true, force: true });
  const result = runValidator(root, sources);
  const parsed = receipt(result);
  assert.equal(result.status, 2);
  assert.equal(parsed.verdict, "FAIL");
  assert.equal(parsed.expected_renderer_root_count, 2);
  assert.equal(parsed.omitted_directories, 1);
  assert.deepEqual(parsed.findings, [{
    kind: "missing_scan_root",
    path: "apps/desktop/src/renderer/web",
    count: 1,
  }]);
}));

test("RFD-TUW-008 sanitizes protected values, photo hashes, and protected path segments", () => withFixture(({
  root, values, sources, photoBytes,
}) => {
  write(path.join(root, "apps/web/dist", values.email, "private.data"), values.credential);
  const result = runValidator(root, sources);
  const parsed = receipt(result);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 1, result.stderr);
  assert.equal(parsed.findings.some(({ path: findingPath }) => /^\[redacted-path-\d+\]$/u.test(findingPath)), true);
  for (const value of Object.values(values)) assert.equal(output.includes(value), false);
  assert.equal(output.includes(createHash("sha256").update(photoBytes).digest("hex")), false);
  assert.equal(parsed.protected_values_printed, false);
}));
