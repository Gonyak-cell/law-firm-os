import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME,
  HRX_MEMBER_PHOTO_ARTIFACT_METADATA_SCHEMA,
  createHrxMemberPhotoProvider,
  validatedMemberPhotoGenerationRef,
} from "../../apps/api/src/hrx-member-roster-registry.js";
import {
  JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
  JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY,
  JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY,
  JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA,
  JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY,
  emptyJsonPostgresProductionSources,
  loadJsonPostgresProductionProfilePhotoBundle,
  materializeJsonPostgresProductionProfilePhotoBundle,
  parseJsonPostgresProductionGitTree,
  redactJsonPostgresProductionRuntimeSource,
  validateJsonPostgresProductionArtifactEntries,
  validateJsonPostgresProductionDeploymentManifest,
  validateJsonPostgresProductionSourceBoundary,
  validateJsonPostgresProductionSourceOverrides,
  withJsonPostgresProductionArtifactOutputTransaction,
} from "../lib/json-postgres-production-artifact.mjs";
import { publicProfessionalProfileCatalog } from "../lib/hrx-public-professional-profile.mjs";
import { captureProfilePhotoManifest } from "../validate-profile-photo-replacement-manifest.mjs";
import {
  syntheticFilename,
  syntheticPng,
  tempRoot,
  writePhotoDirectory,
} from "./profile-media-test-fixture.mjs";

function oid(character) {
  return character.repeat(40);
}

const CRC32_TABLE = Object.freeze(Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
}));

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.allocUnsafe(12 + data.byteLength);
  chunk.writeUInt32BE(data.byteLength, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.byteLength);
  return chunk;
}

function syntheticLargePng(index, payloadBytes) {
  const original = syntheticPng(index);
  const idatOffset = original.indexOf(Buffer.from("IDAT")) - 4;
  return Buffer.concat([
    original.subarray(0, idatOffset),
    pngChunk("tEXt", Buffer.alloc(payloadBytes, index)),
    original.subarray(idatOffset),
  ]);
}

function createPrivatePhotoCase(testContext, name = "valid") {
  const root = tempRoot(testContext, `lawos-production-profile-${name}-`);
  const repositoryRoot = join(root, "repository");
  const privateRoot = join(root, "private");
  const stagingRoot = join(root, "staging");
  mkdirSync(repositoryRoot, { mode: 0o700 });
  mkdirSync(privateRoot, { mode: 0o700 });
  mkdirSync(stagingRoot, { mode: 0o700 });
  const directory = writePhotoDirectory(privateRoot, "photos");
  const manifestPath = join(privateRoot, "profile-photo-manifest.json");
  captureProfilePhotoManifest({ directory, manifestPath });
  return { root, repositoryRoot, privateRoot, stagingRoot, directory, manifestPath };
}

function loadPrivatePhotoCase(fixture) {
  return loadJsonPostgresProductionProfilePhotoBundle({
    directory: fixture.directory,
    manifestPath: fixture.manifestPath,
    repositoryRoot: fixture.repositoryRoot,
  });
}

const SYNTHETIC_TRACKED_PROFILE_PHOTOS = Object.freeze(
  Array.from({ length: 5 }, (_, index) =>
    `${JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY}/${String(index + 1).repeat(64)}.png`),
);
const BUILD_SCRIPT_PATH = fileURLToPath(
  new URL("../build-json-postgres-production-artifact.mjs", import.meta.url),
);
const ARTIFACT_LIBRARY_PATH = fileURLToPath(
  new URL("../lib/json-postgres-production-artifact.mjs", import.meta.url),
);
const ARTIFACT_LIBRARY_URL = new URL(
  "../lib/json-postgres-production-artifact.mjs",
  import.meta.url,
).href;
const PROFILE_MEDIA_FIXTURE_URL = new URL(
  "./profile-media-test-fixture.mjs",
  import.meta.url,
).href;
const PROFILE_PHOTO_MANIFEST_URL = new URL(
  "../validate-profile-photo-replacement-manifest.mjs",
  import.meta.url,
).href;

function outputTransactionRoot(outputDir) {
  const names = readdirSync(outputDir).filter((name) =>
    /^\.lawos-production-output-[a-f0-9]{32}$/u.test(name));
  assert.equal(names.length, 1);
  return join(outputDir, names[0]);
}

function transactionChildSource({ pausePhase }) {
  const pauseInsideBuild = pausePhase === "private-staging";
  const pauseDuringPendingLockClaim = pausePhase === "pending-lock-claim";
  return `
    import { linkSync, mkdirSync, writeFileSync } from "node:fs";
    import { dirname, join } from "node:path";
    const {
      loadJsonPostgresProductionProfilePhotoBundle: loadBundle,
      materializeJsonPostgresProductionProfilePhotoBundle: materializeBundle,
      withJsonPostgresProductionArtifactOutputTransaction: run,
    } =
      await import(${JSON.stringify(ARTIFACT_LIBRARY_URL)});
    const { writePhotoDirectory } = await import(${JSON.stringify(PROFILE_MEDIA_FIXTURE_URL)});
    const { captureProfilePhotoManifest } =
      await import(${JSON.stringify(PROFILE_PHOTO_MANIFEST_URL)});
    const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    run({
      outputDir: process.env.LAWOS_TEST_OUTPUT,
      archiveFilename: "artifact.zip",
      manifestFilename: "artifact.manifest.json",
      build({ archivePath, manifestPath, stagingRoot }) {
        const privateRoot = join(
          dirname(process.env.LAWOS_TEST_OUTPUT),
          "private-input-" + process.pid,
        );
        mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
        const privateDirectory = writePhotoDirectory(privateRoot, "photos");
        const privateManifestPath = join(privateRoot, "manifest.json");
        captureProfilePhotoManifest({
          directory: privateDirectory,
          manifestPath: privateManifestPath,
        });
        materializeBundle({
          bundle: loadBundle({
            directory: privateDirectory,
            manifestPath: privateManifestPath,
            repositoryRoot: process.cwd(),
          }),
          stagingRoot,
        });
        ${pauseInsideBuild ? `
          writeFileSync(process.env.LAWOS_TEST_READY, "ready", { mode: 0o600 });
          pause();
        ` : ""}
        writeFileSync(archivePath, "complete archive", { mode: 0o600 });
        writeFileSync(manifestPath, "complete manifest", { mode: 0o600 });
        return "complete";
      },
      ${pauseInsideBuild || pauseDuringPendingLockClaim ? "" : `
        io: {
          linkSync(source, target) {
            linkSync(source, target);
            writeFileSync(process.env.LAWOS_TEST_READY, "ready", { mode: 0o600 });
            pause();
          },
        },
      `}
      ${pauseDuringPendingLockClaim ? `
        io: {
          afterPendingLockClaim() {
            writeFileSync(process.env.LAWOS_TEST_READY, "ready", { mode: 0o600 });
            pause();
          },
        },
      ` : ""}
    });
  `;
}

