import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import { memberPhotoFor } from "../../web/src/people/memberPhotos.js";
import {
  createHrxMemberPhotoProvider,
  HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME,
  HRX_MEMBER_PHOTO_ARTIFACT_METADATA_SCHEMA,
  memberPhotoDataUrlForEmployeeId,
  validatedMemberPhotoGenerationRef,
} from "../src/hrx-member-photo-provider.js";
import {
  findHrxPublicProfessionalProfileByEmployeeId,
  listHrxMemberRosterRows,
} from "../src/hrx-member-roster-registry.js";
import { findRegisteredAccountByUserId } from "../src/matter-vault-account-registry.js";
import { resolveHrxEmployeeProfileByUserId } from "../src/hrx-runtime-context.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";
import {
  JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY,
  JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA,
  validateJsonPostgresProductionProfilePhotoMetadata,
} from "../../../scripts/lib/json-postgres-production-artifact.mjs";
import { runTenProfileApiRead } from "../../../scripts/lib/profile-media-api-smoke.mjs";
import { syntheticPng } from "../../../scripts/test/profile-media-test-fixture.mjs";
import {
  PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION,
  PROFILE_PHOTO_SLOT_REFS,
} from "../../../scripts/validate-profile-photo-replacement-manifest.mjs";

async function withServer(callback, options = {}) {
  const started = await startApiServer({ port: 0, ...options });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, headers: response.headers, body };
}

async function switchActivePhotoGeneration(root, generationRef, suffix) {
  const temporaryPointer = join(root, `.active-${suffix}`);
  await symlink(join("generations", generationRef), temporaryPointer, "dir");
  await rename(temporaryPointer, join(root, "active"));
}

function permissionHeaders({ tenant = "tenant_rp04_synthetic", effect = "allow" } = {}) {
  const rules = effect === "denied" ? [] : [{ id: `profile-${effect}`, effect: effect === "review" ? "review_required" : "allow", action: "*" }];
  return {
    "x-lawos-permission-context": JSON.stringify({
      principal: {
        user_id: "user_profile_session",
        tenant_id: tenant,
        role_ids: ["master_data_reader", "matter_runtime_user"],
        session_principal_source: "desktop_web_session_envelope",
        session_source_ref: "desktop_offline_login",
      },
      rules,
      object_acl: [],
    }),
  };
}

function profilePath(overrides = {}) {
  const params = new URLSearchParams({
    permission_ref: "ui_profile_me",
    audit_hint_ref: "ui_profile_me_probe",
    ...overrides,
  });
  return `/api/profile/me?${params.toString()}`;
}

function photoManifest(photos, byteField) {
  return {
    schema_version: PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION,
    entries: photos.map((photo, index) => ({
      slot_ref: PROFILE_PHOTO_SLOT_REFS[index],
      filename: photo.fileName,
      media_type: "image/png",
      content_sha256: createHash("sha256").update(photo[byteField]).digest("hex"),
    })),
  };
}

function flatArtifactMetadata(privateManifestSha256) {
  return {
    schema_version: HRX_MEMBER_PHOTO_ARTIFACT_METADATA_SCHEMA,
    generation_ref: `profile_generation_${privateManifestSha256.slice(0, 32)}`,
    private_manifest_schema_version: PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION,
    private_manifest_sha256: privateManifestSha256,
    private_manifest_entry_count: 10,
    injected_photo_entry_count: 10,
    git_source_photo_entry_count: 0,
  };
}

