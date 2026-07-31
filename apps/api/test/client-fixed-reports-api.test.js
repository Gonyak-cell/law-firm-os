import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createAnalyticsRuntimeContext,
} from "../src/analytics-runtime-context.js";
import {
  CLIENT_FIXED_REPORT_MAX_EXPORT_BODY_BYTES,
  handleReportsApiRequest,
} from "../src/reports-runtime-context.js";
import { matchReportRoute } from "../src/routes/reports.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import {
  createFileSessionObjectAclResolver,
} from "../src/session-object-acl-authority.js";
import { startApiServer } from "../src/server.js";
import {
  createAnalyticsRepository,
} from "../../../packages/analytics/src/runtime-repository.js";
import {
  createFinanceRepository,
} from "../../../packages/billing/src/finance-repository.js";
import {
  createCrmRuntimeRepository,
} from "../../../packages/crm/src/runtime-repository.js";
import {
  createMasterDataRepository,
} from "../../../packages/master-data/src/repository.js";
import {
  createObjectAclStore,
} from "../../../packages/authz/src/object-acl-store.js";
import {
  CLIENT_FIXED_REPORT_IDS,
  CLIENT_FIXED_REPORT_MAX_CSV_BYTES,
  CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES,
  CLIENT_FIXED_REPORT_TOKEN_PREFIX,
  clientFixedReportCapabilityBinding,
  createClientFixedReportService,
  createClientFixedReportSnapshotTokenAuthority,
} from "../../../packages/reports/src/index.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
} from "../src/matter-vault-account-registry.js";
import { signedHeaders } from "./helpers/session.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const AS_OF = "2026-07-30T03:00:00.000Z";
const GENERATED_AT = "2026-07-30T03:00:05.000Z";
const TOKEN_SECRET =
  "client-fixed-report-test-secret-material-20260731";
const FORMULA_CLIENT =
  "=HYPERLINK(\"https://bad.test\",\"열기\")";
const HIDDEN_CLIENT = "비공개 고객";
const OPERATIONS = account("wsjo@amic.kr");
const STAFF = account("yjlee@amic.kr");
const PARTNER = account("bj.park@amic.kr");

function authoritativeObjectAclResolver(
  objectAcl = [],
  {
    sourceRef = "synthetic_authoritative_empty",
    onResolve = null,
  } = {},
) {
  return async ({ tenant_id, user_id, request_id }) => {
    onResolve?.({ tenant_id, user_id, request_id });
    return {
      authoritative: true,
      source_ref: sourceRef,
      object_acl: objectAcl.map((entry) => ({
        ...entry,
        tenant_id,
        principal_id: user_id,
      })),
    };
  };
}

function account(email) {
  const value = findRegisteredAccountByEmail(email);
  assert.ok(value, `registered account ${email} must exist`);
  return value;
}

function clientGroup(
  client_group_id,
  display_name,
  party_id,
) {
  return {
    model_type: "ClientGroup",
    tenant_id: TENANT,
    client_group_id,
    display_name,
    member_party_ids: [party_id],
    primary_party_id: party_id,
    owner_user_id: OPERATIONS.user_id,
    status: "active",
  };
}

function lead(
  lead_id,
  client_group_id,
  party_id,
  display_name,
) {
  return {
    model_type: "Lead",
    tenant_id: TENANT,
    lead_id,
    party_id,
    client_group_id,
    display_name,
    inquiry_status: "new",
    source: "manual",
    received_at: "2026-07-30T01:00:00.000Z",
    next_action: "문의 확인",
    assigned_user_id: null,
    owner_user_id: OPERATIONS.user_id,
    status: "active",
    version: 1,
  };
}

function deposit(
  id,
  client_group_id,
  party_id,
  amount,
) {
  return [
    {
      model_type: "BankTransaction",
      tenant_id: TENANT,
      bank_transaction_id: `bank-${id}`,
      account_ref: "client-fixed-report-account",
      transaction_fingerprint: `fingerprint-${id}`,
      date: "2026-07-10",
      occurred_at: "2026-07-10T01:00:00.000Z",
      direction: "inflow",
      amount,
      balance_after: amount,
      currency: "KRW",
      status: "posted",
    },
    {
      model_type: "BankTransactionClassification",
      tenant_id: TENANT,
      bank_transaction_classification_id:
        `classification-${id}`,
      bank_transaction_id: `bank-${id}`,
      client_group_id,
      transaction_date: "2026-07-10",
      transaction_direction: "inflow",
      amount,
      currency: "KRW",
      category: "client_receipt",
      status: "confirmed",
      party_id,
    },
  ];
}

function fee(
  id,
  client_group_id,
  agreed_amount,
) {
  return {
    model_type: "FeeCommitment",
    tenant_id: TENANT,
    fee_commitment_id: `fee-${id}`,
    client_group_id,
    opportunity_id: `opportunity-${id}`,
    matter_id: null,
    currency: "KRW",
    agreed_amount,
    due_date: "2026-08-20",
    accepted_at: "2026-07-01T00:00:00.000Z",
    status: "active",
    source_fee_arrangement_id: null,
    state_version: 1,
    created_by: OPERATIONS.user_id,
    updated_by: OPERATIONS.user_id,
    reason: "고정 리포트 검증",
  };
}

function fixture() {
  let tokenNow = Date.parse("2026-07-30T03:00:10.000Z");
  const masterDataRepository = createMasterDataRepository({
    seedRecords: [
      clientGroup(
        "client-fixed-visible",
        FORMULA_CLIENT,
        "party-fixed-visible",
      ),
      clientGroup(
        "client-fixed-hidden",
        HIDDEN_CLIENT,
        "party-fixed-hidden",
      ),
      {
        model_type: "ContactPoint",
        tenant_id: TENANT,
        contact_point_id: "contact-point-fixed-private",
        owner_entity_id: "entity-fixed-private",
        contact_type: "email",
        value: "private-fixed@example.test",
        is_primary: true,
        owner_user_id: OPERATIONS.user_id,
        status: "active",
      },
    ],
  });
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [
      lead(
        "lead-fixed-visible",
        "client-fixed-visible",
        "party-fixed-visible",
        "표시 문의",
      ),
      lead(
        "lead-fixed-hidden",
        "client-fixed-hidden",
        "party-fixed-hidden",
        "숨김 문의",
      ),
    ],
  });
  const financeRepository = createFinanceRepository({
    seedRecords: [
      ...deposit(
        "fixed-visible",
        "client-fixed-visible",
        "party-fixed-visible",
        1_000_000,
      ),
      ...deposit(
        "fixed-hidden",
        "client-fixed-hidden",
        "party-fixed-hidden",
        99_000_000,
      ),
      fee("fixed-visible", "client-fixed-visible", 2_000_000),
      fee("fixed-hidden", "client-fixed-hidden", 50_000_000),
    ],
  });
  const analyticsRepository = createAnalyticsRepository();
  const baseRuntime = createAnalyticsRuntimeContext({
    repository: analyticsRepository,
    masterDataRepository,
    crmRepository,
    financeRepository,
    clock: () => new Date(GENERATED_AT),
  });
  const tokenAuthority =
    createClientFixedReportSnapshotTokenAuthority({
      secret: TOKEN_SECRET,
      now: () => tokenNow,
    });
  const runtime = Object.freeze({
    ...baseRuntime,
    clientFixedReportTokenAuthority: tokenAuthority,
    clientFixedReportClock: () => new Date(AS_OF),
  });
  return {
    runtime,
    analyticsRepository,
    financeRepository,
    repositories: [
      masterDataRepository,
      crmRepository,
      financeRepository,
      analyticsRepository,
    ],
    advanceTokenClock(milliseconds) {
      tokenNow += milliseconds;
    },
    close() {
      for (const repository of this.repositories) {
        repository.close?.();
      }
    },
  };
}

async function withServer(
  sourceFixture,
  callback,
  startOptions = {},
) {
  const started = await startApiServer({
    port: 0,
    analyticsRuntime: sourceFixture.runtime,
    ...startOptions,
  });
  try {
    return await callback(
      started,
      `http://${started.host}:${started.port}`,
    );
  } finally {
    started.server.closeIdleConnections?.();
    started.server.closeAllConnections?.();
    await new Promise((resolve) => (
      started.server.close(resolve)
    ));
  }
}

function commonQuery(overrides = {}) {
  return new URLSearchParams({
    tenant_id: TENANT,
    permission_ref: "client-fixed-report-permission",
    audit_hint_ref: "client-fixed-report-audit",
    as_of: AS_OF,
    revenue_ranking_period: "year",
    ...overrides,
  }).toString();
}

