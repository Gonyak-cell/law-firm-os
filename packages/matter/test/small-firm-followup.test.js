import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createMatterMember, createMatterTask } from "../src/model.js";
import { createMatterRepository } from "../src/repository.js";
import { buildMatterTimelineReadModel } from "../src/timeline-read-model.js";
import {
  MATTER_FOLLOW_UP_SAVED_VIEWS,
  MatterFollowUpIdempotencyError,
  createMatterFollowUpService,
  validateMatterFollowUp,
} from "../src/followup-service.js";

const tenant_id = "tenant-small-firm-followup";
const actor_id = "person-03";
const now = "2026-07-30T03:00:00.000Z";

function baseFollowUp(overrides = {}) {
  return {
    followup_id: "followup-001",
    title: "[QA] 의뢰인 자료 회신",
    channel: "email",
    status: "open",
    owner_id: actor_id,
    next_action: "자료 수신 여부 확인",
    next_action_at: "2026-07-30T05:00:00.000Z",
    ...overrides,
  };
}

function personRecord(personId, status = "active") {
  return {
    model_type: "Person",
    resource_id: personId,
    person_id: personId,
    tenant_id,
    status,
  };
}

function memberRecord(userId, status = "active") {
  return createMatterMember({
    member_id: `member-${userId}`,
    tenant_id,
    matter_id: "matter-001",
    user_id: userId,
    role: "associate",
    status,
  });
}

function matterRecord(matterId) {
  return {
    model_type: "Matter",
    resource_id: matterId,
    matter_id: matterId,
    tenant_id,
    client_id: `client-${matterId.slice("matter-".length)}`,
    matter_code: `M-${matterId}`,
    title: `Matter ${matterId}`,
    status: "open",
    created_by: actor_id,
    created_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: `perm-${matterId}`,
    audit_trace_id: `audit-${matterId}`,
  };
}

function createHarness({
  repository = createMatterRepository({
    seedRecords: [
      ...Array.from({ length: 6 }, (_, index) =>
        matterRecord(`matter-${String(index + 1).padStart(3, "0")}`)),
      personRecord("person-03"),
      personRecord("person-04"),
    ],
  }),
  createTask = ({ repository: transaction, task }) =>
    transaction.create(createMatterTask(task)),
  at = now,
} = {}) {
  let task_create_count = 0;
  const service = createMatterFollowUpService({
    repository,
    clock: () => at,
    createTask: (input) => {
      task_create_count += 1;
      return createTask(input);
    },
  });
  return {
    repository,
    service,
    taskCreateCount: () => task_create_count,
  };
}

function createFollowUp(service, followup, suffix = followup.followup_id) {
  return service.createFollowUp({
    tenant_id,
    matter_id: followup.matter_id ?? "matter-001",
    followup,
    actor_id,
    idempotency_key: `idem-create-${suffix}`,
    occurred_at: now,
  });
}

function canonicalFollowUpTaskId(followupId) {
  const sourceRef = `followup:${followupId}`;
  const digest = createHash("sha256").update(`${tenant_id}:${sourceRef}`).digest("hex");
  return `task_followup_${digest.slice(0, 20)}`;
}

function repositoryBytes(repository) {
  return JSON.stringify(repository.snapshot());
}

test("[TUW-23] follow-up states require actionable waiting ownership and close done records", () => {
  assert.throws(
    () => validateMatterFollowUp({
      ...baseFollowUp({ status: "waiting_client", owner_id: null }),
      tenant_id,
      matter_id: "matter-001",
      created_by: actor_id,
    }, { now }),
    /waiting_client requires owner_id and next_action_at/,
  );
  assert.throws(
    () => validateMatterFollowUp({
      ...baseFollowUp({ status: "waiting_firm", next_action_at: null }),
      tenant_id,
      matter_id: "matter-001",
      created_by: actor_id,
    }, { now }),
    /waiting_firm requires owner_id and next_action_at/,
  );
  assert.throws(
    () => validateMatterFollowUp({
      ...baseFollowUp({
        status: "waiting_client",
        next_action_at: "2026-07-30T05:00:00",
      }),
      tenant_id,
      matter_id: "matter-001",
      created_by: actor_id,
    }, { now }),
    /next_action_at must be an ISO timestamp with timezone/,
  );
  assert.throws(
    () => validateMatterFollowUp({
      ...baseFollowUp({ status: "snoozed", snoozed_until: null }),
      tenant_id,
      matter_id: "matter-001",
      created_by: actor_id,
    }, { now }),
    /snoozed requires snoozed_until/,
  );
  assert.throws(
    () => validateMatterFollowUp({
      ...baseFollowUp({
        status: "snoozed",
        snoozed_until: "2026-07-31T05:00:00",
      }),
      tenant_id,
      matter_id: "matter-001",
      created_by: actor_id,
    }, { now }),
    /snoozed_until must be an ISO timestamp with timezone/,
  );
  assert.throws(
    () => validateMatterFollowUp({
      ...baseFollowUp({ status: "unknown" }),
      tenant_id,
      matter_id: "matter-001",
      created_by: actor_id,
    }, { now }),
    /status is invalid/,
  );

  const waiting = validateMatterFollowUp({
    ...baseFollowUp({ status: "waiting_client" }),
    tenant_id,
    matter_id: "matter-001",
    created_by: actor_id,
  }, { now });
  assert.equal(waiting.owner_id, actor_id);
  assert.equal(waiting.next_action_at, "2026-07-30T05:00:00.000Z");

  const done = validateMatterFollowUp({
    ...baseFollowUp({ status: "done" }),
    tenant_id,
    matter_id: "matter-001",
    created_by: actor_id,
  }, { now });
  assert.equal(done.closed_at, now);

  const { service } = createHarness();
  assert.throws(
    () => service.createFollowUp({
      tenant_id,
      matter_id: "matter-001",
      followup: baseFollowUp(),
      actor_id,
      idempotency_key: "idem-timezone-less-command",
      occurred_at: "2026-07-30T03:00:00",
    }),
    /occurred_at must be an ISO timestamp with timezone/,
  );
});

