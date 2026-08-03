import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createApiServer,
  createDefaultFinanceRuntime,
  createDefaultMatterRuntime,
} from "../../../api/src/server.js";
import { createHrxRuntimeContext } from "../../../api/src/hrx-runtime-context.js";
import { createApiSessionAuth } from "../../../api/src/session-auth.js";
import {
  highestPrivilegeRegisteredAccount,
  MATTER_VAULT_REGISTERED_TENANT_ID,
  MATTER_VAULT_USER_REGISTRATION_SEED,
} from "../../../api/src/matter-vault-account-registry.js";
import { createFinanceRepository } from "../../../../packages/billing/src/finance-repository.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { createMatterRepository } from "../../../../packages/matter/src/repository.js";

const fixture = JSON.parse(await readFile(
  new URL("../../../../packages/matter/test/fixtures/matter-small-firm-foundation.fixture.json", import.meta.url),
  "utf8",
));
const SESSION_SECRET = "rf12-loopback-session-secret-at-least-32-bytes";
const nowIso = "2026-07-31T03:00:00.000Z";
const nowMs = Date.parse(nowIso);
const sessionTtlMs = 8 * 60 * 60 * 1_000;

export const RF12_CLOCK = Object.freeze({
  nowIso,
  nowMs,
  sessionTtlMs,
  expiresAtIso: new Date(nowMs + sessionTtlMs).toISOString(),
});
export const ACCOUNT = highestPrivilegeRegisteredAccount();
export const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
export const MATTER_ID = "matter-rf12-live-http";
export const MATTER_CODE = "RF12-2026-001";
export const TASK_ID = "task-rf12-live-http";
export const BACKUP_ACCOUNT = MATTER_VAULT_USER_REGISTRATION_SEED.users.find((user) =>
  user.user_id !== ACCOUNT.user_id && user.status !== "disabled");
export const BACKUP_ID = BACKUP_ACCOUNT.user_id;
export const WORK_DATE = "2026-07-30";
export const EXPECTED_GROSS = 150_000;
export const WRITE_DOWN = 10_000;
export const EXPECTED_INVOICE = EXPECTED_GROSS - WRITE_DOWN;
export const FIRST_PAYMENT = 40_000;
export const FINAL_PAYMENT = EXPECTED_INVOICE - FIRST_PAYMENT;

export function personRecords() {
  assert.equal(fixture.people.length, 10, "RF-12 fixture must contain exactly ten people");
  return fixture.people.map((person, index) => ({
    model_type: "Person",
    resource_id: index === 0
      ? ACCOUNT.user_id
      : person.person_id === "person-07"
        ? BACKUP_ID
        : person.person_id,
    person_id: index === 0
      ? ACCOUNT.user_id
      : person.person_id === "person-07"
        ? BACKUP_ID
        : person.person_id,
    tenant_id: TENANT,
    role: person.role,
    display_name: index === 0
      ? ACCOUNT.display_name
      : person.person_id === "person-07"
        ? BACKUP_ACCOUNT.display_name
        : person.display_name,
    status: person.active === false ? "inactive" : "active",
    active: person.active !== false,
  }));
}

function matterSeedRecords() {
  return [
    ...personRecords(),
    {
      model_type: "Matter",
      matter_id: MATTER_ID,
      tenant_id: TENANT,
      client_id: "client-rf12",
      client_display_name: "[RF12] 의뢰인",
      client_group_id: "client-group-rf12",
      billing_client_party_id: "client-rf12",
      matter_code: MATTER_CODE,
      title: "[RF12] 실제 화면 사건",
      status: "open",
      created_by: ACCOUNT.user_id,
      created_at: "2026-07-27T00:00:00.000Z",
      responsible_lawyer: "person-03",
      owner_user_id: "person-03",
      backup_user_id: BACKUP_ID,
      permission_envelope_id: "permission-rf12",
      audit_trace_id: "audit-rf12",
    },
    {
      model_type: "MatterTask",
      task_id: TASK_ID,
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      title: "[RF12] 인수인계 후 완료할 업무",
      status: "todo",
      created_by: "person-03",
      assigned_to: "person-03",
      backup_user_id: BACKUP_ID,
      due_at: "2026-07-31T08:00:00.000+09:00",
      created_at: "2026-07-27T00:00:00.000Z",
      updated_at: "2026-07-27T00:00:00.000Z",
      permission_envelope_id: "permission-rf12",
      audit_trace_id: "audit-task-rf12",
    },
  ];
}

