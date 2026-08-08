import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createDefaultDmsRuntime,
  startApiServer,
} from "../src/server.js";
import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import {
  createOriginalEmailFilingPlacement,
} from "../../../packages/email-dms/src/email-filing-correction-model.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import {
  CORRECTION_ACTOR_ID,
  DOCUMENT_ID,
  MATTER_A,
  MATTER_B,
  MIME_SHA256,
  RECEIPT_ID,
  TENANT_ID,
  THREAD_ID,
  originalFiling,
  seedOriginalFiling,
} from "../../../packages/email-dms/test/helpers/email-filing-correction-fixture.js";

const TOKEN = "Bearer outm21-signed-session";

function matterSeed() {
  const createdAt = "2026-08-08T00:00:00.000Z";
  return [
    {
      model_type: "MatterClient",
      tenant_id: TENANT_ID,
      client_id: "client-outm21",
      client_display_name: "OUTM-21 고객",
      client_short_name: "OUTM21",
      status: "active",
      created_by: CORRECTION_ACTOR_ID,
      created_at: createdAt,
    },
    ...[MATTER_A, MATTER_B].map((matterId) => ({
      model_type: "Matter",
      tenant_id: TENANT_ID,
      matter_id: matterId,
      matter_code: `OUTM21/${matterId}`,
      matter_name: matterId,
      client_id: "client-outm21",
      client_display_name: "OUTM-21 고객",
      title: matterId,
      status: "open",
      created_by: CORRECTION_ACTOR_ID,
      created_at: createdAt,
      permission_envelope_id: `perm:${matterId}`,
      audit_trace_id: `audit:${matterId}`,
    })),
  ];
}

