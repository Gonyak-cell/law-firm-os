import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createAiGovernanceRepository } from "../packages/ai-governance/src/runtime-repository.js";
import { createAnalyticsRepository } from "../packages/analytics/src/runtime-repository.js";
import { createFinanceRepository } from "../packages/billing/src/finance-repository.js";
import { createClientPortalRepository } from "../packages/client-portal/src/runtime-repository.js";
import { createCrmRuntimeRepository } from "../packages/crm/src/runtime-repository.js";
import { createDmsRepository } from "../packages/dms/src/repository.js";
import { createEnterpriseReadinessRepository } from "../packages/enterprise/src/enterprise-readiness-repository.js";
import { runHrxMigrations } from "../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../packages/hrx/src/store/file-store.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../packages/master-data/src/repository.js";
import { createMatterRepository } from "../packages/matter/src/repository.js";
import { createUiReadinessRepository } from "../packages/platform/src/ui-readiness-repository.js";

const ROOT = process.cwd();
const ARTIFACT_JSON = join(ROOT, "artifacts/manual-qa/upl-a06-all-domain-durable-roundtrip-proof.json");
const ARTIFACT_MD = join(ROOT, "artifacts/manual-qa/upl-a06-all-domain-durable-roundtrip-proof.md");
const TENANT = "tenant_upl_a06_durable";
const OWNER = "user_upl_a06_owner";

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function storeFile(path) {
  return {
    path,
    exists: existsSync(path),
    bytes: existsSync(path) ? statSync(path).size : 0,
    sha256: existsSync(path) ? createHash("sha256").update(readFileSync(path)).digest("hex") : null,
  };
}

function recordProbe({ domain, model_type, id_field, id, extra = {} }) {
  return {
    domain,
    model_type,
    id_field,
    id,
    record: {
      model_type,
      tenant_id: TENANT,
      [id_field]: id,
      ...extra,
    },
    ref: {
      tenant_id: TENANT,
      model_type,
      [id_field]: id,
    },
  };
}

function runRepositoryProbe({ domain, path, createRepository, probe, schemaReader = null }) {
  const first = createRepository({ filePath: path });
  const written = first.create(probe.record);
  const firstRead = first.get(probe.ref);
  const second = createRepository({ filePath: path });
  const secondRead = second.get(probe.ref);
  const state = schemaReader ? schemaReader(path, second) : { migrations: [...(second.migrations ?? [])] };
  return {
    domain,
    store_path: path,
    durable: (first.durable === true || first.capabilities?.durable === true) &&
      (second.durable === true || second.capabilities?.durable === true),
    model_type: probe.model_type,
    id: probe.id,
    first_read_present: Boolean(firstRead),
    second_read_present: Boolean(secondRead),
    first_hash: sha256(firstRead),
    second_hash: sha256(secondRead),
    hash_stable_after_reopen: sha256(firstRead) === sha256(secondRead),
    schema: state,
    store_file: storeFile(path),
  };
}

function runHrxProbe(path) {
  const first = createFileHrxStore({ filePath: path });
  const firstMigrationResults = runHrxMigrations(first);
  first.query("insert", {
    table: "hrx_employees",
    row: {
      tenant_id: TENANT,
      employee_id: "emp_upl_a06_durable_001",
      display_name: "UPL A06 Durable Employee",
      status: "active",
      created_at: "2026-07-03T00:00:00.000+09:00",
    },
  });
  const firstRead = first.query("selectOne", {
    table: "hrx_employees",
    where: { tenant_id: TENANT, employee_id: "emp_upl_a06_durable_001" },
  });
  const second = createFileHrxStore({ filePath: path });
  const secondMigrationResults = runHrxMigrations(second);
  const secondRead = second.query("selectOne", {
    table: "hrx_employees",
    where: { tenant_id: TENANT, employee_id: "emp_upl_a06_durable_001" },
  });
  const snapshot = second.snapshot();
  return {
    domain: "hrx",
    store_path: path,
    durable: first.capabilities.durable === true && second.capabilities.durable === true,
    model_type: "hrx_employees",
    id: "emp_upl_a06_durable_001",
    first_read_present: Boolean(firstRead),
    second_read_present: Boolean(secondRead),
    first_hash: sha256(firstRead),
    second_hash: sha256(secondRead),
    hash_stable_after_reopen: sha256(firstRead) === sha256(secondRead),
    schema: {
      schema_version: snapshot.schema_version,
      migration_count: snapshot.applied_migrations.length,
      first_migration_results: firstMigrationResults,
      second_migration_results: secondMigrationResults,
    },
    store_file: storeFile(path),
  };
}

