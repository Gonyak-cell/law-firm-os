import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyJsonPostgresSourceReadInventory,
  createJsonPostgresSourceReadDelta,
  createJsonPostgresSourceReadPacket,
  validateJsonPostgresSourceReadDelta,
  validateJsonPostgresSourceReadPacket,
} from "../src/postgres/source-read-contract.js";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "../src/postgres/source-authority-manifest.js";

const SOURCE_SHA = "1".repeat(40);
const SOURCE_TREE = "2".repeat(40);
const INVENTORY_SHA = "3".repeat(64);

test("source-read packet is closed, exact-bound and non-authorizing", () => {
  const created = createJsonPostgresSourceReadPacket({
    packetId: "LAWOS-SOURCE-READ-TEST",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    inventoryContentSha256: INVENTORY_SHA,
    approvedRootRefs: ["runtime-primary", "registered-account-source"],
  });
  const result = validateJsonPostgresSourceReadPacket(created.packet, {
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    inventoryContentSha256: INVENTORY_SHA,
  });
  assert.equal(result.packet_sha256, created.packet_sha256);
  assert.equal(created.packet.current_state, "PENDING_HUMAN_APPROVAL");
  assert.equal(created.packet.external_actions_authorized, false);
  assert.deepEqual(created.packet.contact_scope, []);
  assert.deepEqual(created.packet.data_scope, [
    "approved-real-source-read",
    `inventory:${INVENTORY_SHA}`,
    `inventory-delta-policy:${JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256}`,
  ]);
  assert.equal(
    created.packet.inventory_delta_policy_sha256,
    JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
  );
  assert.equal(Object.values(created.packet.claims).every((value) => value === false), true);
  assert.deepEqual(
    classifyJsonPostgresSourceReadInventory(created.packet, INVENTORY_SHA),
    {
      verdict: "PASS_SAFE_INVENTORY",
      inventory_drifted: false,
      owner_adjudication_required: false,
    },
  );
  assert.deepEqual(
    classifyJsonPostgresSourceReadInventory(created.packet, "4".repeat(64)),
    {
      verdict: "BLOCKED_SAFE_INVENTORY_DELTA_REQUIRES_OWNER_ADJUDICATION",
      inventory_drifted: true,
      owner_adjudication_required: true,
    },
  );
});

test("source-read packet rejects drift, extra fields and affirmative claims", () => {
  const { packet } = createJsonPostgresSourceReadPacket({
    packetId: "LAWOS-SOURCE-READ-TEST",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    inventoryContentSha256: INVENTORY_SHA,
    approvedRootRefs: ["runtime-primary"],
  });
  assert.throws(
    () => validateJsonPostgresSourceReadPacket(packet, { sourceSha: "4".repeat(40) }),
    /SHA drifted/u,
  );
  assert.throws(
    () => validateJsonPostgresSourceReadPacket({ ...packet, unapproved: true }),
    /unsupported fields/u,
  );
  assert.throws(
    () => validateJsonPostgresSourceReadPacket({
      ...packet,
      claims: { ...packet.claims, real_data_read: true },
    }),
    /affirmative claim/u,
  );
  assert.throws(
    () => validateJsonPostgresSourceReadPacket({
      ...packet,
      inventory_delta_policy_sha256: "4".repeat(64),
    }),
    /binding is invalid/u,
  );
  assert.throws(
    () => validateJsonPostgresSourceReadPacket({
      ...packet,
      requirements: ["read everything"],
    }),
    /requirements or stop conditions drifted/u,
  );
});

test("source-read drift emits a closed safe delta and never authorizes it", () => {
  const { packet } = createJsonPostgresSourceReadPacket({
    packetId: "LAWOS-SOURCE-READ-DELTA-TEST",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    inventoryContentSha256: INVENTORY_SHA,
    approvedRootRefs: ["runtime-primary"],
  });
  const approvedInventory = {
    inventory_content_sha256: INVENTORY_SHA,
    sources: [
      {
        source_ref: "a".repeat(32),
        root_ref: "runtime-primary",
        sha256: "4".repeat(64),
      },
      {
        source_ref: "b".repeat(32),
        root_ref: "runtime-primary",
        sha256: "5".repeat(64),
      },
    ],
  };
  const observedInventory = {
    inventory_content_sha256: "6".repeat(64),
    sources: [
      {
        source_ref: "a".repeat(32),
        root_ref: "runtime-primary",
        sha256: "7".repeat(64),
      },
      {
        source_ref: "c".repeat(32),
        root_ref: "unapproved-root",
        sha256: "8".repeat(64),
      },
    ],
  };
  const delta = createJsonPostgresSourceReadDelta({
    packet,
    approvedInventory,
    observedInventory,
  });
  assert.equal(validateJsonPostgresSourceReadDelta(delta, {
    packet,
    approvedInventory,
    observedInventory,
  }).valid, true);
  assert.deepEqual(delta.safe_counts, {
    added_count: 1,
    changed_count: 1,
    removed_count: 1,
    unapproved_root_count: 1,
    inventory_contract_change_count: 0,
    owner_review_required_count: 3,
  });
  assert.equal(delta.claims.auto_authorized, false);
  assert.equal(delta.claims.authority_decision_final, false);
  assert.equal(Object.values(delta.claims).some((value) => value === true), false);
  const contractOnlyDelta = createJsonPostgresSourceReadDelta({
    packet,
    approvedInventory,
    observedInventory: {
      ...approvedInventory,
      inventory_content_sha256: "9".repeat(64),
    },
  });
  assert.equal(
    contractOnlyDelta.safe_counts.inventory_contract_change_count,
    1,
  );
  assert.equal(
    contractOnlyDelta.safe_counts.owner_review_required_count,
    1,
  );
  assert.throws(
    () => createJsonPostgresSourceReadDelta({
      packet,
      approvedInventory,
      observedInventory: approvedInventory,
    }),
    /delta inventory binding is invalid/u,
  );
});
