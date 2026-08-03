import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron } from "playwright";
import { createFormalRuntimeTelemetry } from "./formal-deployed-api-telemetry.mjs";
import { FORMAL_DEPLOYED_API_TRANSCRIPT_SCHEMA, opaqueSha256 } from "./formal-deployed-api-transcript.mjs";
import { fail, sha256Bytes } from "./formal-deployed-api-io.mjs";

function seq(rows) {
  return rows.map((row, index) => ({ sequence: index + 1, ...row }));
}

function bodySha(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(value)));
}

function itemId(body, fields) {
  for (const field of fields) {
    const value = body?.item?.[field] ?? body?.[field];
    if (typeof value === "string" && value) return value;
  }
  fail("FORMAL_DEPLOYED_API_QA_SCENARIO", "mutation did not return a stable identifier");
}

function mondayFor(dateOnly) {
  const date = new Date(`${dateOnly}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function launchEnvironment(baseUrl, userDataPath, envPath, additions) {
  const blocked = /^(?:AWS_|LAWOS_|MATTER_)|(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTHORIZATION)|^NODE_OPTIONS$/u;
  return {
    ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !blocked.test(name))),
    ...additions,
    MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
    MATTER_DESKTOP_ENV_FILE: envPath,
    MATTER_DESKTOP_LOCAL_API_DISABLED: "1",
    MATTER_DESKTOP_RUNTIME_BASE_URL: baseUrl,
  };
}

async function productPage(app) {
  await app.firstWindow({ timeout: 45_000 });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    for (const page of app.windows()) {
      if (await page.locator("[data-login-form='email-password'], [data-product-axis-nav]").count().catch(() => 0)) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail("FORMAL_DEPLOYED_API_QA_SCENARIO", "formal product window is unavailable");
}

function initials(value) {
  const parts = String(value ?? "").trim().split(/\s+/u).filter(Boolean);
  if (parts.length > 1) return parts.map((part) => [...part][0]).join("").slice(0, 2);
  return [...(parts[0] ?? "")].slice(0, 2).join("");
}

export function buildFormalDeployedApiIdentityRows({ employeeRows, linkRows, expectedUsers, tenantId }) {
  if (employeeRows.length !== 10 || linkRows.length !== 10 || expectedUsers.length !== 10) {
    fail("FORMAL_DEPLOYED_API_QA_IDENTITY", "exactly ten employee rows, login links, and approved identities are required");
  }
  const expectedByEmployee = new Map(expectedUsers.map((item) => [item.employeeId, item.userId]));
  const expectedUserIds = new Set(expectedUsers.map((item) => item.userId));
  if (expectedByEmployee.size !== 10 || expectedUserIds.size !== 10) {
    fail("FORMAL_DEPLOYED_API_QA_IDENTITY", "approved synthetic identity mappings are not unique");
  }
  const linksByEmployee = new Map();
  for (const link of linkRows) {
    if (link?.tenant_id !== tenantId || link?.purpose !== "login_mapping"
      || typeof link.employee_id !== "string" || typeof link.user_id !== "string"
      || linksByEmployee.has(link.employee_id)) {
      fail("FORMAL_DEPLOYED_API_QA_IDENTITY", "employee login links are not unique and tenant-bound");
    }
    linksByEmployee.set(link.employee_id, link.user_id);
  }
  const observedEmployees = new Set();
  return seq(employeeRows.map((row) => {
    const employeeId = row?.employee_id;
    const userId = linksByEmployee.get(employeeId);
    if (row?.tenant_id !== tenantId || typeof employeeId !== "string" || observedEmployees.has(employeeId)
      || expectedByEmployee.get(employeeId) !== userId) {
      fail("FORMAL_DEPLOYED_API_QA_IDENTITY", "employee directory does not match the approved synthetic identity set");
    }
    observedEmployees.add(employeeId);
    const photo = typeof row.photo_url === "string" && row.photo_url ? opaqueSha256(row.photo_url) : null;
    const label = initials(row.initials ?? row.display_name);
    if (!photo && !label) fail("FORMAL_DEPLOYED_API_QA_IDENTITY", "profile photo or initials evidence is missing");
    return {
      user_id_sha256: opaqueSha256(userId),
      employee_id_sha256: opaqueSha256(employeeId),
      classification: "approved-synthetic",
      photo_sha256: photo,
      initials_sha256: photo ? null : opaqueSha256(label),
    };
  }));
}

function otherTenantDenial(response, signedTenantId, requestedTenantId) {
  const employeesFieldPresent = Object.hasOwn(response.body ?? {}, "employees");
  const visibleRows = Array.isArray(response.body?.employees) ? response.body.employees : [];
  if (signedTenantId === requestedTenantId
    || response.status !== 400
    || response.body?.outcome !== "blocked"
    || response.body?.safe_error_code !== "HRX_QUERY_CONTEXT_FORBIDDEN"
    || JSON.stringify(response.body?.forbidden_query_keys) !== JSON.stringify(["tenant_id"])
    || employeesFieldPresent
    || visibleRows.length !== 0) {
    fail("FORMAL_DEPLOYED_API_QA_TENANT", "cross-tenant query did not fail closed with zero visible rows");
  }
  return {
    signed_tenant_sha256: opaqueSha256(signedTenantId),
    requested_tenant_sha256: opaqueSha256(requestedTenantId),
    status: response.status,
    outcome: response.body.outcome,
    safe_error_code: response.body.safe_error_code,
    forbidden_query_keys: response.body.forbidden_query_keys,
    employees_field_present: employeesFieldPresent,
    visible_count: visibleRows.length,
    response_sha256: bodySha(response.body),
  };
}

export async function runFormalDeployedApiScenario({ platform, endpoint, account, sourceSha, artifactSha256, manifestSha256, executableSha256, executablePath, expectedUsers }) {
  const startedAt = new Date().toISOString();
  const runId = `rfd015-${randomUUID()}`;
  const stateRoot = mkdtempSync(join(tmpdir(), "rfd015-deployed-api-"));
  const envPath = join(stateRoot, "empty.env");
  const netLogPath = join(stateRoot, "whole-process-netlog.json");
  writeFileSync(envPath, "", { mode: 0o600 });
  const telemetry = createFormalRuntimeTelemetry({ endpoint, netLogPath, artifactSha256, manifestSha256, executableSha256, executablePath });
  let app;
  let closed = false;
  try {
    const healthResponse = await fetch(new URL("/api/health", `${endpoint}/`), { signal: AbortSignal.timeout(30_000) });
    const health = await healthResponse.json();
    telemetry.recordHealth(healthResponse.status);
    app = await electron.launch({
      executablePath,
      args: telemetry.launchArgs,
      env: launchEnvironment(endpoint, stateRoot, envPath, telemetry.launchEnv),
      timeout: 45_000,
    });
    telemetry.attach(app, startedAt);
    const page = await productPage(app);
    await page.locator("[data-login-form='email-password']").waitFor({ state: "visible", timeout: 30_000 });
    await page.locator("[data-login-email]").fill(account.email);
    await page.locator("[data-login-password]").fill(account.password);
    await page.locator("[data-login-form='email-password'] button[type='submit']").click();
    await page.locator("[data-product-axis-nav]").waitFor({ state: "visible", timeout: 30_000 });
    await page.locator(".post-login-splash").waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
    const runtime = await page.evaluate(() => window.matterSession?.runtime?.());
    const session = await page.evaluate(() => window.matterSession?.status?.());
    if (runtime?.mode !== "production-auth-http" || new URL(runtime?.baseUrl).origin !== new URL(endpoint).origin || runtime?.operatorRuntimeConfigured !== false || session?.state !== "signed_in" || session?.tenant_id !== account.tenant_id) {
      fail("FORMAL_DEPLOYED_API_QA_SCENARIO", "formal runtime or login boundary drifted");
    }
    const requestApi = async (path, method = "GET", body = null) => {
      const result = await page.evaluate(async ({ path, method, body }) => {
        const response = await window.matterSession.api({ path, method, ...(body === null ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
        return { status: Number(response?.http_status ?? response?.status ?? 0), body: response?.body ?? null };
      }, { path, method, body });
      return result;
    };
    const api = async (path, method = "GET", body = null) => {
      const result = await requestApi(path, method, body);
      if (result.status < 200 || result.status >= 300 || result.body === null) fail("FORMAL_DEPLOYED_API_QA_SCENARIO", "deployed API request failed");
      return result;
    };
    await page.locator('[data-product-axis="matters"]').click();
    await page.locator('[data-matter-small-firm-screen="matter-today"]').waitFor({ timeout: 30_000 });
    const today = await api("/api/matter/ops/today");
    const employees = await api("/api/hrx/employees");
    const employeeLinks = await api("/api/hrx/employee-user-links");
    const otherTenant = await requestApi(`/api/hrx/employees?tenant_id=${encodeURIComponent(account.other_tenant_id)}`);
    const employeeRows = Array.isArray(employees.body?.employees) ? employees.body.employees : [];
    const linkRows = Array.isArray(employeeLinks.body?.links) ? employeeLinks.body.links : [];
    const tenantDenial = otherTenantDenial(otherTenant, session.tenant_id, account.other_tenant_id);
    const mutationEvents = [];
    const readbackEvents = [];
    const mutation = (kind, attempt, key, response, fields, item = null) => {
      const id = itemId(item === null ? response.body : { item }, fields);
      mutationEvents.push({ kind, attempt, idempotency_key_sha256: opaqueSha256(key), resource_id_sha256: opaqueSha256(id), response_sha256: bodySha(response.body), status: response.status, replay: response.body?.idempotent_replay === true });
      return id;
    };
    const readback = (kind, id, response, rows) => readbackEvents.push({ kind, resource_id_sha256: opaqueSha256(id), response_sha256: bodySha(response.body), occurrence_count: rows.filter((item) => Object.values(item).includes(id)).length });
    const suffix = randomUUID().replaceAll("-", "");
    const workDate = new Date().toISOString().slice(0, 10);
    const taskKey = `rfd015_task_${suffix}`;
    const taskPayload = { idempotency_key: taskKey, task: { matter_id: account.matter_id, title: `[RFD015] ${suffix.slice(0, 12)}`, assigned_to: session.user_id, due_at: new Date(Date.now() + 86_400_000).toISOString(), priority: "normal" } };
    const taskFirst = await api("/api/matter/ops/tasks", "POST", taskPayload);
    const taskSecond = await api("/api/matter/ops/tasks", "POST", taskPayload);
    const taskId = mutation("task", 1, taskKey, taskFirst, ["task_id", "id"]);
    mutation("task", 2, taskKey, taskSecond, ["task_id", "id"]);
    const taskRead = await api(`/api/matter/ops/tasks?view=board&include_terminal=true&matter_id=${encodeURIComponent(account.matter_id)}`);
    readback("task", taskId, taskRead, taskRead.body?.items ?? []);
    const timeKey = `rfd015_time_${suffix}`;
    const timePayload = { idempotency_key: timeKey, time_entry: { matter_id: account.matter_id, role_id: "attorney", work_date: workDate, duration_minutes: 6, narrative: `[RFD015] ${suffix.slice(0, 12)}`, billable: true, currency: "KRW" } };
    const timeFirst = await api("/api/matter/ops/time-entries", "POST", timePayload);
    const timeSecond = await api("/api/matter/ops/time-entries", "POST", timePayload);
    const timeId = mutation("time", 1, timeKey, timeFirst, ["time_entry_id", "id"]);
    mutation("time", 2, timeKey, timeSecond, ["time_entry_id", "id"]);
    await api("/api/matter/ops/time-weeks/submit", "POST", { idempotency_key: `rfd015_week_submit_${suffix}`, week_start: mondayFor(workDate), time_entry_ids: [timeId] });
    await api("/api/matter/ops/time-weeks/lock", "POST", { idempotency_key: `rfd015_week_lock_${suffix}`, week_start: mondayFor(workDate), time_entry_ids: [timeId], grace_minutes: 15 });
    const timeRead = await api(`/api/matter/ops/time-entries?matter_id=${encodeURIComponent(account.matter_id)}`);
    readback("time", timeId, timeRead, timeRead.body?.items ?? []);
    const projection = await api(`/api/matter/ops/wip?matter_id=${encodeURIComponent(account.matter_id)}`);
    const sourceSet = (projection.body?.item?.eligible_source_sets ?? []).find((item) => (item.source_refs ?? []).some((ref) => Object.values(ref).includes(timeId)));
    if (!sourceSet?.source_refs?.length) fail("FORMAL_DEPLOYED_API_QA_SCENARIO", "locked time is not WIP eligible");
    const wipKey = `rfd015_wip_${suffix}`;
    const wipPayload = { action: "generate", idempotency_key: wipKey, matter_id: account.matter_id, source_set_id: sourceSet.source_set_id, source_refs: sourceSet.source_refs };
    const wipFirst = await api("/api/matter/ops/wip", "POST", wipPayload);
    const wipSecond = await api("/api/matter/ops/wip", "POST", wipPayload);
    const wipId = mutation("wip", 1, wipKey, wipFirst, ["wip_item_id", "id"], wipFirst.body?.wip_items?.[0]);
    mutation("wip", 2, wipKey, wipSecond, ["wip_item_id", "id"], wipSecond.body?.wip_items?.[0]);
    const billingKey = `rfd015_billing_${suffix}`;
    const billingPayload = { action: "prebill", idempotency_key: billingKey, matter_id: account.matter_id, source_set_id: sourceSet.source_set_id, wip_item_ids: (wipFirst.body?.wip_items ?? []).map((item) => item.wip_item_id), wip_snapshot_id: `rfd015_wip_snapshot_${suffix}`, prebill: { prebill_id: `rfd015_prebill_${suffix}`, partner_reviewer_id: session.user_id, currency: "KRW" } };
    const billingFirst = await api("/api/matter/ops/wip", "POST", billingPayload);
    const billingSecond = await api("/api/matter/ops/wip", "POST", billingPayload);
    const billingId = mutation("billing", 1, billingKey, billingFirst, ["prebill_id", "id"], billingFirst.body?.prebill);
    mutation("billing", 2, billingKey, billingSecond, ["prebill_id", "id"], billingSecond.body?.prebill);
    const billingRead = await api(`/api/matter/ops/time-billing?matter_id=${encodeURIComponent(account.matter_id)}`);
    readback("wip", wipId, billingRead, billingRead.body?.item?.wip_items ?? []);
    readback("billing", billingId, billingRead, billingRead.body?.item?.prebills ?? []);
    await telemetry.close(app);
    closed = true;
    const captured = telemetry.finish();
    const todayRows = Array.isArray(today.body?.items) ? today.body.items : today.body?.item ? [today.body.item] : [];
    return {
      schema_version: FORMAL_DEPLOYED_API_TRANSCRIPT_SCHEMA,
      run_id: runId,
      platform,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      health_response: { status: healthResponse.status, source_revision: health.source_revision, persistence_authority: health.persistence_authority, runtime_profile: health.runtime_profile, synthetic_only: health.synthetic_only, uses_real_client_data: health.uses_real_client_data, body_sha256: bodySha(health) },
      runtime_observation: { mode: runtime.mode, base_url_sha256: sha256Bytes(new URL(runtime.baseUrl).origin), operator_runtime_configured: runtime.operatorRuntimeConfigured },
      ...captured,
      identity_rows: buildFormalDeployedApiIdentityRows({ employeeRows, linkRows, expectedUsers, tenantId: session.tenant_id }),
      other_tenant_observation: tenantDenial,
      other_tenant_rows: [],
      matter_today_rows: seq(todayRows.map((row) => ({ row_sha256: bodySha(row) }))),
      mutation_events: seq(mutationEvents),
      readback_events: seq(readbackEvents),
    };
  } finally {
    if (app && !closed) await app.close().catch(() => {});
    rmSync(stateRoot, { recursive: true, force: true });
  }
}
