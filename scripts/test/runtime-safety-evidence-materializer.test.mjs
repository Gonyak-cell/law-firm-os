import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { materializeRuntimeSafetyEvidence } from "../lib/runtime-safety-evidence-materializer.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "lawos-evidence-materializer-"));
  const sourceRoot = join(root, "source");
  const destinationRoot = join(root, "destination");
  mkdirSync(sourceRoot);
  mkdirSync(destinationRoot);
  const bytes = Buffer.from("{}\n");
  writeFileSync(join(sourceRoot, "receipt.json"), bytes);
  return {
    root,
    sourceRoot,
    destinationRoot,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    entry: {
      source_path: "receipt.json",
      destination_path: "workbook/lawos-runtime-safety-evidence/RS-GOV-001/command-evidence.v0.2.json",
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}

function expectCode(code, run) {
  assert.throws(run, (error) => error.code === code);
}

test("evidence materializer copies one exact hash-bound allowlisted file", () => {
  const f = fixture();
  const result = materializeRuntimeSafetyEvidence({ ...f, entries: [f.entry] });
  assert.equal(result.copied, 1);
});

test("evidence materializer rejects outside allowlist, glob, collision, missing source, and hash drift", () => {
  let f = fixture();
  expectCode("EVIDENCE_ALLOWLIST", () => materializeRuntimeSafetyEvidence({ ...f, entries: [{ ...f.entry, destination_path: "raw.log" }] }));
  f = fixture();
  expectCode("EVIDENCE_DESTINATION_PATH", () => materializeRuntimeSafetyEvidence({ ...f, entries: [{ ...f.entry, destination_path: "workbook/**/receipt.json" }] }));
  f = fixture();
  expectCode("EVIDENCE_DESTINATION_COLLISION", () => materializeRuntimeSafetyEvidence({ ...f, entries: [f.entry, f.entry] }));
  f = fixture();
  expectCode("EVIDENCE_SOURCE_MISSING", () => materializeRuntimeSafetyEvidence({ ...f, entries: [{ ...f.entry, source_path: "missing.json" }] }));
  f = fixture();
  expectCode("EVIDENCE_HASH_DRIFT", () => materializeRuntimeSafetyEvidence({ ...f, entries: [{ ...f.entry, sha256: "0".repeat(64) }] }));
});

test("evidence materializer rejects symlink sources and path escape", () => {
  let f = fixture();
  symlinkSync(join(f.sourceRoot, "receipt.json"), join(f.sourceRoot, "link.json"));
  expectCode("EVIDENCE_SYMLINK", () => materializeRuntimeSafetyEvidence({ ...f, entries: [{ ...f.entry, source_path: "link.json" }] }));
  f = fixture();
  expectCode("EVIDENCE_SOURCE_PATH", () => materializeRuntimeSafetyEvidence({ ...f, entries: [{ ...f.entry, source_path: "../receipt.json" }] }));
});
