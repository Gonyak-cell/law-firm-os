import assert from "node:assert/strict";
import { chmod, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  openProtectedEvidenceRoot, readProtectedJsonProof,
} from "../lib/outlook-release-gates.mjs";
import { createProtectedFixtureRoot, writeProtectedJson } from "./helpers/protected-fixture.mjs";

test("protected evidence reads exact regular-file bytes under a trusted root", async (t) => {
  const root = await createProtectedFixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const binding = await writeProtectedJson(root, "proofs/authorization.json", {
    schema_version: "fixture.v1", proof_class: "authorization", result: "approved",
  });
  const store = openProtectedEvidenceRoot(root);
  const loaded = readProtectedJsonProof(store, binding, "authorization");
  assert.equal(loaded.evidence_sha256, binding.evidence_sha256);
  assert.equal(loaded.proof.result, "approved");

  assert.throws(() => readProtectedJsonProof(store, {
    ...binding, evidence_sha256: "f".repeat(64),
  }, "authorization"), /SHA-256 mismatch/);
  assert.throws(() => readProtectedJsonProof(store, {
    evidence_ref: "proofs/missing.json", evidence_sha256: binding.evidence_sha256,
  }, "authorization"), /ENOENT/);
  assert.throws(() => readProtectedJsonProof(store, {
    evidence_ref: "../escape.json", evidence_sha256: binding.evidence_sha256,
  }, "authorization"), /unsafe/);
  assert.throws(() => readProtectedJsonProof(store, binding, "real_outlook_host"), /proof_class mismatch/);
});

test("protected evidence rejects placeholder refs, writable files, and symlinks", async (t) => {
  const root = await createProtectedFixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const binding = await writeProtectedJson(root, "proofs/host.json", {
    schema_version: "fixture.v1", proof_class: "real_outlook_host", result: "pass",
  });
  const store = openProtectedEvidenceRoot(root);
  assert.throws(() => readProtectedJsonProof(store, {
    evidence_ref: "proofs/placeholder.json", evidence_sha256: binding.evidence_sha256,
  }, "real_outlook_host"), /placeholder/);

  await chmod(path.join(root, binding.evidence_ref), 0o666);
  assert.throws(() => readProtectedJsonProof(store, binding, "real_outlook_host"), /group\/world writable/);
  await chmod(path.join(root, binding.evidence_ref), 0o600);
  await symlink(path.join(root, binding.evidence_ref), path.join(root, "proofs/host-link.json"));
  assert.throws(() => readProtectedJsonProof(store, {
    evidence_ref: "proofs/host-link.json", evidence_sha256: binding.evidence_sha256,
  }, "real_outlook_host"), /symlink/);
});

test("protected evidence rejects invalid JSON even when its hash matches", async (t) => {
  const root = await createProtectedFixtureRoot();
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, "invalid.json");
  await writeFile(target, "not-json\n", { mode: 0o600 });
  const { sha256 } = await import("../lib/outlook-release-gates.mjs");
  assert.throws(() => readProtectedJsonProof(openProtectedEvidenceRoot(root), {
    evidence_ref: "invalid.json", evidence_sha256: sha256(Buffer.from("not-json\n")),
  }, "authorization"), /not valid JSON/);
});
