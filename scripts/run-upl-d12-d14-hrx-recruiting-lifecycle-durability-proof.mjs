#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../apps/api/src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = "artifacts/manual-qa";
const JSON_PATH = `${ARTIFACT_DIR}/upl-d12-d14-hrx-recruiting-lifecycle-durability-proof-2026-07-03.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-d12-d14-hrx-recruiting-lifecycle-durability-proof-2026-07-03.md`;
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function check(id, passed, evidence = {}) {
  return { id, passed: Boolean(passed), evidence };
}

async function startApi(hrxStorePath) {
  const started = await startApiServer({ port: 0, hrxStorePath });
  return {
    ...started,
    baseUrl: `http://${started.host}:${started.port}`,
    close: () => new Promise((resolveClose) => started.server.close(resolveClose)),
  };
}

async function json(baseUrl, path, { method = "GET", body, headers } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  return { status: response.status, body: payload, response_hash: sha256(payload) };
}

function durableTableCounts(storePath) {
  const state = JSON.parse(readFileSync(storePath, "utf8"));
  return Object.fromEntries(
    [
      "hrx_job_openings",
      "hrx_candidates",
      "hrx_candidate_consents",
      "hrx_applications",
      "hrx_interviews",
      "hrx_offers",
      "hrx_onboarding_plans",
      "hrx_offboarding_cases",
    ].map((table) => [table, state.tables?.[table]?.length ?? 0]),
  );
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });

const proofRoot = mkdtempSync(join(tmpdir(), "lawos-upl-d12-d14-"));
const hrxStorePath = join(proofRoot, "hrx-store.json");
const ids = Object.freeze({
  job_opening_id: "job-upl-d12-d14",
  candidate_id: "cand-upl-d12-d14",
  consent_id: "consent-upl-d12-d14",
  application_id: "app-upl-d12-d14",
  interview_id: "int-upl-d12-d14",
  offer_id: "offer-upl-d12-d14",
  onboarding_id: "onb-001",
  onboarding_task_id: "policy-ack",
  offboarding_id: "off-001",
});

let firstApi = null;
let secondApi = null;

