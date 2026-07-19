#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import popbill from "popbill";
import { calculateKoreanBusinessIncomeWithholding } from "../packages/billing/src/index.js";

const ROOT = process.cwd();
const ENV_PATH = join(ROOT, ".env.popbill.local");
const ARTIFACT_JSON = process.env.LAWOS_UPL_B13_ARTIFACT_JSON
  ?? join(ROOT, "artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json");
const ARTIFACT_MD = process.env.LAWOS_UPL_B13_ARTIFACT_MD
  ?? join(ROOT, "artifacts/manual-qa/upl-b13-popbill-sandbox-proof.md");

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function loadEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=");
          return index === -1 ? null : [line.slice(0, index), line.slice(index + 1)];
        })
        .filter(Boolean),
    );
  } catch {
    return {};
  }
}

function env(name, source) {
  return process.env[name] ?? source[name] ?? "";
}

function sanitizeResponse(response) {
  if (!response || typeof response !== "object") return response ?? null;
  return Object.fromEntries(
    Object.entries(response).filter(([key]) => !/secret|key|token|password/i.test(key)),
  );
}

function summarizeProbeResult(probe) {
  if (!probe || typeof probe !== "object") {
    return {
      ok: false,
      response_hash: hash(probe ?? null),
      response_body_written: false,
    };
  }
  const body = probe.result ?? probe.error ?? null;
  return {
    ok: probe.ok === true,
    code: body?.code ?? null,
    code_present: body?.code !== undefined,
    message_hash: hash(body?.message ?? ""),
    response_hash: hash(probe),
    response_body_written: false,
  };
}

function summarizeProbeResults(results) {
  return Object.fromEntries(
    Object.entries(results).map(([name, result]) => [name, summarizeProbeResult(result)]),
  );
}

function summarizeIssueBlocker(issue) {
  const body = issue?.error ?? issue?.result ?? null;
  return {
    reason: "Popbill sandbox issue did not return code=1",
    issue_ok: issue?.ok === true,
    issue_code: body?.code ?? null,
    issue_message_hash: hash(body?.message ?? ""),
    issue_response_hash: hash(issue ?? null),
    raw_issue_error_written: false,
  };
}

function callPopbill(fn) {
  return new Promise((resolve) => {
    fn(
      (result) => resolve({ ok: true, result: sanitizeResponse(result) }),
      (error) => resolve({ ok: false, error: sanitizeResponse(error) }),
    );
  });
}

function yyyymmddKst(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date).replaceAll("-", "");
}

function buildTaxinvoice({ corpNum, userId, mgtKey }) {
  const writeDate = yyyymmddKst();
  const withholding = calculateKoreanBusinessIncomeWithholding({ gross_amount: 1_000_000 });
  const supplyCost = 1_000_000;
  const vat = 100_000;
  return {
    withholding,
    request: {
      writeDate,
      chargeDirection: "정과금",
      issueType: "정발행",
      purposeType: "청구",
      taxType: "과세",
      invoicerCorpNum: corpNum,
      invoicerMgtKey: mgtKey,
      invoicerCorpName: "AMIC Law Sandbox",
      invoicerCEOName: "Sandbox CEO",
      invoicerAddr: "Seoul Sandbox",
      invoicerBizClass: "Legal services",
      invoicerBizType: "Service",
      invoicerContactName: userId || "sandbox",
      invoicerEmail: "tax-sandbox@example.invalid",
      invoicerSMSSendYN: false,
      invoiceeType: "사업자",
      invoiceeCorpNum: "8888888888",
      invoiceeCorpName: "Law Firm OS Sandbox Counterparty",
      invoiceeCEOName: "Sandbox Buyer",
      invoiceeAddr: "Sandbox Address",
      invoiceeBizClass: "Software QA",
      invoiceeBizType: "Service",
      invoiceeContactName1: "Sandbox Contact",
      invoiceeEmail1: "buyer-sandbox@example.invalid",
      invoiceeSMSSendYN: false,
      supplyCostTotal: String(supplyCost),
      taxTotal: String(vat),
      totalAmount: String(supplyCost + vat),
      remark1: "Law Firm OS UPL-B-13 Popbill sandbox proof",
      remark2: "KR 3.3 percent withholding local model mapped outside Popbill native fields",
      remark3: `withholding=${withholding.total_withholding_amount};net=${withholding.net_payable_amount}`,
      businessLicenseYN: false,
      bankBookYN: false,
      detailList: [
        {
          serialNum: 1,
          purchaseDT: writeDate,
          itemName: "UPL-B-13 sandbox legal service fee",
          spec: "sandbox",
          qty: "1",
          unitCost: String(supplyCost),
          supplyCost: String(supplyCost),
          tax: String(vat),
          remark: "no production tax issuance",
        },
      ],
    },
  };
}

