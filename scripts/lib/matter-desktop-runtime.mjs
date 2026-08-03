import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import {
  HRX_PUBLIC_PROFILE_ROSTER_SOURCE_PATH,
  publicProfessionalProfileCatalog,
} from "./hrx-public-professional-profile.mjs";
import { desktopReleaseChannelPolicy } from "./matter-desktop-provenance.mjs";
import {
  createMatterDesktopSyntheticRuntimeFixture,
  materializeMatterDesktopSyntheticRuntimeFixture,
} from "./matter-desktop-synthetic-runtime.mjs";
import {
  DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES,
  buildDesktopPrivateDataCorpus,
  scanDesktopPrivateDataBoundary,
} from "./matter-desktop-private-data-boundary.mjs";
import { desktopPrivateDataCorpusNeedles } from "./matter-desktop-private-data-corpus.mjs";
import {
  PRIVATE_STAGING_SOURCE_OVERRIDES,
  redactPrivateStagingRuntimeSource,
  validatePrivateStagingSourceIdentityBoundary,
} from "./private-staging-artifact.mjs";

export const MATTER_DESKTOP_RUNTIME_DATA_MODES = Object.freeze([
  "none",
  "synthetic",
  "private-local",
]);

const defaultRosterSource = HRX_PUBLIC_PROFILE_ROSTER_SOURCE_PATH;
const defaultPhotoSource = "apps/api/src/hrx-member-photos";
const defaultRegistrationSeedSource = "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json";
const defaultClientCandidateSource = "packages/master-data/src/amic-client-candidates.js";
const defaultMatterCandidateSource = "packages/matter/src/amic-matter-code-candidates.js";
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const PRIVATE_RUNTIME_RELATIVE_PATHS = new Set([
  "hrx-member-roster-source-of-truth.json",
  "hrx-member-contact-source-of-truth.json",
  "matter-vault-user-registration-seed.json",
  "hrx-member-photos",
]);

function isExplicitTrue(value) {
  if (value === true) return true;
  if (value === false || value === undefined || value === null) return false;
  return TRUE_VALUES.has(String(value).trim().toLowerCase());
}

function optionOrEnv(option, envValue) {
  return option === undefined ? envValue : option;
}

function resolveChannel({ channel, env, formalRelease }) {
  const configuredChannel = optionOrEnv(channel, env.MATTER_DESKTOP_RELEASE_CHANNEL);
  if (formalRelease === true && configuredChannel !== undefined && configuredChannel !== "formal") {
    throw new Error("formalRelease alias cannot override a non-formal release channel");
  }
  return formalRelease === true ? "formal" : String(configuredChannel ?? "internal").trim();
}

function resolveRuntimeMode({ runtimeMode, env, policy }) {
  const requested = optionOrEnv(runtimeMode, env.MATTER_DESKTOP_RUNTIME_MODE);
  const value = String(requested ?? policy.dataMode).trim();
  if (!MATTER_DESKTOP_RUNTIME_DATA_MODES.includes(value)) {
    throw new Error(`runtime data mode must be one of: ${MATTER_DESKTOP_RUNTIME_DATA_MODES.join(", ")}`);
  }
  return value;
}

function sourcePaths({ repoRoot, env, rosterSourcePath, contactSourcePath, photoSourcePath, registrationSeedSourcePath }) {
  const configuredContact = String(contactSourcePath ?? env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH ?? "").trim();
  return {
    roster: resolve(repoRoot, rosterSourcePath ?? env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH ?? defaultRosterSource),
    contact: configuredContact ? resolve(repoRoot, configuredContact) : null,
    photos: resolve(repoRoot, photoSourcePath ?? env.LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH ?? defaultPhotoSource),
    registrationSeed: resolve(repoRoot, registrationSeedSourcePath ?? defaultRegistrationSeedSource),
  };
}