test("[TUW-23/24] create and update atomically reject unknown or inactive owners", () => {
  const repository = createMatterRepository({
    seedRecords: [
      matterRecord("matter-001"),
      personRecord("person-active"),
      personRecord("person-inactive", "inactive"),
      memberRecord("member-active"),
      memberRecord("member-inactive", "removed"),
    ],
  });
  const { service } = createHarness({ repository });
  const invalidCreates = [
    { field: "owner_id", value: "person-unknown" },
    { field: "owner_id", value: "person-inactive" },
    { field: "backup_owner_id", value: "backup-unknown" },
    { field: "backup_owner_id", value: "member-inactive" },
  ];

  for (const [index, invalid] of invalidCreates.entries()) {
    const idempotencyKey = `idem-invalid-create-owner-${index + 1}`;
    const before = repository.snapshot();
    assert.throws(
      () => service.createFollowUp({
        tenant_id,
        matter_id: "matter-001",
        followup: baseFollowUp({
          followup_id: `followup-invalid-create-${index + 1}`,
          owner_id: "person-active",
          [invalid.field]: invalid.value,
        }),
        actor_id,
        idempotency_key: idempotencyKey,
        occurred_at: now,
      }),
      new RegExp(`${invalid.field} must reference an active tenant Person or same-Matter MatterMember`),
    );
    assert.deepEqual(repository.snapshot(), before);
    assert.equal(repository.getIdempotency({
      tenant_id,
      idempotency_key: idempotencyKey,
    }), undefined);
  }

  const created = service.createFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup: baseFollowUp({
      followup_id: "followup-valid-owner-paths",
      owner_id: "person-active",
      backup_owner_id: "member-active",
    }),
    actor_id,
    idempotency_key: "idem-valid-owner-paths-create",
    occurred_at: now,
  });
  assert.equal(created.item.owner_id, "person-active");
  assert.equal(created.item.backup_owner_id, "member-active");

  const invalidUpdates = [
    { field: "owner_id", value: "person-unknown" },
    { field: "owner_id", value: "person-inactive" },
    { field: "backup_owner_id", value: "backup-unknown" },
    { field: "backup_owner_id", value: "member-inactive" },
  ];
  for (const [index, invalid] of invalidUpdates.entries()) {
    const idempotencyKey = `idem-invalid-update-owner-${index + 1}`;
    const before = repository.snapshot();
    assert.throws(
      () => service.updateFollowUp({
        tenant_id,
        matter_id: "matter-001",
        followup_id: created.item.followup_id,
        patch: { [invalid.field]: invalid.value },
        actor_id,
        idempotency_key: idempotencyKey,
        occurred_at: now,
      }),
      new RegExp(`${invalid.field} must reference an active tenant Person or same-Matter MatterMember`),
    );
    assert.deepEqual(repository.snapshot(), before);
    assert.equal(repository.getIdempotency({
      tenant_id,
      idempotency_key: idempotencyKey,
    }), undefined);
  }

  const updated = service.updateFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: created.item.followup_id,
    patch: {
      owner_id: "member-active",
      backup_owner_id: "person-active",
    },
    actor_id,
    idempotency_key: "idem-valid-owner-paths-update",
    occurred_at: now,
  });
  assert.equal(updated.item.owner_id, "member-active");
  assert.equal(updated.item.backup_owner_id, "person-active");
});

