import assert from "node:assert/strict";
import test from "node:test";
import { handleAiPostgresApiRequest } from "../../../apps/api/src/ai-runtime-context.js";
import {
  AI_GOVERNANCE_APPEND_ONLY_RECORD_TYPES,
  AI_GOVERNANCE_DOMAIN_DESCRIPTOR,
  adjudicateAiOutput,
  createAiGovernanceDomainSnapshot,
  createAiGovernanceRepository,
  createAiOutput,
  createAiOutputExport,
  createAiPolicy,
  createCitationLedger,
  createPromptLog,
  createRetrievalRequest,
  invokeModelGateway,
  reconcileAiGovernanceRecords,
  runAiGovernancePostgresCommand,
} from "../src/index.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { reportDomainReceiptEvidence } from "../../persistence/test/helpers/domain-receipt-evidence.js";

const TENANT = "tenant-rs-dom-ai";
const MATTER = "matter-rs-dom-ai";
const ACTOR = "user-rs-dom-ai";
const POLICY = "policy-rs-dom-ai";
const RETRIEVAL = "retrieval-rs-dom-ai";

function permissionContext() {
  return {
    principal: {
      user_id: ACTOR,
      tenant_id: TENANT,
      role_ids: ["partner"],
      scopes: ["ai.write"],
    },
    rules: [{ id: "allow-ai-rs-dom", effect: "allow", action: "*" }],
    object_acl: [],
  };
}

function buildAiSource() {
  const repository = createAiGovernanceRepository();
  const policy = createAiPolicy({
    repository,
    policy: {
      ai_policy_id: POLICY,
      tenant_id: TENANT,
      matter_id: MATTER,
      matter_sensitivity_routes: ["public", "confidential", "privileged"],
      privilege_label_routes: ["attorney_client", "work_product", "legal_hold"],
    },
    actor_id: ACTOR,
    idempotency_key: "policy-rs-dom-ai",
  });
  const retrieval = createRetrievalRequest({
    repository,
    retrieval_request: {
      retrieval_request_id: RETRIEVAL,
      tenant_id: TENANT,
      matter_id: MATTER,
      ai_policy_id: policy.ai_policy.ai_policy_id,
      source_refs: [{ source_type: "dms_document", source_id: "document-rs-dom-ai" }],
      retrieved_doc_ids: ["document-rs-dom-ai"],
      raw_payload: "must-not-persist",
    },
    actor_id: ACTOR,
    idempotency_key: "retrieval-rs-dom-ai",
  });
  const prompt = createPromptLog({
    repository,
    prompt_log: {
      prompt_log_id: "prompt-rs-dom-ai",
      tenant_id: TENANT,
      matter_id: MATTER,
      retrieval_request_id: retrieval.retrieval_request.retrieval_request_id,
      raw_prompt: "must-not-persist",
    },
    actor_id: ACTOR,
    idempotency_key: "prompt-rs-dom-ai",
  });
  const gateway = invokeModelGateway({
    repository,
    invocation: {
      gateway_invocation_id: "gateway-rs-dom-ai",
      tenant_id: TENANT,
      matter_id: MATTER,
      model_ref: "synthetic-model-rs-dom-ai",
      policy_checked: true,
      retrieval_request_id: retrieval.retrieval_request.retrieval_request_id,
      raw_prompt: "must-not-persist",
      raw_output: "must-not-persist",
    },
    actor_id: ACTOR,
    idempotency_key: "gateway-rs-dom-ai",
  });
  const output = createAiOutput({
    repository,
    ai_output: {
      ai_output_id: "output-rs-dom-ai",
      tenant_id: TENANT,
      matter_id: MATTER,
      prompt_log_id: prompt.prompt_log.prompt_log_id,
      gateway_invocation_id: gateway.model_gateway_invocation.gateway_invocation_id,
      output_digest: "sha256:synthetic-output-rs-dom-ai",
      raw_output: "must-not-persist",
    },
    actor_id: ACTOR,
    idempotency_key: "output-rs-dom-ai",
  });
  createCitationLedger({
    repository,
    citation_ledger: {
      citation_ledger_id: "citation-rs-dom-ai",
      tenant_id: TENANT,
      matter_id: MATTER,
      ai_output_id: output.ai_output.ai_output_id,
      sources: [{ source_type: "dms_document", source_id: "document-rs-dom-ai", page_ref: "1" }],
      raw_source_payload: "must-not-persist",
    },
    actor_id: ACTOR,
    idempotency_key: "citation-rs-dom-ai",
  });
  adjudicateAiOutput({
    repository,
    tenant_id: TENANT,
    review_task_id: output.review_task.review_task_id,
    decision: "approve_with_findings",
    reviewer_id: "attorney-rs-dom-ai",
    actor_id: ACTOR,
    idempotency_key: "adjudication-rs-dom-ai",
  });
  createAiOutputExport({
    repository,
    ai_output_export: {
      ai_output_export_id: "export-rs-dom-ai",
      tenant_id: TENANT,
      matter_id: MATTER,
      ai_output_id: output.ai_output.ai_output_id,
      privilege_label_inherited: true,
      dms_acl_inherited: true,
      external_share_boundary_checked: true,
      raw_output: "must-not-persist",
    },
    actor_id: ACTOR,
    idempotency_key: "export-rs-dom-ai",
  });
  return repository;
}

