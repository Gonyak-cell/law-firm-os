import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  cleanupRolledBackProfilePhotoChange,
  prepareProfilePhotoChange,
  promoteProfilePhotoChange,
  rollbackProfilePhotoChange,
} from "../lib/profile-photo-server-operation.mjs";
import {
  profilePhotoOperationPaths,
  resolveActiveGeneration,
  validateProfilePhotoSafeRoot,
} from "../lib/profile-photo-operation-root.mjs";
import { verifyProfilePhotoManifest } from "../validate-profile-photo-replacement-manifest.mjs";
import { opaqueChangeRef, provisionOperationRoot, tempRoot } from "./profile-media-test-fixture.mjs";

const SCRIPT = fileURLToPath(new URL("../run-profile-photo-server-operation.mjs", import.meta.url));
const OPERATION_MODULE = new URL("../lib/profile-photo-server-operation.mjs", import.meta.url).href;

function assertCode(callback, code) {
  assert.throws(callback, (error) => error?.code === code);
}

function executeOptions(fixture) {
  return { ...fixture, testOnly: true, execute: true };
}

function crashOperation(exportName, fixture, crashPoint) {
  const childSource = [
    `import * as operations from ${JSON.stringify(OPERATION_MODULE)};`,
    `operations[${JSON.stringify(exportName)}]({ ...${JSON.stringify({
      root: fixture.root,
      changeRef: fixture.changeRef,
      testOnly: true,
      execute: true,
    })}, crashHook(point) { if (point === ${JSON.stringify(crashPoint)}) process.exit(91); } });`,
  ].join("\n");
  return spawnSync(process.execPath, ["--input-type=module", "--eval", childSource], { encoding: "utf8" });
}

test("dry-run is default and leaves generations, manifests, records, and active pointer unchanged", (testContext) => {
  const fixture = provisionOperationRoot(testContext);
  const before = readdirSync(fixture.root, { recursive: true }).sort();
  const result = prepareProfilePhotoChange({ ...fixture, testOnly: true });
  assert.equal(result.verdict, "DRY_RUN");
  const paths = profilePhotoOperationPaths(fixture.root, fixture.changeRef);
  assert.equal(existsSync(paths.candidateGeneration), false);
  assert.equal(existsSync(paths.operationRecord), false);
  assert.deepEqual(readdirSync(fixture.root, { recursive: true }).sort(), before);

  const cli = spawnSync(process.execPath, [SCRIPT, "prepare", "--root", fixture.root, "--change-ref", fixture.changeRef, "--test-only"], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).verdict, "DRY_RUN");
  assert.equal(existsSync(paths.candidateGeneration), false);
});

test("explicit TEST_ONLY CLI prepares an immutable candidate generation without switching active", (testContext) => {
  const fixture = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef("cli-local") });
  const paths = profilePhotoOperationPaths(fixture.root, fixture.changeRef);
  const cli = spawnSync(process.execPath, [
    SCRIPT, "prepare", "--root", fixture.root, "--change-ref", fixture.changeRef, "--test-only", "--execute",
  ], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).mutation_executed, true);
  assert.equal(existsSync(paths.candidateGeneration), true);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
});

test("single atomic pointer switches to candidate and rollback restores baseline before cleanup", (testContext) => {
  const fixture = provisionOperationRoot(testContext);
  const options = executeOptions(fixture);
  const paths = profilePhotoOperationPaths(fixture.root, fixture.changeRef);
  assert.equal(prepareProfilePhotoChange(options).mutation_executed, true);
  assert.equal(existsSync(paths.candidateGeneration), true);
  assert.equal(existsSync(paths.baselineManifest), true);
  assert.equal(existsSync(paths.candidateManifest), true);

  const promoted = promoteProfilePhotoChange(options);
  assert.equal(promoted.single_atomic_active_pointer_switch, true);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, paths.candidateGeneration.split("/").at(-1));
  verifyProfilePhotoManifest({ directory: resolveActiveGeneration(fixture.root).directory, manifestPath: paths.candidateManifest });

  rollbackProfilePhotoChange(options);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
  verifyProfilePhotoManifest({ directory: resolveActiveGeneration(fixture.root).directory, manifestPath: paths.baselineManifest });
  assert.equal(cleanupRolledBackProfilePhotoChange(options).mutation_executed, true);
  assert.equal(existsSync(paths.candidateGeneration), false);
  assert.equal(existsSync(paths.operationRecord), false);
  assert.equal(lstatSync(paths.active).isSymbolicLink(), true);
});

test("a failed sole rename leaves the old active pointer present and removes the prepared pointer", (testContext) => {
  const fixture = provisionOperationRoot(testContext);
  const options = executeOptions(fixture);
  prepareProfilePhotoChange(options);
  const paths = profilePhotoOperationPaths(fixture.root, fixture.changeRef);
  let calls = 0;
  assert.throws(() => promoteProfilePhotoChange({
    ...options,
    io: {
      rename() {
        calls += 1;
        throw new Error("synthetic sole rename failure");
      },
    },
  }));
  assert.equal(calls, 1);
  assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
  assert.equal(existsSync(paths.pointerTemp), false);
});

for (const crashPoint of ["before_pointer_prepare", "pointer_prepared", "pointer_switched", "pointer_durable"]) {
  test(`process death at ${crashPoint} leaves old or new active and rollback remains executable`, (testContext) => {
    const fixture = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef(crashPoint) });
    const options = executeOptions(fixture);
    prepareProfilePhotoChange(options);
    const child = crashOperation("promoteProfilePhotoChange", fixture, crashPoint);
    assert.equal(child.status, 91, child.stderr);
    const observed = resolveActiveGeneration(fixture.root).generationRef;
    const expected = ["before_pointer_prepare", "pointer_prepared"].includes(crashPoint)
      ? fixture.baselineGenerationRef
      : profilePhotoOperationPaths(fixture.root, fixture.changeRef).candidateGeneration.split("/").at(-1);
    assert.equal(observed, expected);
    rollbackProfilePhotoChange(options);
    assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
  });
}

