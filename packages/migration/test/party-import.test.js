import assert from "node:assert/strict";
import test from "node:test";
import { createMasterDataRepository } from "../../master-data/src/repository.js";
import { dryRunPartyImport } from "../src/party-import.js";

test("party import dry-run flags duplicate Party candidates without writing state", () => {
  const repository = createMasterDataRepository();
  repository.create({
    model_type: "Party",
    tenant_id: "tenant-a",
    party_id: "party-001",
    party_type: "organization",
    display_name: "AMIC Corp",
    status: "active",
    owner_user_id: "owner-a",
  });
  repository.create({
    model_type: "PartyIdentifier",
    tenant_id: "tenant-a",
    party_identifier_id: "identifier-001",
    party_id: "party-001",
    identifier_type: "business_number",
    identifier_value: "BN-001",
    status: "active",
    owner_user_id: "owner-a",
  });

  const before = repository.snapshot().records.length;
  const result = dryRunPartyImport({
    repository,
    rows: [
      {
        tenant_id: "tenant-a",
        import_id: "import-001",
        display_name: "AMIC Corp",
        identifier_type: "business_number",
        identifier_value: "bn-001",
      },
    ],
  });
  assert.equal(result.outcome, "review_required");
  assert.equal(result.writes_product_state, false);
  assert.equal(result.rows[0].duplicate_candidate_refs.length, 2);
  assert.equal(repository.snapshot().records.length, before);
});