function privateDataCorpusCandidateSources(repoRoot) {
  const client = resolve(repoRoot, defaultClientCandidateSource);
  const matter = resolve(repoRoot, defaultMatterCandidateSource);
  const clientExists = existsSync(client);
  const matterExists = existsSync(matter);
  if (clientExists !== matterExists) {
    throw new Error("client/matter private-data corpus requires both authoritative candidate sources");
  }
  if (!clientExists && existsSync(resolve(repoRoot, "packages/matter/src"))) {
    throw new Error("client/matter private-data corpus authority is missing");
  }
  return clientExists
    ? { clientCandidateSourcePath: client, matterCandidateSourcePath: matter }
    : {};
}

function privateRuntimePathFilter({ repoRoot, runtimeSourceRoot }) {
  const sourceRoot = resolve(repoRoot, runtimeSourceRoot);
  return (sourcePath) => {
    const relativePath = relative(sourceRoot, sourcePath).replaceAll("\\", "/");
    if (!relativePath || relativePath.startsWith("../") || relativePath === "..") return true;
    const firstSegment = relativePath.split("/")[0];
    return !PRIVATE_RUNTIME_RELATIVE_PATHS.has(firstSegment);
  };
}

function packageRuntimePathFilter({ repoRoot, runtimeSourceRoot }) {
  const sourceRoot = resolve(repoRoot, runtimeSourceRoot);
  return (sourcePath) => {
    const relativePath = relative(sourceRoot, sourcePath).replaceAll("\\", "/");
    if (!relativePath || relativePath.startsWith("../") || relativePath === "..") return true;
    const segments = relativePath.split("/");
    if (segments.length === 1) return true;
    return segments[1] === "package.json" || segments[1] === "src";
  };
}

async function copyApiRuntimeSource({ repoRoot, runtimeDir }) {
  const sourceRoot = join(repoRoot, "apps/api/src");
  const targetRoot = join(runtimeDir, "apps/api/src");
  await mkdir(join(runtimeDir, "apps/api"), { recursive: true });
  await cp(sourceRoot, targetRoot, {
    recursive: true,
    filter: privateRuntimePathFilter({ repoRoot, runtimeSourceRoot: sourceRoot }),
  });
  return targetRoot;
}

async function copyRuntimePackages({ repoRoot, runtimeDir }) {
  const sourceRoot = join(repoRoot, "packages");
  const targetRoot = join(runtimeDir, "packages");
  await cp(sourceRoot, targetRoot, {
    recursive: true,
    filter: packageRuntimePathFilter({ repoRoot, runtimeSourceRoot: sourceRoot }),
  });
}

function replaceMatterRuntimeContextIdentityMarkers(text, fixture) {
  const administrator = fixture.account_seed.users[0];
  const members = fixture.roster.members;
  let employeeIndex = 0;
  return String(text)
    .replace(/[A-Z0-9._%+-]+@amic\.(?:kr|law)/giu, administrator.email)
    .replace(/\buser_amic_[a-z0-9_]+\b/giu, administrator.user_id)
    .replace(/\bemp_amic_[a-z0-9_]+\b/giu, () => {
      const member = members[employeeIndex % members.length];
      employeeIndex += 1;
      return member.employee_id;
    });
}

async function rewriteKnownIdentitySources({ repoRoot, runtimeRoot, fixture }) {
  const sourceEntries = [
    "apps/api/src/lambda.js",
    "apps/api/src/outlook-addin-runtime-context.js",
    "apps/api/src/lawos-role-registry.js",
    "apps/api/src/matter-runtime-context.js",
    "packages/matter/src/worktree-template-model.js",
    "packages/master-data/src/amic-client-candidates.js",
    "packages/matter/src/amic-matter-code-candidates.js",
  ];
  const writtenEntries = [];
  for (const relativeSourcePath of sourceEntries) {
    const sourcePath = join(repoRoot, relativeSourcePath);
    const targetPath = join(runtimeRoot, relativeSourcePath);
    if (!existsSync(sourcePath)) continue;
    let text;
    if (relativeSourcePath === "apps/api/src/lawos-role-registry.js"
      || relativeSourcePath === "packages/master-data/src/amic-client-candidates.js"
      || relativeSourcePath === "packages/matter/src/amic-matter-code-candidates.js") {
      const override = PRIVATE_STAGING_SOURCE_OVERRIDES.find(({ target_path: targetPathValue }) => targetPathValue === relativeSourcePath);
      if (!override) throw new Error(`private staging source override is missing: ${relativeSourcePath}`);
      text = await readFile(join(repoRoot, override.source_path), "utf8");
    } else {
      text = await readFile(sourcePath, "utf8");
      text = relativeSourcePath === "apps/api/src/matter-runtime-context.js"
        ? replaceMatterRuntimeContextIdentityMarkers(text, fixture)
        : redactPrivateStagingRuntimeSource({ targetPath: relativeSourcePath, text, syntheticSources: {
          account_seed: fixture.account_seed,
          roster: fixture.roster,
        } }).text;
    }
    await writeFile(targetPath, text, "utf8");
    writtenEntries.push({ path: relativeSourcePath, text });
  }
  return writtenEntries;
}