function signedSessionAuth({ denyCorrection = false, objectAcl = [] } = {}) {
  const principal = Object.freeze({
    source: "api-signed-session",
    header_only_trust_allowed: false,
    tenant_id: TENANT_ID,
    user_id: CORRECTION_ACTOR_ID,
    actor_id: CORRECTION_ACTOR_ID,
    role_ids: Object.freeze(["outlook_addin_user"]),
    scopes: Object.freeze(["matter.read", "matter.write"]),
  });
  const context = Object.freeze({
    principal,
    rules: Object.freeze([{ id: "outm21-allow", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([
      ...(denyCorrection ? [{
        id: "outm21-deny-correction",
        effect: "deny",
        principal_id: CORRECTION_ACTOR_ID,
        action: "outlook:email:correct",
      }] : []),
      ...objectAcl,
    ]),
  });
  return Object.freeze({
    async resolvePermissionContextFromHeaders(headers) {
      if (headers.authorization !== TOKEN) return Object.freeze({ ok: false, status: 401 });
      return Object.freeze({
        ok: true,
        principal,
        context,
        token_payload: Object.freeze({ surface: "outlook_addin" }),
      });
    },
  });
}

async function startFixture({
  matterFilePath,
  matterRepository: injectedMatterRepository,
  denyCorrection = false,
  objectAcl = [],
} = {}) {
  const matterRepository = injectedMatterRepository ?? createMatterRepository({
    filePath: matterFilePath,
    seedRecords: matterSeed(),
  });
  const dmsRepository = createDmsRepository();
  seedOriginalFiling(dmsRepository);
  const emailDmsRepository = createEmailDmsRepository();
  const started = await startApiServer({
    port: 0,
    matterRuntime: Object.freeze({ repository: matterRepository }),
    dmsRuntime: createDefaultDmsRuntime({ repository: dmsRepository }),
    emailDmsRuntime: Object.freeze({ repository: emailDmsRepository }),
    sessionAuth: signedSessionAuth({ denyCorrection, objectAcl }),
  });
  return Object.freeze({
    baseUrl: `http://${started.host}:${started.port}`,
    server: started.server,
    matterRepository,
    dmsRepository,
    emailDmsRepository,
    async close({ closeMatter = true } = {}) {
      await new Promise((resolve) => started.server.close(resolve));
      if (closeMatter) matterRepository.close();
      dmsRepository.close();
      emailDmsRepository.close();
    },
  });
}

async function request(fixture, path, { method = "GET", body, requestId } = {}) {
  const response = await fetch(`${fixture.baseUrl}${path}`, {
    method,
    headers: {
      authorization: TOKEN,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return Object.freeze({ response, body: await response.json() });
}

function correctionBody(current, overrides = {}) {
  return {
    email_thread_id: THREAD_ID,
    original_receipt_id: RECEIPT_ID,
    document_id: DOCUMENT_ID,
    mime_sha256: MIME_SHA256,
    source_matter_id: MATTER_A,
    target_matter_id: MATTER_B,
    expected_placement_id: current.placement_id,
    reason: "담당 Matter 정정",
    idempotency_key: "outm21-a-to-b",
    ...overrides,
  };
}

function currentPath() {
  return `/api/outlook/email/corrections/current?email_thread_id=${encodeURIComponent(THREAD_ID)}`;
}

test("OUTM-21 correction API commits one append-only correction and both Matter projections", async () => {
  const root = mkdtempSync(join(tmpdir(), "outm21-api-"));
  const matterFilePath = join(root, "matter.json");
  const fixture = await startFixture({ matterFilePath });
  let created;
  try {
    const beforeDms = fixture.dmsRepository.snapshot();
    const initial = await request(fixture, currentPath());
    assert.equal(initial.response.status, 200);
    assert.deepEqual(initial.body.item, {
      placement_id: createOriginalEmailFilingPlacement(originalFiling()).placement_id,
      correction_id: createOriginalEmailFilingPlacement(originalFiling()).correction_id,
      event_kind: "original",
      email_thread_id: THREAD_ID,
      original_receipt_id: RECEIPT_ID,
      matter_id: MATTER_A,
      document_id: DOCUMENT_ID,
      mime_sha256: MIME_SHA256,
      occurred_at: originalFiling().occurred_at,
      status: "original",
      copied_mime: false,
    });

    created = await request(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item, {
        tenant_id: undefined,
        actor_id: "forged-body-actor",
      }),
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.outcome, "created");
    assert.equal(created.body.item.matter_id, MATTER_B);
    assert.equal(created.body.item.document_id, DOCUMENT_ID);
    assert.equal(created.body.item.mime_sha256, MIME_SHA256);
    assert.equal(created.body.item.copied_mime, false);
    assert.equal(created.body.timeline_events.length, 2);

    const replay = await request(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item),
    });
    assert.equal(replay.response.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.outcome, "idempotent_replay");
    assert.equal(replay.body.item.placement_id, created.body.item.placement_id);

    const changedFingerprint = await request(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item, { reason: "다른 이유" }),
    });
    assert.equal(changedFingerprint.response.status, 409);
    assert.deepEqual(changedFingerprint.body.safe_error_codes, [
      "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT",
    ]);

    const stale = await request(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial.body.item, {
        idempotency_key: "outm21-stale",
      }),
    });
    assert.equal(stale.response.status, 409);
    assert.deepEqual(stale.body.safe_error_codes, [
      "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
    ]);

    const current = await request(fixture, currentPath());
    assert.equal(current.response.status, 200);
    assert.equal(current.body.item.placement_id, created.body.item.placement_id);
    assert.equal(current.body.item.matter_id, MATTER_B);

    const placements = fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementEvent",
    });
    assert.equal(placements.filter((entry) => entry.event_kind === "original").length, 1);
    assert.equal(placements.filter((entry) => entry.event_kind === "correction").length, 1);
    const references = fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementReference",
    });
    assert.equal(references.length, 1);
    assert.equal(references[0].matter_id, MATTER_B);
    assert.equal(references[0].document_id, DOCUMENT_ID);
    assert.equal(references[0].mime_sha256, MIME_SHA256);
    assert.equal(references[0].copied_mime, false);
    const timeline = fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "MatterTimelineEvent",
    }).filter((entry) => entry.correction_id === created.body.item.correction_id);
    assert.deepEqual(timeline.map((entry) => entry.matter_id).sort(), [MATTER_A, MATTER_B].sort());
    assert.ok(timeline.every((entry) => entry.document_id === DOCUMENT_ID));
    assert.ok(timeline.every((entry) => entry.mime_sha256 === MIME_SHA256));
    const audits = fixture.matterRepository.listAudit({
      tenant_id: TENANT_ID,
      object_id: created.body.item.correction_id,
    });
    assert.equal(audits.length, 1);
    assert.equal(audits[0].actor_id, CORRECTION_ACTOR_ID);
    const receipt = fixture.matterRepository.getIdempotency({
      tenant_id: TENANT_ID,
      idempotency_key: "outlook-email-correction:outm21-a-to-b",
    });
    assert.equal(receipt.response.placement_id, created.body.item.placement_id);
    assert.equal(receipt.response.timeline_event_ids.length, 2);
    assert.deepEqual(fixture.dmsRepository.snapshot(), beforeDms);
  } finally {
    await fixture.close();
  }

  const restarted = await startFixture({
    matterFilePath,
    objectAcl: [{
      id: "outm21-deny-former-source-read",
      effect: "deny",
      principal_id: CORRECTION_ACTOR_ID,
      resource_id: MATTER_A,
      action: "outlook:matter:read",
    }],
  });
  try {
    const current = await request(restarted, currentPath());
    assert.equal(current.response.status, 200);
    assert.equal(current.body.item.placement_id, created.body.item.placement_id);
    assert.equal(current.body.item.matter_id, MATTER_B);
    assert.equal(JSON.stringify(current.body).includes(MATTER_A), false);
  } finally {
    await restarted.close();
  }
});