try {
  firstApi = await startApi(hrxStorePath);
  const firstHeaders = await apiSessionHeaders(firstApi.baseUrl);
  const employees = await json(firstApi.baseUrl, "/api/hrx/employees", { headers: firstHeaders });
  const employeeIds = employees.body.employees.map((employee) => employee.employee_id);
  const hiringManagerEmployeeId = employeeIds[0];
  if (!hiringManagerEmployeeId) throw new Error("HRX seed employee is required for D12/D14 proof");

  const writes = [];
  writes.push(await json(firstApi.baseUrl, "/api/hrx/recruiting/job-openings", {
    method: "POST",
    headers: firstHeaders,
    body: {
      job_opening_id: ids.job_opening_id,
      title: "UPL D12 D14 Durable Recruiting Counsel",
      department_ref: "PracticeGroup:litigation",
      hiring_manager_employee_id: hiringManagerEmployeeId,
      position_count: 1,
      state: "open",
      approval_ref: "Approval:upl-d12-d14",
    },
  }));
  writes.push(await json(firstApi.baseUrl, "/api/hrx/recruiting/candidates", {
    method: "POST",
    headers: firstHeaders,
    body: {
      candidate_id: ids.candidate_id,
      legal_name: "UPL D12 D14 Candidate",
      email: "upl-d12-d14-candidate@example.com",
      source_ref: "ATS:upl-d12-d14:candidate",
      resume_ref: "DMS:upl-d12-d14-resume",
      retention_policy_id: "candidate-retention-2y",
      consent: {
        consent_id: ids.consent_id,
        purpose: "recruiting_processing",
        granted_at: "2026-07-03T00:00:00.000Z",
        evidence_ref: "Consent:upl-d12-d14",
      },
    },
  }));
  writes.push(await json(firstApi.baseUrl, "/api/hrx/recruiting/applications", {
    method: "POST",
    headers: firstHeaders,
    body: {
      application_id: ids.application_id,
      candidate_id: ids.candidate_id,
      job_opening_id: ids.job_opening_id,
      stage: "interview",
      submitted_at: "2026-07-03T00:01:00.000Z",
    },
  }));
  writes.push(await json(firstApi.baseUrl, "/api/hrx/recruiting/interviews", {
    method: "POST",
    headers: firstHeaders,
    body: {
      interview_id: ids.interview_id,
      application_id: ids.application_id,
      candidate_id: ids.candidate_id,
      scheduled_for: "2026-07-08T02:00:00.000Z",
      schedule_source_ref: "CalendarEvent:upl-d12-d14",
      interviewer_employee_ids: [hiringManagerEmployeeId],
    },
  }));
  writes.push(await json(firstApi.baseUrl, "/api/hrx/recruiting/offers", {
    method: "POST",
    headers: firstHeaders,
    body: {
      offer_id: ids.offer_id,
      application_id: ids.application_id,
      candidate_id: ids.candidate_id,
      compensation_ref: "CompPackage:upl-d12-d14",
      document_ref: "DMS:upl-d12-d14-offer",
      state: "sent",
      approval_ref: "Approval:upl-d12-d14-offer",
    },
  }));
  writes.push(await json(firstApi.baseUrl, `/api/hrx/recruiting/applications/${ids.application_id}/stage`, {
    method: "POST",
    headers: firstHeaders,
    body: { stage: "offer", stage_reason: "upl_d12_d14_durability_proof" },
  }));
  writes.push(await json(firstApi.baseUrl, `/api/hrx/recruiting/offers/${ids.offer_id}/stage`, {
    method: "POST",
    headers: firstHeaders,
    body: { state: "accepted", approval_ref: "Approval:upl-d12-d14-offer" },
  }));
  writes.push(await json(firstApi.baseUrl, `/api/hrx/lifecycle/onboarding/${ids.onboarding_id}/tasks/${ids.onboarding_task_id}`, {
    method: "POST",
    headers: firstHeaders,
    body: { status: "completed" },
  }));
  writes.push(await json(firstApi.baseUrl, `/api/hrx/lifecycle/offboarding/${ids.offboarding_id}/close`, {
    method: "POST",
    headers: firstHeaders,
  }));
  await firstApi.close();
  firstApi = null;

  secondApi = await startApi(hrxStorePath);
  const secondHeaders = await apiSessionHeaders(secondApi.baseUrl);
  const pipeline = await json(secondApi.baseUrl, "/api/hrx/recruiting/pipeline", { headers: secondHeaders });
  const onboarding = await json(secondApi.baseUrl, "/api/hrx/lifecycle/onboarding", { headers: secondHeaders });
  const offboarding = await json(secondApi.baseUrl, "/api/hrx/lifecycle/offboarding", { headers: secondHeaders });

  const application = pipeline.body.applications.find((item) => item.application_id === ids.application_id);
  const offer = pipeline.body.offers.find((item) => item.offer_id === ids.offer_id);
  const onboardingPlan = onboarding.body.onboarding.find((item) => item.onboarding_id === ids.onboarding_id);
  const offboardingCase = offboarding.body.offboarding.find((item) => item.offboarding_id === ids.offboarding_id);
  const tableCounts = durableTableCounts(hrxStorePath);
  const checks = [
    check("all-write-routes-returned-success", writes.every((item) => item.status >= 200 && item.status < 300), {
      statuses: writes.map((item) => item.status),
    }),
    check("job-opening-survived-restart", pipeline.body.job_openings.some((item) => item.job_opening_id === ids.job_opening_id)),
    check("candidate-survived-restart", pipeline.body.candidates.some((item) => item.candidate_id === ids.candidate_id)),
    check("application-stage-survived-restart", application?.stage === "offer", { stage: application?.stage ?? null }),
    check("interview-survived-restart", pipeline.body.interviews.some((item) => item.interview_id === ids.interview_id)),
    check("offer-state-survived-restart", offer?.state === "accepted", { state: offer?.state ?? null }),
    check("onboarding-task-state-survived-restart", onboardingPlan?.tasks?.find((task) => task.task_id === ids.onboarding_task_id)?.status === "completed"),
    check("offboarding-close-survived-restart", offboardingCase?.state === "closed", { state: offboardingCase?.state ?? null }),
    check("durable-tables-present", Object.values(tableCounts).every((count) => count > 0), tableCounts),
  ];

  const receipt = {
    schema_version: "law-firm-os.wave1.upl_d12_d14.hrx_recruiting_lifecycle_durability.v0.1",
    generated_at: new Date().toISOString(),
    tuw_ids: ["UPL-D-12", "UPL-D-14"],
    pass: checks.every((item) => item.passed),
    scope: "Signed-session API write and restart readback for HRX recruiting, onboarding, and offboarding durable tables.",
    tenant_id: TENANT,
    store_path_hash: sha256(hrxStorePath),
    ids,
    response_hashes: {
      writes: writes.map((item) => item.response_hash),
      pipeline: pipeline.response_hash,
      onboarding: onboarding.response_hash,
      offboarding: offboarding.response_hash,
    },
    table_counts: tableCounts,
    checks,
    raw_resume_body_included: false,
    raw_interview_feedback_included: false,
    raw_compensation_included: false,
    production_ready_claim: false,
  };

  writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(receipt, null, 2)}\n`);
  writeFileSync(
    join(ROOT, MD_PATH),
    `# UPL D12/D14 HRX Recruiting Lifecycle Durability Proof\n\nGenerated at: ${receipt.generated_at}\n\n- PASS: ${receipt.pass}\n- Store path hash: \`${receipt.store_path_hash}\`\n- Production ready claim: false\n\n## Checks\n\n${checks.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id}`).join("\n")}\n`,
  );
  console.log(JSON.stringify({ pass: receipt.pass, artifact: JSON_PATH, checks: checks.length }, null, 2));
  if (!receipt.pass) process.exitCode = 1;
} finally {
  if (firstApi) await firstApi.close();
  if (secondApi) await secondApi.close();
}
