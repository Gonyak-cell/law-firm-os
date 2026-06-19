#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/client-collaboration-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g10-client-collaboration-api.test.js",
  "docs/reorganization/client-matter-os/cmp-v1/12-cmp-g10-client-collaboration-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/client-collaboration/runtime/evidence",
  "/api/client-collaboration/external-users",
  "/api/client-collaboration/matter-projections",
  "/api/client-collaboration/external-acls",
  "/api/client-collaboration/rfi-requests",
  "/api/client-collaboration/rfi-response-uploads",
  "/api/client-collaboration/portal-rfi-closeout",
  "/api/client-collaboration/client-approvals",
  "/api/client-collaboration/secure-links",
  "/api/client-collaboration/data-rooms",
  "/api/client-collaboration/portal-audit",
  "/api/client-collaboration/portal-data-room-closeout",
  "/api/client-collaboration/ui/client-dashboard",
  "/api/client-collaboration/shared-documents",
  "/api/client-collaboration/message-threads",
  "/api/client-collaboration/upload-security-test",
  "/api/client-collaboration/external-acl-test",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G10_TUW_IDS",
  "CLIENT_COLLABORATION_BOUNDED_CONTEXT",
  "createClientCollaborationRuntimeContext",
  "createClientCollaborationCmpG10RuntimeEvidence",
  "handleClientCollaborationApiRequest",
  "requireNoExternalRuntimeWrite",
  "projection_only_runtime",
  "external_acl_required",
  "internal_data_exposure_allowed: false",
  "object_storage_write_allowed: false",
  "createClientPortalG6ExternalUserDescriptor",
  "createClientPortalG6PortalMatterProjectionDescriptor",
  "createClientPortalG6RFIResponseUploadDescriptor",
  "createDataRoomG6DataRoomAclDescriptor",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "health descriptor exposes client collaboration after G1-G9",
  "separates external users and projects only shared Matter content",
  "enforces external ACLs and RFI upload security without storage writes",
  "secures approvals, secure links, data rooms, and portal audit",
  "dashboard, shared documents, and messages expose projection-only UI state",
  "closeouts and runtime evidence preserve projection-only no-R4 boundary",
]);

const CMP_G10_TUWS = Object.freeze(
  Array.from({ length: 17 }, (_, index) => `CMP-G10-W10-T${String(index + 1).padStart(3, "0")}`),
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
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G10 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/client-collaboration-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g10-client-collaboration-api.test.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/12-cmp-g10-client-collaboration-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G10_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G10 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G10 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G10 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G10 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G10 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G10 runtime source missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G10 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of ["CLIENT_COLLABORATION_BOUNDED_CONTEXT", "CLIENT_COLLABORATION_RUNTIME", "isClientCollaborationPath", "handleClientCollaborationApiRequest"]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G10 runtime.", { phrase });
    }
  }

  if (
    !runtime.includes('"CMP-G9-W09"') ||
    !runtime.includes('"CMP-G1-W01"') ||
    !runtime.includes('"CMP-G5-W05"')
  ) {
    addFinding(findings, "DEPENDENCY_ORDER", "CMP-G10 runtime evidence must preserve G1-G9 dependencies.");
  }

  for (const phrase of ["projection-only", "External identities", "Internal memo", "External ACLs", "RFI uploads", "Secure links"]) {
    if (!report.includes(phrase)) {
      addFinding(findings, "MISSING_REPORT_GUARDRAIL", "CMP-G10 report missing required guardrail text.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G10 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G10 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g10:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g10:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G10 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G10 runtime validation passed.");
console.log("cmp_g10_tuws: 17/17");
console.log("runtime_routes: client collaboration external-user/projection/acl/rfi/upload/approval/link/data-room/audit/ui");
console.log("behavior_tests: projection-only/external-identity-separation/shared-only/no-storage-write/data-room-acl/no-internal-data");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
