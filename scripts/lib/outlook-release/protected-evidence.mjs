import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import {
  assertExactKeys, assertNoSensitiveMaterial, assertSafeRelativePath, assertSha256, concreteText, sha256,
} from "./primitives.mjs";

const TRUSTED_ROOT = Symbol("trusted-protected-evidence-root");
const MAX_PROOF_BYTES = 4 * 1024 * 1024;

function secureMetadata(metadata, name, { directory = false } = {}) {
  if (directory ? !metadata.isDirectory() : !metadata.isFile()) throw new Error(`${name} has the wrong filesystem type`);
  if ((metadata.mode & 0o022) !== 0) throw new Error(`${name} must not be group/world writable`);
}

function checkPathSegments(root, relative) {
  let current = root;
  for (const segment of relative.split("/").slice(0, -1)) {
    current = path.join(current, segment);
    const metadata = lstatSync(current);
    if (metadata.isSymbolicLink()) throw new Error(`protected evidence path contains a symlink: ${relative}`);
    secureMetadata(metadata, `protected evidence directory ${segment}`, { directory: true });
  }
}

export function openProtectedEvidenceRoot(rootPath) {
  const requested = path.resolve(concreteText(rootPath, "protected evidence root"));
  const metadata = lstatSync(requested);
  if (metadata.isSymbolicLink()) throw new Error("protected evidence root must not be a symlink");
  secureMetadata(metadata, "protected evidence root", { directory: true });
  const root = realpathSync(requested);
  return Object.freeze({ [TRUSTED_ROOT]: true, root });
}

function readRegularFile(store, evidenceRef) {
  if (!store?.[TRUSTED_ROOT]) throw new Error("a trusted protected evidence root is required");
  const relative = assertSafeRelativePath(concreteText(evidenceRef, "protected evidence ref"), "protected evidence ref");
  checkPathSegments(store.root, relative);
  const requested = path.join(store.root, relative);
  const linkMetadata = lstatSync(requested);
  if (linkMetadata.isSymbolicLink()) throw new Error(`protected evidence must not be a symlink: ${relative}`);
  const resolved = realpathSync(requested);
  if (resolved !== requested || !resolved.startsWith(`${store.root}${path.sep}`)) {
    throw new Error(`protected evidence escaped the trusted root: ${relative}`);
  }
  const noFollow = constants.O_NOFOLLOW ?? 0;
  const descriptor = openSync(resolved, constants.O_RDONLY | noFollow);
  try {
    const metadata = fstatSync(descriptor);
    secureMetadata(metadata, `protected evidence ${relative}`);
    if (metadata.size < 2 || metadata.size > MAX_PROOF_BYTES) throw new Error(`protected evidence size is invalid: ${relative}`);
    const bytes = readFileSync(descriptor);
    if (bytes.byteLength !== metadata.size) throw new Error(`protected evidence changed while reading: ${relative}`);
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

export function readProtectedJsonDocument(store, binding, name) {
  assertExactKeys(binding, ["evidence_ref", "evidence_sha256"], `${name} evidence binding`);
  const expectedHash = assertSha256(binding.evidence_sha256, `${name} evidence`);
  const bytes = readRegularFile(store, binding.evidence_ref);
  const actualHash = sha256(bytes);
  if (actualHash !== expectedHash) throw new Error(`${name} protected evidence SHA-256 mismatch`);
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${name} protected evidence is not valid JSON`);
  }
  assertNoSensitiveMaterial(document, `${name} protected evidence`);
  return Object.freeze({ bytes, evidence_ref: binding.evidence_ref, evidence_sha256: actualHash, document });
}

export function readProtectedJsonProof(store, binding, expectedProofClass) {
  const loaded = readProtectedJsonDocument(store, binding, expectedProofClass);
  const proof = loaded.document;
  if (proof?.proof_class !== expectedProofClass) {
    throw new Error(`${expectedProofClass} protected evidence proof_class mismatch`);
  }
  return Object.freeze({ ...loaded, proof });
}
