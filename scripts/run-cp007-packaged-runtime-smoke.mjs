#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_BUILD_SHA = process.env.CP007_EXPECTED_BUILD_SHA
  ?? "0e72dd1335c8e996388de16fbd8be441618330ed";
const CANONICAL_TENANT = "tenant_amic_matter_vault";
const ACTOR = "user_amic_jwsuh";
const DISPLAY_NAME = "서지원";
const APP_BUNDLE = path.join(ROOT, "apps/desktop/dist/mac/matter.app");
const EXECUTABLE = path.join(APP_BUNDLE, "Contents/MacOS/matter");
const PACKAGED_APP_ROOT = path.join(APP_BUNDLE, "Contents/Resources/app");
const RENDERER_INDEX = path.join(PACKAGED_APP_ROOT, "src/renderer/web/index.html");
const MAC_SEED = path.join(PACKAGED_APP_ROOT, "runtime/apps/api/src/matter-vault-user-registration-seed.json");
const desktopPackage = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8"));
const WINDOWS_PACKAGE_ROOT = path.join(
  ROOT,
  `apps/desktop/dist/win/matter-internal-${desktopPackage.version}-win32-x64`,
);
const WINDOWS_SEED = path.join(
  WINDOWS_PACKAGE_ROOT,
  "resources/app/runtime/apps/api/src/matter-vault-user-registration-seed.json",
);
const EVIDENCE_DIR = path.join(ROOT, "workbook/forest-v0.1.17-integration-evidence/CP-007");
const RECEIPT_PATH = path.join(EVIDENCE_DIR, "packaged-runtime-smoke.json");
const ARTIFACT_DIR = path.resolve(
  process.env.CP007_SCREENSHOT_DIR ?? path.join(ROOT, "output/playwright/cp007-packaged-runtime"),
);
const SCREENSHOT_PATH = path.join(ARTIFACT_DIR, "signed-in-home.png");
const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-cp007-runtime-"));
const runtimeStoreDir = path.join(userDataPath, "runtime-stores");
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readAccount(seedPath) {
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const account = seed.users.find((user) => user.user_id === ACTOR);
  assert.ok(account, `${ACTOR} must exist in ${path.relative(ROOT, seedPath)}`);
  assert.equal(seed.tenant_id, CANONICAL_TENANT);
  assert.equal(account.email, "jwsuh@amic.kr");
  assert.equal(account.display_name, DISPLAY_NAME);
  assert.deepEqual(account.tenant_memberships.map((membership) => membership.tenant_id), [CANONICAL_TENANT]);
  assert.ok(account.local_dev?.synthetic_token, "internal package account must have a QA-only login fixture");
  return account;
}

function sanitizedEnvironment() {
  return Object.fromEntries(Object.entries(process.env).filter(([name]) => (
    !name.startsWith("LAWOS_")
    && !name.startsWith("MATTER_DESKTOP_")
    && !name.startsWith("MATTER_VAULT_R4_")
    && !["MATTER_R4_OPERATOR_TOKEN", "MATTER_OPERATOR_TOKEN"].includes(name)
  )));
}

