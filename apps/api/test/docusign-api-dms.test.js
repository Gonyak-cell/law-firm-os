import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDocusignCompletionArtifactStore } from "../src/docusign-api.js";
import { createDmsRepository, createFileStorageAdapter, createHash, MATTER, TENANT, ACTOR } from "./docusign-api-fixtures.js";

test("OUTM-34 DMS completion boundary writes an idempotent immutable PDF version with matching SHA", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-dms-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repository = createDmsRepository();
  const storage = createFileStorageAdapter({ rootPath: join(dir, "objects") });
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { repository, storage } });
  const bytes = Buffer.from("signed-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const input = { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api", requested_by_actor_id: ACTOR, request_id: "request-api", envelope_id: "envelope-api", kind: "signed_pdf", title: "agreement - signed.pdf", mime_type: "application/pdf", bytes, sha256: digest };
  const first = await artifactStore.ingest(input);
  assert.deepEqual(first, await artifactStore.ingest(input));
  assert.equal(first.immutable, true);
  assert.equal(first.sha256, digest);
  const versions = repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion", document_id: first.document_id });
  assert.deepEqual([versions.length, versions[0].sha256, storage.getObject({ tenant_id: TENANT, object_id: `vault:${TENANT}:${MATTER}:${first.document_id}:${first.version_id}` }).sha256], [1, digest, digest]);
});

test("OUTM-34 canonical DMS writer revalidates authority inside its write transaction", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-dms-fence-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repository = createDmsRepository();
  const storage = createFileStorageAdapter({ rootPath: join(dir, "objects") });
  const artifactStore = createDocusignCompletionArtifactStore({ dmsRuntime: { repository, storage } });
  const bytes = Buffer.from("fenced-completion-pdf");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const input = { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api", requested_by_actor_id: ACTOR, request_id: "request-fenced", envelope_id: "envelope-fenced", kind: "signed_pdf", title: "agreement - signed.pdf", mime_type: "application/pdf", bytes, sha256: digest };
  const expected = { tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-api", permission_envelope_id: "permission-api", audit_trace_id: "audit-api", request_id: input.request_id, kind: input.kind, sha256: digest, fencing_generation: 1 };
  let drifted = false;
  await assert.rejects(artifactStore.ingest(input, {
    expected_authority: expected,
    validateAuthority: async () => { drifted = true; },
    validateAuthoritySync: () => { if (drifted) throw new Error("authority changed inside DMS writer"); },
  }), /authority changed inside DMS writer/u);
  assert.deepEqual([repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length], [0, 0]);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: `vault:${TENANT}:${MATTER}:docusign-completion:${input.request_id}:${input.kind}:version:docusign-completion:${input.request_id}:${input.kind}:1` }), null);
});
