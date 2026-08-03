import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  DesktopPrivateDataBoundaryError,
  compareCodePointText,
  desktopPrivateDataCorpusNeedles,
  desktopPrivateDataCorpusPhotoHashes,
} from "./matter-desktop-private-data-corpus.mjs";

export {
  DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES,
  DesktopPrivateDataBoundaryError,
  buildDesktopPrivateDataCorpus,
} from "./matter-desktop-private-data-corpus.mjs";

export const FORBIDDEN_DESKTOP_PRIVATE_DATA_BASENAME_KINDS = Object.freeze({
  "hrx-member-contact-source-of-truth.json": "contact_private_path",
  "hrx-member-photos": "photo_private_path",
  "hrx-member-roster-source-of-truth.json": "roster_private_path",
  "matter-vault-user-registration-seed.json": "registration_seed_private_path",
  runtime: "private_runtime_path",
});
export const FORBIDDEN_DESKTOP_PRIVATE_DATA_BASENAMES = Object.freeze(
  Object.keys(FORBIDDEN_DESKTOP_PRIVATE_DATA_BASENAME_KINDS).sort(compareCodePointText),
);
export const UNINSPECTED_DESKTOP_ARCHIVE_EXTENSIONS = Object.freeze([
  ".7z",
  ".appx",
  ".appxbundle",
  ".asar",
  ".bz2",
  ".cab",
  ".dmg",
  ".gz",
  ".msi",
  ".msix",
  ".msixbundle",
  ".nupkg",
  ".pkg",
  ".rar",
  ".tar",
  ".tgz",
  ".xz",
  ".zip",
]);

const PRIVATE_KEY_BASENAME = /\.(?:key|p12|pfx|pem)$/u;
const CREDENTIAL_BASENAME = /^(?:\.env(?:\..+)?|credential(?:s)?(?:\.json)?|secret(?:s)?(?:\.json)?)$/u;
const WINDOWS_EXE_INSTALLER_BASENAME = /(?:^|[ ._-])(?:install|installer|setup)(?:[ ._-]|$)|-win-(?:arm64|ia32|x64)\.exe$/u;
const UNINSPECTED_ARCHIVE_EXTENSION_SET = new Set(UNINSPECTED_DESKTOP_ARCHIVE_EXTENSIONS);
const SCAN_CHUNK_BYTES = 64 * 1024;

function displayPath(targetPath, baseDir) {
  const relative = path.relative(baseDir, targetPath).replaceAll(path.sep, "/");
  return relative || ".";
}

function findingDisplayPath(targetPath, baseDir, needles, photoHashes, redactedPaths) {
  if (redactedPaths.has(targetPath)) return redactedPaths.get(targetPath);
  const candidate = displayPath(targetPath, baseDir);
  const candidateBytes = Buffer.from(candidate);
  const containsProtectedValue = needles.some(({ bytes }) => candidateBytes.indexOf(bytes) !== -1);
  const lowerCandidate = candidate.toLowerCase();
  const containsPhotoHash = [...photoHashes].some((hash) => lowerCandidate.includes(hash));
  if (!containsProtectedValue && !containsPhotoHash) return candidate;
  const opaquePath = `[redacted-path-${redactedPaths.size + 1}]`;
  redactedPaths.set(targetPath, opaquePath);
  return opaquePath;
}

