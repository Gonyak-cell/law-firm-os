import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const usage = "usage: node scripts/validate-cp002-product-capabilities.mjs [--emit|--check|--help]";
const command = process.argv[2] ?? "--check";
if (command === "--help") {
  console.log(usage);
  console.log("Compares the five frozen CP-001 targets and verifies that the CP-002 candidate loses no required route, menu, API policy, capability anchor, or Forest preservation path.");
  process.exit(0);
}
if (!["--emit", "--check"].includes(command) || process.argv.length > 3) {
  console.error(usage);
  process.exit(2);
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (path.resolve(root) !== path.resolve(process.cwd())) throw new Error(`run from repository root: ${root}`);

const targets = Object.freeze([
  ["origin_main", "fdd1e34a42ee11ad1e5049647048471be772f381"],
  ["current_root", "aa653bb12c7424fb5cda717817ba1ee1d2c454c3"],
  ["release_baseline", "137fa156cdb6bb30bb3af72bf3e928ad7e6e4959"],
  ["forest_checkpoint", "fbf7062398da1157ee1322d7440194c1b13f7e0f"],
  ["candidate", "b6853d529699ec155dfdbb59d2f4f976b58b6cb6"]
]);
const targetSha = Object.fromEntries(targets);
const capabilityPath = "workbook/forest-v0.1.17-integration-evidence/RC-004/capability-matrix.json";
const expectedPath = "workbook/forest-v0.1.17-integration-evidence/CP-002/product-capability-matrix.json";
const capabilities = JSON.parse(readFileSync(capabilityPath, "utf8"));
const maxBuffer = 64 * 1024 * 1024;

function show(sha, filePath) {
  try {
    return execFileSync("git", ["show", `${sha}:${filePath}`], {
      maxBuffer,
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return null;
  }
}

function text(sha, filePath) {
  return show(sha, filePath)?.toString("utf8") ?? "";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unique(values) {
  return [...new Set(values)].sort();
}

function navItems(source) {
  return [...source.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)]
    .map((match) => ({ id: match[1], label: match[2] }));
}

function peopleSections(source) {
  return unique([...source.matchAll(/\bsection:\s*"([^"]+)"/g)].map((match) => match[1]));
}

function routePolicyIds(source) {
  return unique([...source.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]));
}

function presentCount(sha, paths) {
  return paths.filter((filePath) => show(sha, filePath)).length;
}

function targetInventory(id, sha) {
  const nav = navItems(text(sha, "apps/web/src/data/nav.js"));
  const sections = peopleSections(text(sha, "apps/web/src/people/peopleFeatureCatalog.js"));
  const policies = routePolicyIds(text(sha, "apps/api/src/routes/hrx/route-policy-map.js"));
  const axes = capabilities.map((capability) => ({
    id: capability.id,
    source_anchors_present: presentCount(sha, capability.source_anchors),
    source_anchors_total: capability.source_anchors.length,
    proof_anchors_present: presentCount(sha, capability.proof_anchors),
    proof_anchors_total: capability.proof_anchors.length,
    preserved_paths_present: presentCount(sha, capability.preserved_paths),
    preserved_paths_total: capability.preserved_paths.length
  }));
  return {
    id,
    sha,
    nav_items: nav,
    nav_route_ids: nav.map((item) => item.id).sort(),
    people_section_count: sections.length,
    leave_section_count: sections.filter((section) => section.startsWith("people-leave")).length,
    payroll_section_count: sections.filter((section) => section.startsWith("people-pay")).length,
    hrx_route_policy_count: policies.length,
    leave_route_policy_count: policies.filter((policy) => policy.startsWith("hrx.leave.")).length,
    payroll_route_policy_count: policies.filter((policy) => policy.startsWith("hrx.payroll.")).length,
    employee_route_policy_count: policies.filter((policy) => policy.startsWith("hrx.employee") || policy.startsWith("hrx.org_chart")).length,
    source_anchor_placement_count: axes.reduce((sum, axis) => sum + axis.source_anchors_present, 0),
    proof_anchor_placement_count: axes.reduce((sum, axis) => sum + axis.proof_anchors_present, 0),
    preserved_path_count: axes.reduce((sum, axis) => sum + axis.preserved_paths_present, 0),
    axes,
    _people_sections: sections,
    _route_policy_ids: policies
  };
}

const rawInventories = targets.map(([id, sha]) => targetInventory(id, sha));
const candidate = rawInventories.find((inventory) => inventory.id === "candidate");
const prior = rawInventories.filter((inventory) => inventory.id !== "candidate");
const candidateNav = new Set(candidate.nav_route_ids);
const candidateSections = new Set(candidate._people_sections);
const candidatePolicies = new Set(candidate._route_policy_ids);
const rawMissingFromCandidate = {
  nav_route_ids: unique(prior.flatMap((inventory) => inventory.nav_route_ids.filter((id) => !candidateNav.has(id)))),
  people_sections: unique(prior.flatMap((inventory) => inventory._people_sections.filter((section) => !candidateSections.has(section)))),
  hrx_route_policy_ids: unique(prior.flatMap((inventory) => inventory._route_policy_ids.filter((policy) => !candidatePolicies.has(policy))))
};
const candidateGlobalUtilities = text(targetSha.candidate, "apps/web/src/data/globalUtilities.js");
const approvedPeopleSectionAliases = [
  {
    from: "people-company-leave",
    to: "people-leave-types",
    disposition: "approved_company_leave_settings_consolidation",
    redirect_verified: candidateGlobalUtilities.includes('["people:people-company-leave", route("people", "people-leave-types"')
  }
];
const approvedPeopleSectionAliasSources = new Set(approvedPeopleSectionAliases.filter((alias) => alias.redirect_verified).map((alias) => alias.from));
const missingFromCandidate = {
  nav_route_ids: rawMissingFromCandidate.nav_route_ids,
  people_sections: rawMissingFromCandidate.people_sections.filter((section) => !approvedPeopleSectionAliasSources.has(section)),
  hrx_route_policy_ids: rawMissingFromCandidate.hrx_route_policy_ids
};

const requiredNav = Object.freeze({ home: "Home", clients: "Client", matters: "Matter", people: "People", vault: "Search", portal: "Portal" });
const candidateNavMap = Object.fromEntries(candidate.nav_items.map((item) => [item.id, item.label]));
const badRequiredNav = Object.entries(requiredNav).filter(([id, label]) => candidateNavMap[id] !== label);
const candidateMissingAxes = candidate.axes.filter((axis) =>
  axis.source_anchors_present !== axis.source_anchors_total
  || axis.proof_anchors_present !== axis.proof_anchors_total
  || axis.preserved_paths_present !== axis.preserved_paths_total
).map((axis) => axis.id);

const checkpointSha = targetSha.forest_checkpoint;
const candidateSha = targetSha.candidate;
const checkpointPathChanges = capabilities.flatMap((capability) => capability.preserved_paths.map((filePath) => {
  const before = show(checkpointSha, filePath);
  const after = show(candidateSha, filePath);
  return {
    axis: capability.id,
    path: filePath,
    status: !before || !after ? "MISSING" : before.equals(after) ? "BYTE_IDENTICAL" : "CHANGED",
    checkpoint_sha256: before ? sha256(before) : null,
    candidate_sha256: after ? sha256(after) : null
  };
}));

const changedPaths = checkpointPathChanges.filter((row) => row.status === "CHANGED");
const missingPaths = checkpointPathChanges.filter((row) => row.status === "MISSING");
const compactInventories = rawInventories.map(({ _people_sections, _route_policy_ids, ...inventory }) => inventory);
const result = {
  schema_version: "law-firm-os.cp002-product-capability-matrix.v1",
  comparison_target_count: targets.length,
  capability_axis_count: capabilities.length,
  inventories: compactInventories,
  candidate_superset: {
    required_nav_count: Object.keys(requiredNav).length,
    bad_required_nav_count: badRequiredNav.length,
    prior_nav_route_missing_count: missingFromCandidate.nav_route_ids.length,
    prior_people_section_raw_missing_count: rawMissingFromCandidate.people_sections.length,
    approved_people_section_alias_count: approvedPeopleSectionAliases.filter((alias) => alias.redirect_verified).length,
    prior_people_section_missing_count: missingFromCandidate.people_sections.length,
    prior_hrx_route_policy_missing_count: missingFromCandidate.hrx_route_policy_ids.length,
    candidate_missing_capability_axis_count: candidateMissingAxes.length,
    candidate_source_anchor_placements: candidate.source_anchor_placement_count,
    candidate_proof_anchor_placements: candidate.proof_anchor_placement_count,
    candidate_preserved_paths: candidate.preserved_path_count,
    missing_from_candidate: missingFromCandidate,
    approved_people_section_aliases: approvedPeopleSectionAliases,
    missing_capability_axes: candidateMissingAxes,
    approved_route_label_changes: [
      { route_id: "vault", from: "Vault", to: "Search", disposition: "approved_product_rename" }
    ]
  },
  forest_checkpoint_to_candidate: {
    compared_path_count: checkpointPathChanges.length,
    byte_identical_count: checkpointPathChanges.filter((row) => row.status === "BYTE_IDENTICAL").length,
    changed_count: changedPaths.length,
    missing_count: missingPaths.length,
    changed_paths: changedPaths.map(({ axis, path, checkpoint_sha256, candidate_sha256 }) => ({ axis, path, checkpoint_sha256, candidate_sha256 }))
  },
  verdict: badRequiredNav.length === 0
    && Object.values(missingFromCandidate).every((items) => items.length === 0)
    && candidateMissingAxes.length === 0
    && missingPaths.length === 0
      ? "PASS"
      : "FAIL"
};

if (result.verdict !== "PASS") throw new Error(`CP-002 capability loss detected: ${JSON.stringify(result.candidate_superset)}`);

if (command === "--emit") {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (!existsSync(expectedPath)) throw new Error(`missing checked-in CP-002 matrix: ${expectedPath}`);
const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
if (JSON.stringify(expected) !== JSON.stringify(result)) throw new Error("checked-in CP-002 matrix does not match the exact Git object comparison");
console.log(JSON.stringify({
  verdict: result.verdict,
  targets: result.comparison_target_count,
  axes: result.capability_axis_count,
  candidate_nav: candidate.nav_items,
  candidate_people_sections: candidate.people_section_count,
  candidate_hrx_route_policies: candidate.hrx_route_policy_count,
  candidate_preserved_paths: candidate.preserved_path_count,
  missing_prior_routes: missingFromCandidate.nav_route_ids.length,
  missing_prior_sections: missingFromCandidate.people_sections.length,
  missing_prior_policies: missingFromCandidate.hrx_route_policy_ids.length,
  checkpoint_paths_changed: changedPaths.length,
  checkpoint_paths_missing: missingPaths.length
}, null, 2));