for (const crashPoint of ["before_pointer_prepare", "pointer_prepared", "pointer_switched", "pointer_durable"]) {
  test(`rollback process death at ${crashPoint} leaves candidate or baseline active and retry restores baseline`, (testContext) => {
    const fixture = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef(`rollback-${crashPoint}`) });
    const options = executeOptions(fixture);
    prepareProfilePhotoChange(options);
    promoteProfilePhotoChange(options);
    const child = crashOperation("rollbackProfilePhotoChange", fixture, crashPoint);
    assert.equal(child.status, 91, child.stderr);
    const observed = resolveActiveGeneration(fixture.root).generationRef;
    const expected = ["before_pointer_prepare", "pointer_prepared"].includes(crashPoint)
      ? profilePhotoOperationPaths(fixture.root, fixture.changeRef).candidateGeneration.split("/").at(-1)
      : fixture.baselineGenerationRef;
    assert.equal(observed, expected);
    rollbackProfilePhotoChange(options);
    assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
  });
}

for (const crashPoint of ["candidate_copied", "candidate_files_durable", "candidate_generation_published"]) {
  test(`prepare process death at ${crashPoint} never changes the active baseline`, (testContext) => {
    const fixture = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef(`prepare-${crashPoint}`) });
    const child = crashOperation("prepareProfilePhotoChange", fixture, crashPoint);
    assert.equal(child.status, 91, child.stderr);
    assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
    assert.equal(lstatSync(profilePhotoOperationPaths(fixture.root, fixture.changeRef).active).isSymbolicLink(), true);
  });
}

for (const crashPoint of ["candidate_generation_removed", "operation_metadata_removed", "cleanup_durable"]) {
  test(`cleanup process death at ${crashPoint} leaves the restored baseline active`, (testContext) => {
    const fixture = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef(`cleanup-${crashPoint}`) });
    const options = executeOptions(fixture);
    prepareProfilePhotoChange(options);
    promoteProfilePhotoChange(options);
    rollbackProfilePhotoChange(options);
    const child = crashOperation("cleanupRolledBackProfilePhotoChange", fixture, crashPoint);
    assert.equal(child.status, 91, child.stderr);
    assert.equal(resolveActiveGeneration(fixture.root).generationRef, fixture.baselineGenerationRef);
    assert.equal(lstatSync(profilePhotoOperationPaths(fixture.root, fixture.changeRef).active).isSymbolicLink(), true);
  });
}

test("path traversal, production labels, symlink roots, data symlinks, and stale paths fail closed", (testContext) => {
  const fixture = provisionOperationRoot(testContext);
  assertCode(() => prepareProfilePhotoChange({ ...fixture, changeRef: "../../escape", testOnly: true }), "CHANGE_REF_INVALID");
  assertCode(() => validateProfilePhotoSafeRoot("/", { testOnly: true }), "SAFE_ROOT_BROAD");

  const linkParent = tempRoot(testContext, "lawos-profile-link-");
  const link = join(linkParent, "linked-root");
  symlinkSync(fixture.root, link);
  assertCode(() => prepareProfilePhotoChange({ root: link, changeRef: fixture.changeRef, testOnly: true }), "OPERATION_PATH_INVALID");

  const sentinel = join(fixture.root, ".lawos-profile-media-root.json");
  const metadata = JSON.parse(readFileSync(sentinel, "utf8"));
  metadata.environment = "production";
  writeFileSync(sentinel, `${JSON.stringify(metadata)}\n`, { mode: 0o600 });
  assertCode(() => prepareProfilePhotoChange({ ...fixture, testOnly: true }), "SAFE_ROOT_SENTINEL_INVALID");

  const symlinkEntry = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef("symlink-entry") });
  const symlinkPaths = profilePhotoOperationPaths(symlinkEntry.root, symlinkEntry.changeRef);
  const photoNames = readdirSync(symlinkPaths.source).sort();
  rmSync(join(symlinkPaths.source, photoNames[0]));
  symlinkSync(join(symlinkPaths.source, photoNames[1]), join(symlinkPaths.source, photoNames[0]));
  assertCode(() => prepareProfilePhotoChange({ ...symlinkEntry, testOnly: true }), "PHOTO_DIRECTORY_ENTRY_TYPE");

  const second = provisionOperationRoot(testContext, { changeRef: opaqueChangeRef("stale") });
  const secondPaths = profilePhotoOperationPaths(second.root, second.changeRef);
  mkdirSync(secondPaths.preparing);
  assertCode(() => prepareProfilePhotoChange({ ...second, testOnly: true }), "OPERATION_STALE_PATH");
});

test("all operation paths are derived inside the approved TEST_ONLY root", (testContext) => {
  const fixture = provisionOperationRoot(testContext);
  const paths = profilePhotoOperationPaths(fixture.root, fixture.changeRef);
  assert.equal(dirname(paths.active), fixture.root);
  assert.equal(dirname(paths.candidateGeneration), join(fixture.root, "generations"));
  assert.equal(dirname(paths.source), join(fixture.root, "incoming"));
  assert.ok(Object.values(paths).every((path) => path.startsWith(`${fixture.root}/`)));
  assert.equal(validateProfilePhotoSafeRoot(fixture.root, { testOnly: true }).root, fixture.root);
});
