import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const defaultRosterSource = "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json";
const defaultPhotoSource = "apps/api/src/hrx-member-photos";
const defaultRegistrationSeedSource = "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json";

function sourcePaths({ repoRoot, env, rosterSourcePath, contactSourcePath, photoSourcePath, registrationSeedSourcePath }) {
  const configuredContact = String(contactSourcePath ?? env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH ?? "").trim();
  return {
    roster: resolve(repoRoot, rosterSourcePath ?? env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH ?? defaultRosterSource),
    contact: configuredContact ? resolve(repoRoot, configuredContact) : null,
    photos: resolve(repoRoot, photoSourcePath ?? env.LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH ?? defaultPhotoSource),
    registrationSeed: resolve(repoRoot, registrationSeedSourcePath ?? defaultRegistrationSeedSource)
  };
}

function publicProfessionalProfileCatalog(privateRoster) {
  const profiles = (privateRoster.members ?? [])
    .filter((member) => member?.employee_id && member?.professional_profile)
    .map((member) => ({
      employee_id: member.employee_id,
      professional_profile: Object.fromEntries([
        "schema_version",
        "profile_kind",
        "public_role_labels",
        "practice_areas",
        "experience",
        "education",
        "qualifications"
      ].flatMap((key) => member.professional_profile[key] === undefined ? [] : [[key, member.professional_profile[key]]]))
    }));
  if (profiles.length === 0) throw new Error("HRX public professional profile catalog cannot be empty");
  return {
    schema_version: "law-firm-os.hrx-public-professional-profile-catalog.v0.1",
    source_ref: "hrx-public-professional-profile-catalog",
    profiles
  };
}

export async function copyDesktopLocalApiRuntime({
  targetAppSourceDir,
  repoRoot,
  formalRelease = false,
  env = process.env,
  rosterSourcePath,
  contactSourcePath,
  photoSourcePath,
  registrationSeedSourcePath
}) {
  if (!targetAppSourceDir || !repoRoot) throw new Error("targetAppSourceDir and repoRoot are required");
  const runtimeDir = join(targetAppSourceDir, "runtime");
  await rm(runtimeDir, { recursive: true, force: true });
  if (formalRelease) return { included: false, runtimeDir };

  const sources = sourcePaths({
    repoRoot,
    env,
    rosterSourcePath,
    contactSourcePath,
    photoSourcePath,
    registrationSeedSourcePath
  });
  if (!existsSync(sources.roster)) throw new Error("HRX member roster source does not exist");
  if (!existsSync(sources.photos)) throw new Error("Internal HRX member photo source does not exist");
  if (sources.contact && !existsSync(sources.contact)) throw new Error("Configured internal HRX member contact source does not exist");
  if (!existsSync(sources.registrationSeed)) throw new Error("Matter Vault user registration seed does not exist");

  const apiRuntimeSrcDir = join(runtimeDir, "apps/api/src");
  await mkdir(join(runtimeDir, "apps/api"), { recursive: true });
  await cp(join(repoRoot, "apps/api/src"), apiRuntimeSrcDir, { recursive: true });

  const privateRoster = JSON.parse(await readFile(sources.roster, "utf8"));
  await writeFile(
    join(apiRuntimeSrcDir, "hrx-public-professional-profile-catalog.json"),
    `${JSON.stringify(publicProfessionalProfileCatalog(privateRoster), null, 2)}\n`
  );

  const runtimeRosterSourcePath = join(apiRuntimeSrcDir, "hrx-member-roster-source-of-truth.json");
  await rm(join(apiRuntimeSrcDir, "hrx-member-contact-source-of-truth.json"), { force: true });
  await rm(runtimeRosterSourcePath, { force: true });
  await rm(join(apiRuntimeSrcDir, "hrx-member-photos"), { recursive: true, force: true });
  await copyFile(sources.roster, runtimeRosterSourcePath);
  if (sources.contact) await copyFile(sources.contact, join(apiRuntimeSrcDir, "hrx-member-contact-source-of-truth.json"));

  const photoTargetPath = join(apiRuntimeSrcDir, "hrx-member-photos");
  await mkdir(photoTargetPath, { recursive: true });
  for (const fileName of await readdir(sources.photos)) {
    if (fileName.toLowerCase().endsWith(".png")) {
      await copyFile(join(sources.photos, fileName), join(photoTargetPath, fileName));
    }
  }
  await copyFile(sources.registrationSeed, join(apiRuntimeSrcDir, "matter-vault-user-registration-seed.json"));
  await cp(join(repoRoot, "packages"), join(runtimeDir, "packages"), { recursive: true });
  return { included: true, runtimeDir, apiRuntimeSrcDir };
}
