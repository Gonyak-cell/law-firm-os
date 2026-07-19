import { createHash } from "node:crypto";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";
import { startDesktopLocalApiServer } from "../apps/desktop/src/main/local-api.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";

const TENANT = "tenant_rp05_synthetic";
const ROOT = process.cwd();
const ARTIFACT_JSON = join(ROOT, "artifacts/manual-qa/upl-a08-packaged-desktop-restart-proof.json");
const ARTIFACT_MD = join(ROOT, "artifacts/manual-qa/upl-a08-packaged-desktop-restart-proof.md");
const PACKAGED_START = "/App/Contents/Resources/app/src/main";
const PACKAGED_ENTRY = "/App/Contents/Resources/app/runtime/apps/api/src/server.js";
const BASE_QUERY = `tenant_id=${TENANT}&permission_ref=perm_ref_rp05_read&audit_hint_ref=upl_a08_desktop_restart_read`;

function openingPayload() {
  return {
    tenant_id: TENANT,
    permission_ref: "perm_ref_rp05_write",
    audit_hint_ref: "upl_a08_desktop_restart_write",
    actor_id: "user_rp05_owner",
    idempotency_key: "upl-a08-desktop-matter-open-001",
    matter_number_seed: "A08-DESKTOP-001",
    require_canonical_matter_code: true,
    client: {
      client_id: "client_upl_a08_desktop",
      client_display_name: "UPL A08 Desktop Client",
      client_short_name: "UPL-A08",
    },
    matter: {
      matter_id: "matter_upl_a08_desktop_restart_001",
      tenant_id: TENANT,
      client_id: "client_upl_a08_desktop",
      legal_client_party_id: "client_upl_a08_desktop",
      billing_client_party_id: "client_upl_a08_desktop",
      matter_type_english: "LIT",
      matter_litigation_axis: "CIV",
      matter_detail_type_korean: "계약분쟁",
      client_case_role: "원고",
      client_case_role_confidence: "upl_a08_desktop_restart_proof",
      source_revision: "upl-a08-desktop-restart-proof",
      title: "UPL A08 desktop restart matter",
      status: "opening",
      created_by: "user_rp05_owner",
      created_at: "2026-07-03T00:00:00.000+09:00",
      permission_envelope_id: "perm_upl_a08_desktop_matter",
      audit_trace_id: "audit_upl_a08_desktop_matter",
    },
    clearance_token: clearanceToken(),
  };
}

function clearanceToken() {
  return {
    clearance_token_id: "clearance_upl_a08_desktop_001",
    tenant_id: TENANT,
    intake_request_id: "intake_upl_a08_desktop_001",
    conflict_check_id: "conflict_upl_a08_desktop_001",
    engagement_id: "engagement_upl_a08_desktop_001",
    snapshot_hash: "sha256:upl-a08-desktop-clearance-001",
    expires_at: "2099-12-31T23:59:59.000Z",
    token_state: "valid",
    outcome: "passed",
  };
}

function intakeRepositoryWithClearance() {
  return createIntakeRuntimeRepository({
    seedRecords: [
      {
        ...clearanceToken(),
        model_type: "ClearanceToken",
        token_state: "active",
        status: "active",
        outcome: "cleared",
        blocked_claims: [],
        conflict_review_satisfied: true,
      },
    ],
  });
}