async function request(
  baseUrl,
  pathname,
  {
    account: requestAccount = OPERATIONS,
    method = "GET",
    body,
    headers: requestHeaders = {},
  } = {},
) {
  const headers = await signedHeaders(
    baseUrl,
    requestAccount,
  );
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...headers,
      ...(body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...requestHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

function screenPath(reportId, overrides = {}) {
  return `/api/reports/clients/fixed/${
    encodeURIComponent(reportId)
  }?${commonQuery(overrides)}`;
}

function exportBody(screen, idempotencyKey, overrides = {}) {
  return {
    tenant_id: TENANT,
    permission_ref: "client-fixed-report-export",
    audit_hint_ref: "client-fixed-report-export-audit",
    snapshot_token: screen.body.item.snapshot.token,
    snapshot_version: screen.body.item.snapshot.version,
    idempotency_key: idempotencyKey,
    ...overrides,
  };
}

function equivalentNonCanonicalToken(token) {
  const [prefix, payload] = token.split(".");
  const remainder = payload.length % 4;
  assert.ok(
    remainder === 2 || remainder === 3,
    "test token must end with unused base64url bits",
  );
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const last = alphabet.indexOf(payload.at(-1));
  assert.notEqual(last, -1);
  const variant = alphabet[last ^ 1];
  const changed = `${prefix}.${payload.slice(0, -1)}${variant}`;
  assert.notEqual(changed, token);
  assert.deepEqual(
    Buffer.from(changed.split(".")[1], "base64url"),
    Buffer.from(payload, "base64url"),
  );
  return changed;
}

function csvRows(item) {
  const source = item.csv_text;
  const parsed = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === "\"" && source[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (character === "\"") {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === "\"") {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      parsed.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell);
  parsed.push(row);
  assert.equal(quoted, false);
  assert.deepEqual(
    parsed[0],
    item.columns.map(({ label }) => label),
  );
  return parsed.slice(1).map((cells, rowIndex) => (
    Object.fromEntries(item.columns.map(({ key }, columnIndex) => {
      const expected = item.rows[rowIndex][key];
      const value = expected === null
        ? (cells[columnIndex] === "" ? null : cells[columnIndex])
        : typeof expected === "number"
          ? Number(cells[columnIndex])
          : cells[columnIndex];
      return [key, value];
    }))
  ));
}

function assertNoReportLeak(response) {
  assert.deepEqual(response.body.items, []);
  assert.equal(Object.hasOwn(response.body, "item"), false);
  assert.equal(response.body.row_count_included, false);
  assert.equal(response.body.value_leak_prevented, true);
  assert.equal(response.body.snapshot_issued, false);
  assert.equal(response.body.csv_included, false);
  const serialized = JSON.stringify(response.body);
  for (const secret of [
    FORMULA_CLIENT,
    HIDDEN_CLIENT,
    "client-fixed-visible",
    "client-fixed-hidden",
    "99000000",
    "50000000",
    "private-fixed@example.test",
    "client-fixed-report-account",
  ]) {
    assert.equal(serialized.includes(secret), false);
  }
}

async function signedContext(email) {
  const user = account(email);
  const auth = createApiSessionAuth({
    profile: "local-dev",
    secret: "client-fixed-report-context-test-secret",
    objectAclResolver: authoritativeObjectAclResolver(),
  });
  const login = await auth.login({
    email: user.email,
    password: user.local_dev.synthetic_token,
  }, { requestId: `fixed-login-${user.user_id}` });
  assert.equal(login.status, 200);
  const verified = await auth.verifyToken(
    login.body.session_token,
    { requestId: `fixed-verify-${user.user_id}` },
  );
  assert.equal(verified.ok, true);
  return verified.context;
}

function boundedDashboard({
  clientName = "가".repeat(200),
  monthlyRowCount = 12,
} = {}) {
  return {
    access_scope: { access_state: "full_access" },
    item: {
      sections: {
        monthly_deposit_revenue: {
          status: "available",
          data: {
            points: Array.from(
              { length: monthlyRowCount },
              (_, index) => ({
                month: `2026-${String(index + 1).padStart(2, "0")}`,
                net_deposit_revenue: 1_000_000 + index,
              }),
            ),
          },
        },
        inquiry_status: {
          status: "available",
          data: {
            items: [
              { code: "new", count: 1 },
              { code: "reviewing", count: 2 },
              { code: "consultation_scheduled", count: 3 },
              { code: "engagement_review", count: 4 },
              { code: "engaged", count: 5 },
              { code: "not_engaged", count: 6 },
            ],
          },
        },
        revenue_ranking: {
          status: "available",
          data: {
            items: Array.from({ length: 10 }, (_, index) => ({
              display_name: clientName,
              matched_inflow_amount: 10_000_000 - index,
              linked_refund_amount: index,
              net_deposit_revenue: 9_000_000 - index,
              latest_deposit_at:
                `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
            })),
          },
        },
        receivables_ranking: {
          status: "available",
          data: {
            items: Array.from({ length: 10 }, (_, index) => ({
              display_name: clientName,
              agreed_amount: 20_000_000 + index,
              active_allocated_amount: 1_000_000 + index,
              receivable_amount: 19_000_000,
              earliest_due_date:
                `2026-08-${String(index + 1).padStart(2, "0")}`,
            })),
          },
        },
      },
    },
  };
}

function boundedService(
  options = {},
  tokenAuthority =
    createClientFixedReportSnapshotTokenAuthority({
      secret: TOKEN_SECRET,
      now: () => Date.parse(AS_OF),
    }),
) {
  return createClientFixedReportService({
    clientOperationsReadModel: {
      readDashboard: () => boundedDashboard(options),
    },
    tokenAuthority,
    now: () => new Date(AS_OF),
  });
}

test("CL-P5-W03-T03 fixed Client routes precede generic routes and allowlist exactly four reports", () => {
  assert.deepEqual(CLIENT_FIXED_REPORT_IDS, [
    "monthly_deposit_revenue",
    "inquiry_status",
    "revenue_ranking",
    "receivables_ranking",
  ]);
  for (const reportId of CLIENT_FIXED_REPORT_IDS) {
    const screen = matchReportRoute({
      pathname: `/api/reports/clients/fixed/${reportId}`,
      method: "GET",
    });
    assert.equal(screen.fixed_client_report, true);
    assert.equal(screen.action, "analytics:client:read");
    const csv = matchReportRoute({
      pathname:
        `/api/reports/clients/fixed/${reportId}.csv`,
      method: "POST",
    });
    assert.equal(csv.fixed_client_report, true);
    assert.equal(csv.action, "analytics:client:export");
  }
  assert.equal(matchReportRoute({
    pathname: "/api/reports/clients/fixed/not-allowed",
    method: "GET",
  }), null);
  assert.equal(matchReportRoute({
    pathname: "/api/reports/clients/fixed/not-allowed.csv",
    method: "POST",
  }), null);
  assert.equal(matchReportRoute({
    pathname: "/api/reports/existing-generic-report",
    method: "GET",
  }).action, "reports:definition:read");
});

test("CL-P5-W03-T03 all four maximum-row snapshots and CSVs stay inside explicit byte budgets while oversized source values fail closed", () => {
  const service = boundedService();
  const proof = [];
  for (const reportId of CLIENT_FIXED_REPORT_IDS) {
    const screen = service.readScreen({
      tenant_id: TENANT,
      actor_id: OPERATIONS.user_id,
      capability_binding: "c".repeat(64),
      permission_context: {},
      report_id: reportId,
      as_of: AS_OF,
      revenue_ranking_period: "year",
    });
    const tokenBytes = Buffer.byteLength(
      screen.snapshot.token,
      "utf8",
    );
    assert.equal(tokenBytes <= CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES, true);
    const csv = service.exportCsv({
      tenant_id: TENANT,
      actor_id: OPERATIONS.user_id,
      capability_binding: "c".repeat(64),
      report_id: reportId,
      snapshot_token: screen.snapshot.token,
      snapshot_version: screen.snapshot.version,
    });
    assert.equal(
      csv.csv_byte_size <= CLIENT_FIXED_REPORT_MAX_CSV_BYTES,
      true,
    );
    proof.push({
      report_id: reportId,
      row_count: screen.row_count,
      token_bytes: tokenBytes,
      csv_bytes: csv.csv_byte_size,
    });
  }
  assert.equal(
    Math.max(...proof.map(({ token_bytes }) => token_bytes))
      <= CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES,
    true,
  );

  assert.throws(
    () => boundedService({
      clientName: "가".repeat(201),
    }).readScreen({
      tenant_id: TENANT,
      actor_id: OPERATIONS.user_id,
      capability_binding: "c".repeat(64),
      permission_context: {},
      report_id: "revenue_ranking",
      as_of: AS_OF,
      revenue_ranking_period: "year",
    }),
    (error) => (
      error?.safe_error_code
        === "CLIENT_FIXED_REPORT_VALIDATION_ERROR"
    ),
  );
  assert.throws(
    () => boundedService({
      monthlyRowCount: 13,
    }).readScreen({
      tenant_id: TENANT,
      actor_id: OPERATIONS.user_id,
      capability_binding: "c".repeat(64),
      permission_context: {},
      report_id: "monthly_deposit_revenue",
      as_of: AS_OF,
      revenue_ranking_period: "year",
    }),
    (error) => (
      error?.safe_error_code
        === "CLIENT_FIXED_REPORT_SOURCE_INVALID"
    ),
  );
  console.log(JSON.stringify({
    scenario: "client-fixed-report-byte-budgets",
    token_max_bytes: CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES,
    export_body_max_bytes:
      CLIENT_FIXED_REPORT_MAX_EXPORT_BODY_BYTES,
    csv_max_bytes: CLIENT_FIXED_REPORT_MAX_CSV_BYTES,
    reports: proof,
    oversized_client_name_denied: true,
    oversized_source_rows_denied: true,
  }));
});

test("CL-P5-W03-T03 independently constructed authorities share snapshots only with the injected stable secret and missing authority fails closed", () => {
  assert.throws(
    () => createClientFixedReportSnapshotTokenAuthority(),
    /secret must contain at least 32 bytes/u,
  );
  const authorityA =
    createClientFixedReportSnapshotTokenAuthority({
      secret: TOKEN_SECRET,
      now: () => Date.parse(AS_OF),
    });
  const authorityB =
    createClientFixedReportSnapshotTokenAuthority({
      secret: TOKEN_SECRET,
      now: () => Date.parse(AS_OF),
    });
  const otherAuthority =
    createClientFixedReportSnapshotTokenAuthority({
      secret:
        "different-client-fixed-report-secret-material-20260731",
      now: () => Date.parse(AS_OF),
    });
  const screen = boundedService({}, authorityA).readScreen({
    tenant_id: TENANT,
    actor_id: OPERATIONS.user_id,
    capability_binding: "c".repeat(64),
    permission_context: {},
    report_id: "revenue_ranking",
    as_of: AS_OF,
    revenue_ranking_period: "year",
  });
  const shared = boundedService({}, authorityB).exportCsv({
    tenant_id: TENANT,
    actor_id: OPERATIONS.user_id,
    capability_binding: "c".repeat(64),
    report_id: "revenue_ranking",
    snapshot_token: screen.snapshot.token,
    snapshot_version: screen.snapshot.version,
  });
  assert.deepEqual(shared.rows, screen.rows);
  assert.throws(
    () => boundedService({}, otherAuthority).exportCsv({
      tenant_id: TENANT,
      actor_id: OPERATIONS.user_id,
      capability_binding: "c".repeat(64),
      report_id: "revenue_ranking",
      snapshot_token: screen.snapshot.token,
      snapshot_version: screen.snapshot.version,
    }),
    (error) => (
      error?.safe_error_code
        === "CLIENT_FIXED_REPORT_SNAPSHOT_INVALID"
    ),
  );

  const missingRuntime = handleReportsApiRequest({
    pathname:
      "/api/reports/clients/fixed/revenue_ranking",
    method: "GET",
    query: Object.fromEntries(
      new URLSearchParams(commonQuery()),
    ),
    body: {},
    context: {},
    requestId: "fixed-missing-token-authority",
    runtime: {
      analyticsRuntime: {
        repository: {},
        clientOperationsReadModel: {
          readDashboard: () => boundedDashboard(),
        },
      },
    },
  });
  assert.equal(missingRuntime.status, 503);
  assert.deepEqual(
    missingRuntime.body.safe_error_codes,
    ["CLIENT_FIXED_REPORT_RUNTIME_UNAVAILABLE"],
  );
  assert.equal(Object.hasOwn(missingRuntime.body, "item"), false);
  console.log(JSON.stringify({
    scenario: "client-fixed-report-shared-key",
    process_a_issue_process_b_verify: true,
    different_secret_denied: true,
    missing_authority_denied: true,
  }));
});

test("CL-P5-W03-T03 two API server instances verify the same snapshot with the shared injected session secret", async () => {
  const sourceFixture = fixture();
  const {
    clientFixedReportTokenAuthority: _fixtureAuthority,
    ...runtimeWithoutAuthority
  } = sourceFixture.runtime;
  const sharedSecret =
    "client-fixed-report-cross-instance-session-secret-20260731";
  const serverA = await startApiServer({
    port: 0,
    sessionSecret: sharedSecret,
    analyticsRuntime: runtimeWithoutAuthority,
  });
  const serverB = await startApiServer({
    port: 0,
    sessionSecret: sharedSecret,
    analyticsRuntime: runtimeWithoutAuthority,
  });
  try {
    const baseA = `http://${serverA.host}:${serverA.port}`;
    const baseB = `http://${serverB.host}:${serverB.port}`;
    const headers = await signedHeaders(baseA, OPERATIONS);
    const screenResponse = await fetch(
      `${baseA}${screenPath("revenue_ranking")}`,
      { headers },
    );
    const screen = {
      status: screenResponse.status,
      body: await screenResponse.json(),
    };
    assert.equal(screen.status, 200, JSON.stringify(screen.body));
    const exportResponse = await fetch(
      `${baseB}/api/reports/clients/fixed/revenue_ranking.csv`,
      {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: JSON.stringify(
          exportBody(screen, "fixed-cross-instance"),
        ),
      },
    );
    const exported = {
      status: exportResponse.status,
      body: await exportResponse.json(),
    };
    assert.equal(
      exported.status,
      201,
      JSON.stringify(exported.body),
    );
    assert.deepEqual(
      exported.body.item.rows,
      screen.body.item.rows,
    );
    console.log(JSON.stringify({
      scenario: "client-fixed-report-cross-instance-runtime",
      server_a_issue_server_b_verify: true,
      shared_secret_injected: true,
      screen_csv_rows_equal: true,
    }));
  } finally {
    for (const started of [serverA, serverB]) {
      started.server.closeIdleConnections?.();
      started.server.closeAllConnections?.();
      await new Promise((resolve) => (
        started.server.close(resolve)
      ));
    }
    sourceFixture.close();
  }
});

test("CL-P5-W03-T03 signed screen snapshots and CSV exports have identical bounded rows, Korean headers, safe cells, print reuse, replay, and audits", async () => {
  const sourceFixture = fixture();
  try {
    await withServer(sourceFixture, async (_started, baseUrl) => {
      const reportProof = [];
      const health = await request(baseUrl, "/api/health");
      const reports = health.body.bounded_contexts.find(
        ({ bounded_context }) => (
          bounded_context === "report-builder"
        ),
      );
      assert.ok(reports.endpoints.includes(
        "GET /api/reports/clients/fixed/:reportId",
      ));
      assert.ok(reports.endpoints.includes(
        "POST /api/reports/clients/fixed/:reportId.csv",
      ));
      assert.equal(
        reports.fixed_client_report_token_max_bytes,
        CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES,
      );
      assert.equal(
        reports.fixed_client_report_export_body_max_bytes,
        CLIENT_FIXED_REPORT_MAX_EXPORT_BODY_BYTES,
      );
      assert.equal(
        reports.fixed_client_report_csv_max_bytes,
        CLIENT_FIXED_REPORT_MAX_CSV_BYTES,
      );
      assert.equal(
        reports.fixed_client_report_object_acl_authority,
        "required_server_session_resolver",
      );
      assert.equal(
        reports
          .fixed_client_report_unavailable_without_object_acl_authority,
        true,
      );
      assert.equal(
        reports.caller_permission_context_object_acl_trusted,
        false,
      );
      assert.equal(
        health.body.auth_authority.object_acl_authority,
        "server_resolver",
      );
      assert.equal(
        health.body.auth_authority
          .object_acl_authority_source_ref,
        "file-current:ObjectAcl",
      );
      assert.equal(
        health.body.auth_authority
          .caller_permission_context_object_acl_trusted,
        false,
      );

      for (const reportId of CLIENT_FIXED_REPORT_IDS) {
        const screen = await request(
          baseUrl,
          screenPath(reportId),
        );
        assert.equal(screen.status, 200, JSON.stringify(screen.body));
        assert.equal(screen.body.outcome, "passed");
        assert.equal(screen.body.item.report_id, reportId);
        assert.equal(
          screen.body.item.rows.length
            <= screen.body.item.row_limit,
          true,
        );
        assert.match(
          screen.body.item.snapshot.token,
          new RegExp(`^${CLIENT_FIXED_REPORT_TOKEN_PREFIX}\\.`),
        );
        const [, encryptedSnapshot] =
          screen.body.item.snapshot.token.split(".");
        const decodedSnapshotBytes = Buffer.from(
          encryptedSnapshot,
          "base64url",
        ).toString("utf8");
        for (const plaintext of [
          TENANT,
          OPERATIONS.user_id,
          reportId,
          AS_OF,
          FORMULA_CLIENT,
          "client-fixed-visible",
        ]) {
          assert.equal(
            screen.body.item.snapshot.token.includes(plaintext),
            false,
          );
          assert.equal(decodedSnapshotBytes.includes(plaintext), false);
        }
        assert.equal(screen.body.item.snapshot.version, 1);
        assert.deepEqual(screen.body.item.print_contract, {
          rows_source: "screen_snapshot",
          server_pdf_required: false,
        });
        assert.equal(
          screen.body.item.permission_prefilter_applied,
          true,
        );
        assert.equal(screen.body.item.internal_ids_included, false);
        assert.equal(screen.body.item.contact_pii_included, false);
        const screenSerialized = JSON.stringify(screen.body.item);
        for (const internal of [
          "client-fixed-visible",
          "client-fixed-hidden",
          "party-fixed-visible",
          "bank-fixed-visible",
          "client-fixed-report-account",
          "fingerprint-fixed-visible",
          "private-fixed@example.test",
        ]) {
          assert.equal(screenSerialized.includes(internal), false);
        }

        const exported = await request(
          baseUrl,
          `/api/reports/clients/fixed/${reportId}.csv`,
          {
            method: "POST",
            body: exportBody(
              screen,
              `fixed-export-${reportId}`,
            ),
          },
        );
        assert.equal(
          exported.status,
          201,
          JSON.stringify(exported.body),
        );
        assert.equal(exported.body.outcome, "created");
        assert.deepEqual(
          exported.body.item.rows,
          screen.body.item.rows,
        );
        assert.deepEqual(
          csvRows(exported.body.item),
          screen.body.item.rows,
        );
        assert.equal(
          exported.body.item.as_of,
          screen.body.item.as_of,
        );
        assert.match(
          exported.body.item.csv_sha256,
          /^[a-f0-9]{64}$/u,
        );
        assert.equal(
          exported.body.item.formula_injection_escaped,
          true,
        );
        assert.equal(
          exported.body.item.internal_ids_included,
          false,
        );

        const replay = await request(
          baseUrl,
          `/api/reports/clients/fixed/${reportId}.csv`,
          {
            method: "POST",
            body: exportBody(
              screen,
              `fixed-export-${reportId}`,
            ),
          },
        );
        assert.equal(replay.status, 200);
        assert.equal(
          replay.body.outcome,
          "idempotent_replay",
        );
        assert.equal(replay.body.idempotent_replay, true);
        assert.equal(
          replay.body.item.csv_text,
          exported.body.item.csv_text,
        );
        assert.deepEqual(
          replay.body.item.rows,
          screen.body.item.rows,
        );
        reportProof.push({
          report_id: reportId,
          row_count: screen.body.item.rows.length,
          snapshot_token_length:
            screen.body.item.snapshot.token.length,
          csv_sha256: exported.body.item.csv_sha256,
          screen_csv_equal: true,
          replay_equal: true,
          headers: exported.body.item.columns.map(
            ({ label }) => label,
          ),
        });
      }

      const revenueScreen = await request(
        baseUrl,
        screenPath("revenue_ranking"),
      );
      const formulaRow = revenueScreen.body.item.rows.find(
        ({ client_name }) => client_name.includes("HYPERLINK"),
      );
      assert.ok(formulaRow);
      assert.match(formulaRow.client_name, /^'=/u);
      for (const record of deposit(
        "fixed-after-screen",
        "client-fixed-visible",
        "party-fixed-visible",
        7_000_000,
      )) {
        sourceFixture.financeRepository.create(record);
      }
      const revenueExport = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          method: "POST",
          body: exportBody(
            revenueScreen,
            "fixed-export-formula-assertion",
          ),
        },
      );
      assert.doesNotMatch(
        revenueExport.body.item.csv_text,
        /(?:^|,|\n)=HYPERLINK/u,
      );
      assert.deepEqual(
        revenueExport.body.item.rows,
        revenueScreen.body.item.rows,
      );
      assert.equal(
        revenueExport.body.item.csv_text.includes("8000000"),
        false,
      );
      assert.equal(
        revenueExport.body.item.csv_text.includes(
          "\"'=HYPERLINK(\"\"https://bad.test\"\"",
        ),
        true,
      );
      console.log(JSON.stringify({
        scenario: "client-fixed-report-screen-csv",
        reports: reportProof,
        opaque_snapshot: true,
        formula_cell_escaped: true,
        source_change_preserved_snapshot_rows: true,
        print_uses_screen_snapshot: true,
      }));
    });

    const audit = sourceFixture.analyticsRepository.listAudit({
      tenant_id: TENANT,
    });
    for (const action of [
      "report.client_fixed.screen.read",
      "report.client_fixed.csv.export",
      "report.client_fixed.csv.replay",
    ]) {
      assert.equal(
        audit.some((event) => event.action === action),
        true,
        action,
      );
    }
    assert.equal(
      audit.every((event) => event.tenant_id === TENANT),
      true,
    );
    const auditSerialized = JSON.stringify(audit);
    assert.equal(auditSerialized.includes(FORMULA_CLIENT), false);
    assert.equal(auditSerialized.includes(HIDDEN_CLIENT), false);
    assert.equal(auditSerialized.includes("bank-fixed"), false);
    assert.equal(
      auditSerialized.includes("private-fixed@example.test"),
      false,
    );
  } finally {
    sourceFixture.close();
  }
});

test("CL-P5-W03-T03 signed deny, cross-tenant, tamper, expiry, user mismatch, caller rows, and idempotency collision fail closed without values", async () => {
  const sourceFixture = fixture();
  try {
    await withServer(sourceFixture, async (_started, baseUrl) => {
      const screen = await request(
        baseUrl,
        screenPath("revenue_ranking"),
      );
      assert.equal(screen.status, 200);

      const denied = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          account: STAFF,
          method: "POST",
          body: exportBody(screen, "fixed-denied-staff"),
        },
      );
      assert.equal(denied.status, 403);
      assertNoReportLeak(denied);

      const crossTenant = await request(
        baseUrl,
        screenPath("revenue_ranking", {
          tenant_id: "tenant-forged-fixed-report",
        }),
      );
      assert.equal(crossTenant.status, 403);
      assertNoReportLeak(crossTenant);
      const crossTenantExport = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          method: "POST",
          body: exportBody(
            screen,
            "fixed-cross-tenant-export",
            { tenant_id: "tenant-forged-fixed-report" },
          ),
        },
      );
      assert.equal(crossTenantExport.status, 403);
      assertNoReportLeak(crossTenantExport);

      const partnerMismatch = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          account: PARTNER,
          method: "POST",
          body: exportBody(
            screen,
            "fixed-user-mismatch",
          ),
        },
      );
      assert.equal(partnerMismatch.status, 400);
      assert.deepEqual(
        partnerMismatch.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_SNAPSHOT_INVALID"],
      );
      assertNoReportLeak(partnerMismatch);

      const token = screen.body.item.snapshot.token;
      const [tokenPrefix, tokenPayload] = token.split(".");
      const tamperedToken = `${tokenPrefix}.${
        tokenPayload.startsWith("a") ? "b" : "a"
      }${tokenPayload.slice(1)}`;
      const tampered = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          method: "POST",
          body: exportBody(screen, "fixed-tampered", {
            snapshot_token: tamperedToken,
          }),
        },
      );
      assert.equal(tampered.status, 400);
      assert.deepEqual(
        tampered.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_SNAPSHOT_INVALID"],
      );
      assertNoReportLeak(tampered);

      const equivalentToken = equivalentNonCanonicalToken(token);
      const equivalentRepresentation = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          method: "POST",
          body: exportBody(
            screen,
            "fixed-equivalent-token-representation",
            { snapshot_token: equivalentToken },
          ),
        },
      );
      assert.equal(equivalentRepresentation.status, 400);
      assert.deepEqual(
        equivalentRepresentation.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_SNAPSHOT_INVALID"],
      );
      assertNoReportLeak(equivalentRepresentation);

      const wrongVersion = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          method: "POST",
          body: exportBody(screen, "fixed-wrong-version", {
            snapshot_version: 2,
          }),
        },
      );
      assert.equal(wrongVersion.status, 400);
      assert.deepEqual(
        wrongVersion.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_SNAPSHOT_INVALID"],
      );
      assertNoReportLeak(wrongVersion);

      const reportMismatch = await request(
        baseUrl,
        "/api/reports/clients/fixed/monthly_deposit_revenue.csv",
        {
          method: "POST",
          body: exportBody(screen, "fixed-report-mismatch"),
        },
      );
      assert.equal(reportMismatch.status, 400);
      assert.deepEqual(
        reportMismatch.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_SNAPSHOT_INVALID"],
      );
      assertNoReportLeak(reportMismatch);

      const oversizedToken = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          method: "POST",
          body: exportBody(screen, "fixed-oversized-token", {
            snapshot_token: `${CLIENT_FIXED_REPORT_TOKEN_PREFIX}.${
              "a".repeat(CLIENT_FIXED_REPORT_MAX_TOKEN_BYTES)
            }`,
          }),
        },
      );
      assert.equal(oversizedToken.status, 413);
      assert.deepEqual(
        oversizedToken.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_REQUEST_TOO_LARGE"],
      );
      assertNoReportLeak(oversizedToken);

      const oversizedBody = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          method: "POST",
          body: exportBody(screen, "fixed-oversized-body", {
            padding: "x".repeat(
              CLIENT_FIXED_REPORT_MAX_EXPORT_BODY_BYTES,
            ),
          }),
        },
      );
      assert.equal(oversizedBody.status, 413);
      assert.deepEqual(
        oversizedBody.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_REQUEST_TOO_LARGE"],
      );
      assertNoReportLeak(oversizedBody);

      for (const forged of [
        { rows: [{ client_name: "위조", net_deposit_revenue: 1 }] },
        { source_digest: "a".repeat(64) },
        { csv_text: "고객,금액\n위조,1" },
      ]) {
        const rejected = await request(
          baseUrl,
          "/api/reports/clients/fixed/revenue_ranking.csv",
          {
            method: "POST",
            body: exportBody(
              screen,
              `fixed-forged-${Object.keys(forged)[0]}`,
              forged,
            ),
          },
        );
        assert.equal(rejected.status, 400);
        assert.deepEqual(
          rejected.body.safe_error_codes,
          ["CLIENT_FIXED_REPORT_CLIENT_PAYLOAD_REJECTED"],
        );
        assertNoReportLeak(rejected);
      }

      const first = await request(
        baseUrl,
        "/api/reports/clients/fixed/revenue_ranking.csv",
        {
          method: "POST",
          body: exportBody(screen, "fixed-collision"),
        },
      );
      assert.equal(first.status, 201);
      const monthly = await request(
        baseUrl,
        screenPath("monthly_deposit_revenue"),
      );
      const collision = await request(
        baseUrl,
        "/api/reports/clients/fixed/monthly_deposit_revenue.csv",
        {
          method: "POST",
          body: exportBody(monthly, "fixed-collision"),
        },
      );
      assert.equal(collision.status, 409);
      assert.deepEqual(
        collision.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_IDEMPOTENCY_CONFLICT"],
      );
      assertNoReportLeak(collision);

      const expiring = await request(
        baseUrl,
        screenPath("inquiry_status"),
      );
      sourceFixture.advanceTokenClock(10 * 60 * 1000);
      const expired = await request(
        baseUrl,
        "/api/reports/clients/fixed/inquiry_status.csv",
        {
          method: "POST",
          body: exportBody(expiring, "fixed-expired"),
        },
      );
      assert.equal(expired.status, 400);
      assert.deepEqual(
        expired.body.safe_error_codes,
        ["CLIENT_FIXED_REPORT_SNAPSHOT_EXPIRED"],
      );
      assertNoReportLeak(expired);

      const unknown = await request(
        baseUrl,
        `/api/reports/clients/fixed/arbitrary?${
          commonQuery()
        }`,
      );
      assert.equal(unknown.status, 404);
      assert.deepEqual(
        unknown.body.safe_error_codes,
        ["REPORTS_NOT_FOUND"],
      );
      console.log(JSON.stringify({
        scenario: "client-fixed-report-adversarial",
        signed_export_denied: denied.status === 403,
        cross_tenant_denied: crossTenant.status === 403,
        cross_tenant_export_denied:
          crossTenantExport.status === 403,
        user_mismatch_denied: partnerMismatch.status === 400,
        tamper_denied: tampered.status === 400,
        equivalent_token_representation_denied:
          equivalentRepresentation.status === 400,
        version_mismatch_denied: wrongVersion.status === 400,
        report_mismatch_denied: reportMismatch.status === 400,
        oversized_token_denied: oversizedToken.status === 413,
        oversized_body_denied: oversizedBody.status === 413,
        caller_rows_digest_rejected: true,
        idempotency_collision_denied:
          collision.status === 409,
        expired_denied: expired.status === 400,
        response_value_leak_prevented: true,
      }));
    });

    const capabilityContext = await signedContext("wsjo@amic.kr");
    const query = Object.fromEntries(
      new URLSearchParams(commonQuery()),
    );
    const requestOnlyChange = {
      ...capabilityContext,
      principal: {
        ...capabilityContext.principal,
        request_id: "fixed-other-request-id",
      },
    };
    assert.equal(
      clientFixedReportCapabilityBinding(requestOnlyChange),
      clientFixedReportCapabilityBinding(capabilityContext),
    );
    const wallIssueContext = {
      ...capabilityContext,
      rules: [
        ...(capabilityContext.rules ?? []),
        {
          id: "client-fixed-ethical-wall-change",
          effect: "deny",
          action: "analytics:client:export",
          ethical_wall_matter_id: "matter-wall-before",
        },
      ],
    };
    const capabilityScreen = handleReportsApiRequest({
      pathname:
        "/api/reports/clients/fixed/revenue_ranking",
      method: "GET",
      query,
      body: {},
      context: wallIssueContext,
      requestId: "fixed-capability-screen",
      runtime: { analyticsRuntime: sourceFixture.runtime },
    });
    assert.equal(capabilityScreen.status, 200);
    const changedCapabilityContext = {
      ...wallIssueContext,
      rules: wallIssueContext.rules.map((rule) => (
        rule.id === "client-fixed-ethical-wall-change"
          ? {
              ...rule,
              ethical_wall_matter_id: "matter-wall-after",
            }
          : rule
      )),
    };
    assert.notEqual(
      clientFixedReportCapabilityBinding(changedCapabilityContext),
      clientFixedReportCapabilityBinding(wallIssueContext),
    );
    const capabilityMismatch = handleReportsApiRequest({
      pathname:
        "/api/reports/clients/fixed/revenue_ranking.csv",
      method: "POST",
      query,
      body: exportBody(
        capabilityScreen,
        "fixed-capability-mismatch",
      ),
      context: changedCapabilityContext,
      requestId: "fixed-capability-export",
      runtime: { analyticsRuntime: sourceFixture.runtime },
    });
    assert.equal(capabilityMismatch.status, 403);
    assert.deepEqual(
      capabilityMismatch.body.safe_error_codes,
      ["CLIENT_FIXED_REPORT_EXPORT_DENIED"],
    );
    assertNoReportLeak(capabilityMismatch);

    const readLimitedDenyContext = {
      ...capabilityContext,
      rules: [
        ...(capabilityContext.rules ?? []),
        {
          id: "client-fixed-action-access-change",
          effect: "deny",
          action: "analytics:client:export",
          action_access: "read",
        },
      ],
    };
    const actionAccessScreen = handleReportsApiRequest({
      pathname:
        "/api/reports/clients/fixed/revenue_ranking",
      method: "GET",
      query,
      body: {},
      context: readLimitedDenyContext,
      requestId: "fixed-action-access-screen",
      runtime: { analyticsRuntime: sourceFixture.runtime },
    });
    assert.equal(actionAccessScreen.status, 200);
    const actionAccessDeniedContext = {
      ...readLimitedDenyContext,
      rules: readLimitedDenyContext.rules.map((rule) => {
        if (rule.id !== "client-fixed-action-access-change") {
          return rule;
        }
        const { action_access: _removed, ...denyRule } = rule;
        return denyRule;
      }),
    };
    assert.notEqual(
      clientFixedReportCapabilityBinding(actionAccessDeniedContext),
      clientFixedReportCapabilityBinding(readLimitedDenyContext),
    );
    const actionAccessDenied = handleReportsApiRequest({
      pathname:
        "/api/reports/clients/fixed/revenue_ranking.csv",
      method: "POST",
      query,
      body: exportBody(
        actionAccessScreen,
        "fixed-action-access-deny",
      ),
      context: actionAccessDeniedContext,
      requestId: "fixed-action-access-export",
      runtime: { analyticsRuntime: sourceFixture.runtime },
    });
    assert.equal(actionAccessDenied.status, 403);
    assert.deepEqual(
      actionAccessDenied.body.safe_error_codes,
      ["CLIENT_FIXED_REPORT_EXPORT_DENIED"],
    );
    assertNoReportLeak(actionAccessDenied);
    console.log(JSON.stringify({
      scenario: "client-fixed-report-capability-binding",
      same_user_capability_change_denied:
        capabilityMismatch.status === 403,
      ethical_wall_change_denied:
        capabilityMismatch.status === 403,
      action_access_allow_to_deny_denied:
        actionAccessDenied.status === 403,
      request_id_only_change_ignored: true,
      bound_permission_fields: [
        "ethical_wall_matter_id",
        "action_access",
      ],
      tenant_user_report_as_of_bound: true,
    }));

    assert.deepEqual(
      sourceFixture.analyticsRepository.listAudit({
        tenant_id: "tenant-forged-fixed-report",
      }),
      [],
    );
    const audit = sourceFixture.analyticsRepository.listAudit({
      tenant_id: TENANT,
    });
    assert.equal(
      audit.some((event) => (
        event.action === "report.client_fixed.denied"
        && event.decision === "deny"
      )),
      true,
    );
    assert.equal(
      audit.every((event) => (
        event.metadata.authoritative_tenant_source
          === "signed_session"
        && event.metadata.client_supplied_tenant_used === false
      )),
      true,
    );
  } finally {
    sourceFixture.close();
  }
});

