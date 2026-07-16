import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAiGovernanceRepository } from "../../ai-governance/src/runtime-repository.js";
import { createAnalyticsRepository } from "../../analytics/src/runtime-repository.js";
import { createFinanceRepository } from "../../billing/src/finance-repository.js";
import { createClientPortalRepository } from "../../client-portal/src/runtime-repository.js";
import { createCrmRuntimeRepository } from "../../crm/src/runtime-repository.js";
import { createDmsRepository } from "../../dms/src/repository.js";
import { createEnterpriseReadinessRepository } from "../../enterprise/src/enterprise-readiness-repository.js";
import { createFileHrxStore } from "../../hrx/src/store/file-store.js";
import { createIntakeRuntimeRepository } from "../../intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../../master-data/src/repository.js";
import { createMatterRepository } from "../../matter/src/repository.js";
import { createUiReadinessRepository } from "../../platform/src/ui-readiness-repository.js";
import { createAuthCredentialStore } from "../../../apps/api/src/auth-credential-store.js";
import { createAuthPasswordResetStore } from "../../../apps/api/src/auth-password-reset-store.js";
import { readDurableJsonFile } from "../src/durable-file.js";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-store-adapter-cas-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

const AUDIT_REPOSITORIES = Object.freeze([
  ["matter", createMatterRepository],
  ["crm", createCrmRuntimeRepository],
  ["intake", createIntakeRuntimeRepository],
  ["finance", createFinanceRepository],
  ["analytics", createAnalyticsRepository],
  ["ai-governance", createAiGovernanceRepository],
  ["client-portal", createClientPortalRepository],
  ["dms", createDmsRepository],
  ["ui-readiness", createUiReadinessRepository],
  ["enterprise-readiness", createEnterpriseReadinessRepository],
]);

for (const [name, createRepository] of AUDIT_REPOSITORIES) {
  test(`${name} repository rejects a stale generation and reloads the winner`, (t) => {
    const filePath = join(fixtureRoot(t), `${name}.json`);
    const first = createRepository({ filePath });
    const stale = createRepository({ filePath });
    const winner = { tenant_id: "tenant-cas", event_id: `${name}-winner` };
    const next = { tenant_id: "tenant-cas", event_id: `${name}-next` };

    first.appendAudit(winner);
    assert.throws(() => stale.appendAudit(next), { code: "LAWOS_STORE_CONFLICT" });
    assert.deepEqual(stale.listAudit({ tenant_id: "tenant-cas" }).map(({ event_id }) => event_id), [winner.event_id]);
    stale.appendAudit(next);

    const reopened = createRepository({ filePath });
    assert.deepEqual(
      reopened.listAudit({ tenant_id: "tenant-cas" }).map(({ event_id }) => event_id).sort(),
      [next.event_id, winner.event_id].sort(),
    );
  });
}

test("Master Data repository rejects a stale transaction commit before retry", (t) => {
  const filePath = join(fixtureRoot(t), "master-data.json");
  const first = createMasterDataRepository({ filePath });
  const stale = createMasterDataRepository({ filePath });

  first.transaction(() => {});
  assert.throws(() => stale.transaction(() => {}), { code: "LAWOS_STORE_CONFLICT" });
  stale.transaction(() => {});
  assert.equal(readDurableJsonFile({ filePath }).generation, 2);
});

test("HRX file store reloads a winning migration after a stale commit", (t) => {
  const filePath = join(fixtureRoot(t), "hrx.json");
  const first = createFileHrxStore({ filePath });
  const stale = createFileHrxStore({ filePath });
  const winner = { id: "cas-winner", sql: "CREATE TABLE cas_winner (id TEXT);" };
  const next = { id: "cas-next", sql: "CREATE TABLE cas_next (id TEXT);" };

  first.migrate(winner);
  assert.throws(
    () => stale.migrate(next),
    (error) => error?.code === "LAWOS_STORE_CONFLICT" && error.safe_error_code === "HRX_TRANSACTION_CONFLICT",
  );
  assert.deepEqual(stale.snapshot().applied_migrations.map(({ id }) => id), [winner.id]);
  stale.migrate(next);
  assert.deepEqual(
    createFileHrxStore({ filePath }).snapshot().applied_migrations.map(({ id }) => id),
    [winner.id, next.id],
  );
});

test("credential store rejects stale password authority and reloads without exposing secret fields", (t) => {
  const filePath = join(fixtureRoot(t), "credentials.json");
  const first = createAuthCredentialStore({ filePath });
  const stale = createAuthCredentialStore({ filePath });
  const firstUser = { user_id: "user-one", email: "one@example.test" };
  const secondUser = { user_id: "user-two", email: "two@example.test" };

  first.setPassword({ user: firstUser, password: "first-long-password" });
  assert.throws(
    () => stale.setPassword({ user: secondUser, password: "second-long-password" }),
    (error) => error?.code === "LAWOS_STORE_CONFLICT" && !Object.hasOwn(error, "password_hash"),
  );
  assert.equal(stale.getByUserId(firstUser.user_id)?.email, firstUser.email);
  stale.setPassword({ user: secondUser, password: "second-long-password" });
  assert.equal(createAuthCredentialStore({ filePath }).count, 2);
});

test("password reset store rejects a stale token authority and retains the winning record", (t) => {
  const filePath = join(fixtureRoot(t), "password-resets.json");
  const first = createAuthPasswordResetStore({ filePath });
  const stale = createAuthPasswordResetStore({ filePath });
  const firstUser = { user_id: "user-one", email: "one@example.test" };
  const secondUser = { user_id: "user-two", email: "two@example.test" };

  first.create({ user: firstUser, token: "token-one" });
  assert.throws(() => stale.create({ user: secondUser, token: "token-two" }), { code: "LAWOS_STORE_CONFLICT" });
  assert.equal(stale.count, 1);
  stale.create({ user: secondUser, token: "token-two" });
  assert.equal(createAuthPasswordResetStore({ filePath }).count, 2);
});
