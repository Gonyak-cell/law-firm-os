import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../audit/src/hrx-event-store.js";
import { createInMemoryHrxRepository } from "../src/repository.js";
import {
  HRX_CANDIDATE_CONVERSION_RECEIPT_VERSION,
  executeCandidateConversion,
} from "../src/recruiting/conversion-service.js";

const actor = Object.freeze({ tenant_id: "tenant-a", actor_id: "people-ops-1" });

const candidate = Object.freeze({
  tenant_id: "tenant-a",
  candidate_id: "cand-001",
  legal_name: "Candidate One",
  email: "candidate@example.test",
  source_ref: "RecruitingSource:cand-001",
  resume_ref: "DocumentRef:resume:cand-001",
  retention_policy_id: "candidate-retention-2y",
});

const application = Object.freeze({
  tenant_id: "tenant-a",
  application_id: "app-001",
  candidate_id: "cand-001",
  job_opening_id: "job-001",
  stage: "hired",
});

const offer = Object.freeze({
  tenant_id: "tenant-a",
  offer_id: "offer-001",
  application_id: "app-001",
  candidate_id: "cand-001",
  compensation_ref: "CompensationRef:offer-001",
  document_ref: "DocumentRef:offer-letter-001",
  state: "accepted",
  approval_ref: "ApprovalRef:offer-001",
});

const jobOpening = Object.freeze({
  tenant_id: "tenant-a",
  job_opening_id: "job-001",
  title: "Associate",
  department_ref: "org-legal",
  hiring_manager_employee_id: "emp-manager",
  position_count: 1,
  state: "open",
  approval_ref: "ApprovalRef:job-001",
});

const manager = Object.freeze({
  tenant_id: "tenant-a",
  employee_id: "emp-manager",
  display_name: "Hiring Manager",
  status: "active",
});

function repositoryWithManager() {
  return createInMemoryHrxRepository({ employees: [manager] });
}

function conversionInput(overrides = {}) {
  return {
    idempotency_key: "candidate-conversion:app-001",
    effective_from: "2026-08-01",
    ...overrides,
  };
}

function conversionAuthority(overrides = {}) {
  return {
    candidate,
    application,
    offer,
    job_opening: jobOpening,
    employee_user_link: {
      user_id: "iam-user-001",
      link_id: "link-001",
    },
    ...overrides,
  };
}

test("accepted candidate conversion derives authority, returns one receipt, and replays the same key", () => {
  const repository = repositoryWithManager();
  const audit = createHrxAuditEventStore();
  const clockValues = [
    "2026-07-30T01:00:00.000Z",
    "2026-07-30T01:00:01.000Z",
  ];
  const execute = () =>
    executeCandidateConversion({
      repository,
      audit,
      actor,
      input: conversionInput(),
      authority: conversionAuthority(),
      clock: () => clockValues.shift() ?? "2026-07-30T01:00:02.000Z",
    });

  const first = execute();
  const replay = execute();

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.receipt, first.receipt);
  assert.equal(first.receipt.schema_version, HRX_CANDIDATE_CONVERSION_RECEIPT_VERSION);
  assert.match(first.receipt.results.employee.value.employee_id, /^emp_candidate_[a-f0-9]{24}$/);
  assert.match(first.receipt.results.employment_profile.value.profile_id, /^profile_candidate_[a-f0-9]{24}$/);
  assert.equal(first.receipt.results.employment_profile.value.manager_employee_id, "emp-manager");
  assert.equal(first.receipt.results.employment_profile.value.title, "Associate");
  assert.equal(first.receipt.results.employment_profile.value.org_unit_id, "org-legal");
  assert.equal(first.receipt.results.employee.outcome, "created");
  assert.equal(first.receipt.results.employment_profile.outcome, "created");
  assert.equal(first.receipt.results.employee_user_link.outcome, "created");
  assert.equal(repository.listEmployees({ tenant_id: "tenant-a" }).length, 2);
  assert.equal(repository.listEmploymentProfiles({ tenant_id: "tenant-a" }).length, 1);
  assert.equal(repository.listEmployeeUserLinks({ tenant_id: "tenant-a" }).length, 1);
  assert.deepEqual(
    audit.list({ tenant_id: "tenant-a" }).map((event) => event.action),
    [
      "hrx.candidate.convert_to_employee.started",
      "hrx.candidate.convert_to_employee.completed",
    ],
  );
});

