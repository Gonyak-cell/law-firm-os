import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { copyDesktopLocalApiRuntime } from "../../../scripts/lib/matter-desktop-runtime.mjs";
import { DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES } from "../../../scripts/lib/matter-desktop-private-data-boundary.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

async function writeFixture(path, contents) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, contents);
}

async function createFixtureRoot() {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "matter-runtime-package-test-"));
  const roster = {
    schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
    members: [{
      user_id: "private-user-1",
      employee_id: "private-employee-1",
      display_name: "Private Fixture Attorney",
      work_email: "private@example.test",
      manager_employee_id: null,
      professional_profile: {
        profile_kind: "private_fixture",
        public_role_labels: ["Private Fixture Attorney"],
        practice_areas: ["fixture"],
      },
    }],
  };
  const contact = { contacts: [{ user_id: "private-user-1", employee_id: "private-employee-1", display_name: "Private Fixture Attorney", work_email: "private@example.test", mobile_phone: "+1-202-555-0199" }] };
  const registrationSeed = { users: [{ user_id: "private-user-1", email: "private@example.test" }] };
  const rosterPath = join(fixtureRoot, "fixtures/private-roster.json");
  const contactPath = join(fixtureRoot, "fixtures/private-contact.json");
  const photosPath = join(fixtureRoot, "fixtures/private-photos");
  const registrationSeedPath = join(fixtureRoot, "fixtures/private-registration-seed.json");
  await writeFixture(join(fixtureRoot, "apps/api/src/server.js"), "export const runtime = true;\n");
  await writeFixture(join(fixtureRoot, "apps/api/src/private-source-that-must-not-copy.txt"), "private-source\n");
  await writeFixture(join(fixtureRoot, "packages/example/src/index.js"), "export const packageRuntime = true;\n");
  await writeFixture(rosterPath, `${JSON.stringify(roster)}\n`);
  await writeFixture(contactPath, `${JSON.stringify(contact)}\n`);
  await writeFixture(join(photosPath, "private-photo.png"), "private-photo\n");
  await writeFixture(registrationSeedPath, `${JSON.stringify(registrationSeed)}\n`);
  await writeFixture(join(fixtureRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster), `${JSON.stringify(roster)}\n`);
  await writeFixture(join(fixtureRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.registrationSeed), `${JSON.stringify(registrationSeed)}\n`);
  await writeFixture(join(fixtureRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.photos, "private-photo.png"), "private-photo\n");
  return { fixtureRoot, rosterPath, contactPath, photosPath, registrationSeedPath };
}

async function stage(options = {}) {
  const fixture = await createFixtureRoot();
  try {
    const result = await copyDesktopLocalApiRuntime({
      targetAppSourceDir: join(fixture.fixtureRoot, options.targetName ?? "app"),
      repoRoot: fixture.fixtureRoot,
      ...fixture,
      ...options,
    });
    return { ...fixture, ...result };
  } catch (error) {
    await rm(fixture.fixtureRoot, { recursive: true, force: true });
    throw error;
  }
}

test("RFD-TUW-005 resolves every channel×mode combination fail-closed", async () => {
  const cases = [
    ["dev", "none", "reject"],
    ["dev", "synthetic", "pass"],
    ["dev", "private-local", "reject"],
    ["internal", "none", "reject"],
    ["internal", "synthetic", "pass"],
    ["internal", "private-local", "reject"],
    ["candidate", "none", "pass"],
    ["candidate", "synthetic", "reject"],
    ["candidate", "private-local", "reject"],
    ["formal", "none", "pass"],
    ["formal", "synthetic", "reject"],
    ["formal", "private-local", "reject"],
  ];
  for (const [channel, runtimeMode, expected] of cases) {
    const fixture = await createFixtureRoot();
    const app = join(fixture.fixtureRoot, `${channel}-${runtimeMode}`);
    await writeFixture(join(app, "runtime/stale-private-data.json"), "stale\n");
    try {
      if (expected === "reject") {
        await assert.rejects(
          copyDesktopLocalApiRuntime({
            targetAppSourceDir: app,
            repoRoot: fixture.fixtureRoot,
            channel,
            runtimeMode,
            rosterSourcePath: join(fixture.fixtureRoot, "missing/private-roster.json"),
            photoSourcePath: join(fixture.fixtureRoot, "missing/private-photos"),
            registrationSeedSourcePath: join(fixture.fixtureRoot, "missing/private-seed.json"),
          }),
        );
        assert.equal(existsSync(join(app, "runtime")), false, `${channel}/${runtimeMode} must leave no runtime after rejection`);
      } else {
        const result = await copyDesktopLocalApiRuntime({ targetAppSourceDir: app, repoRoot: fixture.fixtureRoot, channel, runtimeMode });
        assert.equal(result.channel, channel);
        assert.equal(result.requestedRuntimeMode, runtimeMode);
        assert.equal(result.effectiveRuntimeMode, runtimeMode);
        assert.equal(result.included, runtimeMode === "synthetic");
        assert.equal(existsSync(join(app, "runtime")), runtimeMode === "synthetic", `${channel}/${runtimeMode} runtime presence mismatch`);
      }
    } finally {
      await rm(fixture.fixtureRoot, { recursive: true, force: true });
    }
  }
});

