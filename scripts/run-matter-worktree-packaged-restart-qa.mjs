#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import { highestPrivilegeRegisteredAccount } from "../apps/api/src/matter-vault-account-registry.js";
import { createMatterRepository } from "../packages/matter/src/repository.js";

const repoRoot = path.resolve(import.meta.dirname, "..");
const executablePath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter");
const appContentPath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/Resources/app");
const rendererPath = path.join(appContentPath, "src/renderer/web");
const zipPath = path.join(repoRoot, "apps/desktop/dist/mac/matter-internal-0.1.15-macos.zip");
const dmgPath = path.join(repoRoot, "apps/desktop/dist/mac/matter-internal-0.1.15-macos.dmg");
const evidenceDir = path.join(repoRoot, "workbook/matter-worktree-evidence/WT-04-07");
const receiptPath = path.join(evidenceDir, "packaged-restart-receipt.json");
const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-worktree-packaged-restart-"));
const runtimeStoreDir = path.join(userDataPath, "runtime-stores");
const matterStorePath = path.join(runtimeStoreDir, "matter-store.json");
const account = highestPrivilegeRegisteredAccount();
const tenantId = account?.tenant_memberships?.[0]?.tenant_id;
const at = "2026-07-12T00:00:00.000Z";
const matterId = "matter_wt_04_07_packaged";
const taskId = "task_wt_04_07_packaged";
const worktreeId = "worktree_wt_04_07_packaged";
const taskTitle = "패키지 재시작 상태 보존";
const evidence = { permission_envelope_id: "perm_wt_04_07_packaged", audit_trace_id: "audit_wt_04_07_packaged" };
const packagedQaEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("LAWOS_") && ![
    "MATTER_DESKTOP_RENDERER_URL",
    "MATTER_DESKTOP_API_BASE_URL",
    "MATTER_DESKTOP_RUNTIME_BASE_URL",
    "MATTER_DESKTOP_RUNTIME_STORE_DIR",
    "MATTER_DESKTOP_USER_DATA_PATH",
  ].includes(name)),
);

