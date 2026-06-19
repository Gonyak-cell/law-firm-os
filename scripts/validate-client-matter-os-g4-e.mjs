#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createDmsDocument,
  createDmsG4CheckoutLockDescriptor,
  createDmsG4EmailFilingDescriptor,
  createDmsG4ESecurityEmailSearchCloseoutDescriptor,
  createDmsG4OutlookPlaceholderDescriptor,
  createDmsG4PrivilegeLabelDescriptor,
  createDmsG4RedactionMetadataDescriptor,
  createDmsG4SearchAclDescriptor,
  createDmsG4SecureLinkDescriptor,
} from "../packages/dms/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G4-W06-T007",
  "LFOS-G4-W06-T008",
  "LFOS-G4-W06-T009",
  "LFOS-G4-W06-T010",
  "LFOS-G4-W06-T011",
  "LFOS-G4-W06-T012",
  "LFOS-G4-W06-T013",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "34-g4-matter-dms-entry-plan.md"),
  path.join(ROOT, "38-g4-d-dms-workspace-document-foundation-report.md"),
  path.join(ROOT, "39-g4-e-dms-security-email-search-report.md"),
  path.resolve("packages/dms/src/client-matter-g4.js"),
  path.resolve("packages/dms/test/client-matter-g4-dms-security-email-search.test.js"),
  path.resolve("contracts/dms-core-contract.json"),
  path.resolve("contracts/email-dms-core-contract.json"),
];

const findings = [];

