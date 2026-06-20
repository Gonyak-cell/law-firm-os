import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRiskEvent } from "../src/risk-event.js";

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