test("RFD-TUW-005 defaults internal QA to synthetic and never reads configured private sources", async () => {
  const fixture = await createFixtureRoot();
  try {
    const app = join(fixture.fixtureRoot, "internal-default");
    const result = await copyDesktopLocalApiRuntime({
      targetAppSourceDir: app,
      repoRoot: fixture.fixtureRoot,
      rosterSourcePath: join(fixture.fixtureRoot, "missing/private-roster.json"),
      photoSourcePath: join(fixture.fixtureRoot, "missing/private-photos"),
      registrationSeedSourcePath: join(fixture.fixtureRoot, "missing/private-seed.json"),
    });
    assert.equal(result.channel, "internal");
    assert.equal(result.requestedRuntimeMode, "synthetic");
    assert.equal(result.effectiveRuntimeMode, "synthetic");
    assert.equal(result.included, true);
    assert.equal(result.nonDistributable, true);
    assert.equal(result.distributable, false);
    assert.equal(result.publicCatalogIncluded, true);
    const roster = JSON.parse(await readFile(join(app, "runtime/apps/api/src/hrx-member-roster-source-of-truth.json"), "utf8"));
    assert.equal(roster.members.length, 10);
    assert.match(roster.members[0].work_email, /@example\.invalid$/u);
    assert.equal(existsSync(join(app, "runtime/apps/api/src/private-source-that-must-not-copy.txt")), true);
    assert.equal(existsSync(join(app, "runtime/apps/api/src/hrx-member-photos")), true);
  } finally {
    await rm(fixture.fixtureRoot, { recursive: true, force: true });
  }
});

test("RFD-TUW-005 requires two independent guards before any private-local source access", async () => {
  for (const options of [
    { privateLocalOptIn: true, nonDistributable: false },
    { privateLocalOptIn: false, nonDistributable: true },
  ]) {
    const fixture = await createFixtureRoot();
    try {
      const app = join(fixture.fixtureRoot, "private-guard-failure");
      await assert.rejects(
        copyDesktopLocalApiRuntime({
          targetAppSourceDir: app,
          repoRoot: fixture.fixtureRoot,
          channel: "internal",
          runtimeMode: "private-local",
          ...options,
          rosterSourcePath: join(fixture.fixtureRoot, "missing/private-roster.json"),
          photoSourcePath: join(fixture.fixtureRoot, "missing/private-photos"),
          registrationSeedSourcePath: join(fixture.fixtureRoot, "missing/private-seed.json"),
        }),
        /explicit opt-in and nonDistributable=true/u,
      );
      assert.equal(existsSync(join(app, "runtime")), false);
    } finally {
      await rm(fixture.fixtureRoot, { recursive: true, force: true });
    }
  }
});