test("AI governance domain snapshot preserves policy, review, citation, audit, and raw-payload boundaries", () => {
  const repository = buildAiSource();
  try {
    const source = createAiGovernanceDomainSnapshot({
      repositories: [{ source_id: "ai-governance-file-v2", repository }],
      tenant_id: TENANT,
    });
    assert.equal(source.inventory.reconciliation.policy_count, 1);
    assert.equal(source.inventory.reconciliation.retrieval_count, 1);
    assert.equal(source.inventory.reconciliation.prompt_log_count, 1);
    assert.equal(source.inventory.reconciliation.output_count, 1);
    assert.equal(source.inventory.reconciliation.citation_ledger_count, 1);
    assert.equal(source.inventory.reconciliation.closed_review_task_count, 1);
    assert.equal(source.inventory.reconciliation.export_count, 1);
    assert.equal(source.inventory.reconciliation.promotes_ai_output_to_final_count, 0);
    assert.equal(source.inventory.reconciliation.invariant_passed, true);
    assert.deepEqual(source.inventory.append_only_record_types, AI_GOVERNANCE_APPEND_ONLY_RECORD_TYPES);
    assert.equal(JSON.stringify(source.snapshot).includes("must-not-persist"), false);
    assert.ok(source.snapshot.audit_events.some((event) => event.event_type === "ai.review.adjudicate"));
    assert.ok(source.snapshot.audit_events.some((event) => event.event_type === "ai.citation.ledger"));

    const tamperedRecords = repository.snapshot().records.map((record) => structuredClone(record));
    tamperedRecords.find((record) => record.model_type === "AiOutput").raw_output = "plaintext-output";
    assert.throws(
      () => reconcileAiGovernanceRecords(tamperedRecords),
      (error) => error?.safe_error_code === "AI_RAW_PAYLOAD_REJECTED",
    );

    const tamperedRepository = createAiGovernanceRepository({
      seedRecords: repository.snapshot().records,
      preserveSeedRecords: true,
    });
    tamperedRepository.recordIdempotency({
      tenant_id: TENANT,
      idempotency_key: "tampered-idempotency-rs-dom-ai",
      operation: "tampered",
      response: { raw_output: "plaintext-output" },
    });
    assert.throws(
      () => createAiGovernanceDomainSnapshot({ repositories: [tamperedRepository], tenant_id: TENANT }),
      (error) => error?.safe_error_code === "AI_RAW_PAYLOAD_REJECTED",
    );
    tamperedRepository.close();
  } finally {
    repository.close();
  }
});