function withinRoot(rootRealPath, targetRealPath) {
  if (targetRealPath === rootRealPath) return true;
  const relative = path.relative(rootRealPath, targetRealPath);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function inodeKey(fileStat) {
  return `${fileStat.dev}:${fileStat.ino}`;
}

function symlinkResolutionFinding(error) {
  return error?.code === "ELOOP" ? "symlink_loop" : "broken_symlink";
}

function addUnscannedEntry(entries, logicalPath, findingKind) {
  entries.push({ logicalPath, realPath: null, type: "other", scan: false, findingKind });
}

async function walkEntry({ logicalPath, physicalPath, rootRealPath, state, rootEntry = false }) {
  let entryStat;
  try {
    entryStat = await lstat(physicalPath);
  } catch {
    addUnscannedEntry(state.entries, logicalPath, "unreadable_filesystem_entry");
    return;
  }

  const isSymlink = entryStat.isSymbolicLink();
  let targetRealPath;
  try {
    targetRealPath = await realpath(physicalPath);
  } catch (error) {
    addUnscannedEntry(state.entries, logicalPath, isSymlink
      ? symlinkResolutionFinding(error)
      : "unreadable_filesystem_entry");
    return;
  }
  if (!rootEntry && !withinRoot(rootRealPath, targetRealPath)) {
    addUnscannedEntry(state.entries, logicalPath, isSymlink
      ? "out_of_root_symlink"
      : "out_of_root_filesystem_entry");
    return;
  }

  let targetStat;
  try {
    targetStat = await stat(targetRealPath);
  } catch {
    addUnscannedEntry(state.entries, logicalPath, isSymlink
      ? "broken_symlink"
      : "unreadable_filesystem_entry");
    return;
  }
  const key = inodeKey(targetStat);
  if (isSymlink && state.active.has(key)) {
    addUnscannedEntry(state.entries, logicalPath, "symlink_loop");
    return;
  }
  const type = targetStat.isDirectory() ? "directory" : targetStat.isFile() ? "file" : "other";
  if (type === "other") {
    addUnscannedEntry(state.entries, logicalPath, isSymlink
      ? "unsupported_symlink_target"
      : "uninspected_filesystem_entry");
    return;
  }

  const alreadyVisited = state.visited.has(key);
  state.entries.push({
    logicalPath,
    realPath: targetRealPath,
    type,
    scan: type === "file" && !alreadyVisited,
    findingKind: null,
  });
  if (alreadyVisited) return;
  state.visited.add(key);
  if (type === "file") return;

  state.active.add(key);
  let children;
  try {
    children = await readdir(targetRealPath, { withFileTypes: true });
  } catch {
    state.active.delete(key);
    throw new DesktopPrivateDataBoundaryError("unreadable_scan_root", logicalPath);
  }
  children.sort((left, right) => compareCodePointText(left.name, right.name));
  try {
    for (const child of children) {
      await walkEntry({
        logicalPath: path.join(logicalPath, child.name),
        physicalPath: path.join(targetRealPath, child.name),
        rootRealPath,
        state,
      });
    }
  } finally {
    state.active.delete(key);
  }
}

async function collectRequestedRoot(rootPath, entries) {
  let rootStat;
  try {
    rootStat = await lstat(rootPath);
  } catch {
    throw new DesktopPrivateDataBoundaryError("missing_scan_root", rootPath);
  }
  let rootRealPath;
  try {
    rootRealPath = await realpath(rootPath);
  } catch (error) {
    if (!rootStat.isSymbolicLink()) throw new DesktopPrivateDataBoundaryError("unreadable_scan_root", rootPath);
    entries.push({
      logicalPath: rootPath,
      realPath: null,
      type: "other",
      scan: false,
      findingKind: symlinkResolutionFinding(error),
    });
    return;
  }
  const firstEntryIndex = entries.length;
  await walkEntry({
    logicalPath: rootPath,
    physicalPath: rootPath,
    rootRealPath,
    state: { entries, visited: new Set(), active: new Set() },
    rootEntry: true,
  });
  const rootEntries = entries.slice(firstEntryIndex);
  if (!rootEntries.some(({ scan }) => scan) && !rootEntries.some(({ findingKind }) => findingKind)) {
    entries.push({
      logicalPath: rootPath,
      realPath: rootRealPath,
      type: "other",
      scan: false,
      findingKind: "empty_scan_root",
    });
  }
}

function forbiddenPathKind(basename) {
  const normalized = basename.toLowerCase();
  return FORBIDDEN_DESKTOP_PRIVATE_DATA_BASENAME_KINDS[normalized]
    ?? (CREDENTIAL_BASENAME.test(normalized) || PRIVATE_KEY_BASENAME.test(normalized)
      ? "credential_private_path"
      : null);
}

function isUninspectedArchiveContainer(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  return UNINSPECTED_ARCHIVE_EXTENSION_SET.has(path.extname(basename))
    || (basename.endsWith(".exe") && WINDOWS_EXE_INSTALLER_BASENAME.test(basename));
}

function addFinding(findings, kind, findingPath, count = 1) {
  const key = `${kind}\0${findingPath}`;
  const current = findings.get(key);
  if (current) current.count += count;
  else findings.set(key, { kind, path: findingPath, count });
}

async function scanFile(filePath, needles, photoHashes) {
  const matchedByKind = new Map();
  const hash = createHash("sha256");
  const maximumNeedleLength = needles.reduce((maximum, needle) => Math.max(maximum, needle.bytes.length), 1);
  let tail = Buffer.alloc(0);
  try {
    for await (const chunk of createReadStream(filePath, { highWaterMark: SCAN_CHUNK_BYTES })) {
      hash.update(chunk);
      const searchable = tail.length ? Buffer.concat([tail, chunk]) : chunk;
      for (let index = 0; index < needles.length; index += 1) {
        const needle = needles[index];
        const matches = matchedByKind.get(needle.kind) ?? new Set();
        if (!matches.has(index) && searchable.indexOf(needle.bytes) !== -1) matches.add(index);
        if (matches.size) matchedByKind.set(needle.kind, matches);
      }
      const overlap = Math.min(maximumNeedleLength - 1, searchable.length);
      tail = overlap ? Buffer.from(searchable.subarray(searchable.length - overlap)) : Buffer.alloc(0);
    }
  } catch {
    throw new DesktopPrivateDataBoundaryError("unreadable_scan_file", filePath);
  }
  return {
    matchedByKind,
    privatePhotoMatch: photoHashes.has(hash.digest("hex")),
  };
}

export async function scanDesktopPrivateDataBoundary({
  roots,
  corpus,
  displayBase = process.cwd(),
  allowlistedPathFindings = [],
} = {}) {
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new DesktopPrivateDataBoundaryError("missing_scan_root_argument", ".");
  }
  const needles = desktopPrivateDataCorpusNeedles(corpus);
  const photoHashes = desktopPrivateDataCorpusPhotoHashes(corpus);
  if (!needles || !photoHashes) throw new DesktopPrivateDataBoundaryError("invalid_protected_corpus", ".");
  const absoluteRoots = [...new Set(roots.map((root) => path.resolve(root)))].sort(compareCodePointText);
  const allowedPathFindings = new Set(allowlistedPathFindings.map((entry) => path.resolve(entry)));
  const entries = [];
  for (const root of absoluteRoots) await collectRequestedRoot(root, entries);

  const findings = new Map();
  const redactedPaths = new Map();
  for (const entry of entries) {
    const findingPath = findingDisplayPath(
      entry.logicalPath,
      path.resolve(displayBase),
      needles,
      photoHashes,
      redactedPaths,
    );
    if (entry.findingKind) addFinding(findings, entry.findingKind, findingPath);
    const pathKind = forbiddenPathKind(path.basename(entry.logicalPath));
    if (pathKind && !allowedPathFindings.has(path.resolve(entry.logicalPath))) addFinding(findings, pathKind, findingPath);
    if (entry.type !== "file") continue;
    if (isUninspectedArchiveContainer(entry.logicalPath)) {
      addFinding(findings, "uninspected_archive_container", findingPath);
    }
    if (!entry.scan) continue;
    const { matchedByKind, privatePhotoMatch } = await scanFile(entry.realPath, needles, photoHashes);
    for (const [kind, matches] of matchedByKind) addFinding(findings, kind, findingPath, matches.size);
    if (privatePhotoMatch) addFinding(findings, "private_photo_hash", findingPath);
  }

  const findingRows = [...findings.values()].sort((left, right) =>
    compareCodePointText(left.path, right.path) || compareCodePointText(left.kind, right.kind));
  return Object.freeze({
    verdict: findingRows.length === 0 ? "PASS" : "FAIL",
    root_count: absoluteRoots.length,
    scanned_file_count: entries.filter(({ scan }) => scan).length,
    finding_count: findingRows.reduce((count, finding) => count + finding.count, 0),
    contact_corpus_status: corpus.contact_corpus_status,
    contact_protected_value_count: corpus.contact_protected_value_count,
    findings: Object.freeze(findingRows.map(Object.freeze)),
  });
}

export function desktopPrivateDataBoundaryErrorResult(error, {
  displayBase = process.cwd(),
  corpus = null,
} = {}) {
  const kind = error instanceof DesktopPrivateDataBoundaryError ? error.kind : "private_data_scanner_error";
  const targetPath = error instanceof DesktopPrivateDataBoundaryError ? error.targetPath : ".";
  const needles = desktopPrivateDataCorpusNeedles(corpus) ?? [];
  const photoHashes = desktopPrivateDataCorpusPhotoHashes(corpus) ?? new Set();
  const absoluteTargetPath = path.resolve(targetPath);
  const redactedPaths = new Map();
  if (!corpus && targetPath !== ".") redactedPaths.set(absoluteTargetPath, "[redacted-path-1]");
  return {
    verdict: "FAIL",
    root_count: 0,
    scanned_file_count: 0,
    finding_count: 1,
    contact_corpus_status: corpus?.contact_corpus_status ?? "unavailable",
    contact_protected_value_count: corpus?.contact_protected_value_count ?? 0,
    findings: [{
      kind,
      path: findingDisplayPath(absoluteTargetPath, path.resolve(displayBase), needles, photoHashes, redactedPaths),
      count: 1,
    }],
  };
}