test("CL-P5-W03-T03 signed HTTP uses only authoritative server ClientGroup ACL and fails closed when the authority is missing or cross-tenant", async () => {
  const sourceFixture = fixture();
  const objectAclRoot = mkdtempSync(join(
    tmpdir(),
    "client-fixed-object-acl-",
  ));
  const objectAclStorePath = join(
    objectAclRoot,
    "object-acl-store.json",
  );
  createObjectAclStore({
    filePath: objectAclStorePath,
  }).saveObjectAcl({
    acl: {
      tenant_id: TENANT,
      acl_id: "server-hidden-client-read-deny",
      resource_id: "client-fixed-hidden",
      client_group_id: "client-fixed-hidden",
      principal_id: OPERATIONS.user_id,
      effect: "deny",
      action: "analytics:client:read",
    },
    actor_id: "security-admin-test",
    idempotency_key: "server-hidden-client-read-deny",
  });
  createObjectAclStore({
    filePath: objectAclStorePath,
  }).saveObjectAcl({
    acl: {
      tenant_id: TENANT,
      acl_id: "server-other-principal-visible-deny",
      resource_id: "client-fixed-visible",
      client_group_id: "client-fixed-visible",
      principal_id: "user-other-principal",
      effect: "deny",
      action: "analytics:client:read",
    },
    actor_id: "security-admin-test",
    idempotency_key: "server-other-principal-visible-deny",
  });
  createObjectAclStore({
    filePath: objectAclStorePath,
  }).saveObjectAcl({
    acl: {
      tenant_id: "tenant-other",
      acl_id: "server-other-tenant-visible-deny",
      resource_id: "client-fixed-visible",
      client_group_id: "client-fixed-visible",
      principal_id: OPERATIONS.user_id,
      effect: "deny",
      action: "analytics:client:read",
    },
    actor_id: "security-admin-test",
    idempotency_key: "server-other-tenant-visible-deny",
  });
  const forgedPermissionContext = JSON.stringify({
    principal: {
      tenant_id: TENANT,
      user_id: OPERATIONS.user_id,
    },
    rules: [{
      id: "caller-forged-universal-allow",
      effect: "allow",
      action: "*",
    }],
    object_acl: [{
      id: "caller-forged-hidden-client-allow",
      effect: "allow",
      principal_id: OPERATIONS.user_id,
      action: "analytics:client:read",
      client_group_id: "client-fixed-hidden",
    }],
  });
  try {
    await withServer(
      sourceFixture,
      async (started, baseUrl) => {
        const screen = await request(
          baseUrl,
          screenPath("revenue_ranking"),
          {
            headers: {
              "x-lawos-permission-context":
                forgedPermissionContext,
            },
          },
        );
        assert.equal(screen.status, 200, JSON.stringify(screen.body));
        assert.equal(
          started.sessionAuth
            ? true
            : false,
          true,
        );
        assert.equal(screen.body.item.row_count, 1);
        assert.deepEqual(screen.body.item.rows, [{
          rank: 1,
          client_name: `'${FORMULA_CLIENT}`,
          matched_inflow_amount: 1_000_000,
          linked_refund_amount: 0,
          net_deposit_revenue: 1_000_000,
          latest_deposit_date: "2026-07-10",
        }]);
        const screenSerialized = JSON.stringify(screen.body);
        for (const hidden of [
          HIDDEN_CLIENT,
          "client-fixed-hidden",
          "99000000",
          "50000000",
          "lead-fixed-hidden",
        ]) {
          assert.equal(screenSerialized.includes(hidden), false);
        }

        const exported = await request(
          baseUrl,
          "/api/reports/clients/fixed/revenue_ranking.csv",
          {
            method: "POST",
            headers: {
              "x-lawos-permission-context":
                forgedPermissionContext,
            },
            body: exportBody(
              screen,
              "fixed-http-authoritative-acl",
            ),
          },
        );
        assert.equal(
          exported.status,
          201,
          JSON.stringify(exported.body),
        );
        assert.equal(exported.body.item.row_count, 1);
        assert.deepEqual(
          exported.body.item.rows,
          screen.body.item.rows,
        );
        assert.deepEqual(
          csvRows(exported.body.item),
          screen.body.item.rows,
        );
        const exportedSerialized = JSON.stringify(exported.body);
        for (const hidden of [
          HIDDEN_CLIENT,
          "client-fixed-hidden",
          "99000000",
          "50000000",
          "lead-fixed-hidden",
        ]) {
          assert.equal(exportedSerialized.includes(hidden), false);
        }
      },
      { objectAclStorePath },
    );
    assert.equal(createObjectAclStore({
      filePath: objectAclStorePath,
    }).list({
      tenant_id: TENANT,
      record_type: "ObjectAcl",
    }).length, 2);

    const malformedFileAclCases = [
      ["whitespace", `${OPERATIONS.user_id} `],
      ["missing", undefined],
      ["non-string", 42],
    ];
    let whitespacePrincipalStorePath;
    for (const [label, principalId] of malformedFileAclCases) {
      const malformedStorePath = join(
        objectAclRoot,
        `object-acl-${label}.json`,
      );
      createObjectAclStore({
        filePath: malformedStorePath,
      }).saveObjectAcl({
        acl: {
          tenant_id: TENANT,
          acl_id: `server-malformed-principal-${label}`,
          resource_id: "client-fixed-visible",
          client_group_id: "client-fixed-visible",
          ...(principalId === undefined
            ? {}
            : { principal_id: principalId }),
          effect: "deny",
          action: "analytics:client:read",
        },
        actor_id: "security-admin-test",
        idempotency_key:
          `server-malformed-principal-${label}`,
      });
      const resolver = createFileSessionObjectAclResolver({
        storePath: malformedStorePath,
      });
      await assert.rejects(
        resolver({
          tenant_id: TENANT,
          user_id: OPERATIONS.user_id,
        }),
        /ObjectAcl\.principal_id is invalid/u,
      );
      if (label === "whitespace") {
        whitespacePrincipalStorePath = malformedStorePath;
      }
    }

    const malformedCanonicalFileAclCases = [
      ["action", "action", "analytics:client:read "],
      ["actions", "actions", ["analytics:client:read "]],
      ["resource-id", "resource_id", "client-fixed-visible "],
      ["client-group-id", "client_group_id", "client-fixed-visible "],
      ["resource-type", "resource_type", "ClientGroup "],
    ];
    let malformedCanonicalStorePath;
    for (const [label, field, value] of malformedCanonicalFileAclCases) {
      const malformedStorePath = join(
        objectAclRoot,
        `object-acl-canonical-${label}.json`,
      );
      const acl = {
        tenant_id: TENANT,
        acl_id: `server-malformed-canonical-${label}`,
        resource_id: "client-fixed-visible",
        client_group_id: "client-fixed-visible",
        principal_id: OPERATIONS.user_id,
        effect: "deny",
        action: "analytics:client:read",
        [field]: value,
      };
      createObjectAclStore({
        filePath: malformedStorePath,
      }).saveObjectAcl({
        acl,
        actor_id: "security-admin-test",
        idempotency_key:
          `server-malformed-canonical-${label}`,
      });
      const resolver = createFileSessionObjectAclResolver({
        storePath: malformedStorePath,
      });
      await assert.rejects(
        resolver({
          tenant_id: TENANT,
          user_id: OPERATIONS.user_id,
        }),
        new RegExp(`ObjectAcl\\.${field} is invalid`, "u"),
      );
      if (label === "action") malformedCanonicalStorePath = malformedStorePath;
    }

    await withServer(
      sourceFixture,
      async (_started, baseUrl) => {
        const malformedCanonical = await request(
          baseUrl,
          screenPath("revenue_ranking"),
        );
        assert.equal(malformedCanonical.status, 503);
        assert.deepEqual(
          malformedCanonical.body.safe_error_codes,
          ["CLIENT_FIXED_REPORT_RUNTIME_UNAVAILABLE"],
        );
        assertNoReportLeak(malformedCanonical);
      },
      { objectAclStorePath: malformedCanonicalStorePath },
    );

    await withServer(
      sourceFixture,
      async (_started, baseUrl) => {
        const malformedPrincipal = await request(
          baseUrl,
          screenPath("revenue_ranking"),
        );
        assert.equal(malformedPrincipal.status, 503);
        assert.deepEqual(
          malformedPrincipal.body.safe_error_codes,
          ["CLIENT_FIXED_REPORT_RUNTIME_UNAVAILABLE"],
        );
        assertNoReportLeak(malformedPrincipal);
      },
      { objectAclStorePath: whitespacePrincipalStorePath },
    );

    await withServer(
      sourceFixture,
      async (_started, baseUrl) => {
        const health = await request(baseUrl, "/api/health");
        assert.equal(
          health.body.auth_authority.object_acl_authority,
          "unavailable",
        );
        const unavailable = await request(
          baseUrl,
          screenPath("revenue_ranking"),
        );
        assert.equal(unavailable.status, 503);
        assert.deepEqual(
          unavailable.body.safe_error_codes,
          ["CLIENT_FIXED_REPORT_RUNTIME_UNAVAILABLE"],
        );
        assertNoReportLeak(unavailable);
      },
      { sessionObjectAclResolver: null },
    );

    await withServer(
      sourceFixture,
      async (_started, baseUrl) => {
        const crossTenant = await request(
          baseUrl,
          screenPath("revenue_ranking"),
        );
        assert.equal(crossTenant.status, 503);
        assertNoReportLeak(crossTenant);
      },
      {
        sessionObjectAclResolver: async ({ user_id }) => ({
          authoritative: true,
          source_ref: "synthetic_cross_tenant_acl_fixture",
          object_acl: [{
            id: "cross-tenant-deny",
            tenant_id: "tenant-other",
            principal_id: user_id,
            effect: "deny",
            action: "analytics:client:read",
            client_group_id: "client-fixed-hidden",
          }],
        }),
      },
    );

    await withServer(
      sourceFixture,
      async (_started, baseUrl) => {
        const malformedResourceType = await request(
          baseUrl,
          screenPath("revenue_ranking"),
        );
        assert.equal(malformedResourceType.status, 503);
        assert.deepEqual(
          malformedResourceType.body.safe_error_codes,
          ["CLIENT_FIXED_REPORT_RUNTIME_UNAVAILABLE"],
        );
        assertNoReportLeak(malformedResourceType);
      },
      {
        sessionObjectAclResolver: async ({ tenant_id, user_id }) => ({
          authoritative: true,
          source_ref:
            "synthetic_malformed_resource_type_acl_fixture",
          object_acl: [{
            id: "malformed-resource-type-deny",
            tenant_id,
            principal_id: user_id,
            effect: "deny",
            action: "analytics:client:read",
            resource_type: " Matter ",
            resource_id: "revenue_ranking",
          }],
        }),
      },
    );

    console.log(JSON.stringify({
      scenario:
        "client-fixed-report-signed-http-object-acl-authority",
      authority_source: "file-current:ObjectAcl",
      persisted_current_tenant_object_acl_count: 2,
      forged_permission_header_ignored: true,
      hidden_screen_row_and_amount_excluded: true,
      hidden_csv_row_and_amount_excluded: true,
      exact_other_principal_isolated: true,
      other_tenant_isolated: true,
      malformed_principal_cases_rejected: [
        "whitespace",
        "missing",
        "non-string",
      ],
      malformed_principal_authority_status: 503,
      malformed_resource_type_authority_status: 503,
      authoritative_empty_distinct_from_missing: true,
      missing_authority_status: 503,
      cross_tenant_authority_status: 503,
      production_acl_source_claimed: false,
    }));
  } finally {
    sourceFixture.close();
    rmSync(objectAclRoot, { recursive: true, force: true });
  }
});

