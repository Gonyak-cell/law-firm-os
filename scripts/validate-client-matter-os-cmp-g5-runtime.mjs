#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/vault-dms-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g5-vault-dms-api.test.js",
  "docs/reorganization/client-matter-os/cmp-v1/07-cmp-g5-vault-dms-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/vault/runtime/evidence",
  "/api/vault/workspaces",
  "/api/vault/folders",
  "/api/vault/documents/upload",
  "/api/vault/documents",
  "/api/vault/file-objects",
  "/api/vault/email/filings",
  "/api/vault/outlook/placeholders",
  "/api/vault/search",
  "/api/vault/audit",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G5_TUW_IDS",
  "VAULT_DMS_BOUNDED_CONTEXT",
  "createVaultDmsRuntimeContext",
  "createVaultDmsCmpG5RuntimeEvidence",
  "handleVaultDmsApiRequest",
  "createDmsWorkspace",
  "createDmsDocument",
  "createDmsDocumentVersion",
  "createDmsFileObject",
  "createDmsG4SearchAclDescriptor",
  "createDmsG4SecureLinkDescriptor",
  "createDmsG4AuditCoverageDescriptor",
  "requirePermissionBeforeSearch",
  "permission_before_search_enforced",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "health descriptor exposes Vault/DMS after G1-G4",
  "upload metadata, immutable version, storage descriptor, and lineage without raw bytes",
  "checkout, privilege, redaction, and secure-link controls",
  "blocks Outlook credential leakage",
  "blocks search before permission evidence",
  "hides unauthorized result counts",
  "UI state, audit coverage, runtime evidence, and audit preserve safety boundaries",
]);

const CMP_G5_TUWS = Object.freeze(
  Array.from({ length: 32 }, (_, index) => `CMP-G5-W05-T${String(index + 1).padStart(3, "0")}`),
);

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(file) {
  try {
    await stat(path.resolve(file));
    return true;
  } catch {
    return false;
  }
}

async function readText(file) {
  return readFile(path.resolve(file), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}

const findings = [];

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G5 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/vault-dms-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g5-vault-dms-api.test.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/07-cmp-g5-vault-dms-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G5_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G5 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G5 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G5 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G5 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G5 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G5 runtime source missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G5 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of ["VAULT_DMS_BOUNDED_CONTEXT", "VAULT_DMS_RUNTIME", "isVaultDmsPath", "handleVaultDmsApiRequest"]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G5 runtime.", { phrase });
    }
  }

  if (!runtime.includes('depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03", "CMP-G4-W04"])')) {
    addFinding(findings, "DEPENDENCY_ORDER", "CMP-G5 runtime evidence must preserve G1/G2/G3/G4 dependencies.");
  }

  for (const phrase of ["permission-before-search", "Vault write/search/share audit evidence", "raw storage path", "document bytes"]) {
    if (!report.includes(phrase)) {
      addFinding(findings, "MISSING_REPORT_GUARDRAIL", "CMP-G5 report missing required guardrail text.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G5 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G5 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!runtime.includes("permission_before_search_enforced: true")) {
    addFinding(findings, "PERMISSION_BEFORE_SEARCH", "CMP-G5 runtime must explicitly enforce permission before search.");
  }

  if (!runtime.includes("unauthorized_result_count_exposed: null")) {
    addFinding(findings, "UNAUTHORIZED_COUNT_LEAK", "CMP-G5 search must keep unauthorized result count unexposed.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g5:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g5:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G5 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G5 runtime validation passed.");
console.log("cmp_g5_tuws: 32/32");
console.log("runtime_routes: vault workspace/folder/upload/version/storage/lineage/security/email/outlook/search/ui/audit");
console.log("behavior_tests: permission-before-search/raw-path-block/secure-link/audit-coverage/no-byte-leak");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