test("[TUW-24] create rejects a missing or cross-tenant Matter without product-state mutation", () => {
  const { repository, service } = createHarness();
  repository.create({
    ...matterRecord("matter-cross-tenant"),
    tenant_id: "tenant-other",
  });

  for (const matterId of ["matter-missing", "matter-cross-tenant"]) {
    const idempotencyKey = `idem-followup-${matterId}`;
    const before = repositoryBytes(repository);
    assert.throws(
      () => service.createFollowUp({
        tenant_id,
        matter_id: matterId,
        followup: baseFollowUp({ followup_id: `followup-${matterId}` }),
        actor_id,
        idempotency_key: idempotencyKey,
        occurred_at: now,
      }),
      new RegExp(`Matter not found: ${matterId}`),
    );
    assert.equal(repositoryBytes(repository), before);
    assert.equal(repository.getIdempotency({
      tenant_id,
      idempotency_key: idempotencyKey,
    }), undefined);
  }
});

test("[TUW-24] create derives client_id from the canonical Matter", () => {
  const { repository, service } = createHarness();
  const created = service.createFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup: baseFollowUp({ followup_id: "followup-derived-client" }),
    actor_id,
    idempotency_key: "idem-followup-derived-client",
    occurred_at: now,
  });

  assert.equal(created.item.client_id, "client-001");
  assert.equal(repository.get({
    tenant_id,
    model_type: "MatterFollowUp",
    resource_id: "followup-derived-client",
  }).client_id, "client-001");
});

test("[TUW-24] create atomically rejects a forged same-tenant client_id", () => {
  const { repository, service } = createHarness();
  const before = repositoryBytes(repository);

  assert.throws(
    () => service.createFollowUp({
      tenant_id,
      matter_id: "matter-001",
      followup: baseFollowUp({
        followup_id: "followup-forged-client",
        client_id: "client-002",
      }),
      actor_id,
      idempotency_key: "idem-followup-forged-client",
      occurred_at: now,
    }),
    /client_id must match the canonical Matter client_id/,
  );
  assert.equal(repositoryBytes(repository), before);
  assert.equal(repository.getIdempotency({
    tenant_id,
    idempotency_key: "idem-followup-forged-client",
  }), undefined);
});

test("[TUW-24] update atomically rejects a forged client_id patch", () => {
  const { repository, service } = createHarness();
  createFollowUp(service, baseFollowUp({ client_id: "client-001" }));
  const before = repositoryBytes(repository);

  assert.throws(
    () => service.updateFollowUp({
      tenant_id,
      matter_id: "matter-001",
      followup_id: "followup-001",
      patch: { client_id: "client-002" },
      actor_id,
      idempotency_key: "idem-update-forged-client",
      occurred_at: now,
    }),
    /client_id must match the canonical Matter client_id/,
  );
  assert.equal(repositoryBytes(repository), before);
  assert.equal(repository.getIdempotency({
    tenant_id,
    idempotency_key: "idem-update-forged-client",
  }), undefined);
});

test("[TUW-24] update rejects an existing forged client_id without repairing it", () => {
  const { repository, service } = createHarness();
  repository.create(validateMatterFollowUp({
    ...baseFollowUp({ followup_id: "followup-existing-forged-client" }),
    tenant_id,
    matter_id: "matter-001",
    client_id: "client-002",
    created_by: actor_id,
  }, { now }));
  const before = repositoryBytes(repository);

  assert.throws(
    () => service.updateFollowUp({
      tenant_id,
      matter_id: "matter-001",
      followup_id: "followup-existing-forged-client",
      patch: { title: "[QA] forged client update attempt" },
      actor_id,
      idempotency_key: "idem-update-existing-forged-client",
      occurred_at: now,
    }),
    /client_id must match the canonical Matter client_id/,
  );
  assert.equal(repositoryBytes(repository), before);
  assert.equal(repository.getIdempotency({
    tenant_id,
    idempotency_key: "idem-update-existing-forged-client",
  }), undefined);
});

test("[TUW-24] update derives canonical client_id for an existing omitted value", () => {
  const { repository, service } = createHarness();
  repository.create(validateMatterFollowUp({
    ...baseFollowUp({ followup_id: "followup-existing-client-omitted" }),
    tenant_id,
    matter_id: "matter-001",
    client_id: null,
    created_by: actor_id,
  }, { now }));

  const updated = service.updateFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: "followup-existing-client-omitted",
    patch: { title: "[QA] canonical client derived" },
    actor_id,
    idempotency_key: "idem-update-derived-client",
    occurred_at: now,
  });
  assert.equal(updated.item.client_id, "client-001");
  assert.equal(repository.get({
    tenant_id,
    model_type: "MatterFollowUp",
    resource_id: "followup-existing-client-omitted",
  }).client_id, "client-001");
});

