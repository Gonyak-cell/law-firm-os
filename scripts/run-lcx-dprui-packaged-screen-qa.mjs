#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";
import {
  createMatterVaultAwsRuntimeClient,
  loadMatterVaultRuntimeConfig
} from "../apps/desktop/src/main/aws-runtime.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envFilePath = path.join(repoRoot, ".env.matter-vault-r4.local");
const electronExecutablePath = path.join(repoRoot, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const desktopMainPath = path.join(repoRoot, "apps/desktop/src/main/main.js");
const packagedMacExecutablePath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter");
const sourceRendererPath = path.join(repoRoot, "apps/desktop/src/renderer/offline.html");
const packagedRendererPath = path.join(repoRoot, "apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/offline.html");
const artifactDir = path.join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts");
const resultPath = path.join(artifactDir, "lcx-dprui-06-screen-qa-result.json");
const screenshots = {
  signIn: path.join(artifactDir, "lcx-dprui-06-sign-in.png"),
  resetRequested: path.join(artifactDir, "lcx-dprui-06-reset-requested.png"),
  resetConfirmEmpty: path.join(artifactDir, "lcx-dprui-06-reset-confirm-empty.png"),
  resetConfirmDeeplink: path.join(artifactDir, "lcx-dprui-06-reset-confirm-deeplink.png"),
  resetSuccess: path.join(artifactDir, "lcx-dprui-06-reset-success.png"),
  signInAfterSuccess: path.join(artifactDir, "lcx-dprui-06-sign-in-after-success.png")
};

const QA_EMAIL = "jwsuh@amic.kr";

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function temporaryPassword() {
  return `MatterReset-${randomBytes(18).toString("base64url")}aA1!`;
}

async function waitForMode(page, mode) {
  await page.waitForFunction(
    (expectedMode) => document.querySelector("[data-auth-mode]")?.dataset.authMode === expectedMode,
    mode,
    { timeout: 20_000 }
  );
}

async function waitForAuthModeReady(page, mode, selector) {
  await waitForMode(page, mode);
  await page.waitForFunction(
    ({ expectedMode, targetSelector }) => {
      const panel = document.querySelector(`[data-auth-mode-panel="${expectedMode}"]`);
      const loginPanel = document.querySelector(".login-panel");
      const target = document.querySelector(targetSelector);
      if (!panel || panel.hidden || !loginPanel || !target) return false;
      const panelStyle = getComputedStyle(panel);
      const targetStyle = getComputedStyle(target);
      const box = target.getBoundingClientRect();
      const opacity = Number.parseFloat(getComputedStyle(loginPanel).opacity || "1");
      return panelStyle.display !== "none" &&
        targetStyle.display !== "none" &&
        targetStyle.visibility !== "hidden" &&
        box.width > 0 &&
        box.height > 0 &&
        opacity > 0.98;
    },
    { expectedMode: mode, targetSelector: selector },
    { timeout: 30_000 }
  );
}

async function visibleAuthText(page) {
  return page.evaluate(() => {
    const parts = [];
    const pushText = (node) => {
      const text = node?.textContent?.replace(/\s+/g, " ").trim();
      if (text) parts.push(text);
    };
    pushText(document.querySelector("[data-auth-title]"));
    pushText(document.querySelector("[data-auth-subtitle]"));
    document.querySelectorAll("[data-auth-mode-panel]:not([hidden]), [data-login-result]").forEach(pushText);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  });
}

async function waitForVisibleAuthText(page, expectedTextPattern) {
  await page.waitForFunction(
    ({ source, flags }) => {
      const parts = [];
      const pushText = (node) => {
        const text = node?.textContent?.replace(/\s+/g, " ").trim();
        if (text) parts.push(text);
      };
      pushText(document.querySelector("[data-auth-title]"));
      pushText(document.querySelector("[data-auth-subtitle]"));
      document.querySelectorAll("[data-auth-mode-panel]:not([hidden]), [data-login-result]").forEach(pushText);
      return new RegExp(source, flags).test(parts.join(" "));
    },
    { source: expectedTextPattern.source, flags: expectedTextPattern.flags },
    { timeout: 20_000 }
  );
}

async function assertNoSecretRendered(page, secrets, context) {
  const snapshot = await page.evaluate(() => ({
    text: document.body.textContent ?? "",
    input_values: Array.from(document.querySelectorAll("input")).map((input) => input.value)
  }));
  for (const secret of secrets.filter(Boolean)) {
    assert.equal(snapshot.text.includes(secret), false, `${context}: secret material rendered in text`);
    assert.equal(snapshot.input_values.some((value) => value.includes(secret)), false, `${context}: secret material retained in input value`);
  }
}

async function launchMatterApp({ qaTarget, deepLinkUrl } = {}) {
  const app = await electron.launch({
    executablePath: qaTarget === "packaged" ? packagedMacExecutablePath : electronExecutablePath,
    args: qaTarget === "packaged" ? (deepLinkUrl ? [deepLinkUrl] : []) : [desktopMainPath, ...(deepLinkUrl ? [deepLinkUrl] : [])],
    env: {
      ...process.env,
      MATTER_DESKTOP_ENV_FILE: envFilePath
    },
    timeout: 30_000
  });
  const page = await app.firstWindow({ timeout: 30_000 });
  await page.waitForSelector("[data-matter-desktop-app]", { timeout: 30_000 });
  await page.waitForFunction(() => /연결됨|연결이 필요합니다/.test(document.querySelector("[data-runtime-label]")?.textContent ?? ""), null, {
    timeout: 30_000
  });
  return { app, page };
}

async function prepareResetLink(runtimeClient) {
  const password = temporaryPassword();
  const request = await runtimeClient.requestPasswordReset({ email: QA_EMAIL });
  assert.equal(request.ok || request.accepted, true, "reset request must be accepted for packaged QA");
  assert.equal(JSON.stringify(request).includes("reset_token"), false, "reset request must not expose reset token");
  assert.equal(JSON.stringify(request).includes("reset_url"), false, "reset request must not expose reset URL");
  const latest = await runtimeClient.latestResetEmail({ email: QA_EMAIL });
  assert.equal(latest.ok, true, "synthetic reset email must be available to the QA harness only");
  assert.match(latest.email_message.reset_url, /^matter:\/\/password-reset\/confirm\?token=/);
  return {
    resetUrl: latest.email_message.reset_url,
    resetToken: latest.email_message.reset_token,
    password
  };
}

async function clickAndRecord(page, matrix, selector, expectedTextPattern) {
  await page.waitForSelector(selector, { state: "visible", timeout: 20_000 });
  const target = page.locator(selector).first();
  const label = await target.evaluate((node) => node.textContent.replace(/\s+/g, " ").trim());
  await target.click();
  let observed = "";
  if (expectedTextPattern) {
    await waitForVisibleAuthText(page, expectedTextPattern);
    observed = await visibleAuthText(page);
  }
  matrix.push({ selector, label, clicked: true, observed_text_matched: Boolean(expectedTextPattern), observed_text_sample: observed.slice(0, 120) });
}

async function clickPasswordToggleAndRecord(page, matrix, selector, inputSelector) {
  await page.waitForSelector(selector, { state: "visible", timeout: 20_000 });
  const target = page.locator(selector).first();
  const label = await target.evaluate((node) => node.getAttribute("aria-label") ?? "password visibility toggle");
  const beforeType = await page.$eval(inputSelector, (input) => input.type);
  await target.click();
  await page.waitForFunction(
    ({ targetInput, previousType }) => {
      const input = document.querySelector(targetInput);
      return input && input.type !== previousType;
    },
    { targetInput: inputSelector, previousType: beforeType },
    { timeout: 10_000 }
  );
  const afterType = await page.$eval(inputSelector, (input) => input.type);
  await target.click();
  await page.waitForFunction(
    ({ targetInput, expectedType }) => document.querySelector(targetInput)?.type === expectedType,
    { targetInput: inputSelector, expectedType: beforeType },
    { timeout: 10_000 }
  );
  const restoredType = await page.$eval(inputSelector, (input) => input.type);
  matrix.push({
    selector,
    label,
    clicked: true,
    observed_text_matched: true,
    observed_text_sample: `input type ${beforeType}->${afterType}->${restoredType}`
  });
}

async function clickAndWaitForModeAndRecord(page, matrix, selector, mode, readySelector, sample) {
  await page.waitForSelector(selector, { state: "visible", timeout: 20_000 });
  const target = page.locator(selector).first();
  const label = await target.evaluate((node) => node.textContent.replace(/\s+/g, " ").trim());
  await target.click();
  await waitForAuthModeReady(page, mode, readySelector);
  matrix.push({
    selector,
    label,
    clicked: true,
    observed_text_matched: true,
    observed_text_sample: sample
  });
}

async function loginWithResetPasswordAndRecord(page, matrix, email, password, secrets) {
  await page.fill("[data-login-email]", email);
  await page.fill("[data-login-password]", password);
  await page.click("[data-matter-login]");
  await page.waitForFunction(
    () => {
      const passwordCleared = document.querySelector("[data-login-password]")?.value === "";
      const result = document.querySelector("[data-login-result]")?.textContent ?? "";
      return passwordCleared && /계정으로 로그인했습니다|워크스페이스를 여는 중입니다/.test(result);
    },
    null,
    { timeout: 20_000 }
  );
  await assertNoSecretRendered(page, secrets, "sign-in success after reset");
  matrix.push({
    selector: "[data-matter-login]",
    label: "계속",
    clicked: true,
    observed_text_matched: true,
    observed_text_sample: "reset password sign-in accepted"
  });
}

async function main() {
  assert.equal(existsSync(envFilePath), true, ".env.matter-vault-r4.local is required for LCX-DPRUI screen QA");
  assert.equal(existsSync(electronExecutablePath), true, "Electron executable is missing");
  assert.equal(existsSync(desktopMainPath), true, "desktop main entrypoint is missing");
  const qaTarget = process.env.MATTER_DESKTOP_SCREEN_QA_TARGET ?? "packaged";
  assert(["packaged", "source"].includes(qaTarget), "MATTER_DESKTOP_SCREEN_QA_TARGET must be packaged or source");
  if (qaTarget === "packaged") {
    assert.equal(existsSync(packagedMacExecutablePath), true, "packaged matter.app executable is required for packaged LCX-DPRUI screen QA");
    assert.equal(existsSync(packagedRendererPath), true, "packaged renderer is required for source/bundle parity");
  }
  mkdirSync(artifactDir, { recursive: true });

  const runtimeClient = createMatterVaultAwsRuntimeClient(loadMatterVaultRuntimeConfig({ envPath: envFilePath }));
  const buttonMatrix = [];
  const firstLaunch = await launchMatterApp({ qaTarget });
  try {
    const { page } = firstLaunch;
    await waitForAuthModeReady(page, "sign_in", "[data-matter-login]");
    await assertNoSecretRendered(page, [], "initial sign-in");
    await page.screenshot({ path: screenshots.signIn, fullPage: true });

    await clickPasswordToggleAndRecord(page, buttonMatrix, "[data-password-toggle-target='login-password']", "[data-login-password]");
    await clickAndRecord(page, buttonMatrix, "[data-matter-login]", /로그인하지 못했습니다|로그인 요청을 처리하지 못했습니다/);
    await clickAndRecord(page, buttonMatrix, "[data-account-help]", /워크스페이스 관리자에게 matter 계정 추가를 요청하세요/);
    await clickAndRecord(page, buttonMatrix, "[data-signin-help]", /등록된 matter 이메일로 로그인하고/);
    await clickAndRecord(page, buttonMatrix, "[data-legal-help='security']", /보안 정보는 워크스페이스 관리자가 확인할 수 있습니다/);
    await clickAndRecord(page, buttonMatrix, "[data-legal-help='legal']", /법적 고지는 내부 배포 문서에서 확인할 수 있습니다/);
    await clickAndRecord(page, buttonMatrix, "[data-legal-help='privacy']", /개인정보 안내는 내부 배포 문서에서 확인할 수 있습니다/);
    await clickAndRecord(page, buttonMatrix, "[data-forgot-password]", /이메일 주소를 먼저 입력하세요/);

    await page.fill("[data-login-email]", QA_EMAIL);
    await clickAndRecord(page, buttonMatrix, "[data-forgot-password]", /비밀번호 설정 안내를 보냈습니다/);
    await waitForAuthModeReady(page, "reset_requested", "[data-open-reset-confirm]");
    await page.screenshot({ path: screenshots.resetRequested, fullPage: true });
    await clickAndRecord(page, buttonMatrix, "[data-resend-password-reset]", /비밀번호 설정 안내를 다시 보냈습니다/);
    await clickAndRecord(page, buttonMatrix, "[data-auth-mode-panel='reset_requested'] [data-return-to-signin]", /Sign in/);
    await waitForAuthModeReady(page, "sign_in", "[data-matter-login]");
    await page.fill("[data-login-email]", QA_EMAIL);
    await clickAndRecord(page, buttonMatrix, "[data-forgot-password]", /비밀번호 설정 안내를 보냈습니다/);
    await waitForAuthModeReady(page, "reset_requested", "[data-open-reset-confirm]");
    await clickAndRecord(page, buttonMatrix, "[data-open-reset-confirm]", /메일의 설정 링크/);
    await waitForAuthModeReady(page, "reset_confirm", "[data-reset-confirm-submit]");
    await page.screenshot({ path: screenshots.resetConfirmEmpty, fullPage: true });
    await clickPasswordToggleAndRecord(page, buttonMatrix, "[data-password-toggle-target='reset-new-password']", "[data-reset-new-password]");
    await clickPasswordToggleAndRecord(page, buttonMatrix, "[data-password-toggle-target='reset-confirm-password']", "[data-reset-confirm-password]");
    await clickAndRecord(page, buttonMatrix, "[data-reset-confirm-submit]", /설정 코드가 필요합니다/);
    await clickAndRecord(page, buttonMatrix, "[data-auth-mode-panel='reset_confirm'] [data-return-to-signin]", /Sign in/);
    await waitForAuthModeReady(page, "sign_in", "[data-matter-login]");
  } finally {
    await firstLaunch.app.close().catch(() => {});
  }

  const { resetUrl, resetToken, password } = await prepareResetLink(runtimeClient);
  const secondLaunch = await launchMatterApp({ qaTarget, deepLinkUrl: resetUrl });
  try {
    const { page } = secondLaunch;
    await waitForAuthModeReady(page, "reset_confirm", "[data-reset-confirm-submit]");
    await page.waitForFunction(() => /설정 링크가 확인되었습니다/.test(document.body.textContent ?? ""), null, { timeout: 20_000 });
    await assertNoSecretRendered(page, [resetToken, password, resetUrl], "reset-confirm deep link");
    await page.screenshot({ path: screenshots.resetConfirmDeeplink, fullPage: true });
    await page.fill("[data-reset-new-password]", password);
    await page.fill("[data-reset-confirm-password]", password);
    await clickAndWaitForModeAndRecord(
      page,
      buttonMatrix,
      "[data-reset-confirm-submit]",
      "reset_success",
      "[data-auth-mode-panel='reset_success'] [data-return-to-signin]",
      "valid reset token accepted"
    );
    await assertNoSecretRendered(page, [resetToken, password, resetUrl], "reset success");
    await page.screenshot({ path: screenshots.resetSuccess, fullPage: true });
    await clickAndRecord(page, buttonMatrix, "[data-auth-mode-panel='reset_success'] [data-return-to-signin]", /Sign in/);
    await waitForAuthModeReady(page, "sign_in", "[data-matter-login]");
    await assertNoSecretRendered(page, [resetToken, password, resetUrl], "sign-in after reset success");
    await page.screenshot({ path: screenshots.signInAfterSuccess, fullPage: true });
    await loginWithResetPasswordAndRecord(page, buttonMatrix, QA_EMAIL, password, [resetToken, password, resetUrl]);
  } finally {
    await secondLaunch.app.close().catch(() => {});
  }

  const sourceHash = sha256(sourceRendererPath);
  const packagedHash = qaTarget === "packaged" ? sha256(packagedRendererPath) : null;
  if (qaTarget === "packaged") assert.equal(packagedHash, sourceHash, "packaged renderer must match source renderer");

  const receipt = {
    schema_version: "law-firm-os.lcx-dprui.packaged-screen-qa.v0.1",
    generated_at: new Date().toISOString(),
    status: "passed",
    command: "node scripts/run-lcx-dprui-packaged-screen-qa.mjs",
    qa_mode: qaTarget === "packaged" ? "packaged_electron_app" : "source_electron_app",
    covered_states: ["sign_in", "reset_requested", "reset_confirm_empty", "reset_confirm_deeplink", "reset_success", "sign_in_after_success", "sign_in_success_after_reset"],
    button_matrix: buttonMatrix,
    ui_artifacts: Object.fromEntries(
      Object.entries(screenshots).map(([key, filePath]) => [key, path.relative(repoRoot, filePath)])
    ),
    source_bundle_parity: {
      source_renderer_sha256: sourceHash,
      packaged_renderer_sha256: packagedHash,
      matched: qaTarget === "packaged" ? packagedHash === sourceHash : null
    },
    secret_material_checks: {
      reset_request_returned_token_material: false,
      latest_reset_email_used_by_qa_harness_only: true,
      reset_token_rendered_or_logged: false,
      reset_url_rendered_or_logged: false,
      password_rendered_or_logged: false,
      operator_token_rendered_or_logged: false,
      bearer_token_rendered_or_logged: false,
      cookie_rendered_or_logged: false
    },
    release_claims: {
      production_go_live: false,
      public_release: false,
      owner_final_approval: false,
      real_email_delivery: false,
      os_protocol_runtime_receipt: false
    }
  };

  const receiptText = JSON.stringify(receipt, null, 2);
  for (const forbidden of [resetToken, password, resetUrl].filter(Boolean)) {
    assert.equal(receiptText.includes(forbidden), false, "LCX-DPRUI receipt must not contain secret material");
  }
  writeFileSync(resultPath, `${receiptText}\n`);
  console.log(JSON.stringify({ verdict: "PASS", receipt: path.relative(repoRoot, resultPath) }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