function financeSeedRecords() {
  return [
    {
      model_type: "RateCard",
      rate_card_id: "rate-rf12",
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [
        { role_id: "attorney", hourly_rate: 100_000 },
        { role_id: "partner", hourly_rate: 100_000 },
      ],
      status: "active",
    },
    {
      model_type: "FeeArrangement",
      fee_arrangement_id: "fee-rf12",
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      billing_profile_id: "billing-profile-rf12",
      rate_card_id: "rate-rf12",
      type: "hourly",
      arrangement_type: "hourly",
      status: "active",
    },
  ];
}

function createHrxFixtureRuntime() {
  const people = personRecords();
  const repository = createInMemoryHrxRepository({
    employees: people.map((person, index) => ({
      tenant_id: TENANT,
      employee_id: `employee-rf12-${String(index + 1).padStart(2, "0")}`,
      display_name: person.display_name,
      legal_name: person.display_name,
      status: "active",
      source_ref: "rf12:ten-person-fixture",
    })),
    employee_user_links: people.map((person, index) => ({
      tenant_id: TENANT,
      link_id: `link-rf12-${String(index + 1).padStart(2, "0")}`,
      employee_id: `employee-rf12-${String(index + 1).padStart(2, "0")}`,
      user_id: person.person_id,
      purpose: "login_mapping",
      source_ref: "rf12:ten-person-fixture",
    })),
  });
  return createHrxRuntimeContext({
    repository,
    seedRuntimeFixtures: false,
    allowSyntheticLeaveIntegrationProviders: false,
    allowSyntheticPayrollArtifactSecret: false,
    allowSyntheticCompensationKey: false,
    allowSyntheticPayrollProviders: false,
    seedPayrollRuntime: false,
  });
}

export async function listen(server, port = 0) {
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolveListen);
  });
  return server.address().port;
}

export async function closeServer(server) {
  if (!server?.listening) return;
  await new Promise((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
}

export function createRepositories({ matterPath, financePath, seed }) {
  const matterRepository = createMatterRepository({
    filePath: matterPath,
    seedRecords: seed ? matterSeedRecords() : [],
  });
  const financeRepository = createFinanceRepository({
    filePath: financePath,
    seedRecords: seed ? financeSeedRecords() : [],
  });
  return { matterRepository, financeRepository };
}

function createSessionAuth(stateDir) {
  return createApiSessionAuth({
    profile: "local-dev",
    secret: SESSION_SECRET,
    trustedTenantId: TENANT,
    now: () => RF12_CLOCK.nowMs,
    ttlMs: RF12_CLOCK.sessionTtlMs,
    securityAuditStorePath: join(stateDir, "auth-security.ndjson"),
    credentialStorePath: join(stateDir, "auth-credentials.json"),
    passwordResetTokenStorePath: join(stateDir, "auth-password-reset.json"),
  });
}

export function createHttpServer({ repositories, stateDir }) {
  const sessionAuth = createSessionAuth(stateDir);
  const hrxRuntime = createHrxFixtureRuntime();
  const server = createApiServer({
    hrxRuntime,
    matterRuntime: createDefaultMatterRuntime({ repository: repositories.matterRepository }),
    financeRuntime: createDefaultFinanceRuntime({
      repository: repositories.financeRepository,
      matterRepository: repositories.matterRepository,
    }),
    sessionAuth,
    runtimeProfile: "local-dev",
    now: () => new Date(RF12_CLOCK.nowMs),
  });
  return { server, sessionAuth };
}