function buildPreparedPayloadSummary({ request, withholding, mgtKey }) {
  return {
    withholding_mapping: {
      gross_amount: withholding.gross_amount,
      withholding_rate: withholding.withholding_rate,
      total_withholding_amount: withholding.total_withholding_amount,
      net_payable_amount: withholding.net_payable_amount,
      popbill_native_withholding_field: false,
      mapped_to_field: "remark3",
      mapped_field_hash: hash(request.remark3).slice(0, 12),
    },
    vendor_payload_summary: {
      provider: "popbill",
      environment: "test",
      request_hash: hash(request),
      mgt_key_hash: hash(mgtKey).slice(0, 12),
      write_date: request.writeDate,
      issue_type: request.issueType,
      purpose_type: request.purposeType,
      tax_type: request.taxType,
      supply_cost_total: Number(request.supplyCostTotal),
      tax_total: Number(request.taxTotal),
      total_amount: Number(request.totalAmount),
      detail_count: request.detailList.length,
      raw_request_body_written: false,
      raw_corp_numbers_written: false,
    },
  };
}

function writeArtifact(artifact) {
  mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
  writeFileSync(ARTIFACT_JSON, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    ARTIFACT_MD,
    [
      "# UPL-B-13 Popbill Sandbox Proof",
      "",
      `Status: ${artifact.status}`,
      "",
      `- Vendor: ${artifact.vendor}`,
      `- Sandbox mode: ${artifact.sandbox_mode}`,
      `- External sandbox roundtrip: ${artifact.strict_boundary.external_vendor_sandbox_roundtrip}`,
      `- Strict PASS claim: ${artifact.strict_boundary.strict_pass_claim}`,
      `- Production tax invoice issued: ${artifact.strict_boundary.production_tax_invoice_issued}`,
      `- Credential hash: ${artifact.credential_fingerprint.link_id_hash}/${artifact.credential_fingerprint.secret_key_hash}`,
      `- Prepared request hash: ${artifact.vendor_payload_summary?.request_hash ?? "not_prepared"}`,
      `- Request hash: ${artifact.popbill_receipt?.request_hash ?? "not_run"}`,
      `- Response hash: ${artifact.popbill_receipt?.response_hash ?? "not_run"}`,
      `- Raw provider probe results stored: ${Object.hasOwn(artifact, "popbill_probe_results")}`,
      `- Provider probe summary count: ${Object.keys(artifact.popbill_probe_results_summary ?? {}).length}`,
      `- Withholding mapping: ${artifact.withholding_mapping?.mapped_to_field ?? "not_prepared"}`,
      `- Blocker: ${artifact.blocker?.reason ?? "none"}`,
      "",
    ].join("\n"),
  );
}

const fileEnv = loadEnvFile(ENV_PATH);
const config = {
  linkId: env("POPBILL_LINK_ID", fileEnv),
  secretKey: env("POPBILL_SECRET_KEY", fileEnv),
  corpNum: env("POPBILL_CORP_NUM", fileEnv).replaceAll("-", ""),
  userId: env("POPBILL_USER_ID", fileEnv),
  testMode: env("POPBILL_TEST_MODE", fileEnv) !== "0",
  allowIssue: env("POPBILL_ALLOW_SANDBOX_ISSUE", fileEnv) === "1",
};

const mgtKey = `lawos-b13-${Date.now().toString(36)}`;
const credentialFingerprint = {
  link_id_hash: config.linkId ? hash(config.linkId).slice(0, 12) : null,
  secret_key_hash: config.secretKey ? hash(config.secretKey).slice(0, 12) : null,
};
const prepared = /^\d{10}$/.test(config.corpNum)
  ? (() => {
      const { request, withholding } = buildTaxinvoice({
        corpNum: config.corpNum,
        userId: config.userId,
        mgtKey,
      });
      return { request, withholding, ...buildPreparedPayloadSummary({ request, withholding, mgtKey }) };
    })()
  : null;

let artifact = {
  schema_version: "lawos.wave1.upl-b13.popbill-sandbox-proof.v1",
  generated_at: new Date().toISOString(),
  row_id: "UPL-B-13",
  vendor: "popbill",
  sdk: {
    package: "popbill",
    method_plan: ["checkIsMember", "getUnitCost", "getChargeInfo", "checkMgtKeyInUse", "registIssue"],
  },
  sandbox_mode: config.testMode,
  credential_fingerprint: credentialFingerprint,
  strict_boundary: {
    owner_vendor_decision: true,
    local_3_3_withholding_model_passed: true,
    external_tax_invoice_vendor_selected: true,
    external_vendor_sandbox_roundtrip: false,
    strict_pass_claim: false,
    production_tax_invoice_issued: false,
    raw_secret_written_to_artifact: false,
  },
  withholding_mapping: prepared?.withholding_mapping ?? null,
  vendor_payload_summary: prepared?.vendor_payload_summary ?? null,
  popbill_receipt: null,
  blocker: null,
};