test("[TUW-24] follow-up CRUD is round-trip safe, overdue-aware, audited, and idempotent", () => {
  const { repository, service } = createHarness();
  const command = {
    tenant_id,
    matter_id: "matter-001",
    followup: baseFollowUp(),
    actor_id,
    idempotency_key: "idem-followup-create",
    occurred_at: now,
  };
  const created = service.createFollowUp(command);
  const replay = service.createFollowUp(command);
  assert.equal(created.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.item.followup_id, created.item.followup_id);
  assert.equal(repository.list({ tenant_id, model_type: "MatterFollowUp" }).length, 1);
  assert.throws(
    () => service.createFollowUp({
      ...command,
      followup: { ...command.followup, title: "[QA] 다른 요청" },
    }),
    (error) => error instanceof MatterFollowUpIdempotencyError
      && error.code === "MATTER_FOLLOW_UP_IDEMPOTENCY_CONFLICT",
  );

  const updated = service.updateFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: created.item.followup_id,
    patch: {
      status: "waiting_client",
      owner_id: "person-04",
      next_action: "의뢰인 답변 대기",
      next_action_at: "2026-07-29T09:00:00.000Z",
    },
    actor_id,
    idempotency_key: "idem-followup-update",
    occurred_at: now,
  });
  assert.equal(updated.item.status, "waiting_client");
  assert.equal(service.getFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: created.item.followup_id,
  }).overdue, true);

  const closed = service.updateFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: created.item.followup_id,
    patch: { status: "done" },
    actor_id,
    idempotency_key: "idem-followup-close",
    occurred_at: "2026-07-30T04:00:00.000Z",
  });
  assert.equal(closed.item.closed_at, "2026-07-30T04:00:00.000Z");

  const deleted = service.deleteFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: created.item.followup_id,
    actor_id,
    idempotency_key: "idem-followup-delete",
    occurred_at: "2026-07-30T04:30:00.000Z",
  });
  const deleteReplay = service.deleteFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: created.item.followup_id,
    actor_id,
    idempotency_key: "idem-followup-delete",
    occurred_at: "2026-07-30T04:30:00.000Z",
  });
  assert.equal(deleted.deleted, true);
  assert.equal(deleteReplay.idempotent_replay, true);
  assert.equal(service.listFollowUps({ tenant_id }).length, 0);
  assert.equal(repository.listAudit({ tenant_id }).length, 4);
});

test("[TUW-25] internal notes stay out of client projection and failed outbound stays failed", () => {
  const { repository, service } = createHarness();
  createFollowUp(service, baseFollowUp());

  assert.throws(
    () => service.recordContact({
      tenant_id,
      matter_id: "matter-001",
      contact: {
        contact_id: "contact-timezone-less",
        followup_id: "followup-001",
        entry_kind: "external_contact",
        channel: "email",
        direction: "inbound",
        occurred_at: "2026-07-30T01:00:00",
      },
      actor_id,
      idempotency_key: "idem-contact-timezone-less",
      occurred_at: now,
    }),
    /contact\.occurred_at must be an ISO timestamp with timezone/,
  );

  service.recordContact({
    tenant_id,
    matter_id: "matter-001",
    contact: {
      contact_id: "contact-internal",
      followup_id: "followup-001",
      entry_kind: "internal_note",
      channel: "note",
      summary: "변호사 내부 검토 의견",
      occurred_at: "2026-07-30T01:00:00.000Z",
    },
    actor_id,
    idempotency_key: "idem-contact-internal",
    occurred_at: now,
  });
  service.recordContact({
    tenant_id,
    matter_id: "matter-001",
    client_id: "client-001",
    contact: {
      contact_id: "contact-inbound",
      followup_id: "followup-001",
      entry_kind: "external_contact",
      channel: "email",
      direction: "inbound",
      summary: "의뢰인 자료 수신",
      occurred_at: "2026-07-30T02:00:00.000Z",
    },
    actor_id,
    idempotency_key: "idem-contact-inbound",
    occurred_at: now,
  });
  service.recordContact({
    tenant_id,
    matter_id: "matter-001",
    client_id: "client-001",
    contact: {
      contact_id: "contact-failed",
      followup_id: "followup-001",
      entry_kind: "external_contact",
      channel: "email",
      direction: "outbound",
      delivery_state: "failed",
      summary: "발송 실패",
      occurred_at: "2026-07-30T02:30:00.000Z",
    },
    actor_id,
    idempotency_key: "idem-contact-failed",
    occurred_at: now,
  });

  const internalView = service.listContacts({ tenant_id, matter_id: "matter-001" });
  const clientView = service.listContacts({
    tenant_id,
    matter_id: "matter-001",
    viewer: "client",
  });
  assert.equal(internalView.length, 3);
  assert.deepEqual(clientView.map((item) => item.contact_id), [
    "contact-failed",
    "contact-inbound",
  ]);
  assert.equal(clientView.some((item) => item.entry_kind === "internal_note"), false);
  const failed = clientView.find((item) => item.contact_id === "contact-failed");
  assert.equal(failed.delivery_state, "failed");
  assert.equal(failed.contact_successful, false);
  assert.equal(failed.raw_provider_payload_included, false);

  const timeline = buildMatterTimelineReadModel({
    entries: repository.list({
      tenant_id,
      matter_id: "matter-001",
      model_type: "MatterTimelineEvent",
    }),
    actor: { scopes: [] },
    tenant_id,
    matter_id: "matter-001",
  });
  assert.equal(timeline.visible_entries.length, 2);
  assert.equal(timeline.visible_entries.some((item) => item.type === "matter.followup.internal_note"), false);
});

