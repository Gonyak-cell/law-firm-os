#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { globalUtilityItems, conditionalGlobalItems } from "../apps/web/src/data/globalUtilities.js";
import { PEOPLE_FEATURE_ITEMS } from "../apps/web/src/people/peopleFeatureCatalog.js";
import {
  BASELINE_PROOF_PATH,
  INVENTORY_MD_PATH,
  INVENTORY_PATH,
  PLAN_PATH,
  TRACEABILITY_PATH,
  extractTraceability,
  fileExists,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const RELEASE_MANIFEST_PATH = "apps/desktop/dist/release/matter-desktop-v0.1.0-lcx-vltui-20260630/release-manifest.json";
const ROUTES = [
  ["home", "?view=home"],
  ["client-billing", "?view=clients#client-billing"],
  ["client-data", "?view=clients#client-data"],
  ["client-import", "?view=clients#client-import"],
  ["matter-vault", "?view=matters#matter-vault"],
  ["matter-import", "?view=matters#matter-import"],
  ["vault-documents", "?view=vault#vault-documents"],
  ["people-work-schedule", "?view=people#people-work-schedule"],
  ["calendar-decision", "?view=calendar#calendar-decision"],
  ["settings-advanced", "?view=settings#settings-advanced"]
];

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const peopleCounts = PEOPLE_FEATURE_ITEMS.reduce((acc, item) => {
  const state = item.state ?? "active";
  acc[state] = (acc[state] ?? 0) + 1;
  return acc;
}, {});

const normalGlobalSections = globalUtilityItems.flatMap((utility) =>
  utility.sections.map((section) => ({ utility: utility.id, section: section.id, state: section.state ?? "active" }))
);
const auditRequiredSections = normalGlobalSections.filter((section) => section.state === "audit_required");
const traceability = extractTraceability();
const releaseManifest = readJson(RELEASE_MANIFEST_PATH);
const baselineProof = fileExists(BASELINE_PROOF_PATH) ? readJson(BASELINE_PROOF_PATH) : null;
const releaseClaims = {
  public_release_claim: releaseManifest.public_release_claim === true,
  production_go_live_claim: releaseManifest.production_go_live_claim === true,
  owner_approval_claim: releaseManifest.owner_approval_claim === true,
  actual_launch_go_live_claim: releaseManifest.actual_launch_go_live_claim === true,
  app_store_distribution_claim: releaseManifest.app_store_distribution_claim === true,
  microsoft_store_distribution_claim: releaseManifest.microsoft_store_distribution_claim === true,
  windows_authenticode_signing_claim: releaseManifest.windows_authenticode_signing_claim === true
};
const verdict = Object.values(releaseClaims).every((value) => value === false) ? "PASS" : "BLOCKED";

const inventory = {
  schema_version: "law-firm-os.lazycodex.lcx_full.current_gap_inventory.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-00.01",
  verdict,
  status: "current_gap_frozen",
  source: {
    plan_path: PLAN_PATH,
    traceability_path: TRACEABILITY_PATH,
    release_manifest_path: RELEASE_MANIFEST_PATH,
    latest_tag_by_creatordate: git(["for-each-ref", "refs/tags", "--sort=-creatordate", "--count=1", "--format=%(refname:short)"]),
    head_sha: git(["rev-parse", "HEAD"])
  },
  traceability: {
    parent_count: traceability.parentCount,
    child_count: traceability.childCount,
    missing_parents: traceability.missingParents,
    child_counts: traceability.childCounts
  },
  release_claims: releaseClaims,
  people_catalog: {
    total: PEOPLE_FEATURE_ITEMS.length,
    active: peopleCounts.active ?? 0,
    setup_required: peopleCounts.setup_required ?? 0,
    integration_required: peopleCounts.integration_required ?? 0,
    audit_required: peopleCounts.audit_required ?? 0
  },
  global_utilities: {
    global_utility_count: globalUtilityItems.length,
    normal_section_count: normalGlobalSections.length,
    audit_required_sections: auditRequiredSections.map((section) => `${section.utility}:${section.section}`),
    conditional_global_count: conditionalGlobalItems.length,
    conditional_global_items: conditionalGlobalItems.map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      decision: item.decision
    }))
  },
  routes: ROUTES.map(([id, path]) => ({ id, path })),
  baseline_browser_proof: {
    path: BASELINE_PROOF_PATH,
    exists: Boolean(baselineProof),
    route_count: baselineProof?.routes?.length ?? 0,
    verdict: baselineProof?.verdict ?? "not_run"
  },
  boundaries: {
    no_public_release_claim: releaseManifest.public_release_claim !== true,
    no_production_go_live_claim: releaseManifest.production_go_live_claim !== true,
    no_owner_approval_claim: releaseManifest.owner_approval_claim !== true,
    no_windows_authenticode_claim: releaseManifest.windows_authenticode_signing_claim !== true,
    implementation_freeze_only: true
  }
};

writeJson(INVENTORY_PATH, inventory);

const routeRows = inventory.routes.map((route) => ({ Route: route.id, Path: route.path }));
const lines = [
  "# LCX-FULL-00 Current Gap Inventory",
  "",
  `Generated at: ${inventory.generated_at}`,
  "",
  `Verdict: ${inventory.verdict}`,
  "",
  "## Counts",
  "",
  `- Parent TUWs: ${inventory.traceability.parent_count}`,
  `- Child TUWs: ${inventory.traceability.child_count}`,
  `- People total/active/setup/integration/audit: ${inventory.people_catalog.total}/${inventory.people_catalog.active}/${inventory.people_catalog.setup_required}/${inventory.people_catalog.integration_required}/${inventory.people_catalog.audit_required}`,
  `- Conditional global items: ${inventory.global_utilities.conditional_global_count}`,
  `- Audit-required global sections: ${inventory.global_utilities.audit_required_sections.length}`,
  "",
  "## Routes",
  "",
  markdownTable(routeRows, ["Route", "Path"]),
  "",
  "## Boundary",
  "",
  "- Inventory only; no feature writes are enabled.",
  "- Public release, production go-live, owner approval, store distribution, and Windows Authenticode claims remain false.",
  "- Baseline browser proof is referenced separately and must pass before PR-00 closes."
];

writeText(INVENTORY_MD_PATH, `${lines.join("\n")}\n`);
console.log(JSON.stringify({ verdict: "PASS", inventory: INVENTORY_PATH, markdown: INVENTORY_MD_PATH }, null, 2));
