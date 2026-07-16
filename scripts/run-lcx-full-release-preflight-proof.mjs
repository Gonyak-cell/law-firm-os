#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  RELEASE_PREFLIGHT_MD_PATH,
  RELEASE_PREFLIGHT_PATH,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  return {
    command: [command, ...args].join(" "),
    exit_code: result.status ?? 1,
    signal: result.signal,
    output: sanitizeOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)
  };
}

function sanitizeOutput(value) {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/(token|secret|password|credential|authorization)(['":=\s]+)[^,\s}\]]+/gi, "$1$2[redacted]")
    .trim();
}

function outputTail(output, limit = 1400) {
  const compact = String(output ?? "").replace(/\s+/g, " ").trim();
  return compact.length > limit ? compact.slice(compact.length - limit) : compact;
}

function parseLastJsonObject(output) {
  const text = String(output ?? "");
  const indexes = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "{") indexes.push(index);
  }
  for (const index of indexes.reverse()) {
    try {
      return JSON.parse(text.slice(index).trim());
    } catch {
      // Keep scanning earlier JSON candidates.
    }
  }
  return null;
}

function gate(id, label, result, classify) {
  const parsed = parseLastJsonObject(result.output);
  const classified = classify(result, parsed);
  return {
    tuw_id: id,
    label,
    command: result.command,
    exit_code: result.exit_code,
    claim_status: classified.claim_status,
    allowed_claim: classified.allowed_claim,
    blocked_reason: classified.blocked_reason ?? null,
    evidence_ref: classified.evidence_ref ?? null,
    parsed_summary: classified.parsed_summary ?? null,
    output_tail: outputTail(result.output)
  };
}

function classifyFormalRelease(result) {
  if (result.exit_code === 0) {
    return {
      claim_status: "PASS",
      allowed_claim: "formal release candidate bundle validated; public release still not claimed"
    };
  }
  if (/not_applied_internal_package|Developer ID signing|notarization|missing file/i.test(result.output)) {
    return {
      claim_status: "BLOCKED",
      allowed_claim: "formal release remains blocked until signed/notarized release candidate evidence validates",
      blocked_reason: "Strict formal release bundle validation did not pass in the local evidence set."
    };
  }
  return {
    claim_status: "FAIL",
    allowed_claim: "formal release validation failed with an unclassified error",
    blocked_reason: "Unclassified formal release validator failure."
  };
}

function classifyAwsRuntime(result, parsed) {
  if (result.exit_code === 0 && parsed?.verdict === "PASS") {
    return {
      claim_status: "PASS",
      allowed_claim: "AWS temporary runtime smoke passed with token/password material suppressed",
      parsed_summary: {
        runtime_mode: parsed.runtime_mode,
        account_count: parsed.account_count,
        super_admin_login_result: parsed.super_admin_login?.result,
        general_admin_restriction: parsed.general_account_admin_restriction?.result,
        operator_token_material_printed: parsed.operator_token_material_printed,
        password_material_printed: parsed.password_material_printed,
        reset_token_material_printed: parsed.reset_token_material_printed,
        public_release_claim: parsed.public_release_claim,
        production_go_live_claim: parsed.production_go_live_claim,
        owner_approval_claim: parsed.owner_approval_claim
      }
    };
  }
  if (/required|missing|not configured|environment/i.test(result.output)) {
    return {
      claim_status: "BLOCKED",
      allowed_claim: "AWS temporary runtime smoke is blocked by missing local runtime configuration",
      blocked_reason: "Runtime smoke did not complete because required local configuration is unavailable."
    };
  }
  return {
    claim_status: "FAIL",
    allowed_claim: "AWS temporary runtime smoke failed unexpectedly",
    blocked_reason: "Unclassified AWS runtime smoke failure."
  };
}

function classifyProductionSmoke(result, parsed) {
  if (result.exit_code === 0 && parsed?.verdict === "PASS") {
    return {
      claim_status: "PASS",
      allowed_claim: "production smoke passed for synthetic checks only",
      evidence_ref: parsed.artifact_json,
      parsed_summary: {
        base_url: parsed.base_url,
        check_count: parsed.check_count,
        deployment_commit: parsed.deployment_commit
      }
    };
  }
  if (parsed?.verdict === "BLOCKED" && Array.isArray(parsed.missing_required_env)) {
    return {
      claim_status: "BLOCKED",
      allowed_claim: "production smoke is explicitly blocked until required env is present",
      blocked_reason: parsed.blocked_reason,
      evidence_ref: parsed.artifact_json,
      parsed_summary: {
        missing_required_env: parsed.missing_required_env,
        artifact_md: parsed.artifact_md
      }
    };
  }
  return {
    claim_status: "FAIL",
    allowed_claim: "production smoke failed without a recognized blocked receipt",
    blocked_reason: "Unclassified production smoke failure."
  };
}

