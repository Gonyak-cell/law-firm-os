import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { compileApprovedProfileUpserts } from "../compile-amic-approved-profile-upserts.mjs";

const matterId = "matter_rp05_amic_current_002";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function projection() {
  return {
    source_revision: "amic-1-2026-07-10",
    matter_profile_candidates: [{
      matter_id: matterId,
      source_record_count: 1,
      review_required: true,
      write_eligible: false,
      profile_field_candidates: [{ field: "case_number", candidates: [{ value: "2026가합1001", evidence_record_ids: ["src-001"] }] }],
      stakeholder_candidates: [{ relationship_role: "court_clerk", display_name: "담당 주무관", evidence_record_ids: ["src-001"] }],
    }],
  };
}

async function approvedManifest(workbookPath) {
  return {
    schema_version: "law-firm-os.amic_profile_approval_manifest.v1",
    source_revision: "amic-1-2026-07-10",
    reviewer_id: "reviewer-amic-001",
    approval_ref: "AMIC-APPROVAL-001",
    reviewed_workbook_sha256: hash(await readFile(workbookPath)),
    approved_profiles: [{
      matter_id: matterId,
      profile_fields: [{ field: "case_number", value: "2026가합1001", evidence_record_ids: ["src-001"] }],
      stakeholders: [{
        approval_key: "court-clerk-001",
        relationship_role: "court_clerk",
        display_name: "담당 주무관",
        side: "authority",
        evidence_record_ids: ["src-001"],
        profile_fields: ["court_clerk_stakeholder_id"],
      }],
    }],
  };
}

test("compiles an evidence-backed, no-write plan and binds a reviewed stakeholder through the service validator", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "amic-approved-profile-"));
  const workbookPath = path.join(directory, "review.xlsx");
  await writeFile(workbookPath, "synthetic workbook only");
  const plan = await compileApprovedProfileUpserts({ projection: projection(), workbookPath, approvalManifest: await approvedManifest(workbookPath) });
  assert.equal(plan.plan_status, "preflight_passed_no_write");
  assert.equal(plan.no_data_write_executed, true);
  assert.equal(plan.approved_operation_count, 2);
  assert.equal(plan.matter_plans[0].operations[1].stakeholder_bindings[0].field, "court_clerk_stakeholder_id");
});

test("rejects a manifest whose workbook hash no longer proves the reviewed workbook", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "amic-approved-profile-"));
  const workbookPath = path.join(directory, "review.xlsx");
  await writeFile(workbookPath, "first revision");
  const manifest = await approvedManifest(workbookPath);
  await writeFile(workbookPath, "changed revision");
  await assert.rejects(
    compileApprovedProfileUpserts({ projection: projection(), workbookPath, approvalManifest: manifest }),
    /reviewed_workbook_sha256 does not match/,
  );
});

test("rejects fields that are not exact evidence-backed candidates", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "amic-approved-profile-"));
  const workbookPath = path.join(directory, "review.xlsx");
  await writeFile(workbookPath, "synthetic workbook only");
  const manifest = await approvedManifest(workbookPath);
  manifest.approved_profiles[0].profile_fields[0].value = "2026가합9999";
  await assert.rejects(
    compileApprovedProfileUpserts({ projection: projection(), workbookPath, approvalManifest: manifest }),
    /not an evidence-backed candidate/,
  );
});

test("rejects raw-contact fields instead of silently dropping them from a stakeholder", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "amic-approved-profile-"));
  const workbookPath = path.join(directory, "review.xlsx");
  await writeFile(workbookPath, "synthetic workbook only");
  const manifest = await approvedManifest(workbookPath);
  manifest.approved_profiles[0].stakeholders[0].phone = "02-0000-0000";
  await assert.rejects(
    compileApprovedProfileUpserts({ projection: projection(), workbookPath, approvalManifest: manifest }),
    /unsupported field phone/,
  );
});
