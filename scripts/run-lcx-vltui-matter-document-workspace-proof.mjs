#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-matter-document-workspace-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-matter-document-workspace-proof.md`;
const MATTER_ID = "matter_lcx_vltui_alpha";
const DRAFT_ID = "builder_draft_lcx_vltui_alpha";
const EMAIL_DRAFT_ID = "email_draft_lcx_vltui_alpha";

const genericCollectionBody = {
  request_id: "lcx-vltui-03-generic-collection",
  outcome: "passed",
  items: [],
  page_info: { limit: 25, has_more: false },
  safe_error_codes: [],
  audit_hint_ref: "ui_lcx_vltui_03_generic_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const genericItemBody = {
  request_id: "lcx-vltui-03-generic-item",
  outcome: "passed",
  item: null,
  safe_error_codes: [],
  audit_hint_ref: "ui_lcx_vltui_03_generic_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const mattersBody = {
  ...genericCollectionBody,
  request_id: "lcx-vltui-03-matters",
  items: [
    {
      matter_id: MATTER_ID,
      matter_code: "SyntheticAlpha/Civil/Contract",
      matter_name: "Synthetic Alpha Contract",
      title: "Synthetic Alpha Contract",
      status: "active",
      phase: "document_review",
      client_id: "client_lcx_vltui_alpha",
      client_display_name: "Synthetic Alpha Client",
      owner_display_name: "Matter Owner"
    }
  ]
};

