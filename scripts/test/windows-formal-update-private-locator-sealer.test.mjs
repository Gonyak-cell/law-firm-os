import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  WINDOWS_UPDATE_CANDIDATE_JOB,
  WINDOWS_UPDATE_CANDIDATE_LOCATOR_ARTIFACT_REF_SCHEMA,
  WINDOWS_UPDATE_CANDIDATE_WORKFLOW_REF,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_SCHEMA,
  WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF,
  createWindowsFormalUpdatePrivateLocatorEnvelopeAad,
  validateWindowsFormalUpdatePrivateLocatorArtifactRef,
  validateWindowsUpdateCandidateLocatorArtifactRefs,
} from "../lib/windows-formal-update-private-locator-sealer.mjs";

const workflowPath = fileURLToPath(new URL("../../.github/workflows/windows-formal-update-private-locator-seal.yml", import.meta.url));
const oidcWorkflowPath = fileURLToPath(new URL("../../.github/workflows/windows-formal-update-private-locator-seal-oidc.yml", import.meta.url));
const source = "a".repeat(40);

function candidate(role, runId) {
  return {
    schema_version: WINDOWS_UPDATE_CANDIDATE_LOCATOR_ARTIFACT_REF_SCHEMA,
    producer_repository: "Gonyak-cell/law-firm-os",
    producer_workflow_ref: WINDOWS_UPDATE_CANDIDATE_WORKFLOW_REF,
    producer_job: WINDOWS_UPDATE_CANDIDATE_JOB,
    producer_run_id: runId,
    producer_run_attempt: "1",
    source_sha: role === "baseline" ? source : "b".repeat(40),
    source_tree: role === "baseline" ? "c".repeat(40) : "d".repeat(40),
    candidate_role: role,
    private_receipt_sha256: role === "baseline" ? "e".repeat(64) : "f".repeat(64),
    artifact_name: `windows-signed-private-locator-${role}-${role === "baseline" ? source : "b".repeat(40)}-${runId}-1`,
    artifact_id: role === "baseline" ? "101" : "102",
    artifact_digest: `sha256:${role === "baseline" ? "1".repeat(64) : "2".repeat(64)}`,
    envelope_sha256: role === "baseline" ? "3".repeat(64) : "4".repeat(64),
  };
}

test("aggregate locator envelope AAD uses the exact frozen canonical bytes", () => {
  const aad = createWindowsFormalUpdatePrivateLocatorEnvelopeAad({
    schema_version: WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA,
    generated_at: "2026-08-14T00:00:00.000Z",
    producer_repository: "Gonyak-cell/law-firm-os",
    producer_workflow_ref: WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF,
    producer_job: WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB,
    producer_run_id: "7001",
    producer_run_attempt: "2",
    source_sha: "5".repeat(40),
    source_tree: "6".repeat(40),
    private_locator_sha256: "9".repeat(64),
    private_locator_bytes: 4096,
    wrapping_key_arn: "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-1111-4111-8111-111111111111",
    wrapping_public_key_sha256: "a".repeat(64),
    key_wrap_algorithm: "RSAES_OAEP_SHA_256",
    content_encryption_algorithm: "AES-256-GCM",
    ciphertext_file: "windows-formal-update-private-locator.enc",
    ignored_after_freeze: "must-not-enter-aad",
  });
  assert.equal(Buffer.isBuffer(aad), true);
  assert.equal(
    aad.toString("utf8"),
    `{"ciphertext_file":"windows-formal-update-private-locator.enc","content_encryption_algorithm":"AES-256-GCM","generated_at":"2026-08-14T00:00:00.000Z","key_wrap_algorithm":"RSAES_OAEP_SHA_256","private_locator_bytes":4096,"private_locator_sha256":"${"9".repeat(64)}","producer_job":"seal-private-locator","producer_repository":"Gonyak-cell/law-firm-os","producer_run_attempt":"2","producer_run_id":"7001","producer_workflow_ref":"${WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF}","schema_version":"${WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA}","source_sha":"${"5".repeat(40)}","source_tree":"${"6".repeat(40)}","wrapping_key_arn":"arn:aws:kms:ap-northeast-2:770880870480:key/11111111-1111-4111-8111-111111111111","wrapping_public_key_sha256":"${"a".repeat(64)}"}`,
  );
});