test("CL-P5-W03-T03 partial fixed report preserves validated rows and canonical state through signed screen snapshot CSV and replay", async () => {
  const sourceFixture = fixture();
  let sourceStatus = "partial";
  let dashboardReads = 0;
  const partialRuntime = Object.freeze({
    ...sourceFixture.runtime,
    clientOperationsReadModel: Object.freeze({
      readDashboard: () => {
        dashboardReads += 1;
        const dashboard = boundedDashboard({
          clientName: "부분 데이터 고객",
        });
        dashboard.item.sections.revenue_ranking = {
          status: sourceStatus,
          data: {
            items: [
              {
                display_name: "부분 데이터 고객 A",
                matched_inflow_amount: 2_000_000,
                linked_refund_amount: 100_000,
                net_deposit_revenue: 1_900_000,
                latest_deposit_at:
                  "2026-07-20T00:00:00.000Z",
                client_group_id: "partial-internal-a",
                contact_email: "partial-a@example.test",
              },
              {
                display_name: "부분 데이터 고객 B",
                matched_inflow_amount: 1_500_000,
                linked_refund_amount: 0,
                net_deposit_revenue: 1_500_000,
                latest_deposit_at:
                  "2026-07-19T00:00:00.000Z",
                client_group_id: "partial-internal-b",
                raw_bank_payload: "never-export-partial",
              },
            ],
          },
        };
        return dashboard;
      },
    }),
  });
  try {
    await withServer(
      { ...sourceFixture, runtime: partialRuntime },
      async (_started, baseUrl) => {
        const screen = await request(
          baseUrl,
          screenPath("revenue_ranking"),
        );
        assert.equal(screen.status, 200, JSON.stringify(screen.body));
        assert.equal(screen.body.outcome, "partial");
        assert.equal(screen.body.ui_state, "partial");
        assert.equal(screen.body.item.source_status, "partial");
        assert.equal(screen.body.item.row_count, 2);
        assert.deepEqual(
          screen.body.item.rows.map((row) => row.client_name),
          ["부분 데이터 고객 A", "부분 데이터 고객 B"],
        );
        const screenSerialized = JSON.stringify(screen.body);
        for (const excluded of [
          "partial-internal-a",
          "partial-internal-b",
          "partial-a@example.test",
          "never-export-partial",
        ]) {
          assert.equal(screenSerialized.includes(excluded), false);
        }

        sourceStatus = "available";
        const exported = await request(
          baseUrl,
          "/api/reports/clients/fixed/revenue_ranking.csv",
          {
            method: "POST",
            body: exportBody(
              screen,
              "fixed-partial-export",
            ),
          },
        );
        assert.equal(
          exported.status,
          201,
          JSON.stringify(exported.body),
        );
        assert.equal(exported.body.outcome, "partial");
        assert.equal(exported.body.ui_state, "partial");
        assert.equal(
          exported.body.item.source_status,
          "partial",
        );
        assert.deepEqual(
          exported.body.item.rows,
          screen.body.item.rows,
        );
        assert.deepEqual(
          csvRows(exported.body.item),
          screen.body.item.rows,
        );
        assert.equal(dashboardReads, 1);

        const replay = await request(
          baseUrl,
          "/api/reports/clients/fixed/revenue_ranking.csv",
          {
            method: "POST",
            body: exportBody(
              screen,
              "fixed-partial-export",
            ),
          },
        );
        assert.equal(replay.status, 200);
        assert.equal(replay.body.outcome, "partial");
        assert.equal(replay.body.ui_state, "partial");
        assert.equal(replay.body.idempotent_replay, true);
        assert.equal(
          replay.body.item.source_status,
          "partial",
        );
        assert.deepEqual(
          replay.body.item.rows,
          screen.body.item.rows,
        );
        assert.equal(dashboardReads, 1);

        const exportSerialized = JSON.stringify(exported.body);
        for (const excluded of [
          "partial-internal-a",
          "partial-internal-b",
          "partial-a@example.test",
          "never-export-partial",
        ]) {
          assert.equal(exportSerialized.includes(excluded), false);
        }
        console.log(JSON.stringify({
          scenario: "client-fixed-report-partial-snapshot",
          screen_status: screen.status,
          screen_outcome: screen.body.outcome,
          csv_status: exported.status,
          csv_outcome: exported.body.outcome,
          replay_status: replay.status,
          replay_outcome: replay.body.outcome,
          row_count: screen.body.item.row_count,
          screen_csv_rows_equal: true,
          snapshot_source_reread: false,
          raw_source_fields_included: false,
        }));
      },
    );
  } finally {
    sourceFixture.close();
  }
});

