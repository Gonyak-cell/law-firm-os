import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_LEGAL_RISK_TYPES,
  createHrxRiskDailyScan,
  createHrxRiskEvent,
  createInMemoryHrxRiskEventStore,
  scanHrxLegalRiskEvents,
  transitionHrxRiskEvent,
} from "../src/risk-event.js";

test("HR risk event validates category, severity, and optional Matter link", () => {
  const event = createHrxRiskEvent({
    tenant_id: "tenant-a",
    risk_event_id: "risk-001",
    employee_id: "emp-001",
    category: "privacy",
    severity: "high",
    intake_source_ref: "Hotline:risk-001",
    matter_id: "matter-001",
  });
  assert.equal(event.category, "privacy");
  assert.equal(event.severity, "high");
  assert.equal(event.matter_id, "matter-001");
});

test("HR risk event rejects unknown category and severity", () => {
  assert.throws(
    () =>
      createHrxRiskEvent({
        tenant_id: "tenant-a",
        risk_event_id: "risk-001",
        category: "unknown",
        severity: "high",
        intake_source_ref: "Hotline:risk-001",
      }),
    /category must be one of/,
  );
  assert.throws(
    () =>
      createHrxRiskEvent({
        tenant_id: "tenant-a",
        risk_event_id: "risk-001",
        category: "privacy",
        severity: "urgent",
        intake_source_ref: "Hotline:risk-001",
      }),
    /severity must be one of/,
  );
});

test("legal risk scan creates one event for each D-15 statutory rule fixture", () => {
  const tenant_id = "tenant-a";
  const employees = ["emp-contract", "emp-leave", "emp-training", "emp-overtime", "emp-offboarding"].map((employee_id) => ({
    tenant_id,
    employee_id,
    display_name: employee_id,
    status: "active",
  }));
  const signedContractDocuments = employees
    .filter((employee) => employee.employee_id !== "emp-contract")
    .map((employee) => ({
      tenant_id,
      document_id: `doc-contract-${employee.employee_id}`,
      employee_id: employee.employee_id,
      document_type: "employment_contract",
      contract_state: "signed",
      signature_ref: `Signature:${employee.employee_id}`,
      source_ref: `DMS:contract:${employee.employee_id}`,
    }));
  const trainings = employees
    .filter((employee) => employee.employee_id !== "emp-training")
    .map((employee) => ({
      tenant_id,
      employee_id: employee.employee_id,
      training_type: "statutory_labor",
      status: "completed",
      completed_on: "2026-06-30",
      expires_on: "2026-12-31",
    }));
  const events = scanHrxLegalRiskEvents({
    tenant_id,
    as_of: "2026-07-03",
    employees,
    employment_profiles: employees.map((employee) => ({
      tenant_id,
      profile_id: `profile-${employee.employee_id}`,
      employee_id: employee.employee_id,
      status: "active",
    })),
    documents: [
      ...signedContractDocuments,
      {
        tenant_id,
        document_id: "doc-leave-notice-contract-employee",
        employee_id: "emp-contract",
        document_type: "leave_notice",
        source_ref: "DMS:leave-notice:emp-contract:2026",
        source_verified_at: "2026-06-30T00:00:00.000Z",
      },
    ],
    leave_balance_entries: [
      {
        tenant_id,
        entry_id: "leave-earned-risk",
        employee_id: "emp-leave",
        policy_id: "pto-us",
        entry_type: "earned",
        amount: 88,
        occurred_on: "2026-06-01",
        source_ref: "PolicyAccrual:emp-leave",
      },
    ],
    statutory_trainings: trainings,
    attendance_records: [
      ...["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"].map((work_date, index) => ({
        tenant_id,
        attendance_id: `att-risk-${index}`,
        employee_id: "emp-overtime",
        work_date,
        status: "present",
        recorded_hours: index === 4 ? 8 : 12,
        source_ref: `TimeClock:${work_date}`,
      })),
    ],
    overtime_requests: [],
    offboarding_cases: [
      {
        tenant_id,
        offboarding_id: "off-risk",
        employee_id: "emp-offboarding",
        separation_date: "2026-07-01",
        access_revocations: [{ system_ref: "IdP:core", revoked: false }],
      },
    ],
  });
  assert.equal(events.length, 5);
  assert.deepEqual(events.map((event) => event.risk_type).sort(), [...HRX_LEGAL_RISK_TYPES].sort());
  assert.ok(events.every((event) => event.status === "open"));
  assert.ok(events.find((event) => event.risk_type === "overtime_risk")?.source_refs.some((sourceRef) => sourceRef.includes("overtime-")));
});

test("daily risk scan summarizes legal risk events and store preserves state transitions", () => {
  const scan = createHrxRiskDailyScan({
    tenant_id: "tenant-a",
    as_of: "2026-07-03",
    employees: [{ tenant_id: "tenant-a", employee_id: "emp-001", status: "active" }],
    documents: [],
    statutory_trainings: [{ tenant_id: "tenant-a", employee_id: "emp-001", training_type: "statutory_labor", completed_on: "2026-06-30" }],
    leave_balance_entries: [],
    attendance_records: [],
    overtime_requests: [],
    offboarding_cases: [],
  });
  assert.equal(scan.dashboard.by_type.employment_contract_missing, 1);

  const store = createInMemoryHrxRiskEventStore();
  const [created] = store.upsertMany(scan.risk_events);
  const acknowledged = store.transition(
    { tenant_id: "tenant-a", risk_event_id: created.risk_event_id },
    { status: "acknowledged", changed_by: "people-ops", reason: "owner review" },
  );
  assert.equal(acknowledged.status, "acknowledged");
  assert.equal(acknowledged.state_history[0].from_status, "open");

  const rescanned = store.upsertMany(scan.risk_events)[0];
  assert.equal(rescanned.status, "acknowledged");
  const resolved = transitionHrxRiskEvent(rescanned, {
    status: "resolved",
    resolution_ref: "HRDoc:contract:emp-001:signed",
    changed_by: "people-ops",
  });
  assert.equal(resolved.status, "resolved");
  assert.throws(() => transitionHrxRiskEvent(resolved, { status: "open" }), /cannot transition/);
});
