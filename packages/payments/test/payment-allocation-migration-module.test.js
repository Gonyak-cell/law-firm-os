import assert from "node:assert/strict";
import { test } from "node:test";
import {
  backfillPaymentMatchesAsAllocations as migrationBackfill,
  buildPaymentAllocationMigrationPlan as migrationPlan,
} from "../src/payment-allocation-migration.js";
import {
  backfillPaymentMatchesAsAllocations as serviceBackfill,
  buildPaymentAllocationMigrationPlan as servicePlan,
} from "../src/payment-allocation-service.js";
import {
  backfillPaymentMatchesAsAllocations as packageBackfill,
  buildPaymentAllocationMigrationPlan as packagePlan,
} from "../src/index.js";

test("RFD-TUW-020 preserves migration entrypoint exports across module and package boundaries", () => {
  assert.strictEqual(servicePlan, migrationPlan);
  assert.strictEqual(serviceBackfill, migrationBackfill);
  assert.strictEqual(packagePlan, migrationPlan);
  assert.strictEqual(packageBackfill, migrationBackfill);
});
