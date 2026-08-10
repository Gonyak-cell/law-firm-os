import assert from "node:assert/strict";
import test from "node:test";

import { INTAKE_DOMAIN_DESCRIPTOR } from "../../../packages/intake/src/central-ledger.js";
import { prepareEngagementApproval } from "../../../packages/intake/src/engagement-approval-command.js";
import { approveEngagement } from "../../../packages/intake/src/engagement-service.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { runClientOperationsPostgresMigrations } from "../src/client-operations-schema.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant-postgres-engagement-legacy-startup";
const ACTOR = "actor-postgres-engagement-legacy-startup";
const KEY = "postgres-engagement-legacy-startup-key";
const ENGAGEMENT = Object.freeze({
  engagement_id: "engagement-postgres-legacy-startup",
  tenant_id: TENANT,
  intake_request_id: "intake-postgres-legacy-startup",
  signed_document_id: "document-postgres-legacy-startup",
  signature_ref: "signature:document-postgres-legacy-startup",
  signed_document_upload: Object.freeze({
    signed_document_upload_id: "signed-upload-postgres-legacy-startup",
    document_id: "document-postgres-legacy-startup",
    content_sha256: "a".repeat(64),
    byte_size: 4096,
    mime_type: "application/pdf",
  }),
});

test("operational startup blocks unresolved engagement authority before DMS composition or listen", { timeout: 30_000 }, async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const ledger = createPostgresDomainLedger({ pool: postgres.appPool });
  const repository = createIntakeRuntimeRepository({
    seedRecords: [{
      model_type: "IntakeRequest", intake_request_id: "intake-postgres-legacy-startup",
      tenant_id: TENANT, opportunity_id: "opportunity-postgres-legacy-startup",
      requesting_party_id: "party-postgres-legacy-startup",
      party_ids: ["party-postgres-legacy-startup"], status: "open", owner_user_id: ACTOR,
    }],
  });
  const first = await approveEngagement({
    repository, engagement: ENGAGEMENT, actor_id: ACTOR, idempotency_key: KEY,
  });
  const prepared = prepareEngagementApproval({
    engagement: ENGAGEMENT, actor_id: ACTOR, idempotency_key: KEY,
  });
  repository.recordIdempotency({
    tenant_id: TENANT, idempotency_key: KEY, operation: "engagement_approve",
    actor_id: ACTOR, object_type: "Engagement", object_id: prepared.engagement_id,
    request_fingerprint: prepared.request_fingerprint,
    response: first, created_at: "2026-08-08T00:00:00.000Z",
  });
  await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    repositories: [{ source_id: "parent-engagement-startup-readiness", repository }],
    tenant_id: TENANT,
  }).snapshot);
  repository.close();
  await runClientOperationsPostgresMigrations(postgres.adminPool);

  let storageCompositionCalls = 0;
  const blockedStorage = Object.freeze({
    get adapter_id() {
      storageCompositionCalls += 1;
      return "postgres-engagement-legacy-blocked-storage";
    },
  });
  const sessionSecret = "postgres-engagement-legacy-readiness-session-secret";
  const pool = {
    query: postgres.appPool.query.bind(postgres.appPool),
    connect: postgres.appPool.connect.bind(postgres.appPool),
    end: async () => {},
  };
  await assert.rejects(startApiServer({
    port: 0, runtimeProfile: "operational", sessionSecret,
    staffAuthAuthority: "internal-password",
    sessionAuth: createApiSessionAuth({
      profile: "local-dev", secret: sessionSecret, trustedTenantId: TENANT,
    }),
    stepUpAuthority: Object.freeze({}), persistenceAuthority: "postgres-v2",
    persistenceAuthorityEnv: {
      LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/intake-legacy-readiness",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/intake-legacy-readiness-tenant",
      LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID: "lawos/test/intake-legacy-readiness-payroll",
      LAWOS_IDENTITY_TENANT_ID: TENANT, LAWOS_DATA_SCOPE: "synthetic-only", AWS_REGION: "ap-northeast-2",
    },
    persistenceResolvePostgresSecret: async ({ secretId }) => (
      secretId.endsWith("-tenant") ? postgres.tenantContextSecret : postgres.instance.connection_string
    ),
    persistenceConnectPostgres: async () => pool,
    dmsStorage: blockedStorage,
  }), (error) => (
    error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED"
    && error?.safe_error_code === "INTAKE_ENGAGEMENT_LEGACY_IDEMPOTENCY_INVENTORY_NONZERO"
    && error?.readiness_receipt?.legacy_unresolved_count === 1
  ));
  assert.equal(storageCompositionCalls, 0);
});
