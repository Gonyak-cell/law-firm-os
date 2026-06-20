#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const baselineMode = process.argv.includes("--baseline");

const SCANS = [
  {
    id: "api-server-default-hrx-durable-store",
    file: "apps/api/src/server.js",
    requiredPatterns: [/createDefaultHrxRuntime/, /createFileHrxStore/, /runHrxMigrations/, /assertRuntimePersistenceStore/, /seedHrxDurableRuntimeStore/, /createHrxRuntimeContext\(\{ store: hrxStore \}\)/],
    forbiddenPatterns: [/const HRX_RUNTIME\s*=\s*createHrxRuntimeContext\(\s*\)/],
    blocker: "API server default HRX runtime must use durable store, migrations, and idempotent runtime seed.",
  },
  {
    id: "platform-persistence-port",
    file: "packages/platform/src/persistence/store-port.js",
    requiredPatterns: [/assertRuntimePersistenceStore/, /PLATFORM_PERSISTENCE_REQUIRED_METHODS/, /capabilities\.durable !== true/, /store instanceof Map/],
    blocker: "Platform persistence substrate must reject Map/non-durable runtime stores.",
  },
  {
    id: "hrx-runtime-durable-adapters",
    file: "apps/api/src/hrx-runtime-context.js",
    requiredPatterns: [/seedHrxDurableRuntimeStore/, /createSqlHrxRepository/, /createSqlHrxDocumentStore/, /createSqlLeaveBalanceLedger/, /createSqlLeaveRequestStore/, /createDurableAuditStore/],
    blocker: "HRX runtime context must expose durable repository, document, leave, and audit adapters.",
  },
  {
    id: "durable-audit-store",
    file: "packages/audit/src/durable-audit-store.js",
    requiredPatterns: [/createDurableAuditStore/, /createSqlHrxAuditEventStore/, /verifyHrxAuditHashChain/, /exportTenant/, /verifyTenant/],
    blocker: "Durable audit store must expose tenant export and hash-chain verification.",
  },
  {
    id: "master-data-runtime-repository",
    file: "apps/api/src/master-data-context.js",
    requiredPatterns: [/createMasterDataRuntimeContext/, /createMasterDataRepository/, /runtime_persistence: "file_backed_repository"/, /runtime\.repository\.list/, /runtime\.repository\.get/],
    forbiddenPatterns: [/descriptor-only/, /synthetic_only/, /synthetic_crosswalk/],
    blocker: "Master Data API context must use repository-backed runtime reads instead of descriptor/synthetic markers.",
  },
  {
    id: "hardcoded-people-ui-context",
    file: "apps/web/src/people/hrxApiClient.ts",
    forbiddenPatterns: [/const TENANT_ID = "tenant-a"/, /const ACTOR_ID = "people-ui-runtime"/, /hrx_people_ui_allow/],
    blocker: "People UI still creates a hardcoded allow context instead of relying on trusted server-side session context.",
  },
];

const findings = [];

for (const scan of SCANS) {
  const full = path.join(ROOT, scan.file);
  if (!existsSync(full)) {
    findings.push({ ...scan, severity: "missing-file", matches: ["file missing"] });
    continue;
  }
  const text = readFileSync(full, "utf8");
  const missingRequired = (scan.requiredPatterns ?? [])
    .filter((pattern) => !pattern.test(text))
    .map((pattern) => `missing:${pattern.source}`);
  const forbiddenMatches = (scan.forbiddenPatterns ?? [])
    .filter((pattern) => pattern.test(text))
    .map((pattern) => `forbidden:${pattern.source}`);
  const matches = [...missingRequired, ...forbiddenMatches];
  if (matches.length > 0) findings.push({ ...scan, severity: "blocker", matches });
}

if (baselineMode) {
  console.log("CMP R4 blocker baseline.");
  console.log(`blockers: ${findings.length}`);
  for (const finding of findings) {
    console.log(`- ${finding.id}: ${finding.file}`);
    console.log(`  reason: ${finding.blocker}`);
  }
  process.exit(0);
}

if (findings.length > 0) {
  console.error("CMP R4 blockers remain:");
  for (const finding of findings) {
    console.error(`- ${finding.id}: ${finding.file}`);
    console.error(`  ${finding.blocker}`);
  }
  process.exit(1);
}

console.log("CMP R4 blocker audit passed.");