function classifyReleaseGuard(result, parsed) {
  if (result.exit_code === 0 && parsed?.verdict === "PASS") {
    return {
      claim_status: "PASS",
      allowed_claim: "public release/go-live/owner approval claims remain false",
      parsed_summary: {
        public_release_claim: parsed.public_release_claim,
        production_go_live_claim: parsed.production_go_live_claim,
        owner_approval_claim: parsed.owner_approval_claim
      }
    };
  }
  return {
    claim_status: "FAIL",
    allowed_claim: "release boundary guard failed",
    blocked_reason: "No-public-release guard did not pass."
  };
}

function classifyScreenQa(result, parsed) {
  if (result.exit_code === 0 && parsed?.verdict === "PASS") {
    return {
      claim_status: "PASS",
      allowed_claim: "desktop screen QA passed as supervised pilot candidate proof",
      evidence_ref: parsed.receipt,
      parsed_summary: {
        screenshot: parsed.screenshot
      }
    };
  }
  if (/required|missing|Electron executable|packaged matter\.app/i.test(result.output)) {
    return {
      claim_status: "BLOCKED",
      allowed_claim: "desktop screen QA is blocked by missing local packaged/source runtime",
      blocked_reason: "Desktop QA prerequisites are unavailable."
    };
  }
  return {
    claim_status: "FAIL",
    allowed_claim: "desktop screen QA failed unexpectedly",
    blocked_reason: "Unclassified desktop screen QA failure."
  };
}

const gates = [
  gate("LCX-FULL-19.01", "env/formal release preflight", runCommand("npm", ["run", "matter-desktop:formal-release:validate"]), classifyFormalRelease),
  gate("LCX-FULL-19.02", "AWS runtime smoke", runCommand("npm", ["run", "matter-desktop:aws-runtime:smoke"]), classifyAwsRuntime),
  gate("LCX-FULL-19.03", "web production smoke", runCommand("npm", ["run", "lcx:vltui:production-smoke"]), classifyProductionSmoke),
  gate("LCX-FULL-19.04", "release no-public-claim guard", runCommand("node", ["scripts/validate-matter-desktop-no-public-release-claim.mjs"]), classifyReleaseGuard),
  gate("LCX-FULL-19.05", "desktop screen QA", runCommand("npm", ["run", "matter-desktop:screen-qa"]), classifyScreenQa)
];

const failed = gates.filter((entry) => entry.claim_status === "FAIL");
const blocked = gates.filter((entry) => entry.claim_status === "BLOCKED");
const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.release_preflight_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_parent: "LCX-FULL-19",
  verdict: failed.length === 0 ? "PASS" : "FAIL",
  status: blocked.length > 0 ? "preflight_recorded_with_blocked_gates" : "preflight_passed",
  gates,
  gate_claim_counts: {
    pass: gates.filter((entry) => entry.claim_status === "PASS").length,
    blocked: blocked.length,
    fail: failed.length
  },
  boundary: {
    formal_release_candidate_publicly_released: false,
    production_cutover_executed_by_this_preflight: false,
    company_wide_go_live_executed_by_this_preflight: false,
    public_release_claim: false,
    production_go_live_claim: false,
    owner_approval_claim_by_this_preflight: false,
    provider_production_write_claim_by_this_preflight: false,
    real_client_data_used: false
  }
};

const rows = gates.map((entry) => ({
  TUW: entry.tuw_id,
  Gate: entry.label,
  Claim: entry.claim_status,
  Evidence: entry.evidence_ref ?? "(command output)",
  Boundary: entry.allowed_claim
}));
const md = [
  "# LCX-FULL-19 Release Preflight Proof",
  "",
  `Generated at: ${report.generated_at}`,
  "",
  `Verdict: ${report.verdict}`,
  "",
  `Status: ${report.status}`,
  "",
  markdownTable(rows, ["TUW", "Gate", "Claim", "Evidence", "Boundary"]),
  "",
  "## Boundary",
  "",
  "- Formal release, production cutover, company-wide go-live, and public release are not claimed by this preflight.",
  "- BLOCKED gates are preserved as blocked evidence, not promoted to PASS for the underlying operation.",
  "- Runtime and screen QA proofs use synthetic/runtime accounts only; no real client data import or document write is claimed."
].join("\n");

writeJson(RELEASE_PREFLIGHT_PATH, report);
writeText(RELEASE_PREFLIGHT_MD_PATH, `${md}\n`);

console.log(JSON.stringify({
  verdict: report.verdict,
  status: report.status,
  proof: RELEASE_PREFLIGHT_PATH,
  blocked_gates: blocked.map((entry) => entry.tuw_id),
  failed_gates: failed.map((entry) => entry.tuw_id)
}, null, 2));

if (report.verdict !== "PASS") process.exit(1);