async function json(baseUrl, path, options = {}) {
  const headers = {
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
}

async function startPackagedDesktopLocalApi(userDataPath) {
  return startDesktopLocalApiServer({
    env: { MATTER_DESKTOP_RUNTIME_STORE_DIR: join(userDataPath, "runtime-stores") },
    start: PACKAGED_START,
    userDataPath,
    existsSyncImpl: (candidate) => candidate === PACKAGED_ENTRY,
    startApiServerImpl: (options) => startApiServer({ ...options, intakeRepository: intakeRepositoryWithClearance() }),
  });
}

async function stop(localApi) {
  await new Promise((resolve, reject) => {
    localApi.server.close((error) => (error ? reject(error) : resolve()));
  });
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function storeFileState(storePaths) {
  return Object.fromEntries(
    ["matterStorePath", "hrxStorePath"].map((key) => {
      const path = storePaths[key];
      return [
        key,
        {
          path,
          exists: existsSync(path),
          bytes: existsSync(path) ? statSync(path).size : 0,
          under_runtime_store_dir: path.includes(`${join("LawFirmOS-A08", "runtime-stores")}`),
        },
      ];
    }),
  );
}

async function main() {
  const userDataPath = await mkdtemp(join(tmpdir(), "LawFirmOS-A08-"));
  let firstApi = null;
  let secondApi = null;
  const leaveRequest = {
    request_id: "leave-upl-a08-desktop-restart-001",
    employee_id: "emp_amic_yjlee",
    policy_id: "pto-us",
    leave_type: "pto",
    amount: 4,
    start_date: "2026-08-18",
    end_date: "2026-08-18",
  };

  try {
    firstApi = await startPackagedDesktopLocalApi(userDataPath);
    const firstSessionHeaders = await apiSessionHeaders(firstApi.baseUrl);
    const matterCreate = await json(firstApi.baseUrl, "/api/matters/openings", {
      method: "POST",
      headers: firstSessionHeaders,
      body: JSON.stringify(openingPayload()),
    });
    if (matterCreate.status !== 201) throw new Error(`matter create failed: ${matterCreate.status} ${JSON.stringify(matterCreate.body)}`);

    const leaveCreate = await json(firstApi.baseUrl, "/api/hrx/leave", {
      method: "POST",
      headers: firstSessionHeaders,
      body: JSON.stringify(leaveRequest),
    });
    if (leaveCreate.status !== 201) throw new Error(`leave create failed: ${leaveCreate.status} ${JSON.stringify(leaveCreate.body)}`);

    const firstMatter = await json(firstApi.baseUrl, `/api/matters/${openingPayload().matter.matter_id}?${BASE_QUERY}`, {
      headers: firstSessionHeaders,
    });
    const firstLeave = await json(
      firstApi.baseUrl,
      `/api/hrx/leave?employee_id=${leaveRequest.employee_id}&policy_id=${leaveRequest.policy_id}`,
      { headers: firstSessionHeaders },
    );
    const firstStorePaths = firstApi.storePaths;
    const firstStoreFiles = storeFileState(firstStorePaths);
    await stop(firstApi);
    firstApi = null;

    secondApi = await startPackagedDesktopLocalApi(userDataPath);
    const secondSessionHeaders = await apiSessionHeaders(secondApi.baseUrl);
    const secondMatter = await json(secondApi.baseUrl, `/api/matters/${openingPayload().matter.matter_id}?${BASE_QUERY}`, {
      headers: secondSessionHeaders,
    });
    const secondLeave = await json(
      secondApi.baseUrl,
      `/api/hrx/leave?employee_id=${leaveRequest.employee_id}&policy_id=${leaveRequest.policy_id}`,
      { headers: secondSessionHeaders },
    );
    const secondStorePaths = secondApi.storePaths;
    const secondStoreFiles = storeFileState(secondStorePaths);

    const matterSurvivedRestart =
      secondMatter.status === 200 &&
      secondMatter.body.item?.matter_id === openingPayload().matter.matter_id &&
      secondMatter.body.item?.matter_code === "UPL-A08/LIT/CIV/계약분쟁";
    const leaveSurvivedRestart =
      secondLeave.status === 200 &&
      secondLeave.body.requests?.some((request) => request.request_id === leaveRequest.request_id);
    const sameStorePaths =
      firstStorePaths.matterStorePath === secondStorePaths.matterStorePath &&
      firstStorePaths.hrxStorePath === secondStorePaths.hrxStorePath;

    const artifact = {
      schema_version: "lawos.wave1.upl-a08.packaged-desktop-restart-proof.v1",
      generated_at: new Date().toISOString(),
      row_id: "UPL-A-08",
      status: matterSurvivedRestart && leaveSurvivedRestart && sameStorePaths ? "PASS" : "FAIL",
      scope: "packaged desktop local API restart receipt for matter and leave persistence",
      packaged_desktop_resolution: {
        start: PACKAGED_START,
        entry: firstApi?.entry ?? secondApi.entry,
        packaged_entry_resolved: (firstApi?.entry ?? secondApi.entry) === PACKAGED_ENTRY,
        local_api_start_count: 2,
      },
      restart_boundary: {
        user_data_path: userDataPath,
        direct_store_write_from_script: false,
        start_api_server_injected_for_repo_test_only: true,
        production_ready_claim: false,
      },
      checks: {
        same_store_paths: sameStorePaths,
        matter_survived_restart: matterSurvivedRestart,
        leave_survived_restart: leaveSurvivedRestart,
        first_matter_hash: hash(firstMatter.body.item),
        second_matter_hash: hash(secondMatter.body.item),
      },
      first_launch: {
        base_url: firstApi?.baseUrl ?? null,
        matter_create_status: matterCreate.status,
        leave_create_status: leaveCreate.status,
        matter_read_status: firstMatter.status,
        leave_read_status: firstLeave.status,
        store_paths: firstStorePaths,
        store_files: firstStoreFiles,
      },
      second_launch: {
        base_url: secondApi.baseUrl,
        matter_read_status: secondMatter.status,
        leave_read_status: secondLeave.status,
        matter_id: secondMatter.body.item?.matter_id ?? null,
        matter_code: secondMatter.body.item?.matter_code ?? null,
        leave_request_ids: (secondLeave.body.requests ?? []).map((request) => request.request_id),
        store_paths: secondStorePaths,
        store_files: secondStoreFiles,
      },
    };

    mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
    writeFileSync(ARTIFACT_JSON, `${JSON.stringify(artifact, null, 2)}\n`);
    writeFileSync(
      ARTIFACT_MD,
      [
        "# UPL-A-08 Packaged Desktop Restart Proof",
        "",
        `Status: ${artifact.status}`,
        "",
        `- Packaged entry resolved: ${artifact.packaged_desktop_resolution.packaged_entry_resolved}`,
        `- Local API starts: ${artifact.packaged_desktop_resolution.local_api_start_count}`,
        `- Same store paths: ${artifact.checks.same_store_paths}`,
        `- Matter survived restart: ${artifact.checks.matter_survived_restart}`,
        `- Leave survived restart: ${artifact.checks.leave_survived_restart}`,
        `- Direct store write from script: ${artifact.restart_boundary.direct_store_write_from_script}`,
        `- Matter store: ${artifact.second_launch.store_paths.matterStorePath}`,
        `- HRX store: ${artifact.second_launch.store_paths.hrxStorePath}`,
        "",
      ].join("\n"),
    );

    if (artifact.status !== "PASS") throw new Error(`UPL-A-08 proof failed: ${JSON.stringify(artifact.checks)}`);
    console.log(`UPL-A-08 packaged desktop restart proof PASS -> ${ARTIFACT_JSON}`);
  } finally {
    if (firstApi) await stop(firstApi);
    if (secondApi) await stop(secondApi);
  }
}

await main();