test("[TUW-26] only successful external contact advances monotonic matter and client projections", () => {
  const { repository, service } = createHarness();
  createFollowUp(service, baseFollowUp({ client_id: "client-001" }));

  const beforeMismatch = repository.snapshot();
  assert.throws(
    () => service.recordContact({
      tenant_id,
      matter_id: "matter-001",
      client_id: "client-B",
      contact: {
        contact_id: "contact-client-mismatch",
        client_id: "client-001",
        followup_id: "followup-001",
        entry_kind: "external_contact",
        channel: "call",
        direction: "outbound",
        delivery_state: "manual_recorded",
        occurred_at: "2026-07-29T08:00:00.000Z",
      },
      actor_id,
      idempotency_key: "idem-contact-client-mismatch",
      occurred_at: now,
    }),
    /client_id must match the canonical Matter client_id/,
  );
  assert.deepEqual(repository.snapshot(), beforeMismatch);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterFollowUpContact",
  }).length, 0);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterLastContactProjection",
  }).length, 0);
  assert.equal(repository.listAudit({ tenant_id }).length, beforeMismatch.audit_events.length);
  assert.equal(repository.getIdempotency({
    tenant_id,
    idempotency_key: "idem-contact-client-mismatch",
  }), undefined);

  const firstCommand = {
    tenant_id,
    matter_id: "matter-001",
    client_id: "client-001",
    contact: {
      contact_id: "contact-current",
      followup_id: "followup-001",
      entry_kind: "external_contact",
      channel: "call",
      direction: "outbound",
      delivery_state: "manual_recorded",
      occurred_at: "2026-07-29T10:00:00.000Z",
    },
    actor_id,
    idempotency_key: "idem-contact-current",
    occurred_at: now,
  };
  service.recordContact(firstCommand);
  const replay = service.recordContact(firstCommand);
  assert.equal(replay.idempotent_replay, true);

  service.recordContact({
    ...firstCommand,
    contact: {
      contact_id: "contact-note-newer",
      followup_id: "followup-001",
      entry_kind: "internal_note",
      channel: "note",
      summary: "외부 연락이 아닌 내부 기록",
      occurred_at: "2026-07-29T12:00:00.000Z",
    },
    idempotency_key: "idem-contact-note-newer",
  });
  service.recordContact({
    ...firstCommand,
    contact: {
      contact_id: "contact-failed-newer",
      followup_id: "followup-001",
      entry_kind: "external_contact",
      channel: "email",
      direction: "outbound",
      delivery_state: "failed",
      occurred_at: "2026-07-29T13:00:00.000Z",
    },
    idempotency_key: "idem-contact-failed-newer",
  });
  service.recordContact({
    ...firstCommand,
    contact: {
      contact_id: "contact-old-reingest",
      followup_id: "followup-001",
      entry_kind: "external_contact",
      channel: "email",
      direction: "inbound",
      occurred_at: "2026-07-29T09:00:00.000Z",
    },
    idempotency_key: "idem-contact-old-reingest",
  });
  assert.equal(service.getLastContact({
    tenant_id,
    matter_id: "matter-001",
  }).last_contact_at, "2026-07-29T10:00:00.000Z");
  assert.equal(service.getLastContact({
    tenant_id,
    client_id: "client-001",
  }).last_contact_at, "2026-07-29T10:00:00.000Z");

  service.recordContact({
    ...firstCommand,
    contact: {
      contact_id: "contact-newest",
      followup_id: "followup-001",
      entry_kind: "external_contact",
      channel: "meeting",
      direction: "inbound",
      occurred_at: "2026-07-29T14:00:00.000Z",
    },
    idempotency_key: "idem-contact-newest",
  });
  assert.equal(service.getLastContact({
    tenant_id,
    matter_id: "matter-001",
  }).last_contact_at, "2026-07-29T14:00:00.000Z");
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterFollowUpContact",
  }).length, 5);
});

