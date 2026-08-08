import { GIT_OID, SHA256 } from "./constants.mjs";
import { assertEqual, assertExactKeys, assertSha256, concreteText, utcMillis } from "./primitives.mjs";

export const IDENTITY_KEYS = ["package_lock_sha256", "source_sha", "source_tree"];

export function assertProofBase(proof, schemaVersion, proofClass, identity, extraKeys) {
  assertExactKeys(proof, ["proof_class", "schema_version", ...IDENTITY_KEYS, ...extraKeys], `${proofClass} proof`);
  if (proof.schema_version !== schemaVersion || proof.proof_class !== proofClass
    || !GIT_OID.test(proof.source_sha ?? "") || !GIT_OID.test(proof.source_tree ?? "")
    || !SHA256.test(proof.package_lock_sha256 ?? "")) {
    throw new Error(`${proofClass} proof schema or source identity is invalid`);
  }
  assertEqual({
    source_sha: proof.source_sha,
    source_tree: proof.source_tree,
    package_lock_sha256: proof.package_lock_sha256,
  }, identity, `${proofClass} exact source identity`);
}

export function assertEvidenceBinding(value, name) {
  assertExactKeys(value, ["evidence_ref", "evidence_sha256"], name);
  concreteText(value.evidence_ref, `${name}.evidence_ref`);
  assertSha256(value.evidence_sha256, `${name}.evidence_sha256`);
  return value;
}

export function assertConcreteList(value, name) {
  if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length) {
    throw new Error(`${name} must be a non-empty unique list`);
  }
  for (const [index, entry] of value.entries()) concreteText(entry, `${name}[${index}]`);
  return value;
}

export function assertObservedAt(value, name) {
  utcMillis(value, name);
  return value;
}
