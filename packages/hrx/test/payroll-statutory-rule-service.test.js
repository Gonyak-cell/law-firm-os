import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollRepository } from "../src/payroll/repository.js";
import { createPayrollStatutoryRulePackage, createPayrollStatutoryRuleService } from "../src/payroll/statutory-rule-service.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const PACKAGE = JSON.parse(readFileSync(new URL("../fixtures/payroll-statutory-rules.synthetic.json", import.meta.url), "utf8"));
const AUTHOR = Object.freeze({ tenant_id: "tenant-statutory", actor_id: "rule-author" });
const REVIEWER = Object.freeze({ tenant_id: "tenant-statutory", actor_id: "rule-reviewer" });

test("PY-DED-001 imports, reviews, publishes, and resolves a contiguous synthetic statutory rule", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  let sequence = 0;
  const repository = createPayrollRepository({ store, clock: () => "2026-07-15T01:00:00.000Z", idFactory: (prefix) => `${prefix}-synthetic-${++sequence}` });
  const service = createPayrollStatutoryRuleService({ payrollRepository: repository });
  let rule = service.importDraft(AUTHOR, { rule_version_id: "rule-statutory-synthetic", package: PACKAGE });
  assert.equal(rule.approval_state, "draft");
  assert.throws(() => service.review(AUTHOR, { rule_version_id: rule.rule_version_id, expected_version: 1 }), (error) => error.safe_error_code === "HRX_PAYROLL_SELF_APPROVAL");
  rule = service.review(REVIEWER, { rule_version_id: rule.rule_version_id, expected_version: 1 });
  rule = service.publish(REVIEWER, { rule_version_id: rule.rule_version_id, expected_version: 2 });
  assert.equal(rule.approval_state, "published");
  assert.equal(service.getPublishedForDate(REVIEWER, { as_of: "2026-07-15" }).rule_version_id, rule.rule_version_id);
  store.close();
});

test("PY-DED-001 rejects malformed coverage and fixture-only production publication", () => {
  const gap = structuredClone(PACKAGE);
  gap.income_tax.brackets[1].minimum_taxable_krw += 1;
  assert.throws(() => createPayrollStatutoryRulePackage(gap), /must be contiguous/);
  const overlap = structuredClone(PACKAGE);
  overlap.income_tax.brackets[0].maximum_taxable_krw += 1;
  assert.throws(() => createPayrollStatutoryRulePackage(overlap), /must be contiguous/);
  assert.throws(() => createPayrollStatutoryRulePackage(PACKAGE, { production: true }), /fixture-only/);
});