test("[TUW-26] contact provenance rejects matching forged clients against the canonical Matter", () => {
  const { repository, service } = createHarness();
  repository.create(validateMatterFollowUp({
    ...baseFollowUp(),
    tenant_id,
    matter_id: "matter-001",
    client_id: "client-forged",
    created_by: actor_id,
  }, { now }));
  const before = repository.snapshot();

  assert.throws(
    () => service.recordContact({
      tenant_id,
      matter_id: "matter-001",
      client_id: "client-forged",
      contact: {
        contact_id: "contact-forged-client",
        client_id: "client-forged",
        followup_id: "followup-001",
        entry_kind: "external_contact",
        channel: "email",
        direction: "outbound",
        delivery_state: "sent",
        occurred_at: "2026-07-29T15:00:00.000Z",
      },
      actor_id,
      idempotency_key: "idem-contact-forged-client",
      occurred_at: now,
    }),
    /client_id must match the canonical Matter client_id/,
  );

  assert.deepEqual(repository.snapshot(), before);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterFollowUpContact",
  }).length, 0);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterLastContactProjection",
  }).length, 0);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterTimelineEvent",
  }).length, 0);
  assert.equal(repository.listAudit({ tenant_id }).length, before.audit_events.length);
  assert.equal(repository.getIdempotency({
    tenant_id,
    idempotency_key: "idem-contact-forged-client",
  }), undefined);
});

test("[TUW-27] six follow-ups produce deterministic due, waiting-client, and stale saved views", () => {
  const { service } = createHarness();
  const fixtures = [
    baseFollowUp({
      followup_id: "followup-001",
      matter_id: "matter-001",
      status: "waiting_firm",
      next_action_at: "2026-07-30T04:00:00.000Z",
    }),
    baseFollowUp({
      followup_id: "followup-002",
      matter_id: "matter-002",
      owner_id: "person-04",
      next_action_at: "2026-07-30T08:00:00.000Z",
    }),
    baseFollowUp({
      followup_id: "followup-003",
      matter_id: "matter-003",
      status: "waiting_client",
      next_action_at: "2026-08-01T04:00:00.000Z",
    }),
    baseFollowUp({
      followup_id: "followup-004",
      matter_id: "matter-004",
      owner_id: "person-04",
      status: "waiting_client",
      next_action_at: "2026-08-02T04:00:00.000Z",
    }),
    baseFollowUp({
      followup_id: "followup-005",
      matter_id: "matter-005",
      status: "snoozed",
      next_action_at: null,
      snoozed_until: "2026-08-06T01:00:00.000Z",
    }),
    baseFollowUp({
      followup_id: "followup-006",
      matter_id: "matter-006",
      owner_id: "person-04",
      status: "done",
      next_action_at: null,
    }),
  ];
  for (const followup of fixtures) createFollowUp(service, followup);

  const contactTimes = [
    "2026-07-29T03:00:00.000Z",
    "2026-07-29T04:00:00.000Z",
    "2026-07-29T05:00:00.000Z",
    "2026-07-20T05:00:00.000Z",
    "2026-07-19T05:00:00.000Z",
    "2026-07-18T05:00:00.000Z",
  ];
  fixtures.forEach((followup, index) => {
    service.recordContact({
      tenant_id,
      matter_id: followup.matter_id,
      contact: {
        contact_id: `saved-view-contact-${index + 1}`,
        followup_id: followup.followup_id,
        entry_kind: "external_contact",
        channel: "call",
        direction: "inbound",
        occurred_at: contactTimes[index],
      },
      actor_id,
      idempotency_key: `idem-saved-view-contact-${index + 1}`,
      occurred_at: now,
    });
  });

  assert.deepEqual(MATTER_FOLLOW_UP_SAVED_VIEWS, [
    "due_today",
    "waiting_client",
    "stale_7d",
  ]);
  const due = service.listSavedView({ tenant_id, view: "due_today", now });
  const waiting = service.listSavedView({ tenant_id, view: "waiting_client", now });
  const stale = service.listSavedView({ tenant_id, view: "stale_7d", now });
  assert.deepEqual(due.map((item) => item.followup_id), ["followup-001", "followup-002"]);
  assert.deepEqual(waiting.map((item) => item.followup_id), ["followup-003", "followup-004"]);
  assert.deepEqual(stale.map((item) => item.followup_id), ["followup-004"]);
  assert.equal(due[0].deep_link, "matter://matter/matter-001?tenant=tenant-small-firm-followup");
  assert.equal(due.every((item) => item.deep_link.startsWith("matter://matter/")), true);
});