test("candidate conversion rejects client-owned authority fields and cross-tenant authority", () => {
  const repository = repositoryWithManager();
  const audit = createHrxAuditEventStore();
  assert.throws(
    () => executeCandidateConversion({
      repository,
      audit,
      actor,
      input: conversionInput({
        employee_id: "emp-attacker",
        profile_id: "profile-attacker",
        manager_employee_id: "emp-attacker",
      }),
      authority: conversionAuthority(),
    }),
    (error) => error.status === 400
      && error.safe_error_code === "HRX_CANDIDATE_CONVERSION_AUTHORITY_FIELDS_FORBIDDEN",
  );
  assert.throws(
    () => executeCandidateConversion({
      repository,
      audit,
      actor,
      input: conversionInput(),
      authority: conversionAuthority({
        job_opening: { ...jobOpening, tenant_id: "tenant-b" },
      }),
    }),
    (error) => error.status === 403
      && error.safe_error_code === "HRX_CANDIDATE_CONVERSION_TENANT_MISMATCH",
  );
  assert.equal(repository.listEmployees({ tenant_id: "tenant-a" }).length, 1);
  assert.equal(audit.list({ tenant_id: "tenant-a" }).length, 0);
});

test("candidate conversion requires the stored job opening manager to be active", () => {
  const repository = createInMemoryHrxRepository();
  const audit = createHrxAuditEventStore();
  assert.throws(
    () => executeCandidateConversion({
      repository,
      audit,
      actor,
      input: conversionInput(),
      authority: conversionAuthority(),
    }),
    (error) => error.status === 409
      && error.safe_error_code === "HRX_CANDIDATE_CONVERSION_MANAGER_UNAVAILABLE",
  );
});

test("candidate conversion rejects non-accepted offers and another key after completion", () => {
  const repository = repositoryWithManager();
  const audit = createHrxAuditEventStore();
  assert.throws(
    () =>
      executeCandidateConversion({
        repository,
        audit,
        actor,
        input: conversionInput(),
        authority: conversionAuthority({ offer: { ...offer, state: "sent" } }),
      }),
    /accepted offer/,
  );

  executeCandidateConversion({
    repository,
    audit,
    actor,
    input: conversionInput(),
    authority: conversionAuthority(),
  });
  assert.throws(
    () =>
      executeCandidateConversion({
        repository,
        audit,
        actor,
        input: conversionInput({ idempotency_key: "candidate-conversion:app-001:other" }),
        authority: conversionAuthority(),
      }),
    (error) => error.safe_error_code === "HRX_CANDIDATE_ALREADY_CONVERTED",
  );
});

test("candidate conversion rolls back a partial write and retries the same key", () => {
  const baseRepository = repositoryWithManager();
  let failProfileOnce = true;
  const repository = {
    ...baseRepository,
    transaction(callback) {
      return baseRepository.transaction((transactionRepository) =>
        callback({
          ...transactionRepository,
          createEmploymentProfile(input) {
            if (failProfileOnce) {
              failProfileOnce = false;
              throw new Error("fixture profile write failure");
            }
            return transactionRepository.createEmploymentProfile(input);
          },
        }));
    },
  };
  const audit = createHrxAuditEventStore();

  assert.throws(
    () => executeCandidateConversion({
      repository,
      audit,
      actor,
      input: conversionInput(),
      authority: conversionAuthority(),
    }),
    /fixture profile write failure/,
  );
  assert.equal(baseRepository.listEmployees({ tenant_id: "tenant-a" }).length, 1);
  assert.equal(baseRepository.listEmploymentProfiles({ tenant_id: "tenant-a" }).length, 0);
  assert.equal(
    audit.list({ tenant_id: "tenant-a" }).at(-1).action,
    "hrx.candidate.convert_to_employee.recovery_pending",
  );

  const retried = executeCandidateConversion({
    repository,
    audit,
    actor,
    input: conversionInput(),
    authority: conversionAuthority(),
  });
  assert.equal(retried.replayed, false);
  assert.equal(retried.receipt.state, "completed");
  assert.equal(baseRepository.listEmployees({ tenant_id: "tenant-a" }).length, 2);
  assert.equal(baseRepository.listEmploymentProfiles({ tenant_id: "tenant-a" }).length, 1);
});
