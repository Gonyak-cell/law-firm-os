import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  DEFAULT_HISTORICAL_DIR,
  HASH_256,
  fail,
  freezeDeep,
  record,
  relativePath,
  sha256,
} from "./rf13-debt-remediation-common.mjs";

function generationName(fileName) {
  const match = fileName.match(/(?:\.|-)rerun(\d+)(?=[.-])/u);
  if (match) return `rerun${match[1]}`;
  return "initial";
}

function normalizedRole(fileName) {
  return fileName.replace(/(?:\.|-)rerun\d+(?=[.-])/gu, "");
}

function candidateHistoricalFile(fileName) {
  return /(?:artifact-hashes|source-state|rf13-evidence-manifest|final-artifact-facts|build-manifest|packaged-restart-(?:receipt|qa)|performance|macos-build|build-mac|canonical-launch|source-fingerprint|internal-privacy-boundary|code-source|status(?:-rerun\d+)?-(?:before|after)|source-head|rf13-final-gate-manual-qa|receipt)/iu.test(fileName);
}

function walkFiles(root, current = root, result = []) {
  if (!existsSync(current)) return result;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) walkFiles(root, absolute, result);
    else if (entry.isFile() && candidateHistoricalFile(entry.name)) result.push(absolute);
  }
  return result;
}

function pickSourceFingerprint(value) {
  if (!record(value)) return null;
  const allowed = ["source_sha", "source_tree", "source_dirty", "diff_sha256", "status_sha256", "manifest_sha256", "working_tree_sha256", "goal_sha256", "goal_bytes", "captured_at"];
  const result = {};
  for (const key of allowed) {
    if (Object.hasOwn(value, key)) result[key] = value[key];
  }
  return Object.keys(result).length ? result : null;
}

function parseArtifactHashes(bytes) {
  const entries = [];
  for (const line of bytes.toString("utf8").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const match = line.match(/^([0-9a-f]{64})\s+(.+)$/u);
    if (!match) continue;
    entries.push({ sha256: match[1], path: match[2] });
  }
  return entries;
}

function classifyHistoricalFile(root, absolute) {
  const path = relativePath(root, absolute);
  const fileName = basename(absolute);
  const bytes = readFileSync(absolute);
  const generation = generationName(fileName);
  const role = normalizedRole(fileName);
  const recordValue = {
    path,
    role,
    generation,
    bytes: bytes.length,
    sha256: sha256(bytes),
    kind: "receipt",
  };
  if (/^artifact-hashes(?:\.rerun\d+)?\.txt$/u.test(fileName)) {
    recordValue.kind = "artifact_hashes";
    recordValue.entries = parseArtifactHashes(bytes);
  } else if (/^source-state(?:-rerun\d+)?(?:-before|-after)?(?:\.rerun\d+)?\.json$/u.test(fileName)) {
    recordValue.kind = "source_state";
    try {
      recordValue.fingerprint = pickSourceFingerprint(JSON.parse(bytes.toString("utf8")));
    } catch {
      recordValue.fingerprint = null;
    }
  } else if (/^source-fingerprint-comparison(?:\.rerun\d+)?\.json$/u.test(fileName)) {
    recordValue.kind = "source_state";
    try {
      const parsed = JSON.parse(bytes.toString("utf8"));
      recordValue.fingerprint = pickSourceFingerprint(parsed.normalized_before ?? parsed.normalized_after ?? parsed);
      recordValue.fingerprints = [parsed.normalized_before, parsed.normalized_after]
        .map(pickSourceFingerprint)
        .filter(Boolean);
    } catch {
      recordValue.fingerprint = null;
      recordValue.fingerprints = [];
    }
  } else if (/rf13-evidence-manifest.*\.json$/iu.test(fileName)) {
    recordValue.kind = "rf13_manifest";
    try {
      const parsed = JSON.parse(bytes.toString("utf8"));
      recordValue.references = [];
      const visit = (value) => {
        if (!record(value)) {
          if (Array.isArray(value)) value.forEach(visit);
          return;
        }
        if (typeof value.path === "string" && typeof value.sha256 === "string" && HASH_256.test(value.sha256)) {
          recordValue.references.push({ path: value.path, sha256: value.sha256 });
        }
        Object.values(value).forEach(visit);
      };
      visit(parsed);
    } catch {
      recordValue.references = [];
    }
  } else if (/final-artifact-facts|build-manifest|packaged-restart-(?:receipt|qa)|performance|build-mac|code-source|status(?:-rerun\d+)?-(?:before|after)|source-head|rf13-final-gate-manual-qa/iu.test(fileName)) {
    recordValue.kind = "performance_or_build_receipt";
  }
  return Object.freeze(recordValue);
}