test("[TUW-28] request conversion creates one source-linked MatterTask and rolls back callback failure", () => {
  const { repository, service, taskCreateCount } = createHarness();
  createFollowUp(service, baseFollowUp({
    status: "waiting_firm",
    next_action: "준비서면 초안 작성",
  }));
  const command = {
    tenant_id,
    matter_id: "matter-001",
    followup_id: "followup-001",
    task: { due_at: "2026-07-31" },
    actor_id,
    idempotency_key: "idem-convert-followup",
    occurred_at: now,
  };
  const converted = service.convertRequestToTask(command);
  const replay = service.convertRequestToTask(command);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.task.task_id, converted.task.task_id);
  assert.equal(converted.task.source_ref, "followup:followup-001");
  assert.equal(converted.task.due_at, "2026-07-31");
  assert.equal(converted.item.linked_task_id, converted.task.task_id);
  assert.equal(taskCreateCount(), 1);
  assert.equal(repository.list({ tenant_id, model_type: "MatterTask" }).length, 1);

  const secondKey = service.convertRequestToTask({
    ...command,
    idempotency_key: "idem-convert-followup-second-key",
  });
  assert.equal(secondKey.task.task_id, converted.task.task_id);
  assert.equal(taskCreateCount(), 1);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterTimelineEvent",
    matter_id: "matter-001",
  }).filter((event) => event.type === "matter.followup.task_linked").length, 1);

  const failing = createMatterFollowUpService({
    repository,
    clock: () => now,
    createTask: ({ repository: transaction, task }) => {
      transaction.create(createMatterTask(task));
      throw new Error("simulated task callback failure");
    },
  });
  createFollowUp(failing, baseFollowUp({
    followup_id: "followup-failing",
    matter_id: "matter-002",
  }));
  assert.throws(
    () => failing.convertRequestToTask({
      tenant_id,
      matter_id: "matter-002",
      followup_id: "followup-failing",
      actor_id,
      idempotency_key: "idem-convert-failing",
      occurred_at: now,
    }),
    /simulated task callback failure/,
  );
  assert.equal(failing.getFollowUp({
    tenant_id,
    matter_id: "matter-002",
    followup_id: "followup-failing",
  }).linked_task_id, null);
  assert.equal(repository.list({ tenant_id, model_type: "MatterTask" }).length, 1);
  assert.equal(repository.getIdempotency({
    tenant_id,
    idempotency_key: "idem-convert-failing",
  }), undefined);
});

test("[TUW-28] request conversion rejects a canonical task from another Matter atomically", () => {
  const { repository, service, taskCreateCount } = createHarness();
  const taskId = canonicalFollowUpTaskId("followup-001");
  repository.create(createMatterTask({
    task_id: taskId,
    tenant_id,
    matter_id: "matter-002",
    title: "Wrong-Matter canonical task",
    status: "todo",
    created_by: actor_id,
    created_at: now,
    source_ref: "followup:followup-001",
  }));
  createFollowUp(service, baseFollowUp({
    status: "waiting_firm",
    next_action: "준비서면 초안 작성",
    linked_task_id: taskId,
  }));
  const before = repository.snapshot();

  assert.throws(
    () => service.convertRequestToTask({
      tenant_id,
      matter_id: "matter-001",
      followup_id: "followup-001",
      actor_id,
      idempotency_key: "idem-convert-cross-matter-task",
      occurred_at: now,
    }),
    /linked MatterTask matter_id does not match follow-up/,
  );
  assert.deepEqual(repository.snapshot(), before);
  assert.equal(taskCreateCount(), 0);
  assert.equal(service.getFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: "followup-001",
  }).linked_task_id, taskId);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterTimelineEvent",
    matter_id: "matter-001",
  }).filter((event) => event.type === "matter.followup.task_linked").length, 0);
  assert.equal(repository.getIdempotency({
    tenant_id,
    idempotency_key: "idem-convert-cross-matter-task",
  }), undefined);
});