async function collectRuntimeTextEntries(root, current = root, output = []) {
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = join(current, entry.name);
    if (entry.isDirectory()) await collectRuntimeTextEntries(root, absolutePath, output);
    else if (entry.isSymbolicLink()) throw new Error(`synthetic runtime cannot contain symlink: ${relative(root, absolutePath)}`);
    else if (entry.isFile()) output.push({
      path: relative(root, absolutePath).replaceAll("\\", "/"),
      text: (await readFile(absolutePath)).toString("utf8"),
    });
  }
  return output;
}

function syntheticCorpusReplacement(value, index, fixture) {
  const text = String(value);
  const firstUser = fixture.account_seed.users[0];
  if (/@amic\.(?:kr|law)$/iu.test(text)) return firstUser.email;
  if (/^user_amic_/iu.test(text)) return firstUser.user_id;
  if (/^emp_amic_/iu.test(text)) return fixture.roster.members[0].employee_id;
  if (/^tenant_amic_/iu.test(text)) return fixture.roster.tenant_id;
  if (/^\/(?:Users|home|var)\//u.test(text)) return "/synthetic/lawos-staging/source";
  if (/^[a-f0-9]{64}$/iu.test(text)) return "0".repeat(64);
  if (/^https?:\/\//iu.test(text)) return "https://synthetic.invalid";
  return `synthetic-staging-value-${index + 1}`;
}

async function redactSyntheticCorpusValues({ runtimeRoot, corpus, fixture }) {
  const needles = desktopPrivateDataCorpusNeedles(corpus) ?? [];
  const replacements = needles
    .map(({ bytes }, index) => ({
      value: bytes.toString("utf8"),
      replacement: syntheticCorpusReplacement(bytes.toString("utf8"), index, fixture),
    }))
    .filter(({ value, replacement }) => value && value !== replacement)
    .sort((left, right) => right.value.length - left.value.length || left.value.localeCompare(right.value));
  const binaryPath = /\.(?:png|jpe?g|gif|ico|webp|pdf|zip|7z|tar|gz|dmg|msi|exe|dll|dylib|so)$/iu;
  const entries = await collectRuntimeTextEntries(runtimeRoot);
  for (const entry of entries) {
    if (binaryPath.test(entry.path)) continue;
    let text = entry.text;
    for (const { value, replacement } of replacements) text = text.split(value).join(replacement);
    if (text !== entry.text) await writeFile(join(runtimeRoot, entry.path), text, "utf8");
  }
  return Object.freeze({ replacement_count: replacements.length, scanned_file_count: entries.length });
}

async function validateSyntheticRuntimeIdentityBoundary({
  repoRoot,
  runtimeRoot,
  rewrittenEntries,
  allowlistedSyntheticPaths = [],
}) {
  const entries = await collectRuntimeTextEntries(runtimeRoot);
  validatePrivateStagingSourceIdentityBoundary([...entries, ...rewrittenEntries]);
  const corpus = await buildDesktopPrivateDataCorpus({
    rosterSourcePath: join(repoRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster),
    registrationSeedSourcePath: join(repoRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.registrationSeed),
    photoSourcePath: join(repoRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.photos),
    contactSourceNotApplicable: true,
    ...privateDataCorpusCandidateSources(repoRoot),
    runtimeSafeOnly: true,
  });
  // The runtime root itself is deliberately not a scan root: the shared
  // boundary treats a directory named `runtime` as a private path. Scanning
  // each staged runtime tree still covers every packaged file while keeping
  // the metadata honest about the roots inspected.
  const scanRoots = ["apps", "packages"]
    .map((entry) => join(runtimeRoot, entry))
    .filter((entry) => existsSync(entry));
  const privateDataScan = await scanDesktopPrivateDataBoundary({
    roots: scanRoots,
    corpus,
    displayBase: runtimeRoot,
    allowlistedPathFindings: allowlistedSyntheticPaths,
  });
  if (privateDataScan.verdict !== "PASS") {
    throw new Error("synthetic runtime private-data corpus scan failed");
  }
  const candidateSourceFiles = corpus.candidate_corpus_status === "loaded"
    ? [defaultClientCandidateSource, defaultMatterCandidateSource]
    : [];
  const candidateFindings = privateDataScan.findings
    .filter(({ kind }) => kind === "client_candidate_protected_value"
      || kind === "matter_client_candidate_protected_value"
      || kind === "matter_candidate_protected_value")
    .reduce((sum, finding) => sum + finding.count, 0);
  return Object.freeze({
    scanned_file_count: entries.length,
    real_identity_marker_count: 0,
    privateDataCorpus: Object.freeze({
      corpus_mode: "runtime-safe-identity-and-credentials",
      corpus_kinds: Object.freeze([
        "roster",
        "registration_seed",
        "photos",
        ...(corpus.candidate_corpus_status === "loaded"
          ? ["client_candidates", "matter_client_candidates", "matter_candidates"]
          : []),
      ]),
      source_files: Object.freeze([
        DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster,
        DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.registrationSeed,
        DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.photos,
        ...candidateSourceFiles,
      ]),
      scan_roots: Object.freeze(scanRoots.map((entry) => relative(runtimeRoot, entry).replaceAll("\\", "/"))),
      allowlisted_synthetic_paths: Object.freeze(allowlistedSyntheticPaths
        .map((entry) => relative(runtimeRoot, entry).replaceAll("\\", "/"))
        .sort()),
      contact_corpus_status: corpus.contact_corpus_status,
      protected_value_count: corpus.protected_value_count,
      protected_photo_count: corpus.protected_photo_count,
      contact_protected_value_count: corpus.contact_protected_value_count,
      candidate_corpus_status: corpus.candidate_corpus_status,
      client_candidate_record_count: corpus.client_candidate_record_count,
      matter_client_candidate_record_count: corpus.matter_client_candidate_record_count,
      matter_candidate_record_count: corpus.matter_candidate_record_count,
      client_candidate_protected_value_count: corpus.client_candidate_protected_value_count,
      matter_client_candidate_protected_value_count: corpus.matter_client_candidate_protected_value_count,
      matter_candidate_protected_value_count: corpus.matter_candidate_protected_value_count,
      candidate_finding_count: candidateFindings,
      scanned_file_count: privateDataScan.scanned_file_count,
      finding_count: privateDataScan.finding_count,
      verdict: privateDataScan.verdict,
    }),
  });
}

function remapMaterializedMetadata(value, fromRoot, toRoot) {
  const remap = (targetPath) => typeof targetPath === "string" && targetPath.startsWith(fromRoot)
    ? `${toRoot}${targetPath.slice(fromRoot.length)}`
    : targetPath;
  return {
    ...value,
    targetRoot: remap(value.targetRoot),
    rosterPath: remap(value.rosterPath),
    contactPath: remap(value.contactPath),
    photosPath: remap(value.photosPath),
    registrationSeedPath: remap(value.registrationSeedPath),
    files: value.files.map((entry) => ({ ...entry, path: remap(entry.path) })),
  };
}

const DEFAULT_PROMOTION_IO = Object.freeze({
  exists: (targetPath) => existsSync(targetPath),
  mkdtemp: (prefix) => mkdtemp(prefix),
  rename: (sourcePath, targetPath) => rename(sourcePath, targetPath),
  rm: (targetPath, options) => rm(targetPath, options),
});

async function removePromotionPath(io, targetPath) {
  let lastError = null;
  // Recovery is intentionally bounded. A transient EPERM/EBUSY during a
  // failed promotion must not strand a private backup, while a persistent
  // filesystem failure remains visible to the caller.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await io.rm(targetPath, { recursive: true, force: true });
      return null;
    } catch (error) {
      lastError = error;
    }
  }
  return lastError;
}