function postCommitFailureChildSource() {
  return `
    import { writeFileSync } from "node:fs";
    const { withJsonPostgresProductionArtifactOutputTransaction: run } =
      await import(${JSON.stringify(ARTIFACT_LIBRARY_URL)});
    run({
      outputDir: process.env.LAWOS_TEST_OUTPUT,
      archiveFilename: "artifact.zip",
      manifestFilename: "artifact.manifest.json",
      build({ archivePath, manifestPath }) {
        writeFileSync(archivePath, "committed archive", { mode: 0o600 });
        writeFileSync(manifestPath, "committed manifest", { mode: 0o600 });
      },
      io: {
        afterCommit() {
          throw new Error("synthetic post-commit cleanup failure");
        },
      },
    });
  `;
}

async function killOutputTransaction(outputDir, pausePhase = "first-link") {
  const readyPath = join(dirname(outputDir), `ready-${basename(outputDir)}`);
  const before = new Set(readdirSync(outputDir).filter((name) =>
    /^\.lawos-production-output-[a-f0-9]{32}$/u.test(name)));
  const child = spawn(process.execPath, [
    "--input-type=module",
    "--eval",
    transactionChildSource({ pausePhase }),
  ], {
    env: {
      ...process.env,
      LAWOS_TEST_OUTPUT: outputDir,
      LAWOS_TEST_READY: readyPath,
    },
    stdio: "ignore",
  });
  const exitPromise = new Promise((resolvePromise) => {
    child.once("exit", (code, signal) => resolvePromise({ code, signal }));
  });
  let exit;
  try {
    await waitForPath(readyPath, 10_000);
    child.kill("SIGKILL");
    exit = await exitPromise;
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    throw error;
  }
  assert.equal(exit.signal, "SIGKILL");
  const created = readdirSync(outputDir).filter((name) =>
    /^\.lawos-production-output-[a-f0-9]{32}$/u.test(name) && !before.has(name));
  const expectedCreatedCount = pausePhase === "pending-lock-claim" ? 0 : 1;
  assert.equal(created.length, expectedCreatedCount);
  return {
    exit,
    readyPath,
    transactionRoot: created.length === 1 ? join(outputDir, created[0]) : null,
  };
}

function successfulOutputTransaction(outputDir) {
  return withJsonPostgresProductionArtifactOutputTransaction({
    outputDir,
    archiveFilename: "artifact.zip",
    manifestFilename: "artifact.manifest.json",
    build({ archivePath, manifestPath }) {
      writeFileSync(archivePath, "replacement archive", { mode: 0o600 });
      writeFileSync(manifestPath, "replacement manifest", { mode: 0o600 });
      return "recovered";
    },
  });
}