test("[TUW-29] follow-up handoff moves today's queue and records one bundled audit event", () => {
  const repository = createMatterRepository({
    seedRecords: [
      matterRecord("matter-001"),
      personRecord("person-03"),
      personRecord("person-07"),
      personRecord("person-04"),
      personRecord("person-inactive", "inactive"),
      memberRecord("person-08"),
      memberRecord("backup-inactive", "removed"),
    ],
  });
  const { service } = createHarness({ repository });
  createFollowUp(service, baseFollowUp({
    status: "waiting_firm",
    owner_id: "person-03",
    backup_owner_id: "person-07",
    next_action: "의뢰인에게 검토 결과 회신",
    next_action_at: "2026-07-30T05:00:00.000Z",
  }));
  service.recordContact({
    tenant_id,
    matter_id: "matter-001",
    contact: {
      contact_id: "contact-handoff-note",
      followup_id: "followup-001",
      entry_kind: "internal_note",
      channel: "note",
      summary: "쟁점표 2번을 먼저 확인",
      occurred_at: "2026-07-30T02:00:00.000Z",
    },
    actor_id,
    idempotency_key: "idem-handoff-note",
    occurred_at: now,
  });
  service.recordContact({
    tenant_id,
    matter_id: "matter-001",
    contact: {
      contact_id: "contact-handoff-external",
      followup_id: "followup-001",
      entry_kind: "external_contact",
      channel: "call",
      direction: "inbound",
      summary: "최근 외부 통화 요약",
      occurred_at: "2026-07-30T02:30:00.000Z",
    },
    actor_id,
    idempotency_key: "idem-handoff-external",
    occurred_at: now,
  });
  const command = {
    tenant_id,
    matter_id: "matter-001",
    followup_id: "followup-001",
    to_owner_id: "person-04",
    backup_owner_id: "person-08",
    reason: "기존 담당자 부재",
    actor_id,
    idempotency_key: "idem-followup-handoff",
    occurred_at: now,
  };
  const invalidCommands = [
    {
      to_owner_id: "person-unknown",
      idempotency_key: "idem-followup-handoff-unknown-owner",
      expected: /to_owner_id must reference an active tenant Person or same-Matter MatterMember/,
    },
    {
      to_owner_id: "person-inactive",
      idempotency_key: "idem-followup-handoff-inactive-owner",
      expected: /to_owner_id must reference an active tenant Person or same-Matter MatterMember/,
    },
    {
      backup_owner_id: "backup-unknown",
      idempotency_key: "idem-followup-handoff-unknown-backup",
      expected: /backup_owner_id must reference an active tenant Person or same-Matter MatterMember/,
    },
    {
      backup_owner_id: "backup-inactive",
      idempotency_key: "idem-followup-handoff-inactive-backup",
      expected: /backup_owner_id must reference an active tenant Person or same-Matter MatterMember/,
    },
  ];
  for (const { expected, ...invalid } of invalidCommands) {
    const beforeReject = repository.snapshot();
    assert.throws(
      () => service.handoffFollowUp({ ...command, ...invalid }),
      expected,
    );
    assert.deepEqual(repository.snapshot(), beforeReject);
    assert.equal(repository.getIdempotency({
      tenant_id,
      idempotency_key: invalid.idempotency_key,
    }), undefined);
  }
  assert.equal(service.getFollowUp({
    tenant_id,
    matter_id: "matter-001",
    followup_id: "followup-001",
  }).owner_id, "person-03");
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterFollowUpHandoff",
  }).length, 0);
  assert.equal(repository.listAudit({ tenant_id })
    .filter((event) => event.action === "matter.followup.handoff").length, 0);
  assert.deepEqual(service.listSavedView({
    tenant_id,
    view: "due_today",
    owner_id: "person-03",
    now,
  }).map((item) => item.followup_id), ["followup-001"]);
  assert.equal(service.listSavedView({
    tenant_id,
    view: "due_today",
    owner_id: "person-04",
    now,
  }).length, 0);

  const handedOff = service.handoffFollowUp(command);
  const replay = service.handoffFollowUp(command);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(handedOff.item.owner_id, "person-04");
  assert.equal(handedOff.handoff_event.next_action, "의뢰인에게 검토 결과 회신");
  assert.equal(handedOff.handoff_event.recent_note, "쟁점표 2번을 먼저 확인");
  assert.equal(service.listSavedView({
    tenant_id,
    view: "due_today",
    owner_id: "person-03",
    now,
  }).length, 0);
  assert.deepEqual(service.listSavedView({
    tenant_id,
    view: "due_today",
    owner_id: "person-04",
    now,
  }).map((item) => item.followup_id), ["followup-001"]);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterFollowUpHandoff",
    matter_id: "matter-001",
  }).length, 1);
  assert.equal(repository.list({
    tenant_id,
    model_type: "MatterTimelineEvent",
    matter_id: "matter-001",
  }).filter((event) => event.type === "matter.followup.handed_off").length, 1);
  assert.equal(repository.listAudit({ tenant_id })
    .filter((event) => event.action === "matter.followup.handoff").length, 1);

  repository.update({
    tenant_id,
    model_type: "Person",
    resource_id: "person-04",
  }, { status: "inactive" });
  const beforeInactiveReplay = repository.snapshot();
  assert.throws(
    () => service.handoffFollowUp(command),
    /to_owner_id must reference an active tenant Person or same-Matter MatterMember/,
  );
  assert.deepEqual(repository.snapshot(), beforeInactiveReplay);
});