function promotionRecoveryRequiredError(backupRoot, cause, cleanupError = null) {
  const recoveryReference = basename(backupRoot);
  const error = new Error("runtime promotion recovery required");
  error.name = "MatterRuntimePromotionRecoveryError";
  error.code = "RECOVERY_REQUIRED";
  // Only expose the opaque transaction directory name. Absolute paths and
  // filesystem messages can contain private source locations.
  error.recoveryReference = recoveryReference;
  error.originalErrorCode = cause?.code ?? null;
  if (cleanupError) error.stageCleanupErrorCode = cleanupError.code ?? null;
  return error;
}

async function atomicPromoteRuntime({ stagedRuntimeDir, stagingRoot, runtimeDir, promotionIo = {} }) {
  const io = { ...DEFAULT_PROMOTION_IO, ...promotionIo };
  const parent = dirname(runtimeDir);
  let backupRoot;
  try {
    backupRoot = await io.mkdtemp(join(parent, ".matter-runtime-backup-"));
  } catch (error) {
    const cleanupError = await removePromotionPath(io, stagingRoot);
    if (cleanupError) error.cleanupError = cleanupError;
    throw error;
  }
  const backupRuntimeDir = join(backupRoot, "runtime");
  let state = "prepared";
  try {
    if (io.exists(runtimeDir)) {
      await io.rename(runtimeDir, backupRuntimeDir);
      state = "old-moved";
    }
    await io.rename(stagedRuntimeDir, runtimeDir);
    state = "new-promoted";
    await io.rm(stagingRoot, { recursive: true, force: true });
    state = "stage-cleaned";
    await io.rm(backupRoot, { recursive: true, force: true });
    state = "committed";
  } catch (error) {
    // A promoted runtime must be moved back into the transaction before the
    // old runtime is restored. If that rename fails, retain the backup and
    // fail closed: a caller can recover the old bytes from the opaque
    // transaction directory instead of receiving a misleading ordinary error.
    if ((state === "new-promoted" || state === "stage-cleaned") && io.exists(runtimeDir)) {
      try {
        await mkdir(stagingRoot, { recursive: true });
        await io.rename(runtimeDir, stagedRuntimeDir);
        state = "new-staged";
      } catch (rollbackError) {
        const stageCleanupError = await removePromotionPath(io, stagingRoot);
        throw promotionRecoveryRequiredError(backupRoot, rollbackError, stageCleanupError);
      }
    }
    // Restore only after the new runtime is safely out of the final path. A
    // failed restore leaves the backup untouched for manual recovery.
    if ((state === "old-moved" || state === "new-staged") && io.exists(backupRuntimeDir) && !io.exists(runtimeDir)) {
      try {
        await io.rename(backupRuntimeDir, runtimeDir);
        state = "old-restored";
      } catch (rollbackError) {
        const stageCleanupError = await removePromotionPath(io, stagingRoot);
        throw promotionRecoveryRequiredError(backupRoot, rollbackError, stageCleanupError);
      }
    }
    const cleanupErrors = [];
    const stageCleanupError = await removePromotionPath(io, stagingRoot);
    if (stageCleanupError) cleanupErrors.push(stageCleanupError);
    const backupCleanupError = await removePromotionPath(io, backupRoot);
    if (backupCleanupError) cleanupErrors.push(backupCleanupError);
    if (cleanupErrors.length) {
      throw promotionRecoveryRequiredError(backupRoot, error, cleanupErrors[0]);
    }
    throw error;
  }
}