async function waitForPath(path, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${basename(path)}`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
}

test("production Git tree excludes private-staging and every tracked profile-photo source", () => {
  const tree = Buffer.from([
    `100644 blob ${oid("a")}\tapps/api/src/lambda.js`,
    `100644 blob ${oid("b")}\tapps/api/src/private-staging-admin-lambda.js`,
    `100644 blob ${oid("c")}\tpackages/runtime-auth/src/private-staging-synthetic-email.js`,
    `100644 blob ${oid("d")}\tpackages/persistence/src/postgres/execution-contract.js`,
    ...SYNTHETIC_TRACKED_PROFILE_PHOTOS.map((path, index) =>
      `100644 blob ${oid(String(index + 1))}\t${path}`),
    `100644 blob ${oid("6")}\tapps/api/src/hrx-member-photos/not-approved.png`,
    `100644 blob ${oid("7")}\t${JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY}`,
    "",
  ].join("\0"));
  assert.deepEqual(
    parseJsonPostgresProductionGitTree(tree).map((entry) => entry.path),
    [
      "apps/api/src/lambda.js",
      "packages/persistence/src/postgres/execution-contract.js",
    ],
  );
});

test("production artifact CLI fails closed when private profile-photo inputs are absent", (testContext) => {
  const root = tempRoot(testContext, "lawos-production-profile-cli-");
  const result = spawnSync(process.execPath, [
    BUILD_SCRIPT_PATH,
    "--output-dir",
    join(root, "output"),
  ], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--profile-photo-directory is required/u);
  assert.equal(result.stdout, "");
  const builderSource = readFileSync(BUILD_SCRIPT_PATH, "utf8");
  assert.doesNotMatch(builderSource, /--(?:io|before-open|write-file)/u);
  assert.doesNotMatch(builderSource, /\bio\s*:/u);
  assert.doesNotMatch(
    readFileSync(ARTIFACT_LIBRARY_PATH, "utf8"),
    /inspectProfilePhotoDirectory/u,
  );
});

test("production output transaction removes archive, manifest, and temp data at every failure boundary", (testContext) => {
  const root = tempRoot(testContext, "lawos-production-output-cleanup-");
  const cases = [
    {
      name: "entry-validation",
      expected: /entry validation failure/u,
      build({ archivePath }) {
        writeFileSync(archivePath, "partial archive", { mode: 0o600 });
        throw new Error("entry validation failure");
      },
    },
    {
      name: "size-validation",
      expected: /size validation failure/u,
      build({ archivePath }) {
        writeFileSync(archivePath, "partial archive", { mode: 0o600 });
        throw new Error("size validation failure");
      },
    },
    {
      name: "manifest-validation",
      expected: /manifest validation failure/u,
      build({ archivePath, manifestPath }) {
        writeFileSync(archivePath, "complete archive", { mode: 0o600 });
        writeFileSync(manifestPath, "partial manifest", { mode: 0o600 });
        throw new Error("manifest validation failure");
      },
    },
    {
      name: "missing-manifest",
      expected: /production manifest was not created/u,
      build({ archivePath }) {
        writeFileSync(archivePath, "complete archive", { mode: 0o600 });
      },
    },
  ];
  for (const candidate of cases) {
    const outputDir = join(root, candidate.name);
    mkdirSync(outputDir, { mode: 0o700 });
    assert.throws(
      () => withJsonPostgresProductionArtifactOutputTransaction({
        outputDir,
        archiveFilename: "artifact.zip",
        manifestFilename: "artifact.manifest.json",
        build: candidate.build,
      }),
      candidate.expected,
    );
    assert.deepEqual(readdirSync(outputDir), []);
  }

  for (const failAfterLink of [1, 2]) {
    const outputDir = join(root, `promotion-${failAfterLink}`);
    mkdirSync(outputDir, { mode: 0o700 });
    let links = 0;
    assert.throws(
      () => withJsonPostgresProductionArtifactOutputTransaction({
        outputDir,
        archiveFilename: "artifact.zip",
        manifestFilename: "artifact.manifest.json",
        build({ archivePath, manifestPath }) {
          writeFileSync(archivePath, "complete archive", { mode: 0o600 });
          writeFileSync(manifestPath, "complete manifest", { mode: 0o600 });
        },
        io: {
          linkSync(source, target) {
            linkSync(source, target);
            links += 1;
            if (links === failAfterLink) throw new Error("synthetic promotion failure");
          },
        },
      }),
      /synthetic promotion failure/u,
    );
    assert.equal(links, failAfterLink);
    assert.deepEqual(readdirSync(outputDir), []);
  }

  const successDir = join(root, "success");
  mkdirSync(successDir, { mode: 0o700 });
  const success = withJsonPostgresProductionArtifactOutputTransaction({
    outputDir: successDir,
    archiveFilename: "artifact.zip",
    manifestFilename: "artifact.manifest.json",
    build({ archivePath, manifestPath }) {
      writeFileSync(archivePath, "complete archive", { mode: 0o600 });
      writeFileSync(manifestPath, "complete manifest", { mode: 0o600 });
      return "complete";
    },
  });
  assert.equal(success.result, "complete");
  assert.deepEqual(readdirSync(successDir).sort(), ["artifact.manifest.json", "artifact.zip"]);
});

test("SIGKILL after the first publication link is contained and recovered on the next invocation", async (testContext) => {
  const root = tempRoot(testContext, "lawos-production-output-sigkill-");
  const outputDir = join(root, "output");
  mkdirSync(outputDir, { mode: 0o700 });
  const killed = await killOutputTransaction(outputDir, "first-link");
  const transactionName = basename(killed.transactionRoot);
  assert.deepEqual(readdirSync(outputDir).sort(), [
    ".lawos-production-output.lock",
    transactionName,
    "artifact.zip",
  ].sort());
  assert.equal(lstatSync(killed.transactionRoot).mode & 0o777, 0o700);
  const privatePhotoRoot = join(
    killed.transactionRoot,
    "private-build-staging/apps/api/src/hrx-member-photos",
  );
  const privatePhotoNames = readdirSync(privatePhotoRoot);
  assert.equal(privatePhotoNames.length, 10);
  assert.ok(privatePhotoNames.every((name) => /^[a-f0-9]{64}\.png$/u.test(name)));
  assert.ok(privatePhotoNames.every((name) => readFileSync(join(privatePhotoRoot, name)).length > 0));
  assert.equal(lstatSync(join(outputDir, ".lawos-production-output.lock")).mode & 0o077, 0);
  const recoveryJournalPath = join(killed.transactionRoot, ".recovery-journal.json");
  const recoveryJournal = JSON.parse(readFileSync(recoveryJournalPath, "utf8"));
  assert.equal(lstatSync(recoveryJournalPath).mode & 0o077, 0);
  assert.deepEqual(Object.keys(recoveryJournal).sort(), [
    "outputs",
    "schema_version",
    "transaction_name",
    "transaction_nonce",
  ]);
  assert.deepEqual(recoveryJournal.outputs.map((output) => output.role), [
    "archive",
    "manifest",
  ]);
  assert.ok(recoveryJournal.outputs.every((output) => /^[a-f0-9]{64}$/u.test(output.sha256)));

  const recovered = successfulOutputTransaction(outputDir);
  assert.equal(recovered.result, "recovered");
  assert.deepEqual(readdirSync(outputDir).sort(), [
    "artifact.manifest.json",
    "artifact.zip",
  ]);
  assert.equal(readFileSync(join(outputDir, "artifact.zip"), "utf8"), "replacement archive");
  assert.doesNotMatch(
    readFileSync(BUILD_SCRIPT_PATH, "utf8"),
    /(?:tmpdir|mkdtempSync|lawos-production-artifact-)/u,
  );
});

test("SIGKILL while removing the pending lock recovers same-inode lock names idempotently", async (testContext) => {
  const root = tempRoot(testContext, "lawos-production-output-lock-sigkill-");
  const outputDir = join(root, "output");
  mkdirSync(outputDir, { mode: 0o700 });
  const killed = await killOutputTransaction(outputDir, "pending-lock-claim");
  assert.equal(killed.transactionRoot, null);
  const lockNames = readdirSync(outputDir).sort();
  assert.equal(lockNames.length, 2);
  assert.ok(lockNames.includes(".lawos-production-output.lock"));
  const recoveryLockName = lockNames.find((name) =>
    /^\.lawos-production-output\.lock\.recovering-[a-f0-9]{64}$/u.test(name));
  assert.ok(recoveryLockName);
  const exactLock = lstatSync(
    join(outputDir, ".lawos-production-output.lock"),
    { bigint: true },
  );
  const recoveryLock = lstatSync(join(outputDir, recoveryLockName), { bigint: true });
  assert.equal(exactLock.dev, recoveryLock.dev);
  assert.equal(exactLock.ino, recoveryLock.ino);
  assert.equal(exactLock.mode, recoveryLock.mode);
  assert.equal(exactLock.uid, recoveryLock.uid);

  const recovered = successfulOutputTransaction(outputDir);
  assert.equal(recovered.result, "recovered");
  assert.deepEqual(readdirSync(outputDir).sort(), [
    "artifact.manifest.json",
    "artifact.zip",
  ]);
});

test("a live private-staging transaction blocks concurrent builds without deleting its contents", async (testContext) => {
  const root = tempRoot(testContext, "lawos-production-output-live-");
  const outputDir = join(root, "output");
  const readyPath = join(root, "ready");
  mkdirSync(outputDir, { mode: 0o700 });
  const child = spawn(process.execPath, [
    "--input-type=module",
    "--eval",
    transactionChildSource({ pausePhase: "private-staging" }),
  ], {
    env: {
      ...process.env,
      LAWOS_TEST_OUTPUT: outputDir,
      LAWOS_TEST_READY: readyPath,
    },
    stdio: "ignore",
  });
  testContext.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  });
  await waitForPath(readyPath);
  const transactionRoot = outputTransactionRoot(outputDir);
  const privatePhotoRoot = join(
    transactionRoot,
    "private-build-staging/apps/api/src/hrx-member-photos",
  );
  const entriesBefore = readdirSync(outputDir).sort();
  const privateNamesBefore = readdirSync(privatePhotoRoot).sort();
  const privateBytesBefore = privateNamesBefore.map((name) =>
    readFileSync(join(privatePhotoRoot, name)));
  assert.throws(
    () => successfulOutputTransaction(outputDir),
    (error) => error?.code === "PRODUCTION_OUTPUT_BUILD_IN_PROGRESS",
  );
  assert.deepEqual(readdirSync(outputDir).sort(), entriesBefore);
  assert.deepEqual(readdirSync(privatePhotoRoot).sort(), privateNamesBefore);
  assert.deepEqual(
    privateNamesBefore.map((name) => readFileSync(join(privatePhotoRoot, name))),
    privateBytesBefore,
  );

  child.kill("SIGKILL");
  await new Promise((resolvePromise) => child.once("exit", resolvePromise));
  const recovered = successfulOutputTransaction(outputDir);
  assert.equal(recovered.result, "recovered");
  assert.deepEqual(readdirSync(outputDir).sort(), [
    "artifact.manifest.json",
    "artifact.zip",
  ]);
});

test("post-commit cleanup failure preserves authority until a dead-owner recovery finalizes it", (testContext) => {
  const root = tempRoot(testContext, "lawos-production-output-post-commit-");
  const outputDir = join(root, "output");
  mkdirSync(outputDir, { mode: 0o700 });
  const result = spawnSync(process.execPath, [
    "--input-type=module",
    "--eval",
    postCommitFailureChildSource(),
  ], {
    encoding: "utf8",
    env: { ...process.env, LAWOS_TEST_OUTPUT: outputDir },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /synthetic post-commit cleanup failure/u);
  const transactionRoot = outputTransactionRoot(outputDir);
  assert.ok(existsSync(join(transactionRoot, ".recovery-journal.json")));
  assert.ok(existsSync(join(transactionRoot, ".publication-committed.json")));
  assert.ok(existsSync(join(outputDir, ".lawos-production-output.lock")));
  assert.equal(readFileSync(join(outputDir, "artifact.zip"), "utf8"), "committed archive");
  assert.equal(
    readFileSync(join(outputDir, "artifact.manifest.json"), "utf8"),
    "committed manifest",
  );

  assert.throws(
    () => successfulOutputTransaction(outputDir),
    /production artifact output already exists/u,
  );
  assert.deepEqual(readdirSync(outputDir).sort(), [
    "artifact.manifest.json",
    "artifact.zip",
  ]);
  assert.equal(readFileSync(join(outputDir, "artifact.zip"), "utf8"), "committed archive");
});

test("crash recovery fails closed for torn, symlinked, swapped, hardlinked, and ambiguous ownership", async (testContext) => {
  const root = tempRoot(testContext, "lawos-production-output-adversarial-");

  async function crashedOutput(name, pausePhase = "first-link") {
    const outputDir = join(root, name);
    mkdirSync(outputDir, { mode: 0o700 });
    const killed = await killOutputTransaction(outputDir, pausePhase);
    return { outputDir, ...killed };
  }

  function assertClosed(candidate, codePattern) {
    const before = readdirSync(candidate.outputDir).sort();
    assert.throws(
      () => successfulOutputTransaction(candidate.outputDir),
      (error) => codePattern.test(String(error?.code ?? "")),
    );
    assert.deepEqual(readdirSync(candidate.outputDir).sort(), before);
  }

  const tornJournal = await crashedOutput("torn-journal");
  const tornJournalPath = join(tornJournal.transactionRoot, ".recovery-journal.json");
  chmodSync(tornJournalPath, 0o600);
  writeFileSync(tornJournalPath, "{\"schema_version\":", { mode: 0o600 });
  chmodSync(tornJournalPath, 0o400);
  const tornArchive = readFileSync(join(tornJournal.outputDir, "artifact.zip"));
  assertClosed(tornJournal, /PRODUCTION_OUTPUT_CONTROL_INVALID/u);
  assert.deepEqual(readFileSync(join(tornJournal.outputDir, "artifact.zip")), tornArchive);

  const symlinkJournal = await crashedOutput("symlink-journal");
  const symlinkJournalPath = join(symlinkJournal.transactionRoot, ".recovery-journal.json");
  const savedJournal = join(root, "saved-journal.json");
  renameSync(symlinkJournalPath, savedJournal);
  symlinkSync(savedJournal, symlinkJournalPath, "file");
  assertClosed(symlinkJournal, /PRODUCTION_OUTPUT_CONTROL_INVALID/u);
  assert.ok(lstatSync(symlinkJournalPath).isSymbolicLink());
  assert.ok(readFileSync(savedJournal).byteLength > 0);

  const danglingJournal = await crashedOutput("dangling-journal");
  const danglingJournalPath = join(danglingJournal.transactionRoot, ".recovery-journal.json");
  const savedDanglingJournal = join(root, "saved-dangling-journal.json");
  renameSync(danglingJournalPath, savedDanglingJournal);
  symlinkSync(join(root, "missing-journal-target"), danglingJournalPath, "file");
  assertClosed(danglingJournal, /PRODUCTION_OUTPUT_CONTROL_INVALID/u);
  assert.ok(lstatSync(danglingJournalPath).isSymbolicLink());
  assert.ok(readFileSync(savedDanglingJournal).byteLength > 0);

  const hardlinkedJournal = await crashedOutput("hardlinked-journal");
  const hardlinkedJournalPath = join(
    hardlinkedJournal.transactionRoot,
    ".recovery-journal.json",
  );
  const savedHardlinkedJournal = join(root, "saved-hardlinked-journal.json");
  const attackerJournal = join(root, "attacker-journal.json");
  renameSync(hardlinkedJournalPath, savedHardlinkedJournal);
  writeFileSync(attackerJournal, "{}\n", { mode: 0o400 });
  linkSync(attackerJournal, hardlinkedJournalPath);
  const attackerJournalInode = lstatSync(attackerJournal, { bigint: true }).ino;
  assertClosed(hardlinkedJournal, /PRODUCTION_OUTPUT_CONTROL_INVALID/u);
  assert.equal(
    lstatSync(hardlinkedJournalPath, { bigint: true }).ino,
    attackerJournalInode,
  );
  assert.equal(readFileSync(attackerJournal, "utf8"), "{}\n");

  const swappedStaged = await crashedOutput("swapped-staged");
  const stagedArchive = join(swappedStaged.transactionRoot, "publication/artifact.zip");
  const savedStaged = join(root, "saved-staged.zip");
  const attackerStaged = join(root, "attacker-staged.zip");
  renameSync(stagedArchive, savedStaged);
  writeFileSync(attackerStaged, "attacker staged bytes", { mode: 0o600 });
  linkSync(attackerStaged, stagedArchive);
  assertClosed(swappedStaged, /PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH/u);
  assert.deepEqual(readFileSync(stagedArchive), readFileSync(attackerStaged));

  const symlinkFinal = await crashedOutput("symlink-final");
  const finalArchive = join(symlinkFinal.outputDir, "artifact.zip");
  const savedFinal = join(root, "saved-final.zip");
  const externalTarget = join(root, "external-final.zip");
  renameSync(finalArchive, savedFinal);
  writeFileSync(externalTarget, "external sentinel bytes", { mode: 0o600 });
  symlinkSync(externalTarget, finalArchive, "file");
  assertClosed(symlinkFinal, /PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH/u);
  assert.ok(lstatSync(finalArchive).isSymbolicLink());
  assert.equal(readFileSync(externalTarget, "utf8"), "external sentinel bytes");

  const hardlinkedFinal = await crashedOutput("hardlinked-final");
  const hardlinkedArchive = join(hardlinkedFinal.outputDir, "artifact.zip");
  const savedHardlinkedFinal = join(root, "saved-hardlinked-final.zip");
  const attackerHardlinkSource = join(root, "attacker-hardlink-source.zip");
  renameSync(hardlinkedArchive, savedHardlinkedFinal);
  writeFileSync(attackerHardlinkSource, "attacker hardlink bytes", { mode: 0o600 });
  linkSync(attackerHardlinkSource, hardlinkedArchive);
  const attackerInode = lstatSync(attackerHardlinkSource, { bigint: true }).ino;
  assertClosed(hardlinkedFinal, /PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH/u);
  assert.equal(lstatSync(hardlinkedArchive, { bigint: true }).ino, attackerInode);
  assert.equal(readFileSync(attackerHardlinkSource, "utf8"), "attacker hardlink bytes");

  const symlinkRoot = await crashedOutput("symlink-root");
  const savedTransactionRoot = join(root, "saved-transaction-root");
  const externalDirectory = join(root, "external-directory");
  renameSync(symlinkRoot.transactionRoot, savedTransactionRoot);
  mkdirSync(externalDirectory, { mode: 0o700 });
  writeFileSync(join(externalDirectory, "sentinel"), "external directory bytes", { mode: 0o600 });
  symlinkSync(externalDirectory, symlinkRoot.transactionRoot, "dir");
  assertClosed(symlinkRoot, /PRODUCTION_OUTPUT_RECOVERY_UNTRUSTED/u);
  assert.equal(
    readFileSync(join(externalDirectory, "sentinel"), "utf8"),
    "external directory bytes",
  );

  const ambiguous = await crashedOutput("ambiguous-owner");
  for (const controlPath of [
    join(ambiguous.outputDir, ".lawos-production-output.lock"),
    join(ambiguous.transactionRoot, ".transaction-owner.json"),
  ]) {
    const value = JSON.parse(readFileSync(controlPath, "utf8"));
    value.owner_pid = process.pid;
    value.owner_process_start_identity = "f".repeat(64);
    chmodSync(controlPath, 0o600);
    writeFileSync(controlPath, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    chmodSync(controlPath, 0o400);
  }
  assertClosed(ambiguous, /PRODUCTION_OUTPUT_RECOVERY_IDENTITY_AMBIGUOUS/u);

  const mismatchedLockClaim = await crashedOutput(
    "mismatched-lock-claim",
    "pending-lock-claim",
  );
  const mismatchedLockNames = readdirSync(mismatchedLockClaim.outputDir);
  const mismatchedClaimName = mismatchedLockNames.find((name) =>
    /^\.lawos-production-output\.lock\.recovering-[a-f0-9]{64}$/u.test(name));
  assert.ok(mismatchedClaimName);
  const mismatchedClaimPath = join(mismatchedLockClaim.outputDir, mismatchedClaimName);
  const savedOwnedClaim = join(root, "saved-owned-lock-claim");
  renameSync(mismatchedClaimPath, savedOwnedClaim);
  writeFileSync(
    mismatchedClaimPath,
    readFileSync(join(mismatchedLockClaim.outputDir, ".lawos-production-output.lock")),
    { mode: 0o400 },
  );
  const attackerClaimInode = lstatSync(mismatchedClaimPath, { bigint: true }).ino;
  assert.notEqual(
    attackerClaimInode,
    lstatSync(join(mismatchedLockClaim.outputDir, ".lawos-production-output.lock"), {
      bigint: true,
    }).ino,
  );
  assertClosed(mismatchedLockClaim, /PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH/u);
  assert.equal(lstatSync(mismatchedClaimPath, { bigint: true }).ino, attackerClaimInode);
  assert.ok(readFileSync(savedOwnedClaim).byteLength > 0);

  const arbitraryExisting = await crashedOutput("arbitrary-existing", "private-staging");
  writeFileSync(join(arbitraryExisting.outputDir, "artifact.zip"), "preexisting bytes", {
    mode: 0o600,
  });
  assert.throws(
    () => successfulOutputTransaction(arbitraryExisting.outputDir),
    /production artifact output already exists/u,
  );
  assert.equal(
    readFileSync(join(arbitraryExisting.outputDir, "artifact.zip"), "utf8"),
    "preexisting bytes",
  );
});

test("multiple dead owner-marked private staging roots recover without crossing ownership", async (testContext) => {
  const root = tempRoot(testContext, "lawos-production-output-multiple-");
  const outputDir = join(root, "output");
  mkdirSync(outputDir, { mode: 0o700 });
  const first = await killOutputTransaction(outputDir, "private-staging");
  const detachedFirstLock = join(root, "detached-first-lock");
  renameSync(join(outputDir, ".lawos-production-output.lock"), detachedFirstLock);
  const firstOwner = JSON.parse(readFileSync(
    join(first.transactionRoot, ".transaction-owner.json"),
    "utf8",
  ));
  const secondNonce = createHash("sha256").update("second stale transaction").digest("hex");
  const secondTransactionName = `.lawos-production-output-${secondNonce.slice(0, 32)}`;
  const secondTransactionRoot = join(outputDir, secondTransactionName);
  mkdirSync(secondTransactionRoot, { mode: 0o700 });
  writeFileSync(
    join(secondTransactionRoot, ".transaction-owner.json"),
    `${JSON.stringify({
      ...firstOwner,
      transaction_name: secondTransactionName,
      transaction_nonce: secondNonce,
    })}\n`,
    { mode: 0o400 },
  );
  mkdirSync(join(secondTransactionRoot, "private-build-staging"), { mode: 0o700 });
  writeFileSync(
    join(secondTransactionRoot, "private-build-staging/opaque.png"),
    "second private staging bytes",
    { mode: 0o400 },
  );
  assert.notEqual(first.transactionRoot, secondTransactionRoot);
  assert.equal(lstatSync(first.transactionRoot).mode & 0o777, 0o700);
  assert.equal(lstatSync(secondTransactionRoot).mode & 0o777, 0o700);
  assert.ok(readFileSync(detachedFirstLock).byteLength > 0);

  const recovered = successfulOutputTransaction(outputDir);
  assert.equal(recovered.result, "recovered");
  assert.deepEqual(readdirSync(outputDir).sort(), [
    "artifact.manifest.json",
    "artifact.zip",
  ]);
  assert.ok(readFileSync(detachedFirstLock).byteLength > 0);
});

test("valid external ten-photo bundle materializes immutable bytes and identity-free metadata", (testContext) => {
  const fixture = createPrivatePhotoCase(testContext);
  const bundle = loadPrivatePhotoCase(fixture);
  const result = materializeJsonPostgresProductionProfilePhotoBundle({
    bundle,
    stagingRoot: fixture.stagingRoot,
  });
  const photoRoot = join(fixture.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY);
  const metadataPath = join(fixture.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY);
  const metadataBytes = readFileSync(metadataPath);
  const metadata = JSON.parse(metadataBytes);
  assert.equal(readdirSync(photoRoot).length, 10);
  assert.ok(readdirSync(photoRoot).every((filename) => /^[a-f0-9]{64}\.png$/u.test(filename)));
  assert.ok(readdirSync(photoRoot).every((filename) => (statSync(join(photoRoot, filename)).mode & 0o222) === 0));
  assert.equal(statSync(metadataPath).mode & 0o222, 0);
  assert.deepEqual(Object.keys(metadata).sort(), [
    "generation_ref",
    "git_source_photo_entry_count",
    "injected_photo_entry_count",
    "private_manifest_entry_count",
    "private_manifest_schema_version",
    "private_manifest_sha256",
    "schema_version",
  ]);
  assert.equal(metadata.schema_version, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA);
  assert.equal(metadata.generation_ref, `profile_generation_${metadata.private_manifest_sha256.slice(0, 32)}`);
  assert.equal(metadata.private_manifest_entry_count, 10);
  assert.equal(metadata.injected_photo_entry_count, 10);
  assert.equal(metadata.git_source_photo_entry_count, 0);
  assert.equal(result.binding.metadata_sha256, createHash("sha256").update(metadataBytes).digest("hex"));
  assert.doesNotMatch(
    JSON.stringify(metadata),
    /"(?:name|display_name|email|work_email|employee_id|filename|content_sha256|photo_bytes|photo_base64)"/iu,
  );
});

test("builder metadata constants and bytes are accepted by the flat production API provider", (testContext) => {
  const fixture = createPrivatePhotoCase(testContext, "provider-contract");
  materializeJsonPostgresProductionProfilePhotoBundle({
    bundle: loadPrivatePhotoCase(fixture),
    stagingRoot: fixture.stagingRoot,
  });
  const sourcePath = join(fixture.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY);
  const artifactMetadataPath = join(
    fixture.stagingRoot,
    JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY,
  );
  const metadata = JSON.parse(readFileSync(artifactMetadataPath));
  assert.equal(
    HRX_MEMBER_PHOTO_ARTIFACT_METADATA_FILE_NAME,
    basename(JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY),
  );
  assert.equal(
    HRX_MEMBER_PHOTO_ARTIFACT_METADATA_SCHEMA,
    JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA,
  );
  const provider = createHrxMemberPhotoProvider({ sourcePath, artifactMetadataPath });
  const result = provider.readForEmployeeId("synthetic-profile-slot-1");
  assert.match(result?.dataUrl ?? "", /^data:image\/png;base64,/u);
  assert.equal(result?.generationRef, metadata.generation_ref);
  assert.equal(validatedMemberPhotoGenerationRef(result), metadata.generation_ref);
});

test("external profile-photo bundle rejects missing, extra, symlinked, escaped, duplicate, invalid, and hash-drifted inputs", (testContext) => {
  const fixture = createPrivatePhotoCase(testContext, "attacks");
  assert.throws(
    () => loadJsonPostgresProductionProfilePhotoBundle({ repositoryRoot: fixture.repositoryRoot }),
    /private profile-photo directory is required/u,
  );

  writeFileSync(join(fixture.directory, ".extra"), "extra");
  assert.throws(() => loadPrivatePhotoCase(fixture), /exactly ten/u);

  const symlinkDirectory = join(fixture.privateRoot, "photo-link");
  symlinkSync(fixture.directory, symlinkDirectory, "dir");
  assert.throws(
    () => loadJsonPostgresProductionProfilePhotoBundle({
      directory: symlinkDirectory,
      manifestPath: fixture.manifestPath,
      repositoryRoot: fixture.repositoryRoot,
    }),
    /canonical non-symlink directory/u,
  );
  const manifestLink = join(fixture.privateRoot, "manifest-link.json");
  symlinkSync(fixture.manifestPath, manifestLink, "file");
  assert.throws(
    () => loadJsonPostgresProductionProfilePhotoBundle({
      directory: fixture.directory,
      manifestPath: manifestLink,
      repositoryRoot: fixture.repositoryRoot,
    }),
    /descriptor-pinned canonical non-symlink regular file/u,
  );

  const insideDirectory = writePhotoDirectory(fixture.repositoryRoot, "inside-repository");
  const insideManifest = join(fixture.repositoryRoot, "inside-manifest.json");
  captureProfilePhotoManifest({ directory: insideDirectory, manifestPath: insideManifest });
  assert.throws(
    () => loadJsonPostgresProductionProfilePhotoBundle({
      directory: insideDirectory,
      manifestPath: insideManifest,
      repositoryRoot: fixture.repositoryRoot,
    }),
    /outside the repository worktree/u,
  );

  const invalid = createPrivatePhotoCase(testContext, "invalid-png");
  writeFileSync(join(invalid.directory, syntheticFilename(1)), Buffer.from("not a PNG"));
  assert.throws(() => loadPrivatePhotoCase(invalid), /PNG (?:byte length|signature)/u);

  const drifted = createPrivatePhotoCase(testContext, "hash-drift");
  writeFileSync(join(drifted.directory, syntheticFilename(1)), syntheticPng(1, 201));
  assert.throws(() => loadPrivatePhotoCase(drifted), /content hash mismatch/u);

  const duplicate = createPrivatePhotoCase(testContext, "duplicate-content");
  writeFileSync(
    join(duplicate.directory, syntheticFilename(2)),
    readFileSync(join(duplicate.directory, syntheticFilename(1))),
  );
  assert.throws(() => loadPrivatePhotoCase(duplicate), /distinct PNG content/u);

  const fileLink = createPrivatePhotoCase(testContext, "file-symlink");
  const linkedPhoto = join(fileLink.directory, syntheticFilename(1));
  const savedPhoto = join(fileLink.privateRoot, "saved.png");
  renameSync(linkedPhoto, savedPhoto);
  symlinkSync(savedPhoto, linkedPhoto, "file");
  assert.throws(() => loadPrivatePhotoCase(fileLink), /regular non-symlink files/u);

  const broadManifest = createPrivatePhotoCase(testContext, "broad-manifest-mode");
  chmodSync(broadManifest.manifestPath, 0o644);
  assert.throws(
    () => loadPrivatePhotoCase(broadManifest),
    /descriptor-pinned canonical non-symlink regular file/u,
  );

  const oversizedManifest = createPrivatePhotoCase(testContext, "oversized-manifest");
  const validManifestBytes = readFileSync(oversizedManifest.manifestPath);
  writeFileSync(
    oversizedManifest.manifestPath,
    Buffer.concat([
      validManifestBytes,
      Buffer.alloc((1024 * 1024) + 1 - validManifestBytes.byteLength, 0x20),
    ]),
    { mode: 0o600 },
  );
  assert.throws(
    () => loadPrivatePhotoCase(oversizedManifest),
    /descriptor-pinned canonical non-symlink regular file/u,
  );

  const oversizedSource = createPrivatePhotoCase(testContext, "oversized-source");
  writeFileSync(
    join(oversizedSource.directory, syntheticFilename(1)),
    Buffer.alloc((25 * 1024 * 1024) + 1),
    { mode: 0o600 },
  );
  assert.throws(
    () => loadPrivatePhotoCase(oversizedSource),
    /descriptor-pinned canonical non-symlink regular file/u,
  );

  const oversizedAggregate = createPrivatePhotoCase(testContext, "oversized-aggregate");
  const aggregateManifest = JSON.parse(readFileSync(oversizedAggregate.manifestPath, "utf8"));
  const firstNames = aggregateManifest.entries
    .map((entry) => entry.filename)
    .sort()
    .slice(0, 2);
  for (const [index, filename] of firstNames.entries()) {
    const bytes = syntheticLargePng(index + 1, 13 * 1024 * 1024);
    writeFileSync(join(oversizedAggregate.directory, filename), bytes, { mode: 0o600 });
    aggregateManifest.entries.find((entry) => entry.filename === filename).content_sha256 =
      createHash("sha256").update(bytes).digest("hex");
  }
  writeFileSync(
    oversizedAggregate.manifestPath,
    `${JSON.stringify(aggregateManifest, null, 2)}\n`,
    { mode: 0o600 },
  );
  assert.throws(
    () => loadPrivatePhotoCase(oversizedAggregate),
    /descriptor-pinned canonical non-symlink regular file/u,
  );

  const sourceRace = createPrivatePhotoCase(testContext, "source-leaf-race");
  let sourceSwapped = false;
  assert.throws(
    () => loadJsonPostgresProductionProfilePhotoBundle({
      directory: sourceRace.directory,
      manifestPath: sourceRace.manifestPath,
      repositoryRoot: sourceRace.repositoryRoot,
      io: {
        beforeOpen({ path, label }) {
          if (label !== "private profile-photo file" || sourceSwapped) return;
          sourceSwapped = true;
          const saved = join(sourceRace.privateRoot, "raced-source.png");
          renameSync(path, saved);
          symlinkSync(saved, path, "file");
        },
      },
    }),
    /descriptor-pinned canonical non-symlink regular file/u,
  );
  assert.equal(sourceSwapped, true);

  const materializedRace = createPrivatePhotoCase(testContext, "materialized-leaf-race");
  let materializedSwapped = false;
  assert.throws(
    () => materializeJsonPostgresProductionProfilePhotoBundle({
      bundle: loadPrivatePhotoCase(materializedRace),
      stagingRoot: materializedRace.stagingRoot,
      io: {
        beforeOpen({ path, label }) {
          if (label !== "materialized profile-photo file" || materializedSwapped) return;
          materializedSwapped = true;
          const saved = join(materializedRace.privateRoot, "raced-materialized.png");
          renameSync(path, saved);
          symlinkSync(saved, path, "file");
        },
      },
    }),
    /descriptor-pinned canonical non-symlink regular file/u,
  );
  assert.equal(materializedSwapped, true);
  assert.equal(
    existsSync(join(materializedRace.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY)),
    false,
  );
  assert.equal(
    existsSync(join(materializedRace.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY)),
    false,
  );
  assert.deepEqual(readdirSync(materializedRace.stagingRoot), []);

  const directoryRace = createPrivatePhotoCase(testContext, "materialized-directory-race");
  const renamedPrivateDirectory = join(
    directoryRace.stagingRoot,
    "renamed-private-photo-directory",
  );
  const externalTarget = join(directoryRace.privateRoot, "external-target");
  const externalSentinel = join(externalTarget, "must-remain.txt");
  mkdirSync(externalTarget, { mode: 0o700 });
  writeFileSync(externalSentinel, "external target must remain", { mode: 0o600 });
  let directorySwapped = false;
  assert.throws(
    () => materializeJsonPostgresProductionProfilePhotoBundle({
      bundle: loadPrivatePhotoCase(directoryRace),
      stagingRoot: directoryRace.stagingRoot,
      io: {
        beforeOpen({ path, label }) {
          if (label !== "materialized profile-photo file" || directorySwapped) return;
          directorySwapped = true;
          const materializedDirectory = dirname(path);
          renameSync(materializedDirectory, renamedPrivateDirectory);
          symlinkSync(externalTarget, materializedDirectory, "dir");
        },
      },
    }),
    /descriptor-pinned canonical non-symlink regular file/u,
  );
  assert.equal(directorySwapped, true);
  assert.deepEqual(readdirSync(directoryRace.stagingRoot), []);
  assert.equal(readFileSync(externalSentinel, "utf8"), "external target must remain");

  const oversizedMaterialized = createPrivatePhotoCase(testContext, "oversized-materialized");
  let oversizedWritten = false;
  assert.throws(
    () => materializeJsonPostgresProductionProfilePhotoBundle({
      bundle: loadPrivatePhotoCase(oversizedMaterialized),
      stagingRoot: oversizedMaterialized.stagingRoot,
      io: {
        writeFileSync(path, bytes, options) {
          if (!oversizedWritten && path.endsWith(".png")) {
            oversizedWritten = true;
            writeFileSync(path, Buffer.alloc((25 * 1024 * 1024) + 1), options);
            return;
          }
          writeFileSync(path, bytes, options);
        },
      },
    }),
    /descriptor-pinned canonical non-symlink regular file/u,
  );
  assert.equal(oversizedWritten, true);
  assert.equal(
    existsSync(join(oversizedMaterialized.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY)),
    false,
  );
  assert.deepEqual(readdirSync(oversizedMaterialized.stagingRoot), []);

  const partial = createPrivatePhotoCase(testContext, "partial-materialization");
  let writes = 0;
  assert.throws(
    () => materializeJsonPostgresProductionProfilePhotoBundle({
      bundle: loadPrivatePhotoCase(partial),
      stagingRoot: partial.stagingRoot,
      io: {
        writeFileSync(path, bytes, options) {
          writeFileSync(path, bytes, options);
          writes += 1;
          if (writes === 3) throw new Error("synthetic materialization failure");
        },
      },
    }),
    /synthetic materialization failure/u,
  );
  assert.equal(
    existsSync(join(partial.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY)),
    false,
  );
  assert.equal(
    existsSync(join(partial.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY)),
    false,
  );
  assert.deepEqual(readdirSync(partial.stagingRoot), []);
});

test("production empty sources contain no accounts or roster rows", () => {
  const sources = emptyJsonPostgresProductionSources();
  assert.equal(sources.account_seed.tenant_id, "");
  assert.deepEqual(sources.account_seed.users, []);
  assert.equal(sources.roster.tenant_id, "");
  assert.deepEqual(sources.roster.members, []);
  assert.doesNotMatch(JSON.stringify(sources), /@amic\.|user_amic_|emp_amic_/iu);
});

test("production public professional profiles use opaque joins and public fields only", () => {
  const catalog = publicProfessionalProfileCatalog({
    members: [{
      employee_id: "emp_amic_profile_fixture",
      work_email: "profile-fixture@amic.kr",
      professional_profile: {
        profile_kind: "attorney",
        experience: ["공개 경력"],
        education: ["공개 학력"],
        private_note: "must not be packaged",
      },
    }],
  }, { opaqueEmployeeRefs: true });
  assert.equal(catalog.profiles.length, 1);
  assert.deepEqual(Object.keys(catalog.profiles[0]).sort(), ["employee_ref", "professional_profile"]);
  assert.match(catalog.profiles[0].employee_ref, /^[a-f0-9]{64}$/u);
  assert.deepEqual(catalog.profiles[0].professional_profile, {
    profile_kind: "attorney",
    experience: ["공개 경력"],
    education: ["공개 학력"],
  });
  assert.doesNotMatch(JSON.stringify(catalog), /@amic\.|emp_amic_|private_note/iu);
});

test("production redaction removes all real identity markers", () => {
  const fixtures = [
    ["apps/api/src/lambda.js",
      'const x = "lawos-owner-fixture@amic.kr user_amic_owner_fixture emp_amic_owner_fixture assumed-role/lawos-private-staging-api-role/";'],
    ["apps/api/src/outlook-addin-runtime-context.js", 'const x = "someone@amic.law";'],
    ["packages/matter/src/worktree-template-model.js", 'const x = "someone@amic.kr";'],
  ];
  const redacted = fixtures.map(([targetPath, text]) => ({
    path: targetPath,
    text: redactJsonPostgresProductionRuntimeSource({ targetPath, text }).text,
  }));
  assert.equal(
    validateJsonPostgresProductionSourceBoundary(redacted).real_identity_marker_count,
    0,
  );
  assert.doesNotMatch(JSON.stringify(redacted), /lawos-private-staging/iu);
});

test("production overrides are empty and PostgreSQL membership backed", () => {
  const overrides = [
    {
      source_path: "packages/master-data/src/production-client-candidates.js",
      target_path: "packages/master-data/src/amic-client-candidates.js",
      purpose: "real-clients-loaded-from-approved-postgres-migration-only",
      sha256: "a".repeat(64),
      byte_size: 67,
      text: "export const AMIC_CURRENT_CLIENT_CANDIDATES = Object.freeze([]);\n",
    },
    {
      source_path: "apps/api/src/production-lawos-role-registry.js",
      target_path: "apps/api/src/lawos-role-registry.js",
      purpose: "roles-loaded-from-postgres-identity-membership-only",
      sha256: "b".repeat(64),
      byte_size: 147,
      text: [
        'export const LAWOS_ROLE_REGISTRY_SOURCE = "postgres-v2-account-membership";',
        "export const LAWOS_INTERNAL_ROLE_ASSIGNMENTS = Object.freeze([]);",
        "",
      ].join("\n"),
    },
  ];
  for (const item of overrides) item.byte_size = Buffer.byteLength(item.text);
  assert.equal(
    validateJsonPostgresProductionSourceOverrides(overrides).override_count,
    2,
  );
  assert.throws(
    () => validateJsonPostgresProductionSourceOverrides([
      { ...overrides[0], text: "const email = 'real@amic.kr';", byte_size: 29 },
      overrides[1],
    ]),
    /real identity material/u,
  );
});

test("production artifact entry and v2 deployment manifest contracts fail closed", (testContext) => {
  const fixture = createPrivatePhotoCase(testContext, "artifact-contract");
  const materialized = materializeJsonPostgresProductionProfilePhotoBundle({
    bundle: loadPrivatePhotoCase(fixture),
    stagingRoot: fixture.stagingRoot,
  });
  const photoEntries = readdirSync(
    join(fixture.stagingRoot, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY),
  ).map((filename) => `${JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY}/${filename}`);
  const entries = [
    "apps/api/src/lambda.js",
    "apps/api/src/json-postgres-program-admin-lambda.js",
    "apps/api/src/immutable-program-input.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY,
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/dms/src/json-postgres-dms-migration.js",
    "packages/persistence/src/postgres/execution-contract.js",
    "packages/persistence/src/postgres/migration-runner.js",
    "packages/persistence/src/postgres/program-receipt.js",
    JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY,
    ...photoEntries,
  ];
  const validateEntries = (candidate) => validateJsonPostgresProductionArtifactEntries(candidate, {
    profilePhotoArtifact: materialized.binding,
  });
  assert.equal(validateEntries(entries).entry_count, 24);
  assert.equal(validateEntries([
    ...entries,
    "node_modules/pg-types/test/index.js",
  ]).entry_count, 25);
  assert.throws(
    () => validateEntries(
      entries.filter((entry) => entry !== JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY),
    ),
    /missing apps\/api\/src\/hrx-public-professional-profile-catalog\.json/u,
  );
  assert.throws(
    () => validateEntries(
      entries.filter((entry) => entry !== photoEntries[2]),
    ),
    /exactly ten externally injected/u,
  );
  assert.throws(
    () => validateEntries(
      entries.filter((entry) => entry !== JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY),
    ),
    /missing apps\/api\/src\/hrx-member-photo-artifact-metadata\.json/u,
  );
  assert.throws(
    () => validateEntries([
      ...entries.filter((entry) => !photoEntries.includes(entry)),
      ...SYNTHETIC_TRACKED_PROFILE_PHOTOS,
    ]),
    /exactly ten externally injected/u,
  );
  assert.throws(
    () => validateEntries([
      ...entries,
      "apps/api/src/private-staging-admin-lambda.js",
    ]),
    /forbidden entries/u,
  );
  assert.throws(
    () => validateEntries([
      ...entries,
      "apps/api/test/server.test.js",
    ]),
    /forbidden entries/u,
  );
  assert.throws(
    () => validateEntries([
      ...entries,
      "node_modules/example/private.key",
    ]),
    /forbidden entries/u,
  );
  const manifest = {
    schema_version: JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
    data_scope: "approved-immutable-inputs-only",
    operational_authority: "postgres-v2",
    json_fallback: false,
    json_writer: false,
    dual_write: false,
    file_current_authority: false,
    offline_mutation: false,
    memory_fallback: false,
    packaged_real_identity_count: 0,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
    packaged_private_profile_photo_count: 10,
    secrets_in_environment: false,
    production_ready_claim: false,
    profile_photo_artifact: materialized.binding,
  };
  assert.equal(
    validateJsonPostgresProductionDeploymentManifest(manifest)
      .legacy_authority_counter_total,
    0,
  );
  assert.throws(
    () => validateJsonPostgresProductionDeploymentManifest({
      ...manifest,
      json_fallback: true,
    }),
    /authority boundary drifted/u,
  );
  assert.throws(
    () => validateJsonPostgresProductionDeploymentManifest({
      ...manifest,
      schema_version: "law-firm-os.json-postgres-production-artifact.v1",
    }),
    /authority boundary drifted/u,
  );
  assert.throws(
    () => validateJsonPostgresProductionDeploymentManifest({
      ...manifest,
      profile_photo_artifact: {
        ...materialized.binding,
        employee_id: "must-never-be-recorded",
      },
    }),
    /artifact binding fields are invalid/u,
  );
});