async function withSwapBeforePinnedOpen({ targetPath, swap, restore = () => {} }, callback) {
  const originalOpenSync = fs.openSync;
  const originalReadFileSync = fs.readFileSync;
  let swapped = false;
  const observedPaths = [];
  const swapWhenTargeted = (path) => {
    if (swapped || path !== targetPath) return;
    swap();
    swapped = true;
  };
  fs.openSync = function openSyncWithLeafSwap(path, ...args) {
    observedPaths.push(path);
    swapWhenTargeted(path);
    return originalOpenSync.call(this, path, ...args);
  };
  fs.readFileSync = function readFileSyncWithLeafSwap(path, ...args) {
    observedPaths.push(path);
    swapWhenTargeted(path);
    return originalReadFileSync.call(this, path, ...args);
  };
  syncBuiltinESMExports();
  try {
    const result = await callback();
    assert.equal(swapped, true, `target was not opened: ${JSON.stringify(observedPaths)}`);
    return result;
  } finally {
    try {
      if (swapped) restore();
    } finally {
      fs.openSync = originalOpenSync;
      fs.readFileSync = originalReadFileSync;
      syncBuiltinESMExports();
    }
  }
}

function withLeafSwapBeforePinnedOpen({ targetPath, outsidePath }, callback) {
  return withSwapBeforePinnedOpen({
    targetPath,
    swap() {
      fs.rmSync(targetPath);
      fs.symlinkSync(outsidePath, targetPath, "file");
    },
  }, callback);
}

function withDirectorySwapBeforePinnedOpen({
  targetPath,
  sourceDirectory,
  replacementDirectory,
  backupDirectory,
}, callback) {
  return withSwapBeforePinnedOpen({
    targetPath,
    swap() {
      fs.renameSync(sourceDirectory, backupDirectory);
      try {
        fs.renameSync(replacementDirectory, sourceDirectory);
      } catch (error) {
        fs.renameSync(backupDirectory, sourceDirectory);
        throw error;
      }
    },
    restore() {
      fs.renameSync(sourceDirectory, replacementDirectory);
      fs.renameSync(backupDirectory, sourceDirectory);
    },
  }, callback);
}

test("Profile API descriptor is exposed and keeps production claim false", async () => {
  await withServer(async (baseUrl) => {
    const health = await json(baseUrl, "/api/health");
    assert.equal(health.status, 200);
    const profileContext = health.body.bounded_contexts.find((context) => context.bounded_context === "profile");
    assert.ok(profileContext, "profile bounded context missing");
    assert.deepEqual(profileContext.endpoints, ["GET /api/profile/me"]);
    assert.equal(profileContext.data_source, "authenticated_hrx_member_projection");
    assert.deepEqual(profileContext.contact_policy, {
      visibility: "authenticated_internal",
      allowed_fields: ["work_email", "mobile_phone"],
      public_renderer_literals_allowed: false,
    });
    assert.equal(profileContext.production_ready_claim, false);
  });
});

test("Profile API returns session-derived safe profile read model", async () => {
  await withServer(async (baseUrl) => {
    const headers = await apiSessionHeaders(baseUrl);
    const profile = await json(baseUrl, profilePath(), { headers });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.outcome, "passed");
    assert.equal(profile.body.ui_state, "populated");
    assert.equal(profile.body.item.actor_ref, "user_amic_jwsuh");
    assert.equal(profile.body.item.display_name, "서지원");
    assert.equal(profile.body.item.english_name, "Jiwon Suh");
    assert.equal(profile.body.item.primary_role_label, "대표변호사");
    assert.equal(profile.body.item.title, "대표변호사");
    assert.equal(profile.body.item.employee_id, "emp_amic_jwsuh");
    assert.equal(profile.body.item.work_email, "jwsuh@amic.kr");
    assert.equal(profile.body.item.mobile_phone, "");
    assert.equal(profile.body.item.department, "Legal");
    assert.equal(profile.body.item.affiliation, "AMIC Law");
    assert.equal(profile.body.item.organization_group, "AMIC Law");
    assert.equal(profile.body.item.country, "대한민국");
    assert.equal(profile.body.item.professional_profile.profile_kind, "attorney");
    assert.match(profile.body.item.photo_url, /^data:image\/png;base64,/);
    assert.equal(profile.body.item.photo_included, true);
    assert.equal(profile.headers.get("x-lawos-profile-photo-generation"), null);
    assert.equal(profile.body.item.contact_policy.visibility, "authenticated_internal");
    assert.equal(profile.body.item.tenant_ref, "tenant_amic_matter_vault");
    assert.equal(profile.body.item.contract_summary.source_ref, "hrx-member-roster-source-of-truth");
    assert.equal(profile.body.item.account_summary.session_principal_source, "api_signed_session");
    assert.equal(profile.body.item.account_summary.employee_user_link_resolved, true);
    assert.equal(profile.body.item.secret_material_included, false);
    assert.equal(profile.body.item.direct_identifier_included, true);
    assert.equal(profile.body.production_ready_claim, false);

    for (const [surface, path] of [
      ["home", "/api/home/action-inbox?tenant_id=tenant_amic_matter_vault&permission_ref=ui_home_dashboard_live&audit_hint_ref=ui_home_dashboard_probe&type=approval"],
      ["matters", "/api/matters?tenant_id=tenant_amic_matter_vault&permission_ref=ui_cmp_g4_matter_live&audit_hint_ref=ui_cmp_g4_matter_probe&limit=1"],
      ["people leave", "/api/hrx/leave/me"],
    ]) {
      const protectedRead = await json(baseUrl, path, { headers });
      assert.equal(protectedRead.status, 200, `${surface} must remain readable for jwsuh@amic.kr`);
      assert.notEqual(protectedRead.body.ui_state, "denied", `${surface} must not emit a denied UI state`);
    }
  });
});

