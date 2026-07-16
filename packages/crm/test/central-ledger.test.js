import assert from "node:assert/strict";
import test from "node:test";
import {
  CRM_RUNTIME_SEED,
  INTAKE_RUNTIME_SEED,
} from "../../../apps/api/src/crm-intake-runtime-context.js";
import { createIntakeRequest } from "../../intake/src/intake-request-service.js";
import { INTAKE_DOMAIN_DESCRIPTOR } from "../../intake/src/central-ledger.js";
import { createIntakeRuntimeRepository } from "../../intake/src/runtime-repository.js";
import {
  createRecordRepositoryDomainSnapshot,
  runRecordRepositoryDomainCommand,
  runRecordRepositoryMultiDomainCommand,
} from "../../persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { reportDomainReceiptEvidence } from "../../persistence/test/helpers/domain-receipt-evidence.js";
import { CRM_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { handoffOpportunityToIntake } from "../src/intake-handoff-service.js";
import { createOpportunity } from "../src/opportunity-service.js";
import { createCrmRuntimeRepository } from "../src/runtime-repository.js";

const TENANT = "tenant_cmp_g6_synthetic";
const ACTOR = "user_rs_dom_rehearsal";

function sourceSnapshot(descriptor, repository, sourceId) {
  return createRecordRepositoryDomainSnapshot({
    descriptor,
    repositories: [{ source_id: sourceId, repository }],
    tenant_id: TENANT,
  }).snapshot;
}

test("CRM and Intake inventories fix shared references, clearance append-only records and PII names", () => {
  const crm = createCrmRuntimeRepository({ seedRecords: CRM_RUNTIME_SEED });
  const intake = createIntakeRuntimeRepository({ seedRecords: INTAKE_RUNTIME_SEED });
  try {
    const crmResult = createRecordRepositoryDomainSnapshot({
      descriptor: CRM_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "crm-file-v2", repository: crm }],
      tenant_id: TENANT,
    });
    const intakeResult = createRecordRepositoryDomainSnapshot({
      descriptor: INTAKE_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "intake-file-v2", repository: intake }],
      tenant_id: TENANT,
    });
    assert.equal(crmResult.inventory.canonical_record_count, 5);
    assert.equal(crmResult.inventory.external_reference_count, 4);
    assert.equal(intakeResult.inventory.canonical_record_count, 2);
    assert.equal(intakeResult.inventory.external_reference_count, 1);
    assert.equal(INTAKE_DOMAIN_DESCRIPTOR.append_only({ model_type: "ConflictDecision" }), true);
    assert.equal(INTAKE_DOMAIN_DESCRIPTOR.append_only({ model_type: "ClearanceToken" }), true);
    assert.equal(intakeResult.inventory.pii_field_names.includes("party_snapshot"), true);
  } finally {
    crm.close();
    intake.close();
  }
});