test("CL-P5-W03-T03 report ACL gates stay separate from ClientGroup row trimming and CSV reauthorization", async () => {
  const sourceFixture = fixture();
  try {
    const baseContext = await signedContext("wsjo@amic.kr");
    const restrictedContext = {
      ...baseContext,
      object_acl: [
        ...(baseContext.object_acl ?? []),
        {
          id: "client-fixed-hidden-read-deny",
          effect: "deny",
          principal_id: baseContext.principal.user_id,
          action: "analytics:client:read",
          client_group_id: "client-fixed-hidden",
        },
        {
          id: "client-fixed-hidden-export-allow",
          effect: "allow",
          principal_id: baseContext.principal.user_id,
          action: "analytics:client:export",
          client_group_id: "client-fixed-hidden",
        },
      ],
    };
    const query = Object.fromEntries(
      new URLSearchParams(commonQuery()),
    );
    const screen = handleReportsApiRequest({
      pathname:
        "/api/reports/clients/fixed/revenue_ranking",
      method: "GET",
      query,
      body: {},
      context: restrictedContext,
      requestId: "fixed-object-acl-screen",
      runtime: { analyticsRuntime: sourceFixture.runtime },
    });
    assert.equal(screen.status, 200, JSON.stringify(screen.body));
    assert.equal(screen.body.item.rows.length, 1);
    assert.deepEqual(
      screen.body.item.rows.map((row) => ({
        client_name: row.client_name,
        net_deposit_revenue: row.net_deposit_revenue,
      })),
      [{
        client_name: `'${FORMULA_CLIENT}`,
        net_deposit_revenue: 1_000_000,
      }],
    );
    const serialized = JSON.stringify(screen.body);
    for (const hidden of [
      HIDDEN_CLIENT,
      "client-fixed-hidden",
      "99000000",
      "50000000",
      "lead-fixed-hidden",
    ]) {
      assert.equal(serialized.includes(hidden), false);
    }

    const exported = handleReportsApiRequest({
      pathname:
        "/api/reports/clients/fixed/revenue_ranking.csv",
      method: "POST",
      query: {},
      body: exportBody(screen, "fixed-object-acl-export"),
      context: restrictedContext,
      requestId: "fixed-object-acl-export",
      runtime: { analyticsRuntime: sourceFixture.runtime },
    });
    assert.equal(exported.status, 201, JSON.stringify(exported.body));
    assert.deepEqual(
      exported.body.item.rows,
      screen.body.item.rows,
    );
    assert.deepEqual(
      csvRows(exported.body.item),
      screen.body.item.rows,
    );
    assert.equal(
      JSON.stringify(exported.body).includes(HIDDEN_CLIENT),
      false,
    );
    assert.equal(
      JSON.stringify(exported.body).includes("99000000"),
      false,
    );

    const reportId = "revenue_ranking";
    const reportPath =
      `/api/reports/clients/fixed/${reportId}`;
    const reportCsvPath = `${reportPath}.csv`;
    const contextWithAcl = (entries, rules = baseContext.rules) => ({
      ...baseContext,
      rules,
      object_acl: [
        ...(baseContext.object_acl ?? []),
        ...entries,
      ],
    });
    const readReport = (permissionContext, requestId) => (
      handleReportsApiRequest({
        pathname: reportPath,
        method: "GET",
        query,
        body: {},
        context: permissionContext,
        requestId,
        runtime: { analyticsRuntime: sourceFixture.runtime },
      })
    );
    const exportReport = (
      sourceScreen,
      permissionContext,
      idempotencyKey,
    ) => handleReportsApiRequest({
      pathname: reportCsvPath,
      method: "POST",
      query: {},
      body: exportBody(sourceScreen, idempotencyKey),
      context: permissionContext,
      requestId: `${idempotencyKey}-request`,
      runtime: { analyticsRuntime: sourceFixture.runtime },
    });

    const reportReadDeny = {
      id: "client-fixed-report-read-deny",
      effect: "deny",
      principal_id: baseContext.principal.user_id,
      action: "analytics:client:read",
      resource_id: reportId,
    };
    const reportDeniedContext = contextWithAcl([
      reportReadDeny,
    ]);
    const reportDeniedScreen = readReport(
      reportDeniedContext,
      "fixed-report-acl-screen-deny",
    );
    assert.equal(reportDeniedScreen.status, 403);
    assertNoReportLeak(reportDeniedScreen);
    const reportDeniedExport = exportReport(
      screen,
      reportDeniedContext,
      "fixed-report-acl-export-deny",
    );
    assert.equal(reportDeniedExport.status, 403);
    assert.deepEqual(
      reportDeniedExport.body.safe_error_codes,
      ["CLIENT_FIXED_REPORT_EXPORT_DENIED"],
    );
    assertNoReportLeak(reportDeniedExport);

    const wildcardDeniedContext = contextWithAcl([{
      id: "client-fixed-report-wildcard-deny",
      effect: "deny",
      principal_id: baseContext.principal.user_id,
      action: "*",
      resource_id: "*",
    }]);
    const wildcardDeniedScreen = readReport(
      wildcardDeniedContext,
      "fixed-report-wildcard-screen-deny",
    );
    assert.equal(wildcardDeniedScreen.status, 403);
    assertNoReportLeak(wildcardDeniedScreen);
    const wildcardDeniedExport = exportReport(
      screen,
      wildcardDeniedContext,
      "fixed-report-wildcard-export-deny",
    );
    assert.equal(wildcardDeniedExport.status, 403);
    assertNoReportLeak(wildcardDeniedExport);

    const unrelatedDeniedContext = contextWithAcl([{
      id: "client-fixed-unrelated-report-deny",
      effect: "deny",
      principal_id: baseContext.principal.user_id,
      action: "analytics:client:read",
      resource_id: "inquiry_status",
    }]);
    const unrelatedScreen = readReport(
      unrelatedDeniedContext,
      "fixed-unrelated-report-screen",
    );
    assert.equal(
      unrelatedScreen.status,
      200,
      JSON.stringify(unrelatedScreen.body),
    );
    const unrelatedExport = exportReport(
      unrelatedScreen,
      unrelatedDeniedContext,
      "fixed-unrelated-report-export",
    );
    assert.equal(
      unrelatedExport.status,
      201,
      JSON.stringify(unrelatedExport.body),
    );
    assert.deepEqual(
      unrelatedExport.body.item.rows,
      unrelatedScreen.body.item.rows,
    );

    const reportAllowRules = baseContext.rules
      .filter(({ id }) => (
        id !== "api-session-analytics-client-export"
      ))
      .map((rule) => (
        rule.id === "api-session-analytics-client-read"
          ? { ...rule, resource_type: "ClientGroup" }
          : rule
      ));
    const reportAllowedContext = contextWithAcl([{
      id: "client-fixed-report-specific-allow",
      effect: "allow",
      principal_id: baseContext.principal.user_id,
      actions: [
        "analytics:client:read",
        "analytics:client:export",
      ],
      resource_id: reportId,
    }], reportAllowRules);
    const reportAllowedScreen = readReport(
      reportAllowedContext,
      "fixed-report-acl-screen-allow",
    );
    assert.equal(
      reportAllowedScreen.status,
      200,
      JSON.stringify(reportAllowedScreen.body),
    );
    const reportAllowedExport = exportReport(
      reportAllowedScreen,
      reportAllowedContext,
      "fixed-report-acl-export-allow",
    );
    assert.equal(
      reportAllowedExport.status,
      201,
      JSON.stringify(reportAllowedExport.body),
    );
    assert.deepEqual(
      reportAllowedExport.body.item.rows,
      reportAllowedScreen.body.item.rows,
    );

    console.log(JSON.stringify({
      scenario: "client-fixed-report-object-acl",
      screen_row_count: screen.body.item.rows.length,
      csv_row_count: exported.body.item.rows.length,
      hidden_amount_included: false,
      export_expanded_read_scope: false,
      report_specific_deny_screen_and_export: true,
      wildcard_deny_screen_and_export: true,
      unrelated_report_deny_non_impact: true,
      report_specific_allow_screen_and_export: true,
      csv_reauthorization_enforced: true,
    }));
  } finally {
    sourceFixture.close();
  }
});