test("Profile photo resolver uses an opaque asset key and rejects unsafe employee refs", async () => {
  const photoDirectory = await mkdtemp(join(tmpdir(), "lawos-profile-photo-"));
  try {
    const employeeId = "employee-1";
    const assetKey = createHash("sha256").update(employeeId).digest("hex");
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    await writeFile(join(photoDirectory, `${assetKey}.png`), png);

    assert.equal(
      memberPhotoDataUrlForEmployeeId(employeeId, photoDirectory),
      `data:image/png;base64,${png.toString("base64")}`,
    );
    assert.equal(memberPhotoDataUrlForEmployeeId("../../etc/passwd", photoDirectory), null);
    assert.equal(memberPhotoDataUrlForEmployeeId("", photoDirectory), null);
  } finally {
    await rm(photoDirectory, { recursive: true, force: true });
  }
});

test("Profile API satisfies ten-profile smoke and binds active generation across switch and rollback", async () => {
  const root = await mkdtemp(join(tmpdir(), "lawos-profile-api-generation-"));
  const baselineGenerationRef = `profile_generation_${"1".repeat(32)}`;
  const candidateGenerationRef = `profile_generation_${"2".repeat(32)}`;
  const emptyGenerationRef = `profile_generation_${"3".repeat(32)}`;
  const roster = listHrxMemberRosterRows();
  const photos = roster.map((member, index) => {
    const fileName = `${createHash("sha256").update(member.employee_id).digest("hex")}.png`;
    return {
      member,
      fileName,
      baseline: syntheticPng(index + 1, 10),
      candidate: syntheticPng(index + 1, 80),
      replacement: syntheticPng(index + 1, 180),
    };
  });
  const primaryPhoto = photos.find(({ member }) => member.employee_id === "emp_amic_jwsuh");
  try {
    assert.equal(roster.length, 10);
    assert.ok(primaryPhoto);
    for (const generationRef of [baselineGenerationRef, candidateGenerationRef, emptyGenerationRef]) {
      await mkdir(join(root, "generations", generationRef), { recursive: true });
    }
    const replacementGenerationPath = join(root, "replacement-generation");
    await mkdir(replacementGenerationPath);
    for (const photo of photos) {
      await writeFile(join(root, "generations", baselineGenerationRef, photo.fileName), photo.baseline);
      await writeFile(join(root, "generations", candidateGenerationRef, photo.fileName), photo.candidate);
      await writeFile(join(replacementGenerationPath, photo.fileName), photo.replacement);
    }
    await symlink(join("generations", baselineGenerationRef), join(root, "active"), "dir");

    await withServer(async (baseUrl) => {
      const sessionHeaders = new Map();
      const readProfileForSlot = async (slotRef) => {
        const index = PROFILE_PHOTO_SLOT_REFS.indexOf(slotRef);
        const account = findRegisteredAccountByUserId(roster[index]?.user_id);
        assert.ok(account);
        if (!sessionHeaders.has(account.user_id)) {
          sessionHeaders.set(account.user_id, await apiSessionHeaders(baseUrl, account));
        }
        const profile = await json(baseUrl, profilePath(), { headers: sessionHeaders.get(account.user_id) });
        return {
          status: profile.status,
          body: profile.body,
          generation_ref: profile.headers.get("x-lawos-profile-photo-generation"),
        };
      };
      const smoke = await runTenProfileApiRead({
        readProfile: readProfileForSlot,
        expectedManifest: photoManifest(photos, "baseline"),
        expectedGenerationRef: baselineGenerationRef,
      });
      assert.ok(Object.values(smoke).every((value) => value === 10));

      const headers = sessionHeaders.get("user_amic_jwsuh") ?? await apiSessionHeaders(baseUrl);
      const readProfile = () => json(baseUrl, profilePath(), { headers });
      const assertPhoto = (profile, generationRef, bytes) => {
        assert.equal(profile.status, 200);
        assert.equal(profile.headers.get("x-lawos-profile-photo-generation"), generationRef);
        assert.equal(profile.body.item.photo_included, true);
        assert.deepEqual(
          Buffer.from(profile.body.item.photo_url.slice("data:image/png;base64,".length), "base64"),
          bytes,
        );
      };

      assertPhoto(await readProfile(), baselineGenerationRef, primaryPhoto.baseline);
      await switchActivePhotoGeneration(root, candidateGenerationRef, "candidate");
      assertPhoto(await readProfile(), candidateGenerationRef, primaryPhoto.candidate);
      await switchActivePhotoGeneration(root, baselineGenerationRef, "rollback");
      assertPhoto(await readProfile(), baselineGenerationRef, primaryPhoto.baseline);

      const canonicalRoot = fs.realpathSync(root);
      const baselineDirectory = fs.realpathSync(join(root, "generations", baselineGenerationRef));
      const replacementDirectory = fs.realpathSync(replacementGenerationPath);
      const racedGeneration = await withDirectorySwapBeforePinnedOpen({
        targetPath: join(baselineDirectory, primaryPhoto.fileName),
        sourceDirectory: baselineDirectory,
        replacementDirectory,
        backupDirectory: join(canonicalRoot, "baseline-generation-race-backup"),
      }, readProfile);
      assert.equal(racedGeneration.status, 200);
      assert.equal(racedGeneration.body.item.photo_url, null);
      assert.equal(racedGeneration.body.item.photo_included, false);
      assert.equal(racedGeneration.headers.get("x-lawos-profile-photo-generation"), null);
      assert.notEqual(
        racedGeneration.body.item.photo_url,
        `data:image/png;base64,${primaryPhoto.replacement.toString("base64")}`,
      );
      assertPhoto(await readProfile(), baselineGenerationRef, primaryPhoto.baseline);

      await switchActivePhotoGeneration(root, emptyGenerationRef, "missing");
      const missing = await readProfile();
      assert.equal(missing.status, 200);
      assert.equal(missing.headers.get("x-lawos-profile-photo-generation"), null);
      assert.equal(missing.body.item.photo_url, null);
      assert.equal(missing.body.item.photo_included, false);
      assert.equal(memberPhotoFor(missing.body.item), undefined);
      assert.equal((missing.body.item.english_name || missing.body.item.display_name).slice(0, 1), "J");
    }, {
      profilePhotoProvider: createHrxMemberPhotoProvider({
        sourcePath: null,
        generationRootPath: root,
      }),
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Profile API accepts builder-compatible flat immutable artifact metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "lawos-profile-flat-artifact-"));
  const sourcePath = join(root, "hrx-member-photos");
  const metadataPath = join(root, HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME);
  const roster = listHrxMemberRosterRows();
  const photos = roster.map((member, index) => ({
    member,
    fileName: `${createHash("sha256").update(member.employee_id).digest("hex")}.png`,
    bytes: syntheticPng(index + 1, 120),
  }));
  const manifest = photoManifest(photos, "bytes");
  const privateManifestSha256 = createHash("sha256").update(`${JSON.stringify(manifest)}\n`).digest("hex");
  const metadata = validateJsonPostgresProductionProfilePhotoMetadata(
    flatArtifactMetadata(privateManifestSha256),
  );
  try {
    assert.equal(HRX_MEMBER_PHOTO_ARTIFACT_METADATA_SCHEMA, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA);
    assert.equal(
      `apps/api/src/${HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME}`,
      JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY,
    );
    await mkdir(sourcePath);
    for (const photo of photos) await writeFile(join(sourcePath, photo.fileName), photo.bytes);
    await writeFile(metadataPath, `${JSON.stringify(metadata)}\n`);
    const profilePhotoProvider = createHrxMemberPhotoProvider({ sourcePath });

    await withServer(async (baseUrl) => {
      const sessionHeaders = new Map();
      const smoke = await runTenProfileApiRead({
        expectedManifest: manifest,
        expectedGenerationRef: metadata.generation_ref,
        async readProfile(slotRef) {
          const index = PROFILE_PHOTO_SLOT_REFS.indexOf(slotRef);
          const account = findRegisteredAccountByUserId(roster[index]?.user_id);
          assert.ok(account);
          if (!sessionHeaders.has(account.user_id)) {
            sessionHeaders.set(account.user_id, await apiSessionHeaders(baseUrl, account));
          }
          const profile = await json(baseUrl, profilePath(), { headers: sessionHeaders.get(account.user_id) });
          return {
            status: profile.status,
            body: profile.body,
            generation_ref: profile.headers.get("x-lawos-profile-photo-generation"),
          };
        },
      });
      assert.ok(Object.values(smoke).every((value) => value === 10));

      const headers = sessionHeaders.get("user_amic_jwsuh") ?? await apiSessionHeaders(baseUrl);
      const assertArtifactFailClosed = async () => {
        const profile = await json(baseUrl, profilePath(), { headers });
        assert.equal(profile.status, 200);
        assert.equal(profile.body.item.photo_included, false);
        assert.equal(profile.body.item.photo_url, null);
        assert.equal(profile.headers.get("x-lawos-profile-photo-generation"), null);
      };
      await writeFile(metadataPath, "{");
      await assertArtifactFailClosed();
      await writeFile(metadataPath, `${JSON.stringify(metadata)}\n`);
      await writeFile(join(sourcePath, `${"f".repeat(64)}.png`), syntheticPng(200, 200));
      await assertArtifactFailClosed();
    }, { profilePhotoProvider });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Flat artifact files cannot mint a generation when malformed, forged, linked, raced, or outside", async () => {
  const root = await mkdtemp(join(tmpdir(), "lawos-profile-flat-metadata-negative-"));
  const outsideRoot = await mkdtemp(join(tmpdir(), "lawos-profile-flat-metadata-outside-"));
  const sourcePath = join(root, "hrx-member-photos");
  const metadataPath = join(root, HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME);
  const outsideMetadataPath = join(outsideRoot, HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME);
  const roster = listHrxMemberRosterRows();
  const privateManifestSha256 = createHash("sha256").update("synthetic-private-manifest").digest("hex");
  const validMetadata = flatArtifactMetadata(privateManifestSha256);
  const targetMember = roster[0];
  const targetPhotoPath = join(
    sourcePath,
    `${createHash("sha256").update(targetMember.employee_id).digest("hex")}.png`,
  );
  const targetPhotoBytes = syntheticPng(1, 160);
  try {
    await mkdir(sourcePath);
    for (const [index, member] of roster.entries()) {
      const fileName = `${createHash("sha256").update(member.employee_id).digest("hex")}.png`;
      await writeFile(join(sourcePath, fileName), syntheticPng(index + 1, 160));
    }
    const replacementSourcePath = join(root, "hrx-member-photos-replacement");
    await mkdir(replacementSourcePath);
    for (const [index, member] of roster.entries()) {
      const fileName = `${createHash("sha256").update(member.employee_id).digest("hex")}.png`;
      await writeFile(join(replacementSourcePath, fileName), syntheticPng(index + 1, 220));
    }
    const assertArtifactRejected = (path = metadataPath) => {
      const result = createHrxMemberPhotoProvider({ sourcePath, artifactMetadataPath: path })
        .readForEmployeeId(targetMember.employee_id);
      assert.equal(result, null);
    };

    assertArtifactRejected();
    await writeFile(metadataPath, "{");
    assertArtifactRejected();
    for (const metadata of [
      { ...validMetadata, unexpected: true },
      { ...validMetadata, schema_version: "law-firm-os.profile-photo-artifact-metadata.v2" },
      { ...validMetadata, generation_ref: `profile_generation_${"f".repeat(32)}` },
      { ...validMetadata, private_manifest_schema_version: "law-firm-os.profile-photo-replacement-manifest.v1" },
      { ...validMetadata, private_manifest_sha256: privateManifestSha256.toUpperCase() },
      { ...validMetadata, private_manifest_entry_count: 9 },
      { ...validMetadata, injected_photo_entry_count: 9 },
      { ...validMetadata, git_source_photo_entry_count: 1 },
    ]) {
      await writeFile(metadataPath, `${JSON.stringify(metadata)}\n`);
      assertArtifactRejected();
    }

    await writeFile(outsideMetadataPath, `${JSON.stringify(validMetadata)}\n`);
    await rm(metadataPath);
    await symlink(outsideMetadataPath, metadataPath);
    assertArtifactRejected();
    assertArtifactRejected(outsideMetadataPath);

    await rm(metadataPath);
    await writeFile(metadataPath, `${JSON.stringify(validMetadata)}\n`);
    const linkedSourcePath = join(root, "hrx-member-photos-link");
    await symlink(sourcePath, linkedSourcePath, "dir");
    const linkedSourceResult = createHrxMemberPhotoProvider({
      sourcePath: linkedSourcePath,
      artifactMetadataPath: metadataPath,
    }).readForEmployeeId(targetMember.employee_id);
    assert.equal(linkedSourceResult, null);

    const outsidePhotoPath = join(outsideRoot, "outside.png");
    const outsidePhotoBytes = syntheticPng(240, 240);
    await writeFile(outsidePhotoPath, outsidePhotoBytes);
    const canonicalTargetPhotoPath = fs.realpathSync(targetPhotoPath);
    const canonicalMetadataPath = fs.realpathSync(metadataPath);
    const canonicalSourcePath = fs.realpathSync(sourcePath);
    const canonicalReplacementSourcePath = fs.realpathSync(replacementSourcePath);
    const replacementTargetBytes = syntheticPng(1, 220);
    const profilePhotoProvider = createHrxMemberPhotoProvider({
      sourcePath,
      artifactMetadataPath: canonicalMetadataPath,
    });
    const rawProvider = createHrxMemberPhotoProvider({
      sourcePath,
      artifactMetadataPath: null,
    });
    const prevalidationBackup = join(fs.realpathSync(root), "prevalidation-source-backup");
    fs.renameSync(canonicalSourcePath, prevalidationBackup);
    fs.renameSync(canonicalReplacementSourcePath, canonicalSourcePath);
    try {
      assert.equal(profilePhotoProvider.readForEmployeeId(targetMember.employee_id), null);
      assert.equal(rawProvider.readForEmployeeId(targetMember.employee_id), null);
    } finally {
      fs.renameSync(canonicalSourcePath, canonicalReplacementSourcePath);
      fs.renameSync(prevalidationBackup, canonicalSourcePath);
    }
    await withServer(async (baseUrl) => {
      const account = findRegisteredAccountByUserId(targetMember.user_id);
      assert.ok(account);
      const headers = await apiSessionHeaders(baseUrl, account);
      const racedPhoto = await withLeafSwapBeforePinnedOpen({
        targetPath: canonicalTargetPhotoPath,
        outsidePath: outsidePhotoPath,
      }, () => json(baseUrl, profilePath(), { headers }));
      assert.equal(racedPhoto.status, 200);
      assert.equal(racedPhoto.body.item.photo_url, null);
      assert.equal(racedPhoto.body.item.photo_included, false);
      assert.equal(racedPhoto.headers.get("x-lawos-profile-photo-generation"), null);
      assert.notEqual(
        racedPhoto.body.item.photo_url,
        `data:image/png;base64,${outsidePhotoBytes.toString("base64")}`,
      );

      await rm(canonicalTargetPhotoPath);
      await writeFile(canonicalTargetPhotoPath, targetPhotoBytes);
      const racedDirectory = await withDirectorySwapBeforePinnedOpen({
        targetPath: canonicalTargetPhotoPath,
        sourceDirectory: canonicalSourcePath,
        replacementDirectory: canonicalReplacementSourcePath,
        backupDirectory: join(fs.realpathSync(root), "flat-source-race-backup"),
      }, () => json(baseUrl, profilePath(), { headers }));
      assert.equal(racedDirectory.status, 200);
      assert.equal(racedDirectory.body.item.photo_url, null);
      assert.equal(racedDirectory.body.item.photo_included, false);
      assert.equal(racedDirectory.headers.get("x-lawos-profile-photo-generation"), null);
      assert.notEqual(
        racedDirectory.body.item.photo_url,
        `data:image/png;base64,${replacementTargetBytes.toString("base64")}`,
      );

      const forgedMetadata = flatArtifactMetadata(
        createHash("sha256").update("forged-raced-metadata").digest("hex"),
      );
      await writeFile(outsideMetadataPath, `${JSON.stringify(forgedMetadata)}\n`);
      const racedMetadata = await withLeafSwapBeforePinnedOpen({
        targetPath: canonicalMetadataPath,
        outsidePath: outsideMetadataPath,
      }, () => json(baseUrl, profilePath(), { headers }));
      assert.equal(racedMetadata.status, 200);
      assert.equal(racedMetadata.body.item.photo_url, null);
      assert.equal(racedMetadata.body.item.photo_included, false);
      assert.equal(racedMetadata.headers.get("x-lawos-profile-photo-generation"), null);
      assert.notEqual(
        racedMetadata.headers.get("x-lawos-profile-photo-generation"),
        forgedMetadata.generation_ref,
      );
    }, { profilePhotoProvider });

    const rawPhoto = rawProvider.readForEmployeeId(targetMember.employee_id);
    assert.equal(rawPhoto.dataUrl, `data:image/png;base64,${targetPhotoBytes.toString("base64")}`);
    assert.equal(validatedMemberPhotoGenerationRef(rawPhoto), null);
    const racedRawPhoto = await withDirectorySwapBeforePinnedOpen({
      targetPath: canonicalTargetPhotoPath,
      sourceDirectory: canonicalSourcePath,
      replacementDirectory: canonicalReplacementSourcePath,
      backupDirectory: join(fs.realpathSync(root), "raw-source-race-backup"),
    }, () => rawProvider.readForEmployeeId(targetMember.employee_id));
    assert.equal(racedRawPhoto, null);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test("Packaged Jiwon portrait keeps enough source pixels for the desktop crop", async () => {
  const png = await readFile(new URL(
    "../src/hrx-member-photos/b6ad38508be75403e379885a95ef91c3f77da7d19ac4f8635ba328f6a6da0725.png",
    import.meta.url,
  ));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.ok(png.readUInt32BE(16) >= 1200);
  assert.ok(png.readUInt32BE(20) >= 1700);
});

test("Profile resolver joins the signed account to its durable HRX employee", () => {
  const tenantId = "tenant_amic_matter_vault";
  const repository = createInMemoryHrxRepository({
    employees: [{
      tenant_id: tenantId,
      employee_id: "emp_runtime_jwsuh",
      display_name: "서지원",
      legal_name: "서지원",
      work_email: "jwsuh@amic.kr",
      status: "active",
      source_ref: "durable-hrx-runtime",
    }],
    employment_profiles: [{
      tenant_id: tenantId,
      profile_id: "profile_runtime_jwsuh",
      employee_id: "emp_runtime_jwsuh",
      employment_type: "full_time",
      status: "active",
      title: "대표변호사",
      org_unit_id: "org_legal",
      manager_employee_id: null,
      effective_from: "2026-06-22",
      source_ref: "durable-hrx-runtime",
    }],
    employee_user_links: [{
      tenant_id: tenantId,
      link_id: "link_runtime_jwsuh",
      employee_id: "emp_runtime_jwsuh",
      user_id: "user_amic_jwsuh",
      purpose: "login_mapping",
      source_ref: "durable-hrx-runtime",
    }],
  });
  const profile = resolveHrxEmployeeProfileByUserId({ repository }, {
    tenant_id: tenantId,
    user_id: "user_amic_jwsuh",
  });
  assert.equal(profile.employee_id, "emp_runtime_jwsuh");
  assert.equal(profile.display_name, "서지원");
  assert.equal(profile.work_email, "jwsuh@amic.kr");
  assert.equal(profile.title, "대표변호사");
  assert.equal(profile.department, "Legal");
  assert.equal(profile.affiliation, "AMIC Law");
  assert.equal(profile.organization_group, "AMIC Law");
});

test("Packaged public professional profile catalog exposes only the employee join and public profile", () => {
  const profile = findHrxPublicProfessionalProfileByEmployeeId("emp_amic_jwsuh", {
    profiles: [{
      employee_id: "emp_amic_jwsuh",
      professional_profile: {
        profile_kind: "attorney",
        experience: ["법무법인 아믹 대표변호사"],
        education: ["서울대학교 교육학과 학사"],
        qualifications: ["대한민국 변호사"],
      },
    }],
  });
  assert.deepEqual(Object.keys(profile).sort(), ["employee_id", "professional_profile", "source_ref"]);
  assert.equal(profile.professional_profile.profile_kind, "attorney");
  assert.equal("work_email" in profile, false);
  assert.equal("mobile_phone" in profile, false);
});

test("Packaged public professional profile catalog resolves an opaque employee join", () => {
  const employeeId = "emp_runtime_jwsuh";
  const profile = findHrxPublicProfessionalProfileByEmployeeId(employeeId, {
    profiles: [{
      employee_ref: createHash("sha256").update(employeeId).digest("hex"),
      professional_profile: {
        profile_kind: "attorney",
        experience: ["법무법인 아믹 대표변호사"],
      },
    }],
  });
  assert.equal(profile.employee_id, employeeId);
  assert.deepEqual(profile.professional_profile.experience, ["법무법인 아믹 대표변호사"]);
  assert.equal(findHrxPublicProfessionalProfileByEmployeeId("", { profiles: [] }), null);
});

test("Profile API rejects unsigned review and denied permission contexts", async () => {
  await withServer(async (baseUrl) => {
    const review = await json(baseUrl, profilePath(), { headers: permissionHeaders({ effect: "review" }) });
    assert.equal(review.status, 401);
    assert.equal(review.body.outcome, "blocked");
    assert.deepEqual(review.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);

    const denied = await json(baseUrl, profilePath(), { headers: permissionHeaders({ effect: "denied" }) });
    assert.equal(denied.status, 401);
    assert.equal(denied.body.outcome, "blocked");
    assert.deepEqual(denied.body.safe_error_codes, ["AUTH_SESSION_REQUIRED"]);
  });
});