test("aggregate sealer freezes producer refs and public aggregate ref", () => {
  const refs = validateWindowsUpdateCandidateLocatorArtifactRefs({
    baseline: candidate("baseline", "9001"),
    target: candidate("target", "9002"),
  });
  assert.equal(refs.baseline.producer_job, "private-immutable-handoff");
  assert.equal(refs.target.artifact_digest.startsWith("sha256:"), true);
  const aggregate = validateWindowsFormalUpdatePrivateLocatorArtifactRef({
    schema_version: WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_SCHEMA,
    producer_repository: "Gonyak-cell/law-firm-os",
    producer_workflow_ref: WINDOWS_UPDATE_PRIVATE_LOCATOR_WORKFLOW_REF,
    producer_job: WINDOWS_UPDATE_PRIVATE_LOCATOR_JOB,
    producer_run_id: "7001",
    producer_run_attempt: "2",
    source_sha: "5".repeat(40),
    source_tree: "6".repeat(40),
    artifact_name: "windows-formal-update-private-locator-7001-2",
    artifact_id: "103",
    artifact_digest: `sha256:${"7".repeat(64)}`,
    envelope_sha256: "8".repeat(64),
    private_locator_sha256: "9".repeat(64),
    wrapping_public_key_sha256: "a".repeat(64),
  });
  assert.equal(aggregate.producer_job, "seal-private-locator");
});

test("workflow authenticates closed candidate archives before the reusable OIDC boundary", () => {
  const workflow = readFileSync(workflowPath, "utf8");
  const oidcWorkflow = readFileSync(oidcWorkflowPath, "utf8");
  assert.match(workflow, /^name: Windows Formal Update Private Locator Seal$/mu);
  assert.match(workflow, /^  seal-private-locator:$/mu);
  assert.match(workflow, /WINDOWS_UPDATE_LOCATOR_ARTIFACT_READ_TOKEN/u);
  assert.match(workflow, /id-token: none/u);
  assert.match(workflow, /attempts\/\$run_attempt\/jobs\?per_page=100/u);
  assert.match(workflow, /--authenticate-downloads/u);
  assert.match(workflow, /mode not in \(0, stat\.S_IFREG\)/u);
  assert.match(workflow, /os\.O_EXCL/u);
  assert.match(workflow, /os\.O_NOFOLLOW/u);
  assert.match(workflow, /name\.encode\("ascii", "strict"\)/u);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/windows-formal-update-private-locator-seal-oidc\.yml/u);
  assert.ok(workflow.indexOf("--authenticate-downloads") < workflow.indexOf("python3 - <<'PY'"));
  assert.ok(workflow.indexOf("python3 - <<'PY'") < workflow.indexOf("--preflight"));

  assert.match(oidcWorkflow, /^name: Windows Formal Update Private Locator Seal OIDC$/mu);
  assert.match(oidcWorkflow, /^  workflow_call:$/mu);
  assert.match(oidcWorkflow, /environment:\n\s+name: windows-formal-update-private-locator-seal/u);
  assert.match(oidcWorkflow, /id-token: write/u);
  assert.match(oidcWorkflow, /actions\/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093/u);
  assert.match(oidcWorkflow, /windows-formal-update-private-locator-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/u);
  assert.match(oidcWorkflow, /retention-days: 30/u);
  assert.match(oidcWorkflow, /windows\/governance\/v1\//u);
  assert.ok(oidcWorkflow.indexOf("actions/download-artifact@") < oidcWorkflow.indexOf("actions/checkout@"));
  assert.ok(oidcWorkflow.indexOf("actions/checkout@") < oidcWorkflow.indexOf("actions/setup-node@"));
  assert.ok(oidcWorkflow.indexOf("actions/setup-node@") < oidcWorkflow.indexOf("aws-actions/configure-aws-credentials@"));
  assert.ok(oidcWorkflow.indexOf("aws-actions/configure-aws-credentials@") < oidcWorkflow.indexOf("\n        run:"));
  assert.match(oidcWorkflow, /object_count!==19/u);
  assert.match(oidcWorkflow, /governance_upload_count!==9/u);
  assert.match(oidcWorkflow, /artifact_digest_hex=\$\{ARTIFACT_DIGEST#sha256:\}/u);
  assert.match(workflow, /if: always\(\)/u);
  assert.match(oidcWorkflow, /if: always\(\)/u);
  assert.equal(WINDOWS_UPDATE_PRIVATE_LOCATOR_SCHEMA, "law-firm-os.windows-formal-update-private-locator.v1");
  assert.equal(WINDOWS_UPDATE_PRIVATE_LOCATOR_ENVELOPE_SCHEMA, "law-firm-os.windows-formal-update-private-locator-envelope.v1");
});