if (!config.linkId || !config.secretKey) {
  artifact = {
    ...artifact,
    status: "BLOCKED_POPBILL_CREDENTIALS_MISSING",
    blocker: { reason: "POPBILL_LINK_ID and POPBILL_SECRET_KEY are required" },
  };
  writeArtifact(artifact);
  console.log(`UPL-B-13 Popbill sandbox proof blocked -> ${ARTIFACT_JSON}`);
  process.exitCode = 1;
} else if (!config.testMode) {
  artifact = {
    ...artifact,
    status: "BLOCKED_POPBILL_PRODUCTION_MODE_DENIED",
    blocker: { reason: "POPBILL_TEST_MODE must stay enabled for Wave-1 sandbox proof" },
  };
  writeArtifact(artifact);
  console.log(`UPL-B-13 Popbill sandbox proof blocked -> ${ARTIFACT_JSON}`);
  process.exitCode = 1;
} else if (!/^\d{10}$/.test(config.corpNum)) {
  artifact = {
    ...artifact,
    status: "READY_NEEDS_POPBILL_CORP_NUM",
    blocker: { reason: "POPBILL_CORP_NUM must be the Popbill member business number without hyphens" },
  };
  writeArtifact(artifact);
  console.log(`UPL-B-13 Popbill sandbox proof ready; POPBILL_CORP_NUM required -> ${ARTIFACT_JSON}`);
} else if (!config.allowIssue) {
  artifact = {
    ...artifact,
    status: "READY_NEEDS_SANDBOX_ISSUE_APPROVAL",
    blocker: { reason: "Set POPBILL_ALLOW_SANDBOX_ISSUE=1 after confirming Popbill test certificate setup" },
  };
  writeArtifact(artifact);
  console.log(`UPL-B-13 Popbill sandbox proof ready; issue approval required -> ${ARTIFACT_JSON}`);
} else {
  const { request, withholding } = prepared;

  popbill.config({
    LinkID: config.linkId,
    SecretKey: config.secretKey,
    IsTest: true,
    IPRestrictOnOff: true,
    UseStaticIP: false,
    UseLocalTimeYN: true,
  });
  const service = popbill.TaxinvoiceService();

  const member = await callPopbill((success, error) => service.checkIsMember(config.corpNum, success, error));
  const unitCost = await callPopbill((success, error) => service.getUnitCost(config.corpNum, success, error));
  const chargeInfo = await callPopbill((success, error) => service.getChargeInfo(config.corpNum, config.userId, success, error));
  const keyInUse = await callPopbill((success, error) => service.checkMgtKeyInUse(config.corpNum, "SELL", mgtKey, success, error));
  const issue = await callPopbill((success, error) =>
    service.registIssue(
      config.corpNum,
      request,
      false,
      false,
      "Law Firm OS UPL-B-13 sandbox issue proof",
      "Law Firm OS Popbill sandbox proof",
      "",
      config.userId,
      success,
      error,
    ),
  );

  const responseSummary = { member, unitCost, chargeInfo, keyInUse, issue };
  const issued = issue.ok && Number(issue.result?.code) === 1;
  artifact = {
    ...artifact,
    status: issued ? "PASS_POPBILL_SANDBOX_ROUNDTRIP" : "BLOCKED_POPBILL_SANDBOX_ISSUE_FAILED",
    strict_boundary: {
      ...artifact.strict_boundary,
      external_vendor_sandbox_roundtrip: issued,
      strict_pass_claim: issued,
    },
    withholding_mapping: prepared.withholding_mapping,
    vendor_payload_summary: prepared.vendor_payload_summary,
    popbill_receipt: {
      provider: "popbill",
      environment: "test",
      request_hash: prepared.vendor_payload_summary.request_hash,
      response_hash: hash(responseSummary),
      mgt_key_hash: prepared.vendor_payload_summary.mgt_key_hash,
      nts_confirm_num_present: typeof issue.result?.ntsConfirmNum === "string" && issue.result.ntsConfirmNum.length > 0,
      issue_response_code: issue.result?.code ?? issue.error?.code ?? null,
      issue_response_message_hash: hash(issue.result?.message ?? issue.error?.message ?? ""),
      raw_request_body_written: false,
      raw_response_body_written: false,
    },
    popbill_probe_results_summary: summarizeProbeResults(responseSummary),
    blocker: issued ? null : summarizeIssueBlocker(issue),
  };
  writeArtifact(artifact);
  console.log(`${issued ? "UPL-B-13 Popbill sandbox proof PASS" : "UPL-B-13 Popbill sandbox proof blocked"} -> ${ARTIFACT_JSON}`);
  if (!issued) process.exitCode = 1;
}
