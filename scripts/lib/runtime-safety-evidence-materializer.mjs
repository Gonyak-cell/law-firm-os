import { createHash } from "node:crypto";
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const TUW_FILE = /^workbook\/lawos-runtime-safety-evidence\/RS-[A-Z]+-\d{3}\/(?:command-evidence\.v0\.2\.json|run-manifest\.json|status\.json|output-hashes\.json|decision-packet\.json|decision-packet\.json\.sig)$/;
const VERIFICATION_RUN_FILE = /^workbook\/lawos-runtime-safety-evidence\/_verification-runs\/[A-Za-z0-9._-]+\/(?:dependencies\.json|run-manifest\.json|output-hashes\.json)$/;
const EXACT_FILES = new Set([
  "workbook/lawos-runtime-safety-evidence/RS-DMS-009/dms-source-readiness.json",
  "workbook/lawos-runtime-safety-evidence/RS-PRJ-006/prj-outcome.json",
  "workbook/lawos-runtime-safety-evidence/RS-OFF-006/off-outcome.json",
  "workbook/lawos-runtime-safety-evidence/RS-CUT-002/source-inventory.json",
  "workbook/lawos-runtime-safety-evidence/RS-CUT-007/cut-outcome-index.json",
  "workbook/lawos-runtime-safety-evidence/evidence-contract-remediation-v0.2.json",
  "workbook/lawos-runtime-safety-evidence/evidence-rerun-manifest-v0.2.json",
  "workbook/lawos-runtime-safety-evidence/_integration/dependencies.json",
  "workbook/lawos-runtime-safety-evidence/_integration/run-manifest.json",
  "workbook/lawos-runtime-safety-evidence/_integration/command-evidence.v0.2.json",
  "workbook/lawos-runtime-safety-evidence/_integration/lineage-manifest.json",
  "workbook/lawos-runtime-safety-evidence/_integration/final-147-audit.json",
]);

export class RuntimeSafetyMaterializerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuntimeSafetyMaterializerError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new RuntimeSafetyMaterializerError(code, message, details);
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function normalizeRelativePath(path, code) {
  if (typeof path !== "string" || path.length === 0 || isAbsolute(path) || /[\0*?\[\]{}!]/.test(path) || path.includes("\\")) {
    fail(code, "path must be an exact portable relative path without glob syntax");
  }
  const normalized = path.split("/").filter((part) => part !== ".").join("/");
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) fail(code, "path escapes its root");
  return normalized;
}

function resolveRegularFile(root, candidate, code) {
  const rootReal = realpathSync(root);
  const full = resolve(join(rootReal, candidate));
  const rel = relative(rootReal, full);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(code, "path escapes its root");
  if (!existsSync(full)) fail("EVIDENCE_SOURCE_MISSING", "materializer source does not exist", { candidate });
  let cursor = rootReal;
  for (const part of rel.split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) fail("EVIDENCE_SYMLINK", "materializer paths may not contain symlinks", { candidate });
  }
  if (!lstatSync(full).isFile()) fail(code, "materializer source must be a regular file", { candidate });
  return full;
}

export function isAllowedRuntimeSafetyEvidencePath(path) {
  if (typeof path !== "string" || isAbsolute(path) || /[\0*?\[\]{}!]/.test(path) || path.includes("\\") || path.includes("..")) return false;
  return TUW_FILE.test(path) || VERIFICATION_RUN_FILE.test(path) || EXACT_FILES.has(path);
}

export function materializeRuntimeSafetyEvidence({ sourceRoot, destinationRoot, entries }) {
  if (!existsSync(sourceRoot) || !existsSync(destinationRoot)) fail("EVIDENCE_ROOT", "source and destination roots must exist");
  if (!Array.isArray(entries) || entries.length === 0) fail("EVIDENCE_MANIFEST", "materializer entries must be a non-empty array");
  const destinations = new Set();
  const prepared = entries.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) fail("EVIDENCE_MANIFEST", "entry must be an object", { index });
    const sourcePath = normalizeRelativePath(entry.source_path, "EVIDENCE_SOURCE_PATH");
    const destinationPath = normalizeRelativePath(entry.destination_path, "EVIDENCE_DESTINATION_PATH");
    if (!isAllowedRuntimeSafetyEvidencePath(destinationPath)) fail("EVIDENCE_ALLOWLIST", "destination is outside the exact evidence allowlist", { destinationPath });
    if (destinations.has(destinationPath)) fail("EVIDENCE_DESTINATION_COLLISION", "destination appears more than once", { destinationPath });
    destinations.add(destinationPath);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? "")) fail("EVIDENCE_MANIFEST", "entry sha256 is invalid", { index });
    const source = resolveRegularFile(sourceRoot, sourcePath, "EVIDENCE_SOURCE_PATH");
    const actualSha256 = sha256File(source);
    if (actualSha256 !== entry.sha256) fail("EVIDENCE_HASH_DRIFT", "source hash does not match the manifest", { sourcePath });
    const destination = resolve(join(realpathSync(destinationRoot), destinationPath));
    const rel = relative(realpathSync(destinationRoot), destination);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail("EVIDENCE_DESTINATION_PATH", "destination escapes its root");
    if (existsSync(destination)) fail("EVIDENCE_DESTINATION_COLLISION", "destination already exists", { destinationPath });
    return { source, destination, destinationPath, sha256: actualSha256 };
  });

  for (const entry of prepared) {
    mkdirSync(dirname(entry.destination), { recursive: true, mode: 0o700 });
    copyFileSync(entry.source, entry.destination, constants.COPYFILE_EXCL);
    if (sha256File(entry.destination) !== entry.sha256) fail("EVIDENCE_COPY_HASH_DRIFT", "destination hash changed during materialization", { destinationPath: entry.destinationPath });
  }
  return Object.freeze({ copied: prepared.length, destinations: prepared.map((entry) => entry.destinationPath) });
}