function addFinding(code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function requireIncludes(text, value, code, message) {
  if (!text.includes(value)) addFinding(code, message, { value });
}

const tenant_id = "tenant_g4e_validator";
const actor_id = "actor_g4e_validator";
const matter_id = "matter_g4e_validator";

function document(overrides = {}) {
  return createDmsDocument({
    document_id: "doc_g4e_validator",
    tenant_id,
    matter_id,
    workspace_id: "workspace_g4e_validator",
    folder_id: "folder_g4e_validator",
    title: "Synthetic privileged DMS document",
    status: "active",
    current_version_id: "version_g4e_validator_v1",
    permission_envelope_id: "perm_g4e_document",
    audit_trace_id: "audit_g4e_document",
    ...overrides,
  });
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G4-E validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "34-g4-matter-dms-entry-plan.md"));
  const g4dReport = await readText(path.join(ROOT, "38-g4-d-dms-workspace-document-foundation-report.md"));
  const report = await readText(path.join(ROOT, "39-g4-e-dms-security-email-search-report.md"));
  const source = await readText(path.resolve("packages/dms/src/client-matter-g4.js"));
  const testSource = await readText(path.resolve("packages/dms/test/client-matter-g4-dms-security-email-search.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const dmsContract = await readJson(path.resolve("contracts/dms-core-contract.json"));
  const emailDmsContract = await readJson(path.resolve("contracts/email-dms-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G4-E TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G4-E TUW missing from G4 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G4-E TUW missing from G4-E report.");
  }

  requireIncludes(g4dReport, "G4-D DMS Workspace Document Foundation Report", "G4D_DEPENDENCY", "G4-E must build on G4-D DMS evidence.");
  requireIncludes(riskRegister, "R-011", "R011_DEPENDENCY", "G4-E must preserve DMS search index ACL risk control.");

  for (const phrase of [
    "G4-E DMS Security Email Search Report",
    "This slice does not claim G4 runtime readiness",
    "DMS check-in/check-out locks",
    "privilege labels",
    "redaction metadata",
    "secure link sharing",
    "email filing",
    "Outlook filing placeholders",
    "search index ACL controls",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G4-E report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createDmsG4CheckoutLockDescriptor",
    "createDmsG4PrivilegeLabelDescriptor",
    "createDmsG4RedactionMetadataDescriptor",
    "createDmsG4SecureLinkDescriptor",
    "createDmsG4EmailFilingDescriptor",
    "createDmsG4OutlookPlaceholderDescriptor",
    "createDmsG4SearchAclDescriptor",
    "createDmsG4ESecurityEmailSearchCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export function ${symbol}`, "MISSING_SOURCE_EXPORT", "G4-E descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G4-E descriptor export missing test coverage.");
  }

  for (const marker of [
    "dms_checkout_concurrent_edit_blocked",
    "dms_privilege_ai_search_exclusion_required",
    "dms_redacted_export_required",
    "dms_secure_link_expiry_required",
    "dms_email_filing_matter_trace_mismatch",
    "dms_outlook_credential_leak_blocked",
    "dms_search_unauthorized_result_blocked",
    "executes_email_runtime",
    "executes_search_indexing",
    "exposes_email_credentials",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G4-E source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g4e:validate"] !== "node scripts/validate-client-matter-os-g4-e.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g4e:validate.");
  }

  if (
    dmsContract.program?.program_id !== "RP06" ||
    dmsContract.no_write_attestation?.executes_search_indexing !== false ||
    emailDmsContract.program?.program_id !== "RP08" ||
    emailDmsContract.program?.descriptor_only !== true
  ) {
    addFinding("CONTRACT_BOUNDARY", "RP06/RP08 contracts must remain descriptor-only no-runtime evidence.");
  }

  const checkout = createDmsG4CheckoutLockDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    lock_request: { lock_id: "lock_g4e", requested_by: actor_id },
  });
  const blockedCheckout = createDmsG4CheckoutLockDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    lock_request: { lock_id: "lock_g4e", requested_by: actor_id },
    existing_lock: { lock_id: "lock_existing", locked_by: "other_actor", status: "active" },
  });
  const privilege = createDmsG4PrivilegeLabelDescriptor({
    tenant_id,
    document: document(),
    privilege_label: { label_id: "priv_g4e", classification: "privileged", ai_search_excluded: true },
  });
  const redaction = createDmsG4RedactionMetadataDescriptor({
    tenant_id,
    document: document(),
    redactions: [{ redaction_id: "redact_g4e", page: 1, reason: "privilege" }],
    export_redacted: true,
  });
  const secureLink = createDmsG4SecureLinkDescriptor({
    tenant_id,
    document: document(),
    link_policy: { expires_at: "2026-07-01T00:00:00.000Z", mfa_required: true, watermark_required: true },
  });
  const emailFiling = createDmsG4EmailFilingDescriptor({
    tenant_id,
    matter_id,
    email_thread: { email_thread_id: "thread_g4e", tenant_id, matter_id, message_ids: ["message_g4e_1"] },
    dms_document_ref: "DmsDocument:doc_g4e",
    filing_audit_ref: "audit:g4e:email-filing",
  });
  const outlook = createDmsG4OutlookPlaceholderDescriptor({
    tenant_id,
    actor_id,
    placeholder_request: { mailbox_ref: "mailbox:g4e" },
  });
  const blockedOutlook = createDmsG4OutlookPlaceholderDescriptor({
    tenant_id,
    actor_id,
    placeholder_request: { mailbox_ref: "mailbox:g4e", access_token: "secret-token" },
  });
  const search = createDmsG4SearchAclDescriptor({
    tenant_id,
    actor_id,
    query: "merger agreement",
    search_results: [
      { document_id: "doc_allowed", title: "Allowed", actor_can_view: true },
      { document_id: "doc_denied", title: "Denied", actor_can_view: false, permission_decision: "deny" },
    ],
  });
  const closeout = createDmsG4ESecurityEmailSearchCloseoutDescriptor({
    tenant_id,
    descriptors: [checkout, privilege, redaction, secureLink, emailFiling, outlook, search],
  });

  if (
    checkout.outcome !== "review_required" ||
    blockedCheckout.outcome !== "blocked" ||
    !blockedCheckout.blocked_claims.includes("dms_checkout_concurrent_edit_blocked")
  ) {
    addFinding("CHECKOUT_LOCK", "Checkout lock descriptor must block concurrent edits.");
  }
  if (privilege.outcome !== "review_required" || privilege.ai_search_excluded !== true || privilege.search_index_allowed !== false) {
    addFinding("PRIVILEGE_LABEL", "Privilege label descriptor must require AI/search exclusion.");
  }
  if (redaction.outcome !== "review_required" || redaction.redaction_receipt.original_bytes_exposed !== false) {
    addFinding("REDACTION", "Redaction descriptor must require redacted export and hide original bytes.");
  }
  if (
    secureLink.outcome !== "review_required" ||
    secureLink.secure_link_receipt.expiry_tested !== true ||
    secureLink.secure_link_receipt.document_bytes_served !== false
  ) {
    addFinding("SECURE_LINK", "Secure link descriptor must require expiry MFA and watermark without serving bytes.");
  }
  if (emailFiling.outcome !== "review_required" || emailFiling.email_filing_receipt.email_runtime_executed !== false) {
    addFinding("EMAIL_FILING", "Email filing descriptor must keep Matter trace without email runtime.");
  }
  if (
    outlook.outcome !== "review_required" ||
    outlook.credentials_exposed !== false ||
    blockedOutlook.outcome !== "blocked" ||
    !blockedOutlook.blocked_claims.includes("dms_outlook_credential_leak_blocked")
  ) {
    addFinding("OUTLOOK_PLACEHOLDER", "Outlook placeholder descriptor must block credential leaks.");
  }
  if (
    search.outcome !== "review_required" ||
    search.visible_results.length !== 1 ||
    search.unauthorized_result_count_exposed !== null ||
    search.search_receipt.search_index_queried !== false
  ) {
    addFinding("SEARCH_ACL", "Search ACL descriptor must omit unauthorized results without querying index runtime.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 7 ||
    closeout.checkout_lock_tested !== true ||
    closeout.privilege_search_exclusion_tested !== true ||
    closeout.redacted_export_tested !== true ||
    closeout.secure_link_policy_tested !== true ||
    closeout.email_filing_tested !== true ||
    closeout.outlook_placeholder_tested !== true ||
    closeout.search_acl_tested !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G4E_CLOSEOUT", "G4-E closeout must summarize security email search evidence and keep readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G4-E validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G4-E validation passed.");
console.log("g4e_tuws: LFOS-G4-W06-T007/LFOS-G4-W06-T008/LFOS-G4-W06-T009/LFOS-G4-W06-T010/LFOS-G4-W06-T011/LFOS-G4-W06-T012/LFOS-G4-W06-T013");
console.log("checkout_privilege_redaction: concurrent_edit_ai_search_exclusion_redacted_export");
console.log("secure_email_outlook: expiry_mfa_watermark_matter_filing_no_credentials");
console.log("search_acl: unauthorized_result_absent");
console.log("dms_runtime_readiness_claim: open");