test("CL-P5-W03-T03 fixed report ACL gates ignore wrong-type same-ID allows and denies for screen and CSV", async () => {
  const sourceFixture = fixture();
  try {
    const baseContext = await signedContext("wsjo@amic.kr");
    const reportId = "revenue_ranking";
    const reportPath =
      `/api/reports/clients/fixed/${reportId}`;
    const reportCsvPath = `${reportPath}.csv`;
    const query = Object.fromEntries(
      new URLSearchParams(commonQuery()),
    );
    const exactReadRule = {
      id: "client-fixed-exact-read-rule",
      effect: "allow",
      action: "analytics:client:read",
      resource_type: "client_fixed_report",
    };
    const exactExportRule = {
      id: "client-fixed-exact-export-rule",
      effect: "allow",
      action: "analytics:client:export",
      resource_type: "client_fixed_report_export",
    };
    const permissionContext = ({
      rules = [],
      objectAcl = [],
    } = {}) => ({
      ...baseContext,
      rules,
      object_acl: objectAcl,
    });
    const readReport = (context, requestId) => (
      handleReportsApiRequest({
        pathname: reportPath,
        method: "GET",
        query,
        body: {},
        context,
        requestId,
        runtime: { analyticsRuntime: sourceFixture.runtime },
      })
    );
    const exportReport = (
      sourceScreen,
      context,
      idempotencyKey,
    ) => handleReportsApiRequest({
      pathname: reportCsvPath,
      method: "POST",
      query: {},
      body: exportBody(sourceScreen, idempotencyKey),
      context,
      requestId: `${idempotencyKey}-request`,
      runtime: { analyticsRuntime: sourceFixture.runtime },
    });
    const acl = ({
      id,
      effect,
      action,
      resourceType,
    }) => ({
      id,
      tenant_id: TENANT,
      principal_id: baseContext.principal.user_id,
      effect,
      action,
      resource_type: resourceType,
      resource_id: reportId,
    });

    const wrongTypeReadAllowContext = permissionContext({
      objectAcl: [acl({
        id: "wrong-type-read-allow",
        effect: "allow",
        action: "analytics:client:read",
        resourceType: "Matter",
      })],
    });
    const wrongTypeReadAllowScreen = readReport(
      wrongTypeReadAllowContext,
      "fixed-wrong-type-read-allow",
    );
    assert.equal(wrongTypeReadAllowScreen.status, 403);
    assert.deepEqual(
      wrongTypeReadAllowScreen.body.safe_error_codes,
      ["CLIENT_FIXED_REPORT_READ_DENIED"],
    );
    assertNoReportLeak(wrongTypeReadAllowScreen);

    const wrongTypeExportAllowContext = permissionContext({
      rules: [exactReadRule],
      objectAcl: [acl({
        id: "wrong-type-export-allow",
        effect: "allow",
        action: "analytics:client:export",
        resourceType: "Matter",
      })],
    });
    const wrongTypeExportAllowScreen = readReport(
      wrongTypeExportAllowContext,
      "fixed-wrong-type-export-allow-screen",
    );
    assert.equal(
      wrongTypeExportAllowScreen.status,
      200,
      JSON.stringify(wrongTypeExportAllowScreen.body),
    );
    const wrongTypeExportAllowCsv = exportReport(
      wrongTypeExportAllowScreen,
      wrongTypeExportAllowContext,
      "fixed-wrong-type-export-allow",
    );
    assert.equal(wrongTypeExportAllowCsv.status, 403);
    assert.deepEqual(
      wrongTypeExportAllowCsv.body.safe_error_codes,
      ["CLIENT_FIXED_REPORT_EXPORT_DENIED"],
    );
    assertNoReportLeak(wrongTypeExportAllowCsv);

    const wrongTypeDenyContext = permissionContext({
      rules: [exactReadRule, exactExportRule],
      objectAcl: [
        acl({
          id: "wrong-type-read-deny",
          effect: "deny",
          action: "analytics:client:read",
          resourceType: "Matter",
        }),
        acl({
          id: "wrong-type-export-deny",
          effect: "deny",
          action: "analytics:client:export",
          resourceType: "Matter",
        }),
      ],
    });
    const wrongTypeDenyScreen = readReport(
      wrongTypeDenyContext,
      "fixed-wrong-type-deny-screen",
    );
    assert.equal(
      wrongTypeDenyScreen.status,
      200,
      JSON.stringify(wrongTypeDenyScreen.body),
    );
    const wrongTypeDenyCsv = exportReport(
      wrongTypeDenyScreen,
      wrongTypeDenyContext,
      "fixed-wrong-type-deny-export",
    );
    assert.equal(
      wrongTypeDenyCsv.status,
      201,
      JSON.stringify(wrongTypeDenyCsv.body),
    );
    assert.deepEqual(
      wrongTypeDenyCsv.body.item.rows,
      wrongTypeDenyScreen.body.item.rows,
    );

    const exactReadDenyContext = permissionContext({
      rules: [exactReadRule, exactExportRule],
      objectAcl: [acl({
        id: "exact-type-read-deny",
        effect: "deny",
        action: "analytics:client:read",
        resourceType: "client_fixed_report",
      })],
    });
    const exactReadDeniedScreen = readReport(
      exactReadDenyContext,
      "fixed-exact-type-read-deny",
    );
    assert.equal(exactReadDeniedScreen.status, 403);
    assertNoReportLeak(exactReadDeniedScreen);

    const exactExportDenyContext = permissionContext({
      rules: [exactReadRule, exactExportRule],
      objectAcl: [acl({
        id: "exact-type-export-deny",
        effect: "deny",
        action: "analytics:client:export",
        resourceType: "client_fixed_report_export",
      })],
    });
    const exactExportDenyScreen = readReport(
      exactExportDenyContext,
      "fixed-exact-type-export-deny-screen",
    );
    assert.equal(
      exactExportDenyScreen.status,
      200,
      JSON.stringify(exactExportDenyScreen.body),
    );
    const exactExportDeniedCsv = exportReport(
      exactExportDenyScreen,
      exactExportDenyContext,
      "fixed-exact-type-export-deny",
    );
    assert.equal(exactExportDeniedCsv.status, 403);
    assert.deepEqual(
      exactExportDeniedCsv.body.safe_error_codes,
      ["CLIENT_FIXED_REPORT_EXPORT_DENIED"],
    );
    assertNoReportLeak(exactExportDeniedCsv);

    console.log(JSON.stringify({
      scenario:
        "client-fixed-report-resource-type-adversarial",
      wrong_type_read_allow_status:
        wrongTypeReadAllowScreen.status,
      wrong_type_export_allow_status:
        wrongTypeExportAllowCsv.status,
      wrong_type_read_deny_status:
        wrongTypeDenyScreen.status,
      wrong_type_export_deny_status:
        wrongTypeDenyCsv.status,
      exact_type_read_deny_status:
        exactReadDeniedScreen.status,
      exact_type_export_deny_status:
        exactExportDeniedCsv.status,
      wrong_type_same_id_ignored: true,
      exact_read_and_export_types_enforced: true,
      screen_csv_rows_equal_after_wrong_type_deny: true,
    }));
  } finally {
    sourceFixture.close();
  }
});