async function findProductPage(app) {
  await app.firstWindow({ timeout: 45_000 });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    for (const candidate of app.windows()) {
      const ready = await candidate.locator(
        "[data-login-form='email-password'], [data-product-axis-nav]",
      ).count().catch(() => 0);
      if (ready) return candidate;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const diagnostics = await Promise.all(app.windows().map(async (candidate) => ({
    url: candidate.url(),
    title: await candidate.title().catch(() => ""),
    body: (await candidate.textContent("body").catch(() => ""))?.slice(0, 240),
  })));
  throw new Error(`Packaged product window did not become ready: ${JSON.stringify(diagnostics)}`);
}

assert.equal(sourceRevision, EXPECTED_BUILD_SHA, "CP-007 smoke must execute the exact package build SHA");
for (const requiredPath of [EXECUTABLE, RENDERER_INDEX, MAC_SEED, WINDOWS_SEED]) {
  assert.equal(existsSync(requiredPath), true, `required packaged file is missing: ${requiredPath}`);
}

const macAccount = readAccount(MAC_SEED);
const windowsAccount = readAccount(WINDOWS_SEED);
assert.deepEqual(
  {
    user_id: windowsAccount.user_id,
    email: windowsAccount.email,
    display_name: windowsAccount.display_name,
    tenant_ids: windowsAccount.tenant_memberships.map((membership) => membership.tenant_id),
  },
  {
    user_id: macAccount.user_id,
    email: macAccount.email,
    display_name: macAccount.display_name,
    tenant_ids: macAccount.tenant_memberships.map((membership) => membership.tenant_id),
  },
  "Mac and Windows packaged account projections must match",
);

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(path.join(userDataPath, "fixture-only.env"), "", "utf8");

let app;
const pageErrors = [];
const consoleErrors = [];
try {
  app = await electron.launch({
    executablePath: EXECUTABLE,
    args: ["--disable-gpu"],
    env: {
      ...sanitizedEnvironment(),
      MATTER_DESKTOP_USER_DATA_PATH: userDataPath,
      MATTER_DESKTOP_RUNTIME_STORE_DIR: runtimeStoreDir,
      MATTER_DESKTOP_LOCAL_API_ENABLED: "1",
      MATTER_DESKTOP_ENV_FILE: path.join(userDataPath, "fixture-only.env"),
      MATTER_DESKTOP_OPERATOR_TOKEN: "",
      MATTER_VAULT_R4_OPERATOR_TOKEN: "",
      MATTER_R4_OPERATOR_TOKEN: "",
      MATTER_OPERATOR_TOKEN: "",
    },
    timeout: 45_000,
  });

  const page = await findProductPage(app);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const initialUrl = new URL(page.url());
  assert.equal(path.resolve(fileURLToPath(initialUrl)), path.resolve(RENDERER_INDEX));
  const runtime = await page.evaluate(async () => ({
    endpoint: window.matterSession?.desktopApiBaseUrl ?? null,
    status: await window.matterSession?.runtime?.(),
    session: await window.matterSession?.status?.(),
  }));
  assert.match(runtime.endpoint, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.equal(runtime.session?.state, "signed_out");
  const health = await fetch(`${runtime.endpoint}/api/health`).then(async (response) => ({
    status: response.status,
    body: await response.json(),
  }));
  assert.equal(health.status, 200);

  await page.locator("[data-login-email]").fill(macAccount.email);
  await page.locator("[data-login-password]").fill(macAccount.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForFunction(
    () => new URL(window.location.href).searchParams.get("view") === "home",
    null,
    { timeout: 20_000 },
  );
  await page.locator("[data-product-axis-nav]").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".post-login-splash").waitFor({ state: "detached", timeout: 10_000 });

  const proof = await page.evaluate(async () => {
    const session = await window.matterSession?.status?.();
    const envelopeText = window.sessionStorage.getItem("lawos.session.envelope");
    const envelope = envelopeText ? JSON.parse(envelopeText) : null;
    const profile = await window.matterSession?.api?.({
      path: "/api/profile/me?permission_ref=cp007_packaged_runtime&audit_hint_ref=cp007_packaged_runtime",
      method: "GET",
    });
    return {
      url: window.location.href,
      session,
      envelope,
      profile: {
        status: Number(profile?.http_status ?? profile?.status ?? 0),
        outcome: profile?.body?.outcome ?? null,
        actor_ref: profile?.body?.item?.actor_ref ?? null,
        tenant_ref: profile?.body?.item?.tenant_ref ?? null,
        display_name: profile?.body?.item?.display_name ?? null,
        employee_id: profile?.body?.item?.employee_id ?? null,
      },
    };
  });

  assert.equal(proof.session?.state, "signed_in");
  assert.equal(proof.session?.user_id, ACTOR);
  assert.equal(proof.session?.tenant_id, CANONICAL_TENANT);
  assert.equal(proof.session?.display_name, DISPLAY_NAME);
  assert.equal(proof.envelope?.actor_ref, ACTOR);
  assert.ok(proof.envelope?.tenant_refs, "product renderer must persist the desktop tenant handoff");
  assert.ok(Object.values(proof.envelope.tenant_refs).length >= 5);
  assert.ok(Object.values(proof.envelope.tenant_refs).every((tenantRef) => tenantRef === CANONICAL_TENANT));
  assert.equal(JSON.stringify(proof.envelope).includes("synthetic"), false);
  assert.deepEqual(proof.profile, {
    status: 200,
    outcome: "passed",
    actor_ref: ACTOR,
    tenant_ref: CANONICAL_TENANT,
    display_name: DISPLAY_NAME,
    employee_id: "emp_amic_jwsuh",
  });

  await page.screenshot({
    path: SCREENSHOT_PATH,
    fullPage: false,
    animations: "disabled",
    caret: "hide",
  });
  const unexpectedConsoleErrors = consoleErrors.filter((message) => (
    !message.includes("WebSocket") && !message.includes("24678")
  ));
  assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors));
  assert.equal(unexpectedConsoleErrors.length, 0, JSON.stringify(unexpectedConsoleErrors));

  const receipt = {
    schema_version: "law-firm-os.cp007-packaged-runtime-smoke.v1",
    generated_at: new Date().toISOString(),
    verdict: "PASS",
    exact_build_sha: sourceRevision,
    package_channel: "internal",
    macos: {
      bundle: path.relative(ROOT, APP_BUNDLE),
      executable: path.relative(ROOT, EXECUTABLE),
      executable_sha256: sha256File(EXECUTABLE),
      renderer_path: path.relative(ROOT, RENDERER_INDEX),
      native_runtime_smoke: "PASS",
    },
    runtime: {
      endpoint_kind: "loopback_ephemeral",
      local_api_default_start: false,
      local_api_explicit_opt_in: true,
      health_status: health.status,
      runtime_configured: runtime.status?.configured === true,
      trusted_ipc_profile_status: proof.profile.status,
      packaged_runtime_entry_present: existsSync(path.join(PACKAGED_APP_ROOT, "runtime/apps/api/src/server.js")),
    },
    identity: {
      user_id: proof.session.user_id,
      employee_id: proof.profile.employee_id,
      display_name: proof.profile.display_name,
      canonical_tenant: proof.session.tenant_id,
      mac_windows_seed_projection_equal: true,
    },
    handoff: {
      envelope_present: true,
      tenant_ref_count: Object.keys(proof.envelope.tenant_refs).length,
      all_tenant_refs_canonical: true,
      canonical_tenant_fallback_count: 0,
      synthetic_tenant_ref_count: 0,
    },
    diagnostics: {
      page_error_count: pageErrors.length,
      console_error_count: unexpectedConsoleErrors.length,
    },
    screenshot: {
      path: path.relative(ROOT, SCREENSHOT_PATH),
      sha256: sha256File(SCREENSHOT_PATH),
    },
    boundaries: {
      synthetic_auth_fixture: true,
      synthetic_tenant_fallback: false,
      real_employee_write: false,
      formal_macos_release: false,
      native_windows_runtime: false,
      public_release: false,
      production_go_live: false,
    },
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    verdict: receipt.verdict,
    exact_build_sha: receipt.exact_build_sha,
    receipt: path.relative(ROOT, RECEIPT_PATH),
    screenshot: receipt.screenshot.path,
    canonical_tenant_fallback_count: 0,
  }, null, 2)}\n`);
} finally {
  if (app) await app.close().catch(() => {});
  rmSync(userDataPath, { recursive: true, force: true });
}