test("CRM/Intake PostgreSQL imports, async ports and handoff rehearsal preserve both domain readbacks", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T18:20:00.000Z"),
  });
  const crmSourceRepository = createCrmRuntimeRepository({ seedRecords: CRM_RUNTIME_SEED });
  const intakeSourceRepository = createIntakeRuntimeRepository({ seedRecords: INTAKE_RUNTIME_SEED });
  const crmSource = sourceSnapshot(CRM_DOMAIN_DESCRIPTOR, crmSourceRepository, "crm-file-v2");
  const intakeSource = sourceSnapshot(INTAKE_DOMAIN_DESCRIPTOR, intakeSourceRepository, "intake-file-v2");
  crmSourceRepository.close();
  intakeSourceRepository.close();

  const crmImport = await ledger.importSnapshot(crmSource);
  const intakeImport = await ledger.importSnapshot(intakeSource);
  const crmSecondImport = await ledger.importSnapshot(crmSource);
  const intakeSecondImport = await ledger.importSnapshot(intakeSource);
  assert.equal(crmSecondImport.replayed, true);
  assert.equal(intakeSecondImport.replayed, true);
  const crmShadow = await ledger.compareSnapshot(crmSource);
  const intakeShadow = await ledger.compareSnapshot(intakeSource);
  assert.equal(crmShadow.comparison.equal, true);
  assert.equal(intakeShadow.comparison.equal, true);

  await runRecordRepositoryDomainCommand({
    ledger,
    descriptor: CRM_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createCrmRuntimeRepository,
    command(repository) {
      return createOpportunity({
        repository,
        opportunity: {
          opportunity_id: "opp_rs_dom_handoff_001",
          tenant_id: TENANT,
          party_id: "party_cmp_g6_client_001",
          display_name: "Central ledger handoff rehearsal",
          stage: "qualified",
          status: "active",
          owner_user_id: ACTOR,
        },
        actor_id: ACTOR,
        idempotency_key: "crm-opportunity-rs-dom-001",
      });
    },
  });

  const handoffCommand = await runRecordRepositoryMultiDomainCommand({
    ledger,
    tenant_id: TENANT,
    domains: [
      { key: "crm", descriptor: CRM_DOMAIN_DESCRIPTOR, create_repository: createCrmRuntimeRepository },
      { key: "intake", descriptor: INTAKE_DOMAIN_DESCRIPTOR, create_repository: createIntakeRuntimeRepository },
    ],
    command({ crm, intake }) {
      return handoffOpportunityToIntake({
        crmRepository: crm,
        intakeService: {
          createIntakeRequest: ({ request, actor_id, idempotency_key }) =>
            createIntakeRequest({ repository: intake, request, actor_id, idempotency_key }),
        },
        tenant_id: TENANT,
        opportunity_id: "opp_rs_dom_handoff_001",
        intake_request_id: "intake_rs_dom_handoff_001",
        actor_id: ACTOR,
        idempotency_key: "crm-intake-handoff-rs-dom-001",
      });
    },
  });
  const handoff = handoffCommand.result;
  assert.equal(handoff.opportunity.stage, "intake_requested");
  assert.equal(handoff.intake_request.creates_matter, false);
  const intakeFlush = handoffCommand.flushes.intake;
  const crmFlush = handoffCommand.flushes.crm;
  assert.equal(intakeFlush.comparison.equal, true);
  assert.equal(crmFlush.comparison.equal, true);

  await runRecordRepositoryDomainCommand({
    ledger,
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createIntakeRuntimeRepository,
    command(repository) {
      return repository.create({
        model_type: "ConflictDecision",
        conflict_decision_id: "decision_rs_dom_atomic_001",
        tenant_id: TENANT,
        intake_request_id: "intake_cmp_g6_synthetic_001",
        conflict_check_id: "conflict_cmp_g6_synthetic_001",
        reviewer_id: ACTOR,
        decision: "clear",
        status: "recorded",
      });
    },
  });

  await assert.rejects(
    runRecordRepositoryMultiDomainCommand({
      ledger,
      tenant_id: TENANT,
      domains: [
        { key: "crm", descriptor: CRM_DOMAIN_DESCRIPTOR, create_repository: createCrmRuntimeRepository },
        { key: "intake", descriptor: INTAKE_DOMAIN_DESCRIPTOR, create_repository: createIntakeRuntimeRepository },
      ],
      command({ crm, intake }) {
        crm.create({
          model_type: "Lead",
          lead_id: "lead_rs_dom_must_rollback_001",
          tenant_id: TENANT,
          party_id: "party_cmp_g6_client_001",
          display_name: "Must roll back with Intake conflict",
          status: "active",
          owner_user_id: ACTOR,
        });
        intake.update(
          {
            tenant_id: TENANT,
            model_type: "ConflictDecision",
            conflict_decision_id: "decision_rs_dom_atomic_001",
          },
          { decision: "blocked" },
        );
      },
    }),
  );
  assert.equal(await ledger.read({
    tenant_id: TENANT,
    domain_id: "crm",
    record_type: "Lead",
    record_id: "lead_rs_dom_must_rollback_001",
  }), undefined);

  for (const receipt of [
    [crmSource, crmImport, crmSecondImport, crmShadow, crmFlush],
    [intakeSource, intakeImport, intakeSecondImport, intakeShadow, intakeFlush],
  ]) {
    const [source, imported, secondImport, shadow, flush] = receipt;
    const { domain_id } = source;
    const rehearsal = await ledger.recordRehearsal({
      tenant_id: TENANT,
      domain_id,
      import_receipt_id: imported.receipt.receipt_id,
      shadow_receipt_id: shadow.receipt.receipt_id,
      smoke_result: {
        adapter: `${domain_id}-postgres-domain-ledger`,
        handoff_readback_equal: flush.comparison.equal,
        creates_matter: false,
        production_migrated: false,
      },
    });
    assert.equal(rehearsal.status, "source_ready");
    assert.equal(rehearsal.production_migrated, false);
    reportDomainReceiptEvidence({ source, imported, secondImport, shadow, rehearsal });
  }
});
