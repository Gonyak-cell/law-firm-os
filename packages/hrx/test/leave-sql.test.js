import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeaveRequestService, createSqlLeaveRequestStore } from "../src/leave/request-service.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

function setup() {
  const store = createFileHrxStore({ filePath: join(mkdtempSync(join(tmpdir(), "hrx-leave-sql-")), "store.json") });
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store });
  repository.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" });
  const ledger = createSqlLeaveBalanceLedger({ store });
  const requestStore = createSqlLeaveRequestStore({ store });
  return { store, ledger, requestStore, service: createLeaveRequestService({ store: requestStore, balanceLedger: ledger }) };
}

test("SQL leave ledger and request store survive service transitions", async () => {
  const { store, ledger, requestStore, service } = setup();
  ledger.append({
    tenant_id: "tenant-a",
    entry_id: "earned-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    entry_type: "earned",
    amount: 16,
    occurred_on: "2026-06-20",
    source_ref: "PolicyAccrual:2026-06",
  });
  await service.submit(
    { tenant_id: "tenant-a", actor_id: "user-a" },
    {
      request_id: "leave-001",
      employee_id: "emp-001",
      policy_id: "pto-us",
      leave_type: "pto",
      amount: 8,
      start_date: "2026-06-24",
      end_date: "2026-06-24",
    },
  );
  await service.approve({ tenant_id: "tenant-a", actor_id: "manager-a" }, { request_id: "leave-001" });
  assert.equal(requestStore.get({ tenant_id: "tenant-a", request_id: "leave-001" }).state, "approved");
  assert.equal(ledger.balance({ tenant_id: "tenant-a", employee_id: "emp-001", policy_id: "pto-us" }).available_balance, 8);
  store.close();
});