const vaultSummaryBody = {
  request_id: "lcx-vltui-03-vault-summary",
  outcome: "passed",
  item: {
    matter_id: MATTER_ID,
    matter_code: "SyntheticAlpha/Civil/Contract",
    matter_name: "Synthetic Alpha Contract",
    client_display_name: "Synthetic Alpha Client",
    document_count: 1,
    workspace_id: "vault_workspace_lcx_vltui_alpha",
    registered_account_email: "records@example.invalid"
  },
  safe_error_codes: [],
  audit_hint_ref: "ui_mv_matter_vault_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const timelineBody = {
  request_id: "lcx-vltui-03-timeline",
  outcome: "passed",
  item: {
    visible_entries: [
      {
        type: "document",
        title: "Vault boundary review",
        source_ref: "matter_runtime_context"
      }
    ]
  },
  safe_error_codes: [],
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const vaultDocumentsBody = {
  ...genericCollectionBody,
  request_id: "lcx-vltui-03-vault-documents",
  items: [
    {
      document_id: "doc_lcx_vltui_alpha",
      matter_id: MATTER_ID,
      title: "Synthetic Alpha Contract",
      status: "active",
      registered_account_email: "records@example.invalid",
      storage_pointer_ref_included: false,
      document_bytes_included: false
    }
  ]
};

const vaultSearchBody = {
  ...genericCollectionBody,
  request_id: "lcx-vltui-03-vault-search",
  items: [
    {
      document_id: "doc_lcx_vltui_alpha",
      matter_id: MATTER_ID,
      version_id: "version_lcx_vltui_alpha_current",
      indexed_fields: ["title", "matter_code"],
      storage_pointer_ref_included: false,
      raw_text_included: false
    }
  ]
};

const vaultAuditBody = {
  ...genericCollectionBody,
  request_id: "lcx-vltui-03-vault-audit",
  items: [
    {
      action: "permission_check",
      object_type: "matter_document",
      decision: "recorded"
    }
  ]
};

const templatesBody = {
  ...genericCollectionBody,
  request_id: "lcx-vltui-03-document-templates",
  items: [
    {
      template_id: "engagement_draft",
      label: "위임계약서 초안",
      category: "document",
      merge_field_count: 6,
      requires_approval: true
    },
    {
      template_id: "matter_status_update_email",
      label: "진행상황 안내 메일",
      category: "email",
      merge_field_count: 4,
      requires_approval: false
    }
  ]
};

const approvalRequestsBody = {
  ...genericCollectionBody,
  request_id: "lcx-vltui-03-approval-requests",
  items: [
    {
      request_id: "approval_request_lcx_vltui_alpha",
      draft_id: DRAFT_ID,
      status: "pending_owner_approval",
      reviewer_user_ref_included: false
    }
  ]
};

const bridgeStatusBody = {
  request_id: "lcx-vltui-03-bridge-ready",
  outcome: "passed",
  item: {
    source_mode: "matter_app_api",
    client_upsert_path: "/api/matters/vault-bridge/clients/upsert",
    matter_upsert_path: "/api/matters/vault-bridge/matters/upsert",
    runtime_write_ready: true,
    repository_durable: true
  },
  safe_error_codes: [],
  state_idempotent: true,
  count_leak_prevented: true,
  production_ready_claim: false
};

const passedPreflightBody = {
  request_id: "lcx-vltui-03-upload-preflight-pass",
  outcome: "preflight_passed",
  item: {
    preflight_ref: "vault-preflight:matter_lcx_vltui_alpha:document-workspace",
    selected_matter_ref: `matter:${MATTER_ID}`,
    matter_id: MATTER_ID,
    matter_code: "SyntheticAlpha/Civil/Contract",
    matter_name: "Synthetic Alpha Contract",
    client_id: "client_lcx_vltui_alpha",
    client_display_name: "Synthetic Alpha Client",
    action: "upload_preflight",
    allowed_next_step: "permission_check_only",
    source_mode: "matter_app_api",
    permission_checked: true,
    ethical_wall_clear: true,
    lifecycle_eligible: true,
    vault_document_write_enabled: false,
    production_ready_claim: false
  },
  safe_error_codes: [],
  audit_hint_ref: "ui_cmp_g5_vault_probe",
  ui_state: "preflight_passed",
  state_idempotent: true,
  count_leak_prevented: true,
  vault_document_write_enabled: false,
  production_ready_claim: false
};

const builderDraftBody = {
  request_id: "lcx-vltui-03-builder-draft",
  outcome: "created",
  item: {
    draft_id: DRAFT_ID,
    matter_id: MATTER_ID,
    template_id: "engagement_draft",
    title: "위임계약서 초안",
    status: "draft",
    body_included: false,
    raw_source_included: false
  },
  audit_event: { audit_event_ref: "audit:builder-draft:create" },
  safe_error_codes: [],
  audit_hint_ref: "ui_sf_b_w04_builder_draft_create_probe",
  state_idempotent: true,
  production_ready_claim: false
};

const builderPatchBody = {
  ...builderDraftBody,
  request_id: "lcx-vltui-03-builder-patch",
  outcome: "updated",
  item: {
    ...builderDraftBody.item,
    status: "review_ready"
  },
  audit_event: { audit_event_ref: "audit:builder-draft:patch" }
};

const builderPreviewBody = {
  request_id: "lcx-vltui-03-builder-preview",
  outcome: "passed",
  item: {
    draft_id: DRAFT_ID,
    title: "위임계약서 초안",
    preview_sections: ["요약", "승인", "Vault 경계"],
    body_included: false,
    raw_text_included: false
  },
  safe_error_codes: [],
  audit_hint_ref: "ui_sf_b_w04_builder_preview_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const approvalRequestBody = {
  request_id: "lcx-vltui-03-builder-approval",
  outcome: "approval_required",
  item: {
    request_id: "approval_request_lcx_vltui_alpha",
    draft_id: DRAFT_ID,
    status: "pending_owner_approval",
    reviewer_user_ref_included: false
  },
  approval_request: {
    request_id: "approval_request_lcx_vltui_alpha",
    status: "pending_owner_approval",
    reviewer_user_ref_included: false
  },
  safe_error_codes: [],
  audit_hint_ref: "ui_sf_b_w04_builder_approval_request_probe",
  production_ready_claim: false
};

const publishBlockedBody = {
  request_id: "lcx-vltui-03-builder-publish",
  outcome: "owner_blocked",
  ui_state: "owner_blocked",
  item: null,
  publish_state: {
    publish_envelope_ref: "vault-publish-envelope:matter_lcx_vltui_alpha:builder_draft",
    audit_event_ref: "audit:builder-publish:owner-blocked",
    vault_document_created: false,
    document_bytes_included: false,
    storage_pointer_ref_included: false
  },
  safe_error_codes: ["OWNER_APPROVAL_REQUIRED"],
  audit_hint_ref: "ui_sf_b_w04_builder_publish_probe",
  state_idempotent: true,
  production_ready_claim: false
};

const emailDraftBody = {
  request_id: "lcx-vltui-03-email-draft",
  outcome: "created",
  item: {
    draft_id: EMAIL_DRAFT_ID,
    matter_id: MATTER_ID,
    template_id: "matter_status_update_email",
    subject_included: true,
    body_included: false,
    recipient_refs_included: false,
    status: "draft"
  },
  audit_event: { audit_event_ref: "audit:email-draft:create" },
  safe_error_codes: [],
  audit_hint_ref: "ui_sf_b_w04_email_draft_create_probe",
  state_idempotent: true,
  production_ready_claim: false
};

const emailPatchBody = {
  ...emailDraftBody,
  request_id: "lcx-vltui-03-email-patch",
  outcome: "updated",
  item: {
    ...emailDraftBody.item,
    status: "review_ready"
  },
  audit_event: { audit_event_ref: "audit:email-draft:patch" }
};

const emailSendBlockedBody = {
  request_id: "lcx-vltui-03-email-send",
  outcome: "provider_blocked",
  ui_state: "provider_blocked",
  item: null,
  provider_state: {
    provider: "outlook_graph",
    connected: false,
    external_send_executed: false
  },
  safe_error_codes: ["OUTLOOK_GRAPH_PROVIDER_NOT_CONNECTED"],
  audit_hint_ref: "ui_sf_b_w04_email_send_boundary_probe",
  state_idempotent: true,
  production_ready_claim: false
};

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function screenshotPath(id) {
  return `${SCREENSHOT_DIR}/lcx-vltui-03-${id}.png`;
}

function forbiddenText(text) {
  return /(LAWOS_VAULT_BRIDGE_TOKEN|MATTER_APP_API_TOKEN|Bearer\s+|sk-[A-Za-z0-9]|document_bytes|storage_pointer|production_ready_claim|raw_source|raw_text|업로드 완료|전송 완료|go_live|public_release|owner_final_approval)/i.test(text);
}

function renderMarkdown(report) {
  const lines = [
    "# LCX-VLTUI-03.01~03.05 Matter Document Workspace Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "| Case | Preflight | Publish Gate Before Preflight | Publish Calls | Email Send Calls | Unexpected Writes | Passed | Screenshot |",
    "| --- | --- | --- | ---: | ---: | ---: | --- | --- |"
  ];
  for (const item of report.cases) {
    lines.push(`| ${item.id} | ${item.preflight_state} | ${item.publish_before_preflight.state}/${item.publish_before_preflight.disabled} | ${item.calls.publish} | ${item.calls.email_send} | ${item.calls.unexpected_writes.length} | ${item.passed} | ${item.screenshot} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- Synthetic browser route interception only.");
  lines.push("- Builder and email routes return sanitized metadata, preview sections, envelope refs, and blocked provider/owner states.");
  lines.push("- Vault publication is gated by the document workspace preflight and remains owner-blocked with no Vault document write.");
  lines.push("- Import execution remains owner/provider-blocked; only a dry-run-ready state is surfaced after preflight.");
  lines.push("- This proof does not execute customer import, document mutation, public release, owner final approval, or go-live.");
  return `${lines.join("\n")}\n`;
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function basePage(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1180 } });
  const calls = {
    matters: 0,
    vault_summary: 0,
    timeline: 0,
    bridge_status: 0,
    preflight: 0,
    builder_create: 0,
    builder_patch: 0,
    builder_preview: 0,
    approval: 0,
    publish: 0,
    email_create: 0,
    email_patch: 0,
    email_send: 0,
    recently_viewed: 0,
    unexpected_writes: []
  };

  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("/api/") || request.method() === "GET") return;
    const allowed = [
      "/api/matters/vault-bridge/upload-preflight",
      `/api/matters/${MATTER_ID}/builder-drafts`,
      `/api/matters/${MATTER_ID}/email-drafts`,
      `/api/matters/${MATTER_ID}/recently-viewed`
    ];
    if (!allowed.some((path) => url.includes(path))) {
      calls.unexpected_writes.push({ method: request.method(), url });
    }
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") return fulfillJson(route, genericCollectionBody);
    return fulfillJson(route, { ...genericItemBody, outcome: "created" });
  });

  await page.route("**/api/matters?**", (route) => {
    calls.matters += 1;
    return fulfillJson(route, mattersBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/vault-summary?**`, (route) => {
    calls.vault_summary += 1;
    return fulfillJson(route, vaultSummaryBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/timeline?**`, (route) => {
    calls.timeline += 1;
    return fulfillJson(route, timelineBody);
  });
  await page.route("**/api/vault/documents?**", (route) => fulfillJson(route, vaultDocumentsBody));
  await page.route("**/api/vault/search?**", (route) => fulfillJson(route, vaultSearchBody));
  await page.route("**/api/vault/audit?**", (route) => fulfillJson(route, vaultAuditBody));
  await page.route(`**/api/matters/${MATTER_ID}/document-templates?**`, (route) => fulfillJson(route, templatesBody));
  await page.route(`**/api/matters/${MATTER_ID}/builder-approval-requests?**`, (route) => fulfillJson(route, approvalRequestsBody));
  await page.route("**/api/matters/vault-bridge/status", (route) => {
    calls.bridge_status += 1;
    return fulfillJson(route, bridgeStatusBody);
  });
  await page.route("**/api/matters/vault-bridge/upload-preflight", (route) => {
    calls.preflight += 1;
    return fulfillJson(route, passedPreflightBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/builder-drafts`, (route) => {
    calls.builder_create += 1;
    return fulfillJson(route, builderDraftBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/builder-drafts/${DRAFT_ID}`, (route) => {
    calls.builder_patch += 1;
    return fulfillJson(route, builderPatchBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/builder-drafts/${DRAFT_ID}/preview?**`, (route) => {
    calls.builder_preview += 1;
    return fulfillJson(route, builderPreviewBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/builder-drafts/${DRAFT_ID}/approval-requests`, (route) => {
    calls.approval += 1;
    return fulfillJson(route, approvalRequestBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/builder-drafts/${DRAFT_ID}/publish-to-vault`, (route) => {
    calls.publish += 1;
    return fulfillJson(route, publishBlockedBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/email-drafts`, (route) => {
    calls.email_create += 1;
    return fulfillJson(route, emailDraftBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/email-drafts/${EMAIL_DRAFT_ID}`, (route) => {
    calls.email_patch += 1;
    return fulfillJson(route, emailPatchBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/email-drafts/${EMAIL_DRAFT_ID}/send`, (route) => {
    calls.email_send += 1;
    return fulfillJson(route, emailSendBlockedBody);
  });
  await page.route(`**/api/matters/${MATTER_ID}/recently-viewed`, (route) => {
    calls.recently_viewed += 1;
    return fulfillJson(route, { ...genericItemBody, outcome: "created" });
  });

  return { page, calls };
}

async function boundarySnapshot(page) {
  const panel = page.locator("[data-lcx-vltui-03-document-workspace-boundary='true']").first();
  await panel.waitFor({ state: "visible", timeout: 15000 });
  return panel.evaluate((element) => ({
    source_state: element.getAttribute("data-lcx-vltui-03-vault-source-state"),
    preflight_state: element.getAttribute("data-lcx-vltui-03-preflight-state"),
    publish_state: element.getAttribute("data-lcx-vltui-03-publish-state"),
    publish_write_enabled: element.getAttribute("data-lcx-vltui-03-publish-write-enabled"),
    import_dry_run_state: element.getAttribute("data-lcx-vltui-03-import-dry-run-state"),
    import_execute_state: element.getAttribute("data-lcx-vltui-03-import-execute-state"),
    email_send_state: element.getAttribute("data-lcx-vltui-03-email-send-state"),
    preflight_ref: element.getAttribute("data-lcx-vltui-03-preflight-ref")
  }));
}

async function publishButtonState(page) {
  const builder = page.locator("[data-sf-b-w04-document-builder='true']").first();
  const button = builder.getByRole("button", { name: "Vault 등록 요청" });
  return {
    state: await button.getAttribute("data-lcx-vltui-03-publish-action-state"),
    disabled: await button.isDisabled()
  };
}

async function runWorkspaceCase(browser) {
  const { page, calls } = await basePage(browser);
  try {
    await page.goto(`${WEB}/?locale=ko&view=matters&data=live&ctx=allow#matter-vault`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-mv-matter-vault-panel='true']").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("[data-lcx-vltui-03-document-workspace-boundary='true']").waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-03-document-workspace-boundary='true']")?.getAttribute("data-lcx-vltui-03-vault-source-state") === "source-ready");

    const initialBoundary = await boundarySnapshot(page);
    const initialPublish = await publishButtonState(page);

    const builder = page.locator("[data-sf-b-w04-document-builder='true']").first();
    await builder.getByRole("button", { name: "초안 생성" }).click();
    await page.locator("[data-sf-b-w04-builder-preview='true']").waitFor({ state: "visible", timeout: 15000 });
    const publishBeforePreflight = await publishButtonState(page);

    await page.locator("[data-lcx-vltui-03-document-workspace-boundary='true']").first().getByRole("button", { name: "문서 사전검사" }).click();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-03-document-workspace-boundary='true']")?.getAttribute("data-lcx-vltui-03-preflight-state") === "passed");
    const passedBoundary = await boundarySnapshot(page);
    const publishAfterPreflight = await publishButtonState(page);

    await builder.getByRole("button", { name: "검토 준비" }).click();
    await page.locator("[data-sf-b-w04-builder-patch-result='true']").waitFor({ state: "visible", timeout: 15000 });
    await builder.getByRole("button", { name: "승인 요청" }).click();
    await page.locator("[data-sf-b-w04-builder-approval-result='true']").waitFor({ state: "visible", timeout: 15000 });
    await builder.getByRole("button", { name: "Vault 등록 요청" }).click();
    await page.locator("[data-sf-b-w04-builder-publish-blocked-result='true']").waitFor({ state: "visible", timeout: 15000 });

    const email = page.locator("[data-sf-b-w04-email-composer='true']").first();
    await email.getByRole("button", { name: "초안 생성" }).click();
    await page.locator("[data-sf-b-w04-email-draft-result='true']").waitFor({ state: "visible", timeout: 15000 });
    await email.getByRole("button", { name: "내용 정리" }).click();
    await page.locator("[data-sf-b-w04-email-patch-result='true']").waitFor({ state: "visible", timeout: 15000 });
    await email.getByRole("button", { name: "발송 요청" }).click();
    await page.locator("[data-sf-b-w04-email-send-provider-blocked='true']").waitFor({ state: "visible", timeout: 15000 });

    const finalBoundary = await boundarySnapshot(page);
    await page.locator("[data-lcx-vltui-03-document-workspace-boundary='true']").first().scrollIntoViewIfNeeded();
    const screenshot = screenshotPath("document-workspace-proof");
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });

    const text = compact(await page.locator("[data-mv-matter-vault-panel='true']").innerText());
    const forbidden = forbiddenText(text);
    const passed =
      initialBoundary.source_state === "source-ready" &&
      initialBoundary.preflight_state === "not-run" &&
      initialPublish.disabled === true &&
      publishBeforePreflight.state === "preflight-required" &&
      publishBeforePreflight.disabled === true &&
      passedBoundary.preflight_state === "passed" &&
      passedBoundary.publish_write_enabled === "false" &&
      passedBoundary.import_dry_run_state === "dry-run-ready" &&
      passedBoundary.import_execute_state === "owner-provider-blocked" &&
      publishAfterPreflight.state === "owner-blocked" &&
      publishAfterPreflight.disabled === false &&
      finalBoundary.email_send_state === "provider-blocked" &&
      calls.preflight === 1 &&
      calls.builder_create === 1 &&
      calls.builder_patch === 1 &&
      calls.builder_preview >= 2 &&
      calls.approval === 1 &&
      calls.publish === 1 &&
      calls.email_create === 1 &&
      calls.email_patch === 1 &&
      calls.email_send === 1 &&
      calls.unexpected_writes.length === 0 &&
      !forbidden;

    return {
      id: "document-workspace-boundary",
      initial_boundary: initialBoundary,
      final_boundary: finalBoundary,
      publish_initial: initialPublish,
      publish_before_preflight: publishBeforePreflight,
      publish_after_preflight: publishAfterPreflight,
      preflight_state: passedBoundary.preflight_state,
      preflight_ref: passedBoundary.preflight_ref,
      calls,
      forbidden_text_detected: forbidden,
      screenshot,
      passed
    };
  } finally {
    await page.close();
  }
}

async function main() {
  mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });
  const browser = await chromium.launch();
  try {
    const cases = [await runWorkspaceCase(browser)];
    const report = {
      schema_version: "law-firm-os.lazycodex.lcx_vltui.matter_document_workspace_proof.v0.1",
      tuw_ids: ["LCX-VLTUI-03.01", "LCX-VLTUI-03.02", "LCX-VLTUI-03.03", "LCX-VLTUI-03.04", "LCX-VLTUI-03.05"],
      generated_at: new Date().toISOString(),
      verdict: cases.every((item) => item.passed) ? "PASS" : "FAIL",
      boundary: {
        synthetic_route_interception_only: true,
        customer_document_import_executed: false,
        vault_document_write_enabled: false,
        vault_document_created: false,
        document_bytes_included: false,
        storage_pointer_ref_included: false,
        provider_send_executed: false,
        production_ready: false,
        public_release: false,
        go_live_approved: false,
        owner_final_approval: false
      },
      cases
    };
    writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(join(ROOT, MD_PATH), renderMarkdown(report));
    if (report.verdict !== "PASS") {
      console.error(JSON.stringify(report, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({
      verdict: report.verdict,
      tuw_ids: report.tuw_ids,
      proof: JSON_PATH,
      markdown: MD_PATH
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