test("RFD-TUW-005 private-local remains available only with both explicit guards", async () => {
  const fixture = await createFixtureRoot();
  try {
    const result = await copyDesktopLocalApiRuntime({
      targetAppSourceDir: join(fixture.fixtureRoot, "private-local-app"),
      repoRoot: fixture.fixtureRoot,
      channel: "internal",
      runtimeMode: "private-local",
      privateLocalOptIn: true,
      nonDistributable: true,
      rosterSourcePath: fixture.rosterPath,
      contactSourcePath: fixture.contactPath,
      photoSourcePath: fixture.photosPath,
      registrationSeedSourcePath: fixture.registrationSeedPath,
    });
    assert.equal(result.channel, "internal");
    assert.equal(result.requestedRuntimeMode, "private-local");
    assert.equal(result.effectiveRuntimeMode, "private-local");
    assert.equal(result.included, true);
    assert.equal(result.nonDistributable, true);
    assert.equal(result.distributable, false);
    assert.equal(result.privateSourcePaths.roster, fixture.rosterPath);
    assert.equal(existsSync(join(result.runtimeDir, "apps/api/src/hrx-member-roster-source-of-truth.json")), true);
    assert.equal(existsSync(join(result.runtimeDir, "apps/api/src/hrx-member-photos/private-photo.png")), true);
  } finally {
    await rm(fixture.fixtureRoot, { recursive: true, force: true });
  }
});

test("RFD-TUW-005 formalRelease is a strict no-runtime override", async () => {
  const fixture = await createFixtureRoot();
  try {
    const app = join(fixture.fixtureRoot, "formal-override");
    await writeFixture(join(app, "runtime/stale-private-data.json"), "stale\n");
    await assert.rejects(
      copyDesktopLocalApiRuntime({
        targetAppSourceDir: app,
        repoRoot: fixture.fixtureRoot,
        channel: "formal",
        formalRelease: true,
        runtimeMode: "private-local",
        privateLocalOptIn: true,
        nonDistributable: true,
      }),
      /not allowed for the formal release channel|not allowed for the formal distributable release channel/u,
    );
    assert.equal(existsSync(join(app, "runtime")), false);

    await assert.rejects(
      copyDesktopLocalApiRuntime({
        targetAppSourceDir: join(fixture.fixtureRoot, "invalid-formal-alias"),
        repoRoot: fixture.fixtureRoot,
        channel: "internal",
        formalRelease: true,
      }),
      /cannot override a non-formal release channel/u,
    );
  } finally {
    await rm(fixture.fixtureRoot, { recursive: true, force: true });
  }
});

test("RFD-TUW-005 synthetic package contains only deterministic fixture photos and catalog", async () => {
  const fixture = await stage({ channel: "dev", runtimeMode: "synthetic" });
  try {
    const runtimeRoot = fixture.runtimeDir;
    const catalog = JSON.parse(readFileSync(join(runtimeRoot, "apps/api/src/hrx-public-professional-profile-catalog.json"), "utf8"));
    assert.equal(catalog.profiles.length, 10);
    const photoEntries = await import("node:fs/promises").then(({ readdir }) => readdir(join(runtimeRoot, "apps/api/src/hrx-member-photos")));
    assert.equal(photoEntries.length, 10);
    assert.equal(photoEntries.every((fileName) => /^[a-f0-9]{64}\.png$/u.test(fileName)), true);
    assert.equal(existsSync(join(runtimeRoot, "apps/api/src/matter-vault-user-registration-seed.json")), true);
    const siblings = await import("node:fs/promises").then(({ readdir }) => readdir(dirname(runtimeRoot)));
    assert.equal(siblings.some((name) => name.startsWith(".matter-runtime-stage-")), false);
    assert.equal(siblings.some((name) => name.startsWith(".matter-runtime-backup-")), false);
  } finally {
    await rm(fixture.fixtureRoot, { recursive: true, force: true });
  }
});