test("AI governance PostgreSQL import, async API, append-only guard, shadow, and rehearsal preserve invariants", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T23:00:00.000Z"),
  });
  const repository = buildAiSource();
  const source = createAiGovernanceDomainSnapshot({
    repositories: [{ source_id: "ai-governance-file-v2", repository }],
    tenant_id: TENANT,
  });
  repository.close();

  const imported = await ledger.importSnapshot(source.snapshot);
  assert.equal(imported.replayed, false);
  assert.equal(imported.receipt.rejected_count, 0);
  const secondImport = await ledger.importSnapshot(source.snapshot);
  assert.equal(secondImport.replayed, true);
  const shadow = await ledger.compareSnapshot(source.snapshot);
  assert.equal(shadow.comparison.equal, true);
  const rehearsal = await ledger.recordRehearsal({
    tenant_id: TENANT,
    domain_id: AI_GOVERNANCE_DOMAIN_DESCRIPTOR.domain_id,
    import_receipt_id: imported.receipt.receipt_id,
    shadow_receipt_id: shadow.receipt.receipt_id,
    smoke_result: {
      status: "passed",
      synthetic_only: true,
      environment: "test",
      adapter: "ai-governance-postgres-domain-ledger",
      executed_at: "2026-07-16T23:00:00.000Z",
      source_snapshot_hash: shadow.comparison.source_hash,
      checks: {
        source_imported: imported.receipt.status === "source_imported",
        idempotency_replayed: secondImport.replayed,
        shadow_equal: shadow.comparison.equal,
        readback_equal: shadow.comparison.source_hash === shadow.comparison.target_hash,
        json_dual_write_absent: true,
      },
      production_migrated: false,
    },
  });

  const api = await handleAiPostgresApiRequest({
    ledger,
    pathname: "/api/ai/outputs",
    method: "POST",
    query: {},
    body: {
      permission_ref: "perm-rs-dom-ai",
      audit_hint_ref: "audit-rs-dom-ai",
      actor_id: ACTOR,
      idempotency_key: "api-output-rs-dom-ai",
      prompt_log: {
        prompt_log_id: "api-prompt-rs-dom-ai",
        tenant_id: TENANT,
        matter_id: MATTER,
        retrieval_request_id: RETRIEVAL,
        raw_prompt: "must-not-persist",
      },
      ai_output: {
        ai_output_id: "api-output-rs-dom-ai",
        tenant_id: TENANT,
        matter_id: MATTER,
        output_digest: "sha256:synthetic-api-output-rs-dom-ai",
        raw_output: "must-not-persist",
      },
    },
    context: permissionContext(),
    requestId: "request-output-rs-dom-ai",
  });
  assert.equal(api.response.status, 201);
  assert.equal(api.response.body.item.ai_output_id, "api-output-rs-dom-ai");
  assert.equal(Object.hasOwn(api.response.body.item, "raw_output"), false);
  assert.equal(api.persistence.shadow_equal, true);
  assert.equal(api.persistence.production_migrated, false);
  const persistedOutput = await ledger.read({
    tenant_id: TENANT,
    domain_id: AI_GOVERNANCE_DOMAIN_DESCRIPTOR.domain_id,
    record_type: "AiOutput",
    record_id: "api-output-rs-dom-ai",
  });
  assert.equal(Object.hasOwn(persistedOutput.payload, "raw_output"), false);

  await assert.rejects(
    runAiGovernancePostgresCommand({
      ledger,
      tenant_id: TENANT,
      command(materializedRepository) {
        return materializedRepository.update(
          { tenant_id: TENANT, model_type: "AiOutput", ai_output_id: "output-rs-dom-ai" },
          { status: "tampered" },
        );
      },
    }),
  );

  const targetRecords = await ledger.list({ tenant_id: TENANT, domain_id: AI_GOVERNANCE_DOMAIN_DESCRIPTOR.domain_id });
  const reconciliation = reconcileAiGovernanceRecords(targetRecords.map((record) => record.payload));
  assert.equal(reconciliation.output_count, 2);
  assert.equal(reconciliation.closed_review_task_count, 1);
  assert.equal(reconciliation.open_review_task_count, 1);
  assert.equal(reconciliation.promotes_ai_output_to_final_count, 0);
  assert.equal(reconciliation.invariant_passed, true);
  assert.equal(JSON.stringify(targetRecords).includes("must-not-persist"), false);

  const auditEvents = await ledger.listAudit({ tenant_id: TENANT, domain_id: AI_GOVERNANCE_DOMAIN_DESCRIPTOR.domain_id });
  assert.ok(auditEvents.some((event) => event.event_type === "ai.output.create"));
  assert.ok(auditEvents.some((event) => event.event_type === "ai.review.adjudicate"));
  assert.ok(auditEvents.some((event) => event.event_type === "ai.citation.ledger"));

  assert.equal(rehearsal.status, "source_ready");
  assert.equal(rehearsal.production_migrated, false);
  reportDomainReceiptEvidence({ source: source.snapshot, imported, secondImport, shadow, rehearsal });
});
