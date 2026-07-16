import assert from "node:assert/strict";
import {
  assertRepositoryPortV2,
  hashRepositoryRequest,
} from "../../src/repository-port-v2.js";

export async function runRepositoryPortV2Contract(repository, {
  tenantId = "tenant-contract-a",
  otherTenantId = "tenant-contract-b",
} = {}) {
  assertRepositoryPortV2(repository);
  const emptyRead = repository.read({ tenant_id: tenantId, record_type: "ContractRecord", record_id: "record-1" });
  assert.equal(typeof emptyRead?.then, "function");
  assert.equal(await emptyRead, undefined);

  const created = await repository.write({
    tenant_id: tenantId,
    record_type: "ContractRecord",
    record_id: "record-1",
    expected_version: 0,
    data: { label: "created" },
  });
  assert.equal(created.state_version, 1);
  assert.deepEqual((await repository.read({ tenant_id: tenantId, record_type: "ContractRecord", record_id: "record-1" })).data, { label: "created" });
  assert.equal(await repository.read({ tenant_id: otherTenantId, record_type: "ContractRecord", record_id: "record-1" }), undefined);

  await assert.rejects(
    repository.write({
      tenant_id: tenantId,
      record_type: "ContractRecord",
      record_id: "record-1",
      expected_version: 0,
      data: { label: "stale" },
    }),
    (error) => error?.code === "LAWOS_REPOSITORY_CONFLICT" && error?.status === 409,
  );
  const updated = await repository.write({
    tenant_id: tenantId,
    record_type: "ContractRecord",
    record_id: "record-1",
    expected_version: 1,
    data: { label: "updated" },
  });
  assert.equal(updated.state_version, 2);

  const requestHash = hashRepositoryRequest({ operation: "contract", value: 1 });
  const claimed = await repository.claimIdempotency({
    tenant_id: tenantId,
    key: "contract-idempotency-1",
    request_hash: requestHash,
    response: { record_id: "record-1" },
  });
  assert.equal(claimed.replayed, false);
  const replayed = await repository.claimIdempotency({
    tenant_id: tenantId,
    key: "contract-idempotency-1",
    request_hash: requestHash,
    response: { ignored: true },
  });
  assert.equal(replayed.replayed, true);
  assert.deepEqual(replayed.record.response, { record_id: "record-1" });
  await assert.rejects(
    repository.claimIdempotency({
      tenant_id: tenantId,
      key: "contract-idempotency-1",
      request_hash: hashRepositoryRequest({ operation: "contract", value: 2 }),
    }),
    (error) => error?.code === "LAWOS_IDEMPOTENCY_CONFLICT" && error?.status === 409,
  );

  const transactionResult = await repository.transaction({ tenant_id: tenantId }, async (tx) => {
    await Promise.resolve();
    const record = await tx.write({
      tenant_id: tenantId,
      record_type: "ContractRecord",
      record_id: "record-2",
      expected_version: 0,
      data: { label: "transaction" },
    });
    const audit = await tx.appendAudit({
      tenant_id: tenantId,
      event_id: "audit-contract-success",
      event_type: "contract.record_written",
      object_type: "ContractRecord",
      object_id: "record-2",
      payload: { state_version: record.state_version },
    });
    return { record, audit };
  });
  assert.equal(transactionResult.record.state_version, 1);

  await assert.rejects(
    repository.transaction({ tenant_id: tenantId }, async (tx) => {
      await tx.write({
        tenant_id: tenantId,
        record_type: "ContractRecord",
        record_id: "record-rollback",
        expected_version: 0,
        data: { label: "must-rollback" },
      });
      await tx.appendAudit({
        tenant_id: tenantId,
        event_id: "audit-contract-rollback",
        event_type: "contract.must_rollback",
      });
      throw new Error("synthetic contract rollback");
    }),
    /synthetic contract rollback/u,
  );
  assert.equal(await repository.read({ tenant_id: tenantId, record_type: "ContractRecord", record_id: "record-rollback" }), undefined);
  const audits = await repository.listAudit({ tenant_id: tenantId });
  assert.equal(audits.some((event) => event.event_id === "audit-contract-success"), true);
  assert.equal(audits.some((event) => event.event_id === "audit-contract-rollback"), false);

  await assert.rejects(
    repository.transaction({ tenant_id: tenantId }, (tx) => tx.write({
      tenant_id: otherTenantId,
      record_type: "ContractRecord",
      record_id: "cross-tenant",
      expected_version: 0,
      data: {},
    })),
    (error) => error?.code === "LAWOS_TENANT_SCOPE_MISMATCH" && error?.status === 403,
  );

  return Object.freeze({
    created_version: created.state_version,
    updated_version: updated.state_version,
    audit_count: audits.length,
    idempotency_replay: replayed.replayed,
    rollback_preserved: true,
    tenant_isolation: true,
  });
}