test("RFD-TUW-005 stages the current source tree without real identity markers", async () => {
  const root = await mkdtemp(join(tmpdir(), "matter-runtime-current-tree-"));
  try {
    const result = await copyDesktopLocalApiRuntime({
      targetAppSourceDir: join(root, "app"),
      repoRoot: REPO_ROOT,
      channel: "internal",
      runtimeMode: "synthetic",
    });
    assert.equal(result.identityBoundary.real_identity_marker_count, 0);
    assert.ok(result.identityBoundary.scanned_file_count > 100);
    assert.equal(result.syntheticFixture.safe_counts.account_count, 10);
    const clientCandidateSource = await readFile(join(result.runtimeDir, "packages/master-data/src/amic-client-candidates.js"), "utf8");
    assert.match(clientCandidateSource, /AMIC_CURRENT_CLIENT_CANDIDATES\s*=\s*Object\.freeze\(\[\]\)/u);
    assert.doesNotMatch(clientCandidateSource, /귀한사람들|그래비티랩스/u);
    const matterCandidateSource = await readFile(join(result.runtimeDir, "packages/matter/src/amic-matter-code-candidates.js"), "utf8");
    assert.match(matterCandidateSource, /AMIC_CURRENT_MATTER_CLIENTS\s*=\s*Object\.freeze\(\[\]\)/u);
    assert.match(matterCandidateSource, /AMIC_CURRENT_MATTER_CODE_CANDIDATES\s*=\s*Object\.freeze\(\[\]\)/u);
    assert.equal(result.identityBoundary.privateDataCorpus.verdict, "PASS");
    assert.equal(result.identityBoundary.privateDataCorpus.finding_count, 0);
    assert.equal(result.identityBoundary.privateDataCorpus.corpus_mode, "runtime-safe-identity-and-credentials");
    assert.equal(result.identityBoundary.privateDataCorpus.candidate_corpus_status, "loaded");
    assert.equal(result.identityBoundary.privateDataCorpus.client_candidate_record_count, 99);
    assert.equal(result.identityBoundary.privateDataCorpus.matter_client_candidate_record_count, 99);
    assert.equal(result.identityBoundary.privateDataCorpus.matter_candidate_record_count, 148);
    assert.equal(result.identityBoundary.privateDataCorpus.candidate_finding_count, 0);
    assert.deepEqual(result.identityBoundary.privateDataCorpus.corpus_kinds, [
      "roster",
      "registration_seed",
      "photos",
      "client_candidates",
      "matter_client_candidates",
      "matter_candidates",
    ]);
    assert.deepEqual(result.identityBoundary.privateDataCorpus.source_files, [
      "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
      "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
      "apps/api/src/hrx-member-photos",
      "packages/master-data/src/amic-client-candidates.js",
      "packages/matter/src/amic-matter-code-candidates.js",
    ]);
    const lambdaSource = await readFile(join(result.runtimeDir, "apps/api/src/lambda.js"), "utf8");
    const clientCandidates = await import(pathToFileURL(join(REPO_ROOT, "packages/master-data/src/amic-client-candidates.js")).href);
    const matterCandidates = await import(pathToFileURL(join(REPO_ROOT, "packages/matter/src/amic-matter-code-candidates.js")).href);
    const candidateIdentityValues = [
      ...clientCandidates.AMIC_CURRENT_CLIENT_CANDIDATES.flatMap((record) => [record.display_name, record.canonical_display_name]),
      ...matterCandidates.AMIC_CURRENT_MATTER_CLIENTS.flatMap((record) => [
        record.client_id,
        record.client_display_name,
        record.client_short_name,
        record.canonical_display_name,
      ]),
      ...matterCandidates.AMIC_CURRENT_MATTER_CODE_CANDIDATES.flatMap((record) => [
        record.matter_id,
        record.matter_code,
        record.matter_name,
        record.client_id,
        record.client_display_name,
        record.client_short_name,
      ]),
    ].filter((value) => typeof value === "string" && value.length >= 4);
    assert.equal(candidateIdentityValues.every((value) => !lambdaSource.includes(value)), true);
    assert.ok(result.identityBoundary.privateDataCorpus.scanned_file_count > 100);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("RFD-TUW-005 cleans a failed private-local copy without promoting a partial runtime", async () => {
  const fixture = await createFixtureRoot();
  try {
    const brokenPhotoPath = join(fixture.photosPath, "broken.png");
    await mkdir(brokenPhotoPath, { recursive: true });
    const app = join(fixture.fixtureRoot, "private-local-failure");
    await assert.rejects(copyDesktopLocalApiRuntime({
      targetAppSourceDir: app,
      repoRoot: fixture.fixtureRoot,
      channel: "internal",
      runtimeMode: "private-local",
      privateLocalOptIn: true,
      nonDistributable: true,
      rosterSourcePath: fixture.rosterPath,
      contactSourcePath: fixture.contactPath,
      photoSourcePath: fixture.photosPath,
      registrationSeedSourcePath: fixture.registrationSeedPath,
    }));
    assert.equal(existsSync(join(app, "runtime")), false);
    const siblings = await import("node:fs/promises").then(({ readdir }) => readdir(app));
    assert.equal(siblings.some((name) => name.startsWith(".matter-runtime-stage-")), false);
    assert.equal(siblings.some((name) => name.startsWith(".matter-runtime-backup-")), false);
  } finally {
    await rm(fixture.fixtureRoot, { recursive: true, force: true });
  }
});

test("RFD-TUW-005 rejects irrelevant private-local guard flags", async () => {
  for (const options of [
    { runtimeMode: "synthetic", privateLocalOptIn: true },
    { runtimeMode: "none", nonDistributable: true },
  ]) {
    const fixture = await createFixtureRoot();
    const app = join(fixture.fixtureRoot, "irrelevant-private-guard");
    try {
      await assert.rejects(
        copyDesktopLocalApiRuntime({
          targetAppSourceDir: app,
          repoRoot: fixture.fixtureRoot,
          channel: "internal",
          ...options,
        }),
        /private-local guards are only valid/u,
      );
      assert.equal(existsSync(join(app, "runtime")), false);
    } finally {
      await rm(fixture.fixtureRoot, { recursive: true, force: true });
    }
  }
});

async function assertPromotionFailureRecovery({ failurePhase }) {
  const fixture = await createFixtureRoot();
  const app = join(fixture.fixtureRoot, `promotion-${failurePhase}`);
  const runtimeDir = join(app, "runtime");
  await writeFixture(join(runtimeDir, "old-runtime.txt"), "old-runtime\n");
  let injected = false;
  const defaultRename = async (sourcePath, targetPath) => rename(sourcePath, targetPath);
  const defaultRm = async (targetPath, options) => rm(targetPath, options);
  const promotionIo = {
    rename: async (sourcePath, targetPath) => {
      const source = String(sourcePath);
      const target = String(targetPath);
      if (!injected && failurePhase === "before-old-rename" && source === runtimeDir && target.includes(".matter-runtime-backup-")) {
        injected = true;
        const error = new Error("injected old-runtime rename failure");
        error.code = "EPERM";
        throw error;
      }
      if (!injected && failurePhase === "between-renames" && source.includes(".matter-runtime-stage-") && source.endsWith("/runtime") && target === runtimeDir) {
        injected = true;
        const error = new Error("injected staged-runtime rename failure");
        error.code = "EPERM";
        throw error;
      }
      return defaultRename(sourcePath, targetPath);
    },
    rm: async (targetPath, options) => {
      const target = String(targetPath);
      if (!injected && failurePhase === "backup-cleanup" && target.includes(".matter-runtime-backup-")) {
        injected = true;
        const error = new Error("injected backup cleanup failure");
        error.code = "EPERM";
        throw error;
      }
      if (!injected && failurePhase === "stage-cleanup" && target.includes(".matter-runtime-stage-")) {
        injected = true;
        const error = new Error("injected stage cleanup failure");
        error.code = "EPERM";
        throw error;
      }
      return defaultRm(targetPath, options);
    },
  };
  try {
    await assert.rejects(copyDesktopLocalApiRuntime({
      targetAppSourceDir: app,
      repoRoot: fixture.fixtureRoot,
      channel: "internal",
      runtimeMode: "synthetic",
      promotionIo,
    }));
    assert.equal(injected, true);
    assert.equal(readFileSync(join(runtimeDir, "old-runtime.txt"), "utf8"), "old-runtime\n");
    const siblings = await import("node:fs/promises").then(({ readdir }) => readdir(app));
    assert.equal(siblings.some((name) => name.startsWith(".matter-runtime-stage-")), false, failurePhase);
    assert.equal(siblings.some((name) => name.startsWith(".matter-runtime-backup-")), false, failurePhase);
  } finally {
    await rm(fixture.fixtureRoot, { recursive: true, force: true });
  }
}

for (const failurePhase of ["before-old-rename", "between-renames", "backup-cleanup", "stage-cleanup"]) {
  test(`RFD-TUW-005 promotion rollback leaves no artifacts (${failurePhase})`, () => assertPromotionFailureRecovery({ failurePhase }));
}

async function assertPromotionDoubleFailureRecovery({ failurePhase }) {
  const fixture = await createFixtureRoot();
  const app = join(fixture.fixtureRoot, `promotion-double-${failurePhase}`);
  const runtimeDir = join(app, "runtime");
  await writeFixture(join(runtimeDir, "old-runtime.txt"), "old-runtime\n");
  let firstInjected = false;
  let secondInjected = false;
  const promotionIo = {
    rename: async (sourcePath, targetPath) => {
      const source = String(sourcePath);
      const target = String(targetPath);
      if (failurePhase === "restore-old"
        && !firstInjected
        && source.includes(".matter-runtime-stage-")
        && source.endsWith("/runtime")
        && target === runtimeDir) {
        firstInjected = true;
        const error = new Error("injected staged-runtime rename failure");
        error.code = "EIO";
        throw error;
      }
      if (failurePhase === "restore-old"
        && firstInjected
        && !secondInjected
        && source.includes(".matter-runtime-backup-")
        && source.endsWith("/runtime")
        && target === runtimeDir) {
        secondInjected = true;
        const error = new Error("injected old-runtime recovery rename failure");
        error.code = "EPERM";
        throw error;
      }
      if (failurePhase === "rollback-new"
        && firstInjected
        && !secondInjected
        && source === runtimeDir
        && target.includes(".matter-runtime-stage-")
        && target.endsWith("/runtime")) {
        secondInjected = true;
        const error = new Error("injected promoted-runtime rollback rename failure");
        error.code = "EPERM";
        throw error;
      }
      return rename(sourcePath, targetPath);
    },
    rm: async (targetPath, options) => {
      const target = String(targetPath);
      if (failurePhase === "rollback-new"
        && !firstInjected
        && target.includes(".matter-runtime-backup-")) {
        firstInjected = true;
        const error = new Error("injected backup cleanup failure");
        error.code = "EIO";
        throw error;
      }
      return rm(targetPath, options);
    },
  };
  try {
    let error = null;
    try {
      await copyDesktopLocalApiRuntime({
        targetAppSourceDir: app,
        repoRoot: fixture.fixtureRoot,
        channel: "internal",
        runtimeMode: "synthetic",
        promotionIo,
      });
    } catch (caught) {
      error = caught;
    }
    assert.ok(error, `${failurePhase} must reject`);
    assert.equal(error.code, "RECOVERY_REQUIRED", failurePhase);
    assert.match(error.recoveryReference, /^\.matter-runtime-backup-/u);
    assert.equal(error.message.includes(fixture.fixtureRoot), false);
    assert.equal(firstInjected, true);
    assert.equal(secondInjected, true);
    const siblings = await import("node:fs/promises").then(({ readdir }) => readdir(app));
    assert.equal(siblings.some((name) => name.startsWith(".matter-runtime-stage-")), false, failurePhase);
    const backupName = siblings.find((name) => name.startsWith(".matter-runtime-backup-"));
    assert.ok(backupName, `${failurePhase} must preserve an opaque backup transaction`);
    assert.equal(readFileSync(join(app, backupName, "runtime", "old-runtime.txt"), "utf8"), "old-runtime\n");
    if (failurePhase === "restore-old") {
      assert.equal(existsSync(runtimeDir), false);
    } else {
      assert.equal(existsSync(runtimeDir), true);
    }
  } finally {
    await rm(fixture.fixtureRoot, { recursive: true, force: true });
  }
}

test("RFD-TUW-005 preserves the old-runtime backup when old-runtime recovery rename fails", () => (
  assertPromotionDoubleFailureRecovery({ failurePhase: "restore-old" })
));

test("RFD-TUW-005 preserves the old-runtime backup when promoted-runtime rollback rename fails", () => (
  assertPromotionDoubleFailureRecovery({ failurePhase: "rollback-new" })
));