test("OUTM-21 denies before Matter disclosure and rejects unsigned authority claims", async () => {
  const fixture = await startFixture({ denyCorrection: true });
  try {
    const initial = createOriginalEmailFilingPlacement(originalFiling());
    const readable = await request(fixture, currentPath());
    assert.equal(readable.response.status, 200);
    assert.equal(readable.body.item.placement_id, initial.placement_id);
    const deniedReal = await request(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      requestId: "req-outm21-denied-real",
      body: correctionBody(initial),
    });
    const deniedUnknown = await request(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      requestId: "req-outm21-denied-unknown",
      body: correctionBody(initial, { target_matter_id: "matter-not-disclosed" }),
    });
    assert.equal(deniedReal.response.status, 403);
    assert.equal(deniedUnknown.response.status, 403);
    for (const denial of [deniedReal, deniedUnknown]) {
      assert.deepEqual(denial.body.safe_error_codes, [
        "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED",
      ]);
      assert.equal(denial.body.item, null);
      assert.equal(denial.body.count_leak_prevented, true);
      assert.equal(JSON.stringify(denial.body).includes(MATTER_B), false);
      assert.equal(JSON.stringify(denial.body).includes("matter-not-disclosed"), false);
    }

    const forged = await request(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial, {
        tenant_id: "forged-tenant",
        actor_id: "forged-actor",
      }),
    });
    assert.equal(forged.response.status, 400);
    assert.deepEqual(forged.body.safe_error_codes, ["OUTLOOK_EMAIL_CORRECTION_INVALID"]);
    assert.equal(fixture.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementEvent",
    }).length, 0);
  } finally {
    await fixture.close();
  }

  const targetOnly = await startFixture({
    objectAcl: [{
      id: "outm21-deny-source-correction",
      effect: "deny",
      principal_id: CORRECTION_ACTOR_ID,
      resource_id: MATTER_A,
      action: "outlook:email:correct",
    }],
  });
  try {
    const denied = await request(targetOnly, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(createOriginalEmailFilingPlacement(originalFiling())),
    });
    assert.equal(denied.response.status, 403);
    assert.deepEqual(denied.body.safe_error_codes, [
      "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED",
    ]);
    assert.equal(targetOnly.matterRepository.list({
      tenant_id: TENANT_ID,
      model_type: "EmailFilingPlacementEvent",
    }).length, 0);
  } finally {
    await targetOnly.close();
  }
});

test("OUTM-21 identity conflicts and target-link failures leave no partial projection", async () => {
  const baseMatterRepository = createMatterRepository({ seedRecords: matterSeed() });
  let failTargetLink = true;
  let matterRepository;
  matterRepository = Object.freeze({
    ...baseMatterRepository,
    transaction(fn) {
      return baseMatterRepository.transaction(() => fn(matterRepository));
    },
    create(record) {
      if (failTargetLink && record.model_type === "EmailFilingPlacementReference") {
        failTargetLink = false;
        throw new Error("synthetic target-link failure");
      }
      return baseMatterRepository.create(record);
    },
  });
  const fixture = await startFixture({ matterRepository });
  try {
    const initial = createOriginalEmailFilingPlacement(originalFiling());
    for (const overrides of [
      { email_thread_id: "thread-not-canonical" },
      { original_receipt_id: "receipt-not-canonical" },
      { document_id: "document-not-canonical" },
      { mime_sha256: "b".repeat(64) },
    ]) {
      const conflict = await request(fixture, "/api/outlook/email/corrections", {
        method: "POST",
        body: correctionBody(initial, overrides),
      });
      assert.equal(conflict.response.status, 409);
      assert.deepEqual(conflict.body.safe_error_codes, [
        "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT",
      ]);
      assert.equal(conflict.body.item, null);
    }

    const failed = await request(fixture, "/api/outlook/email/corrections", {
      method: "POST",
      body: correctionBody(initial),
    });
    assert.equal(failed.response.status, 500);
    assert.deepEqual(failed.body.safe_error_codes, ["OUTLOOK_EMAIL_CORRECTION_FAILED"]);
    for (const modelType of [
      "EmailFilingPlacementEvent",
      "EmailFilingPlacementReference",
      "MatterTimelineEvent",
    ]) {
      assert.equal(baseMatterRepository.list({
        tenant_id: TENANT_ID,
        model_type: modelType,
      }).length, 0);
    }
    assert.equal(baseMatterRepository.listAudit({ tenant_id: TENANT_ID }).length, 0);
    assert.equal(baseMatterRepository.getIdempotency({
      tenant_id: TENANT_ID,
      idempotency_key: "outlook-email-correction:outm21-a-to-b",
    }), undefined);
  } finally {
    await fixture.close({ closeMatter: false });
    baseMatterRepository.close();
  }
});
