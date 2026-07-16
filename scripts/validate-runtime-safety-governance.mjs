#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import {
  DERIVED_STORE_PATH_MANIFEST,
  STORE_PATH_MANIFEST,
} from "../apps/api/src/store-path-manifest.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLAN_PATH = "workbook/lawos-runtime-safety-central-ledger-detailed-tuw-execution-plan-2026-07-16.md";
const EVIDENCE_ROOT = "workbook/lawos-runtime-safety-evidence";
const APPROVED_PLAN_SHA = "1d2df30e235d3080aaa877bb6e01b0a43be8e5c5";

const EXPECTED_WORKSTREAM_COUNTS = Object.freeze({
  "RS-GOV": 8,
  "RS-SA": 8,
  "RS-SB": 10,
  "RS-DUR": 12,
  "RS-STO": 15,
  "RS-BKP": 8,
  "RS-DBF": 12,
  "RS-IDN": 10,
  "RS-DOM": 30,
  "RS-DMS": 10,
  "RS-PRJ": 6,
  "RS-OFF": 6,
  "RS-CUT": 12,
});

const EXPECTED_EXTERNAL_KEYS = Object.freeze([
  "EXT-PLAN-APPROVAL",
  "EXT-AWS-BACKUP",
  "EXT-PG-PROD",
  "EXT-STAGING",
  "EXT-REAL-DATA",
  "EXT-DMS-PROVIDER",
  "EXT-IDP",
  "EXT-RETENTION",
  "EXT-PROD-WINDOW",
  "EXT-RELEASE",
  "EXT-WIN-SIGN",
]);

function absolute(path) {
  return join(ROOT, path);
}

