import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDurableAuditStore } from "../../audit/src/durable-audit-store.js";
import { runHrxMigrations } from "../../hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../hrx/src/store/file-store.js";
import {
  appendMasterDataAuditEvent,
  assertMasterDataReferences,
  createMasterDataRepository,
  createPartyMergeSplitService,
} from "../src/index.js";

const TENANT = "tenant-a";
const OWNER = "owner-a";

function createPartyRepository() {
  const repository = createMasterDataRepository();
  repository.create({
    model_type: "Party",
    tenant_id: TENANT,
    party_id: "party-source",
    party_type: "organization",
    display_name: "Source Party",
    status: "active",
    owner_user_id: OWNER,
  });
  repository.create({
    model_type: "Party",
    tenant_id: TENANT,
    party_id: "party-target",
    party_type: "organization",
    display_name: "Target Party",
    status: "active",
    owner_user_id: OWNER,
  });
  return repository;
}

test("Party merge transaction rolls back failed merge and persists successful merge", () => {
  const repository = createPartyRepository();
  const service = createPartyMergeSplitService({ repository });
  assert.throws(
    () =>
      service.mergeParties({
        tenant_id: TENANT,
        source_party_id: "party-source",
        target_party_id: "party-missing",
        reason: "duplicate_review",
      }),
    /target Party not found/,
  );
  assert.equal(repository.get({ tenant_id: TENANT, model_type: "Party", id: "party-source" }).status, "active");

  const merged = service.mergeParties({
    tenant_id: TENANT,
    source_party_id: "party-source",
    target_party_id: "party-target",
    reason: "duplicate_review",
  });
  assert.equal(merged.source.status, "archived");
  assert.equal(merged.merged_into_party_id, "party-target");
});

test("Master Data audit event appends complete durable evidence", () => {
  const store = createFileHrxStore({ filePath: join(mkdtempSync(join(tmpdir(), "master-data-audit-")), "audit.json") });
  runHrxMigrations(store);
  const audit = createDurableAuditStore({ store });
  const event = appendMasterDataAuditEvent(audit, {
    tenant_id: TENANT,
    actor_id: OWNER,
    action: "master_data.party.merge",
    object_type: "Party",
    object_id: "party-source",
    reason: "duplicate_review",
    metadata: { merged_into_party_id: "party-target" },
  });
  assert.equal(event.source, "master-data-runtime");
  assert.equal(event.action, "master_data.party.merge");
  assert.equal(event.metadata.merged_into_party_id, "party-target");
  assert.equal(audit.verifyTenant({ tenant_id: TENANT }), true);
  store.close();
});

test("Master Data reference integrity blocks stale refs", () => {
  const repository = createPartyRepository();
  assertMasterDataReferences(repository, {
    tenant_id: TENANT,
    references: [{ model_type: "Party", id: "party-source" }],
  });
  assert.throws(
    () =>
      assertMasterDataReferences(repository, {
        tenant_id: TENANT,
        references: [{ model_type: "Party", id: "party-missing" }],
      }),
    /stale Master Data reference blocked/,
  );
});