function runMasterDataProbe({ domain, path, id }) {
  const probe = recordProbe({
    domain,
    model_type: "Entity",
    id_field: "entity_id",
    id,
    extra: {
      entity_kind: "organization",
      display_name: `${domain} durable entity`,
      status: "active",
      owner_user_id: OWNER,
    },
  });
  return runRepositoryProbe({
    domain,
    path,
    createRepository: createMasterDataRepository,
    probe,
    schemaReader: (filePath) => {
      const state = JSON.parse(readFileSync(filePath, "utf8"));
      return { schema_version: state.schema_version };
    },
  });
}

function allPassed(results) {
  return results.every((result) => (
    result.durable === true &&
    result.first_read_present === true &&
    result.second_read_present === true &&
    result.hash_stable_after_reopen === true &&
    result.store_file.exists === true &&
    result.store_file.bytes > 0
  ));
}

async function main() {
  const storeDir = await mkdtemp(join(tmpdir(), "lawos-upl-a06-durable-"));
  const paths = {
    hrx: join(storeDir, "hrx-store.json"),
    master_data: join(storeDir, "master-data-store.json"),
    matter: join(storeDir, "matter-store.json"),
    dms: join(storeDir, "dms-store.json"),
    crm: join(storeDir, "crm-store.json"),
    intake: join(storeDir, "intake-store.json"),
    crm_master_data: join(storeDir, "crm-master-data-store.json"),
    finance: join(storeDir, "finance-store.json"),
    analytics: join(storeDir, "analytics-store.json"),
    ai_governance: join(storeDir, "ai-store.json"),
    client_portal: join(storeDir, "portal-store.json"),
    ui_readiness: join(storeDir, "ui-readiness-store.json"),
    enterprise_readiness: join(storeDir, "enterprise-readiness-store.json"),
  };

  const probes = [
    runHrxProbe(paths.hrx),
    runMasterDataProbe({ domain: "master_data", path: paths.master_data, id: "entity_upl_a06_master_001" }),
    runRepositoryProbe({
      domain: "matter",
      path: paths.matter,
      createRepository: createMatterRepository,
      probe: recordProbe({
        domain: "matter",
        model_type: "Matter",
        id_field: "matter_id",
        id: "matter_upl_a06_durable_001",
        extra: {
          client_id: "client_upl_a06_durable",
          client_display_name: "UPL A06 Durable Client",
          matter_code: "UPL-A06/LIT/CIV/ROUNDTRIP",
          matter_name: "UPL A06 Durable Matter",
          title: "UPL A06 Durable Matter",
          status: "open",
          created_by: OWNER,
          created_at: "2026-07-03T00:00:00.000+09:00",
          permission_envelope_id: "perm_upl_a06_matter",
          audit_trace_id: "audit_upl_a06_matter",
        },
      }),
    }),
    runRepositoryProbe({
      domain: "dms",
      path: paths.dms,
      createRepository: createDmsRepository,
      probe: recordProbe({
        domain: "dms",
        model_type: "DmsWorkspace",
        id_field: "workspace_id",
        id: "workspace_upl_a06_durable_001",
        extra: {
          matter_id: "matter_upl_a06_durable_001",
          name: "UPL A06 Durable Workspace",
          status: "active",
          permission_envelope_id: "perm_upl_a06_dms",
          audit_trace_id: "audit_upl_a06_dms",
        },
      }),
    }),
    runRepositoryProbe({
      domain: "crm",
      path: paths.crm,
      createRepository: createCrmRuntimeRepository,
      probe: recordProbe({
        domain: "crm",
        model_type: "Lead",
        id_field: "lead_id",
        id: "lead_upl_a06_durable_001",
        extra: {
          party_id: "party_upl_a06_durable",
          display_name: "UPL A06 Durable Lead",
          status: "active",
          owner_user_id: OWNER,
        },
      }),
    }),
    runRepositoryProbe({
      domain: "intake",
      path: paths.intake,
      createRepository: createIntakeRuntimeRepository,
      probe: recordProbe({
        domain: "intake",
        model_type: "IntakeRequest",
        id_field: "intake_request_id",
        id: "intake_upl_a06_durable_001",
        extra: {
          opportunity_id: "opportunity_upl_a06_durable",
          requesting_party_id: "party_upl_a06_durable",
          party_ids: ["party_upl_a06_durable"],
          status: "open",
          owner_user_id: OWNER,
        },
      }),
    }),
    runMasterDataProbe({ domain: "crm_master_data", path: paths.crm_master_data, id: "entity_upl_a06_crm_master_001" }),
    runRepositoryProbe({
      domain: "finance",
      path: paths.finance,
      createRepository: createFinanceRepository,
      probe: recordProbe({
        domain: "finance",
        model_type: "Invoice",
        id_field: "invoice_id",
        id: "invoice_upl_a06_durable_001",
        extra: { matter_id: "matter_upl_a06_durable_001", status: "draft", total_amount: 1000 },
      }),
    }),
    runRepositoryProbe({
      domain: "analytics",
      path: paths.analytics,
      createRepository: createAnalyticsRepository,
      probe: recordProbe({
        domain: "analytics",
        model_type: "AnalyticsDashboard",
        id_field: "dashboard_id",
        id: "dashboard_upl_a06_durable_001",
        extra: { title: "UPL A06 Durable Dashboard", status: "draft" },
      }),
    }),
    runRepositoryProbe({
      domain: "ai_governance",
      path: paths.ai_governance,
      createRepository: createAiGovernanceRepository,
      probe: recordProbe({
        domain: "ai_governance",
        model_type: "AiPolicy",
        id_field: "ai_policy_id",
        id: "ai_policy_upl_a06_durable_001",
        extra: { policy_name: "UPL A06 Durable AI Policy", status: "draft" },
      }),
    }),
    runRepositoryProbe({
      domain: "client_portal",
      path: paths.client_portal,
      createRepository: createClientPortalRepository,
      probe: recordProbe({
        domain: "client_portal",
        model_type: "ExternalUser",
        id_field: "external_user_id",
        id: "external_user_upl_a06_durable_001",
        extra: { email: "upl-a06@example.invalid", client_group_id: "client_group_upl_a06" },
      }),
    }),
    runRepositoryProbe({
      domain: "ui_readiness",
      path: paths.ui_readiness,
      createRepository: createUiReadinessRepository,
      probe: recordProbe({
        domain: "ui_readiness",
        model_type: "UiReadinessCheck",
        id_field: "ui_check_id",
        id: "ui_check_upl_a06_durable_001",
        extra: { tuw_id: "UPL-A-06", route_id: "all-domain-durable", ui_surface_id: "runtime-store-proof" },
      }),
    }),
    runRepositoryProbe({
      domain: "enterprise_readiness",
      path: paths.enterprise_readiness,
      createRepository: createEnterpriseReadinessRepository,
      probe: recordProbe({
        domain: "enterprise_readiness",
        model_type: "EnterpriseReadinessItem",
        id_field: "enterprise_item_id",
        id: "enterprise_item_upl_a06_durable_001",
        extra: { item_type: "durable_store_roundtrip", control_ref: "UPL-A-06" },
      }),
    }),
  ];

  const artifact = {
    schema_version: "lawos.wave1.upl-a06.all-domain-durable-roundtrip-proof.v1",
    generated_at: new Date().toISOString(),
    row_id: "UPL-A-06",
    status: allPassed(probes) ? "PASS" : "FAIL",
    owner_db_decision_boundary: {
      local_wave1_owner_boundary_closed: true,
      selected_local_runtime_boundary: "per-domain file-backed durable stores with schema or migration metadata",
      external_production_database_decision_claim: false,
      production_ready_claim: false,
      all_domain_roundtrip_locally_possible: true,
    },
    domain_count: probes.length,
    expected_domains: Object.keys(paths),
    domains: probes,
  };

  mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
  writeFileSync(ARTIFACT_JSON, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    ARTIFACT_MD,
    [
      "# UPL-A-06 All-Domain Durable Roundtrip Proof",
      "",
      `Status: ${artifact.status}`,
      "",
      `- Domains: ${artifact.domain_count}`,
      `- Local Wave-1 owner boundary closed: ${artifact.owner_db_decision_boundary.local_wave1_owner_boundary_closed}`,
      `- External production DB decision claimed: ${artifact.owner_db_decision_boundary.external_production_database_decision_claim}`,
      `- Production-ready claim: ${artifact.owner_db_decision_boundary.production_ready_claim}`,
      "",
      "| Domain | Store file | Reopen readback | Schema/migration |",
      "|---|---:|---:|---|",
      ...probes.map((result) => (
        `| ${result.domain} | ${result.store_file.bytes} | ${result.second_read_present && result.hash_stable_after_reopen} | ${JSON.stringify(result.schema)} |`
      )),
      "",
    ].join("\n"),
  );

  if (artifact.status !== "PASS") throw new Error(`UPL-A-06 durable roundtrip failed: ${ARTIFACT_JSON}`);
  console.log(`UPL-A-06 all-domain durable roundtrip proof PASS -> ${ARTIFACT_JSON}`);
}

await main();