async function copyPrivateLocalRuntime({
  apiRuntimeSrcDir,
  repoRoot,
  env,
  rosterSourcePath,
  contactSourcePath,
  photoSourcePath,
  registrationSeedSourcePath,
}) {
  const sources = sourcePaths({
    repoRoot,
    env,
    rosterSourcePath,
    contactSourcePath,
    photoSourcePath,
    registrationSeedSourcePath,
  });
  if (!existsSync(sources.roster)) throw new Error("HRX member roster source does not exist");
  if (!existsSync(sources.photos)) throw new Error("Internal HRX member photo source does not exist");
  if (sources.contact && !existsSync(sources.contact)) throw new Error("Configured internal HRX member contact source does not exist");
  if (!existsSync(sources.registrationSeed)) throw new Error("Matter Vault user registration seed does not exist");

  const privateRoster = JSON.parse(await readFile(sources.roster, "utf8"));
  await writeFile(
    join(apiRuntimeSrcDir, "hrx-public-professional-profile-catalog.json"),
    `${JSON.stringify(publicProfessionalProfileCatalog(privateRoster), null, 2)}\n`,
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
  return {
    privateRoster,
    privateSourcePaths: Object.freeze({
      roster: sources.roster,
      contact: sources.contact,
      photos: sources.photos,
      registrationSeed: sources.registrationSeed,
    }),
  };
}

function resultBase({
  channel,
  requestedRuntimeMode,
  effectiveRuntimeMode,
  included,
  nonDistributable,
  runtimeDir,
  policy,
}) {
  return {
    channel,
    requestedRuntimeMode,
    effectiveRuntimeMode,
    included,
    nonDistributable,
    distributable: policy.distributable,
    runtimeDir,
    dataClass: policy.allowedDataClasses[effectiveRuntimeMode],
    apiTarget: policy.apiTarget,
    privacyBoundary: effectiveRuntimeMode === "private-local" ? "private-local-explicit-guarded" : effectiveRuntimeMode === "synthetic" ? "synthetic-fixture-only" : "no-bundled-data",
  };
}

/**
 * Stage the optional local API runtime for a desktop package.
 *
 * `private-local` is intentionally a two-key operation: the caller must set
 * both `privateLocalOptIn`/MATTER_DESKTOP_PRIVATE_LOCAL_OPT_IN and
 * `nonDistributable`/MATTER_DESKTOP_NON_DISTRIBUTABLE. Neither key is inferred
 * from the other, a channel, or the legacy formalRelease alias.
 */
export async function copyDesktopLocalApiRuntime({
  targetAppSourceDir,
  repoRoot,
  channel,
  runtimeMode,
  privateLocalOptIn,
  nonDistributable,
  formalRelease = false,
  env = process.env,
  rosterSourcePath,
  contactSourcePath,
  photoSourcePath,
  registrationSeedSourcePath,
  promotionIo,
} = {}) {
  if (!targetAppSourceDir || !repoRoot) throw new Error("targetAppSourceDir and repoRoot are required");
  const runtimeDir = join(targetAppSourceDir, "runtime");

  const resolvedChannel = resolveChannel({ channel, env, formalRelease });
  const policy = desktopReleaseChannelPolicy(resolvedChannel);
  const requestedRuntimeMode = resolveRuntimeMode({ runtimeMode, env, policy });
  const optIn = isExplicitTrue(optionOrEnv(privateLocalOptIn, env.MATTER_DESKTOP_PRIVATE_LOCAL_OPT_IN));
  const explicitNonDistributable = isExplicitTrue(optionOrEnv(nonDistributable, env.MATTER_DESKTOP_NON_DISTRIBUTABLE));
  const channelAllowsMode = policy.allowedDataModes.includes(requestedRuntimeMode);

  if (requestedRuntimeMode !== "private-local" && (optIn || explicitNonDistributable)) {
    await rm(runtimeDir, { recursive: true, force: true });
    throw new Error("private-local guards are only valid for private-local runtime mode");
  }

  if (policy.distributable && explicitNonDistributable) {
    await rm(runtimeDir, { recursive: true, force: true });
    throw new Error(`nonDistributable=true is not allowed for the ${resolvedChannel} distributable release channel`);
  }
  if (!channelAllowsMode) {
    await rm(runtimeDir, { recursive: true, force: true });
    throw new Error(`runtime data mode ${requestedRuntimeMode} is not allowed for the ${resolvedChannel} release channel`);
  }
  if (requestedRuntimeMode === "private-local" && (!optIn || !explicitNonDistributable)) {
    await rm(runtimeDir, { recursive: true, force: true });
    throw new Error("private-local runtime requires explicit opt-in and nonDistributable=true");
  }

  const effectiveNonDistributable = policy.distributable === false || explicitNonDistributable;
  if (requestedRuntimeMode === "none") {
    await rm(runtimeDir, { recursive: true, force: true });
    return resultBase({
      channel: resolvedChannel,
      requestedRuntimeMode,
      effectiveRuntimeMode: "none",
      included: false,
      nonDistributable: effectiveNonDistributable,
      runtimeDir,
      policy,
    });
  }

  await mkdir(dirname(runtimeDir), { recursive: true });
  const stagingRoot = await mkdtemp(join(dirname(runtimeDir), ".matter-runtime-stage-"));
  const stagedRuntimeDir = join(stagingRoot, "runtime");
  try {
    const apiRuntimeSrcDir = await copyApiRuntimeSource({ repoRoot, runtimeDir: stagedRuntimeDir });
    await copyRuntimePackages({ repoRoot, runtimeDir: stagedRuntimeDir });

    if (requestedRuntimeMode === "synthetic") {
      const fixture = createMatterDesktopSyntheticRuntimeFixture();
      const rewrittenEntries = await rewriteKnownIdentitySources({ repoRoot, runtimeRoot: stagedRuntimeDir, fixture });
      const materialized = await materializeMatterDesktopSyntheticRuntimeFixture({ targetRoot: stagedRuntimeDir });
      await writeFile(
        join(apiRuntimeSrcDir, "hrx-public-professional-profile-catalog.json"),
        `${JSON.stringify(publicProfessionalProfileCatalog(fixture.roster), null, 2)}\n`,
      );
      const corpus = await buildDesktopPrivateDataCorpus({
        rosterSourcePath: join(repoRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster),
        registrationSeedSourcePath: join(repoRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.registrationSeed),
        photoSourcePath: join(repoRoot, DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.photos),
        contactSourceNotApplicable: true,
        ...privateDataCorpusCandidateSources(repoRoot),
        runtimeSafeOnly: true,
      });
      await redactSyntheticCorpusValues({ runtimeRoot: stagedRuntimeDir, corpus, fixture });
      const boundary = await validateSyntheticRuntimeIdentityBoundary({
        repoRoot,
        runtimeRoot: stagedRuntimeDir,
        rewrittenEntries,
        allowlistedSyntheticPaths: [
          materialized.rosterPath,
          materialized.contactPath,
          materialized.photosPath,
          materialized.registrationSeedPath,
          join(stagedRuntimeDir, "packages/platform/src/secrets"),
          ...materialized.files.map((entry) => entry.path),
        ],
      });
      await atomicPromoteRuntime({ stagedRuntimeDir, stagingRoot, runtimeDir, promotionIo });
      return {
        ...resultBase({
          channel: resolvedChannel,
          requestedRuntimeMode,
          effectiveRuntimeMode: "synthetic",
          included: true,
          nonDistributable: effectiveNonDistributable,
          runtimeDir,
          policy,
        }),
        apiRuntimeSrcDir: join(runtimeDir, "apps/api/src"),
        syntheticFixture: remapMaterializedMetadata(materialized, stagedRuntimeDir, runtimeDir),
        privateSourcePaths: null,
        publicCatalogIncluded: true,
        identityBoundary: boundary,
      };
    }

    const privateRuntime = await copyPrivateLocalRuntime({
      apiRuntimeSrcDir,
      repoRoot,
      env,
      rosterSourcePath,
      contactSourcePath,
      photoSourcePath,
      registrationSeedSourcePath,
    });
    await atomicPromoteRuntime({ stagedRuntimeDir, stagingRoot, runtimeDir, promotionIo });
    return {
      ...resultBase({
        channel: resolvedChannel,
        requestedRuntimeMode,
        effectiveRuntimeMode: "private-local",
        included: true,
        nonDistributable: true,
        runtimeDir,
        policy,
      }),
      apiRuntimeSrcDir: join(runtimeDir, "apps/api/src"),
      syntheticFixture: null,
      privateSourcePaths: privateRuntime.privateSourcePaths,
      publicCatalogIncluded: true,
    };
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}