assert.equal(process.platform, "darwin", "WT-04-07 packaged restart QA currently targets the macOS matter.app");
assert.equal(existsSync(executablePath), true, `latest packaged executable is required: ${executablePath}`);
assert.ok(account?.email && account?.local_dev?.synthetic_token && account?.user_id && tenantId, "registered local QA account is required");
mkdirSync(evidenceDir, { recursive: true });
mkdirSync(runtimeStoreDir, { recursive: true });

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sha256Directory(directoryPath) {
  const hash = createHash("sha256");
  const visit = (currentPath) => {
    for (const entry of readdirSync(currentPath, { withFileTypes: true }).toSorted((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(directoryPath, absolutePath);
      hash.update(relativePath);
      if (entry.isDirectory()) visit(absolutePath);
      else hash.update(readFileSync(absolutePath));
    }
  };
  visit(directoryPath);
  return hash.digest("hex");
}

function seedIsolatedStore() {
  const repository = createMatterRepository({
    filePath: matterStorePath,
    seedRecords: [
      {
        model_type: "Matter",
        matter_id: matterId,
        matter_code: "PACKAGED-QA/LIT/CIV/RESTART",
        matter_type_english: "LIT",
        matter_litigation_axis: "CIV",
        matter_detail_type_korean: "재시작검증",
        tenant_id: tenantId,
        client_id: "client_wt_04_07_packaged",
        client_name: "패키지 QA 고객",
        title: "워크트리 패키지 재시작 QA",
        status: "open",
        created_by: account.user_id,
        created_at: at,
        updated_at: at,
        ...evidence,
      },
      {
        model_type: "MatterMember",
        member_id: "member_wt_04_07_packaged",
        matter_id: matterId,
        tenant_id: tenantId,
        user_id: account.user_id,
        role: "associate",
        status: "active",
        ...evidence,
      },
      {
        model_type: "MatterWorktree",
        worktree_id: worktreeId,
        matter_id: matterId,
        tenant_id: tenantId,
        status: "active",
        version: 1,
        created_by: account.user_id,
        created_at: at,
        updated_by: account.user_id,
        updated_at: at,
        ...evidence,
      },
      {
        model_type: "MatterTask",
        task_id: taskId,
        matter_id: matterId,
        tenant_id: tenantId,
        title: taskTitle,
        status: "todo",
        assigned_to: account.user_id,
        created_by: account.user_id,
        created_at: at,
        updated_at: at,
        ...evidence,
      },
      {
        model_type: "MatterWorktreeNode",
        node_id: "node_wt_04_07_packaged",
        worktree_id: worktreeId,
        matter_id: matterId,
        tenant_id: tenantId,
        node_type: "task",
        parent_node_id: null,
        title: taskTitle,
        sort_order: 0,
        status: "active",
        task_id: taskId,
        ...evidence,
      },
    ],
  });
  repository.close();
}

async function launchPackagedApp() {
  const app = await electron.launch({
    executablePath,
    args: ["--disable-gpu"],
    env: {
      ...packagedQaEnvironment,
      MATTER_DESKTOP_LOCAL_API_DISABLED: "0",
      MATTER_DESKTOP_RUNTIME_STORE_DIR: runtimeStoreDir,
      MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
    },
    timeout: 45_000,
  });
  const page = await app.firstWindow({ timeout: 45_000 });
  const window = await app.browserWindow(page);
  await window.evaluate((target) => target.setBounds({ x: 60, y: 30, width: 1440, height: 960 }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({ content: ".forest-sidebar-user { visibility: hidden !important; }" });
  assert.match(page.url(), /apps\/desktop\/dist\/mac\/matter\.app\/Contents\/Resources\/app\/src\/renderer\/offline\.html$/, "QA must start from the exact repo-local Forest login renderer");
  assert.match(await page.evaluate(() => window.matterSession?.desktopApiBaseUrl ?? ""), /^http:\/\/127\.0\.0\.1:\d+$/, "QA must use the packaged isolated local API");

  if (await page.locator('[data-login-screen="forest-split"]').count()) {
    await page.fill("[data-login-email]", account.email);
    await page.fill("[data-login-password]", account.local_dev.synthetic_token);
    await page.click('[data-login-form="email-password"] button[type="submit"]');
  }
  await page.waitForSelector('[data-product-axis-nav="top-header"]', { timeout: 45_000 });
  assert.match(page.url(), /apps\/desktop\/dist\/mac\/matter\.app\/Contents\/Resources\/app\/src\/renderer\/web\/index\.html/, "QA must hand off to the exact repo-local packaged product renderer");
  return { app, page };
}

async function openSeededWorktree(page) {
  await page.locator('[data-product-axis="matters"]').click();
  await page.locator('[data-context-sidebar="matters"]').waitFor({ state: "visible" });
  const workManagement = page.locator('.sidebar-group-toggle', { hasText: "업무 관리" }).first();
  if ((await workManagement.getAttribute("aria-expanded")) !== "true") await workManagement.click();
  await page.locator('[data-sidebar-section="matter-worktree"]').click();
  await page.locator('.matter-worktree').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('.matter-worktree-selector select').selectOption(matterId);
  const checkbox = page.getByRole("checkbox", { name: `${taskTitle} 완료` });
  await checkbox.waitFor({ state: "visible", timeout: 30_000 });
  return checkbox;
}

async function run() {
  seedIsolatedStore();
  let firstApp;
  let secondApp;
  let firstRuntimeBaseUrl;
  let secondRuntimeBaseUrl;
  let worktreePracticeTypography;
  try {
    ({ app: firstApp } = await launchPackagedApp().then(async ({ app, page }) => {
      firstRuntimeBaseUrl = await page.evaluate(() => window.matterSession.desktopApiBaseUrl);
      const checkbox = await openSeededWorktree(page);
      assert.equal(await checkbox.isChecked(), false, "seeded task must start incomplete");
      await checkbox.click();
      await assert.doesNotReject(() => checkbox.waitFor({ state: "visible" }));
      await page.waitForFunction((label) => document.querySelector(`input[aria-label="${label}"]`)?.checked === true, `${taskTitle} 완료`, { timeout: 30_000 });
      assert.match(await page.locator('.matter-worktree-progress-copy').innerText(), /1\/1 완료/, "first launch must show completed progress");
      await page.locator(".matter-worktree-stage").screenshot({ path: path.join(evidenceDir, "packaged-before-restart.png"), animations: "disabled", caret: "hide" });
      return { app };
    }));
    await firstApp.close();
    firstApp = null;

    ({ app: secondApp } = await launchPackagedApp().then(async ({ app, page }) => {
      secondRuntimeBaseUrl = await page.evaluate(() => window.matterSession.desktopApiBaseUrl);
      const checkbox = await openSeededWorktree(page);
      assert.equal(await checkbox.isChecked(), true, "completed task must remain checked after full app restart");
      assert.match(await page.locator('.matter-worktree-progress-copy').innerText(), /1\/1 완료/, "second launch must restore completed progress");
      worktreePracticeTypography = await page.locator('.matter-worktree-practice-areas button').evaluateAll((buttons) => ({
        labels: buttons.map((button) => button.textContent.trim()),
        font_sizes: buttons.map((button) => getComputedStyle(button).fontSize),
      }));
      assert.deepEqual(worktreePracticeTypography, {
        labels: ["송무", "기업 자문", "분쟁", "트랜잭션"],
        font_sizes: ["16px", "16px", "16px", "16px"],
      });
      return { app };
    }));
    await secondApp.close();
    secondApp = null;

    const repository = createMatterRepository({ filePath: matterStorePath });
    const persistedTask = repository.get({ tenant_id: tenantId, model_type: "MatterTask", id: taskId });
    const auditCount = repository.listAudit({ tenant_id: tenantId, object_id: taskId }).length;
    repository.close();
    assert.equal(persistedTask?.status, "done", "MatterTask must remain the persisted completion source");
    assert.equal(auditCount, 1, "one UI completion must produce one durable audit event");
    assert.notEqual(firstRuntimeBaseUrl, secondRuntimeBaseUrl, "full app restart must create a fresh local API process");

    const receipt = {
      schema_version: "law-firm-os.matter-worktree.packaged-restart-qa.v1",
      generated_at: new Date().toISOString(),
      status: "passed",
      exact_bundle: "apps/desktop/dist/mac/matter.app",
      exact_executable: "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter",
      executable_sha256: sha256File(executablePath),
      app_content_sha256: sha256Directory(appContentPath),
      renderer_sha256: sha256Directory(rendererPath),
      zip_sha256: sha256File(zipPath),
      dmg_sha256: sha256File(dmgPath),
      app_launch_count: 2,
      local_api_port_changed: firstRuntimeBaseUrl !== secondRuntimeBaseUrl,
      task_state_before_write: "todo",
      task_state_after_first_launch: "done",
      task_state_after_restart: persistedTask.status,
      restored_progress: "1/1",
      worktree_practice_typography: worktreePracticeTypography,
      durable_audit_event_count: auditCount,
      matter_task_is_completion_source: true,
      isolated_runtime_store: true,
      credential_material_recorded: false,
      real_client_data_used: false,
      employee_pii_recorded: false,
      public_release: false,
      aws_deployment: false,
      production_go_live: false,
      screenshots: [
        "workbook/matter-worktree-evidence/WT-04-07/packaged-before-restart.png",
      ],
    };
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ verdict: "PASS", receipt: path.relative(repoRoot, receiptPath), app_launch_count: 2, restored_progress: "1/1" }, null, 2));
  } finally {
    await firstApp?.close().catch(() => {});
    await secondApp?.close().catch(() => {});
    if (existsSync(matterStorePath)) {
      const storeStat = statSync(matterStorePath);
      assert.ok(storeStat.size > 0, "isolated matter store must contain durable records");
    }
    rmSync(userDataPath, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
