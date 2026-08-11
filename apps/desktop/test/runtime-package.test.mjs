import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  copyDesktopLocalApiRuntime,
  stageDesktopMainRuntimeDependencies,
} from "../../../scripts/lib/matter-desktop-runtime.mjs";

const sourceProofImport = "../../../../packages/email-dms/src/outlook-desktop-installation-proof.js";
const packagedProofImport = "./outlook-desktop-installation-proof.js";

async function writeFixture(path, contents) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, contents);
}

async function writeDesktopMainFixture(root) {
  await writeFixture(
    join(root, "src/main/outlook-installation.js"),
    `import { signOutlookDesktopLifecycleRequest } from "${sourceProofImport}";\n`,
  );
}

test("desktop packaged main stages its canonical Outlook proof dependency", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "matter-main-runtime-package-test-"));
  try {
    const targetAppSourceDir = join(fixtureRoot, "packaged-app");
    const proofSource = "export const proof = true;\n";
    await writeFixture(
      join(fixtureRoot, "packages/email-dms/src/outlook-desktop-installation-proof.js"),
      proofSource,
    );
    await writeDesktopMainFixture(targetAppSourceDir);

    await stageDesktopMainRuntimeDependencies({ targetAppSourceDir, repoRoot: fixtureRoot });

    assert.equal(
      await readFile(join(targetAppSourceDir, "src/main/outlook-desktop-installation-proof.js"), "utf8"),
      proofSource,
    );
    const stagedInstallation = await readFile(
      join(targetAppSourceDir, "src/main/outlook-installation.js"),
      "utf8",
    );
    assert.equal(stagedInstallation.includes(sourceProofImport), false);
    assert.equal(stagedInstallation.includes(packagedProofImport), true);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("desktop runtime staging is identical by channel and excludes local data from formal packages", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "matter-runtime-package-test-"));
  try {
    const rosterPath = join(fixtureRoot, "fixtures/roster.json");
    const photosPath = join(fixtureRoot, "fixtures/photos");
    const registrationSeedPath = join(fixtureRoot, "fixtures/registration-seed.json");
    await writeFixture(join(fixtureRoot, "apps/api/src/server.js"), "export const runtime = true;\n");
    await writeFixture(join(fixtureRoot, "packages/example/src/index.js"), "export const packageRuntime = true;\n");
    await writeFixture(
      join(fixtureRoot, "packages/email-dms/src/outlook-desktop-installation-proof.js"),
      "export const proof = true;\n",
    );
    await writeFixture(rosterPath, `${JSON.stringify({
      members: [{
        employee_id: "employee-1",
        professional_profile: { profile_kind: "public", practice_areas: ["litigation"] }
      }]
    })}\n`);
    await writeFixture(join(photosPath, "employee-1.png"), "png-fixture");
    await writeFixture(registrationSeedPath, "{\"users\":[]}\n");

    const internalApp = join(fixtureRoot, "internal-app");
    await writeDesktopMainFixture(internalApp);
    const internal = await copyDesktopLocalApiRuntime({
      targetAppSourceDir: internalApp,
      repoRoot: fixtureRoot,
      rosterSourcePath: rosterPath,
      photoSourcePath: photosPath,
      registrationSeedSourcePath: registrationSeedPath
    });
    assert.equal(internal.included, true);
    assert.equal(existsSync(join(internalApp, "runtime/apps/api/src/server.js")), true);
    assert.equal(existsSync(join(internalApp, "runtime/packages/example/src/index.js")), true);
    assert.equal(existsSync(join(internalApp, "runtime/apps/api/src/hrx-member-roster-source-of-truth.json")), true);
    assert.equal(existsSync(join(internalApp, "runtime/apps/api/src/hrx-member-photos/employee-1.png")), true);
    assert.equal(existsSync(join(internalApp, "runtime/apps/api/src/matter-vault-user-registration-seed.json")), true);
    const publicCatalog = JSON.parse(await readFile(
      join(internalApp, "runtime/apps/api/src/hrx-public-professional-profile-catalog.json"),
      "utf8"
    ));
    assert.equal(publicCatalog.profiles[0].employee_id, "employee-1");

    const formalApp = join(fixtureRoot, "formal-app");
    await writeDesktopMainFixture(formalApp);
    await writeFixture(join(formalApp, "runtime/stale-private-data.json"), "{}\n");
    const formal = await copyDesktopLocalApiRuntime({
      targetAppSourceDir: formalApp,
      repoRoot: fixtureRoot,
      formalRelease: true
    });
    assert.equal(formal.included, false);
    assert.equal(existsSync(join(formalApp, "runtime")), false);
    assert.equal(existsSync(join(formalApp, "src/main/outlook-desktop-installation-proof.js")), true);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