function conflictValueKey(value) {
  return JSON.stringify(value);
}

function addConflict(map, key, kind, generation, value) {
  if (!map.has(key)) map.set(key, { key, kind, values: new Map(), observations: [] });
  const entry = map.get(key);
  const valueKey = conflictValueKey(value);
  // Preserve every named generation even when two generations happen to
  // carry the same value.  Distinct values determine whether this is a
  // conflict; observations keep generation membership auditable.
  entry.values.set(valueKey, { generation, value });
  entry.observations.push({ generation, value });
}

function historicalConflicts(files) {
  const map = new Map();
  for (const file of files) {
    if (file.kind === "artifact_hashes") {
      for (const entry of file.entries ?? []) addConflict(map, `artifact:${entry.path}`, "artifact_hash", file.generation, entry.sha256);
    }
    if (file.kind === "source_state" && file.fingerprint) {
      for (const key of ["source_sha", "source_tree", "diff_sha256", "status_sha256", "manifest_sha256", "working_tree_sha256", "goal_sha256", "goal_bytes"]) {
        if (Object.hasOwn(file.fingerprint, key)) addConflict(map, `source:${key}`, "source_fingerprint", file.generation, file.fingerprint[key]);
      }
    }
    if (["performance_or_build_receipt", "rf13_manifest"].includes(file.kind)) {
      addConflict(map, `receipt:${file.role}`, "receipt_generation", file.generation, file.sha256);
    }
  }
  return [...map.values()]
    .filter((entry) => new Set(entry.observations.map((observation) => conflictValueKey(observation.value))).size > 1)
    .map((entry) => ({
      key: entry.key,
      kind: entry.kind,
      values: [...entry.observations].sort((left, right) => left.generation < right.generation ? -1 : left.generation > right.generation ? 1 : 0).map((item) => ({ generation: item.generation, value: item.value })),
      resolution: "UNRESOLVED_CONFLICT",
      canonical_generation: null,
      formal_release_allowed: false,
      qa_only: true,
    }));
}

/**
 * Enumerate all named historical generations.  No generation is implicitly
 * promoted: conflicts are disclosed and every affected generation is
 * quarantined for QA-only use.
 */
export function buildHistoricalRf13Inventory({ cwd = process.cwd(), historicalDir = DEFAULT_HISTORICAL_DIR } = {}) {
  const repositoryRoot = resolve(cwd);
  const absoluteRoot = resolve(repositoryRoot, historicalDir);
  if (!existsSync(absoluteRoot)) fail("HISTORICAL_DIRECTORY_MISSING", "historical RF13 evidence directory is missing", { category: "historical_inventory" });
  const files = walkFiles(absoluteRoot).map((file) => classifyHistoricalFile(absoluteRoot, file)).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const generationNames = [...new Set(files.map((file) => file.generation))].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const conflicts = historicalConflicts(files);
  const conflictGenerations = new Set(conflicts.flatMap((entry) => entry.values.map((value) => value.generation)));
  const generations = generationNames.map((name) => {
    const generationFiles = files.filter((file) => file.generation === name);
    return {
      name,
      file_count: generationFiles.length,
      files: generationFiles.map((file) => file.path),
      supersession: {
        status: conflictGenerations.has(name) ? "QUARANTINED_CONFLICT" : "OBSERVED_NOT_CANONICAL",
        superseded_by: [],
        canonical: false,
        reason: conflictGenerations.has(name) ? "conflicting historical source or artifact generations" : "no automatic canonical selection",
      },
    };
  });
  return freezeDeep({
    directory: relativePath(repositoryRoot, absoluteRoot),
    classification: "QA_ONLY",
    distributable: false,
    formal_release_allowed: false,
    formal_release_block_reason: conflicts.length ? "UNRESOLVED_HISTORICAL_CONFLICT" : "HISTORICAL_INTERNAL_QA_ONLY",
    files,
    generations,
    conflicts,
    canonical_selection: {
      status: "NONE",
      generation: null,
      rule: "do not auto-select a rerun; unresolved conflicts quarantine every generation",
    },
    conflict_disclosure: conflicts.length
      ? "Historical RF13 source, artifact, and receipt generations conflict; all are QA_ONLY and non-distributable."
      : "No conflicting historical generation was observed; historical RF13 remains QA_ONLY and non-distributable.",
  });
}