function readText(path) {
  return readFileSync(absolute(path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function sameSet(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

function sourceFilesUnder(path) {
  const output = [];
  const visit = (current) => {
    for (const name of readdirSync(current)) {
      const fullPath = join(current, name);
      const rel = relative(ROOT, fullPath).replaceAll("\\", "/");
      if (name === "node_modules" || name === "dist" || name === "test" || name === "tests") continue;
      const stat = statSync(fullPath);
      if (stat.isDirectory()) visit(fullPath);
      else if (/\.(?:js|mjs)$/.test(name) && !/\.test\./.test(name)) output.push(rel);
    }
  };
  visit(absolute(path));
  return output.sort();
}

function discoverDirectFsWriters() {
  const writerCall = /\b(?:writeFileSync|appendFileSync|renameSync|writeFile|appendFile|rename)\s*\(/;
  return [...sourceFilesUnder("apps/api/src"), ...sourceFilesUnder("packages")]
    .filter((path) => {
      const source = readText(path);
      return /node:fs(?:\/promises)?/.test(source) && writerCall.test(source);
    })
    .sort();
}

function discoverDurableWriterUsers() {
  return [...sourceFilesUnder("apps/api/src"), ...sourceFilesUnder("packages")]
    .filter((path) => readText(path).includes("writeJsonFileDurably"))
    .sort();
}

function parsePlan(plan) {
  const rows = plan.split("\n")
    .filter((line) => /^\| `RS-[A-Z]+-\d{3}` \|/.test(line))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      const id = cells[0]?.match(/`(RS-[A-Z]+-\d{3})`/)?.[1];
      return { id, cells };
    });

  assert.equal(rows.length, 147, "expected 147 TUW rows");
  assert.equal(new Set(rows.map((row) => row.id)).size, 147, "TUW IDs must be unique");
  for (const row of rows) {
    assert.equal(row.cells.length, 7, `${row.id} must have seven ledger cells`);
    assert.equal(row.cells.every(Boolean), true, `${row.id} contains an empty ledger cell`);
  }

  const ids = new Set(rows.map((row) => row.id));
  const graph = new Map();
  for (const row of rows) {
    const dependencies = [...row.cells[4].matchAll(/RS-[A-Z]+-\d{3}/g)].map((match) => match[0]);
    for (const dependency of dependencies) assert.equal(ids.has(dependency), true, `${row.id} has missing dependency ${dependency}`);
    graph.set(row.id, dependencies);
  }

  const colors = new Map();
  const visit = (id, stack = []) => {
    const color = colors.get(id) ?? 0;
    assert.notEqual(color, 1, `dependency cycle: ${[...stack, id].join(" -> ")}`);
    if (color === 2) return;
    colors.set(id, 1);
    for (const dependency of graph.get(id) ?? []) visit(dependency, [...stack, id]);
    colors.set(id, 2);
  };
  for (const id of ids) visit(id);

  const workstreams = {};
  for (const row of rows) {
    const workstream = row.id.replace(/-\d{3}$/, "");
    workstreams[workstream] ??= { count: 0, terminals: [] };
    workstreams[workstream].count += 1;
    if (/; terminal(?:,|\s|$)/.test(row.cells[6])) workstreams[workstream].terminals.push(row.id);
  }
  assert.equal(sameSet(Object.keys(workstreams), Object.keys(EXPECTED_WORKSTREAM_COUNTS)), true, "workstream set drifted");
  for (const [workstream, count] of Object.entries(EXPECTED_WORKSTREAM_COUNTS)) {
    assert.equal(workstreams[workstream].count, count, `${workstream} TUW count drifted`);
    assert.equal(workstreams[workstream].terminals.length, 1, `${workstream} must have exactly one final terminal`);
  }

  const externalKeys = [...plan.matchAll(/^\| `(EXT-[A-Z-]+)` \|/gm)].map((match) => match[1]);
  assert.equal(sameSet(externalKeys, EXPECTED_EXTERNAL_KEYS), true, "external dependency registry drifted");
  for (const row of rows) {
    if (/(?:human|hybrid)/.test(row.cells[1]) && row.cells[6].includes("STOP-EXT")) {
      assert.match(row.cells[6], /(?:EXT-[A-Z-]+|EXT-\*)/, `${row.id} lacks an external approval key`);
    }
  }

  const sourceSection = plan.split("## 16. 주요 source reference")[1] ?? "";
  const sourceRefs = [...sourceSection.matchAll(/^- `([^`]+)`$/gm)].map((match) => match[1]);
  assert.equal(sourceRefs.length, 34, "source reference count drifted");
  for (const sourceRef of sourceRefs) assert.equal(existsSync(absolute(sourceRef)), true, `missing source reference ${sourceRef}`);

  return { rows, workstreams, externalKeys, sourceRefs };
}

function validateWriterInventory() {
  const inventory = readJson(`${EVIDENCE_ROOT}/RS-GOV-003/writer-inventory.json`);
  assert.equal(inventory.source_sha, APPROVED_PLAN_SHA);
  assert.equal(inventory.required_manifest_path_count, STORE_PATH_MANIFEST.length);
  assert.equal(inventory.derived_path_count, DERIVED_STORE_PATH_MANIFEST.length);
  assert.equal(sameSet(inventory.paths.map((entry) => entry.key), STORE_PATH_MANIFEST.map((entry) => entry.key)), true, "manifest writer coverage drifted");
  assert.equal(sameSet(inventory.derived_paths.map((entry) => entry.key), DERIVED_STORE_PATH_MANIFEST.map((entry) => entry.key)), true, "derived writer coverage drifted");
  assert.equal(sameSet(inventory.direct_fs_writer_files, discoverDirectFsWriters()), true, "direct filesystem writer inventory drifted");
  assert.equal(sameSet(inventory.durable_writer_users, discoverDurableWriterUsers()), true, "durable writer user inventory drifted");
  for (const entry of [...inventory.paths, ...inventory.derived_paths, ...inventory.out_of_manifest_writers]) {
    for (const sourcePath of entry.source_paths ?? []) assert.equal(existsSync(absolute(sourcePath)), true, `missing writer source ${sourcePath}`);
  }
  return inventory;
}

function validateGovernanceArtifacts() {
  const callGraph = readJson(`${EVIDENCE_ROOT}/RS-GOV-004/repository-call-graph.json`);
  assert.equal(callGraph.source_sha, APPROVED_PLAN_SHA);
  assert.equal(callGraph.nodes.length, 16);
  assert.equal(sameSet(callGraph.nodes.map((entry) => entry.store_key), STORE_PATH_MANIFEST.map((entry) => entry.key)), true, "repository call graph store set drifted");
  for (const node of callGraph.nodes) for (const path of node.source_paths) assert.equal(existsSync(absolute(path)), true, `missing call graph source ${path}`);

  const classification = readJson(`${EVIDENCE_ROOT}/RS-GOV-005/store-authority-classification.json`);
  assert.equal(classification.source_sha, APPROVED_PLAN_SHA);
  assert.equal(classification.unresolved_policy_count, 0);
  assert.equal(sameSet(classification.paths.map((entry) => entry.key), STORE_PATH_MANIFEST.map((entry) => entry.key)), true, "authority classification store set drifted");
  assert.equal(classification.derived_paths.length, 1);

  const dependencies = readJson(`${EVIDENCE_ROOT}/RS-GOV-006/external-dependency-ledger.json`);
  assert.equal(dependencies.source_sha, APPROVED_PLAN_SHA);
  assert.equal(sameSet(dependencies.dependencies.map((entry) => entry.key), EXPECTED_EXTERNAL_KEYS), true, "external dependency evidence drifted");
  assert.equal(dependencies.dependencies.find((entry) => entry.key === "EXT-PLAN-APPROVAL")?.status, "approved_source_only");
  assert.equal(dependencies.dependencies.filter((entry) => entry.status === "approval_required").length, 10);

  const approval = readJson(`${EVIDENCE_ROOT}/RS-GOV-008/source-implementation-approval.json`);
  assert.equal(approval.decision, "APPROVED_SOURCE_IMPLEMENTATION");
  assert.equal(approval.approved_plan_sha, APPROVED_PLAN_SHA);
  assert.equal(approval.boundary.release_approved, false);
  assert.equal(approval.boundary.aws_mutation_approved, false);
  assert.equal(approval.boundary.production_migration_approved, false);
  assert.equal(approval.boundary.go_live_approved, false);

  for (let index = 1; index <= 8; index += 1) {
    const tuwId = `RS-GOV-${String(index).padStart(3, "0")}`;
    const evidence = readJson(`${EVIDENCE_ROOT}/${tuwId}/command-evidence.json`);
    assert.equal(evidence.tuw_id, tuwId);
    assert.equal(evidence.source_sha, APPROVED_PLAN_SHA);
    assert.equal(evidence.claims.production_ready, false);
    assert.equal(evidence.claims.release_executed, false);
    assert.equal(evidence.claims.aws_mutation_executed, false);
    assert.equal(evidence.claims.go_live, false);
  }

  return { callGraph, classification, dependencies, approval };
}

function main() {
  const plan = parsePlan(readText(PLAN_PATH));
  const inventory = validateWriterInventory();
  const artifacts = validateGovernanceArtifacts();
  console.log(JSON.stringify({
    verdict: "PASS",
    validator: "runtime-safety-governance",
    approved_plan_sha: APPROVED_PLAN_SHA,
    tuw_count: plan.rows.length,
    workstream_count: Object.keys(plan.workstreams).length,
    final_terminal_count: Object.values(plan.workstreams).filter((entry) => entry.terminals.length === 1).length,
    required_manifest_path_count: inventory.paths.length,
    derived_path_count: inventory.derived_paths.length,
    direct_fs_writer_file_count: inventory.direct_fs_writer_files.length,
    repository_call_graph_node_count: artifacts.callGraph.nodes.length,
    external_dependency_count: artifacts.dependencies.dependencies.length,
    source_implementation_approved: true,
    external_execution_approved: false,
    production_ready_claim: false,
    go_live_claim: false,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}
