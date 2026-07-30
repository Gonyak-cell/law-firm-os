import { createHash } from "node:crypto";
import { createLead } from "../../../packages/crm/src/lead-service.js";
import {
  inquiryEmailEvidenceId,
} from "../../../packages/email-dms/src/inquiry-evidence-model.js";

export const OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES = Object.freeze({
  evidence_quarantined: "OUTLOOK_INQUIRY_EVIDENCE_QUARANTINED",
  identity_conflict: "OUTLOOK_INQUIRY_IDENTITY_CONFLICT",
  idempotency_conflict: "OUTLOOK_INQUIRY_IDEMPOTENCY_CONFLICT",
  lead_not_found: "OUTLOOK_INQUIRY_LEAD_NOT_FOUND",
  link_conflict: "OUTLOOK_INQUIRY_LINK_CONFLICT",
  runtime_unavailable: "OUTLOOK_INQUIRY_RUNTIME_UNAVAILABLE",
});

function commandError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function requiredString(input, field, maxLength = 2048) {
  const value = input?.[field];
  if (
    typeof value !== "string"
    || value.trim() === ""
    || value.trim().length > maxLength
  ) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stableId(prefix, input) {
  return `${prefix}_${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 32)}`;
}

function assertRepository(repository, methods, label) {
  if (
    !repository
    || methods.some((method) => typeof repository[method] !== "function")
  ) {
    throw commandError(
      OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.runtime_unavailable,
      `${label} repository is unavailable`,
      503,
    );
  }
}

function registrationAction(input = {}) {
  const action = requiredString(input, "action", 32);
  if (!["new", "link_existing"].includes(action)) {
    throw new TypeError("action must be new or link_existing");
  }
  if (action === "link_existing") {
    requiredString(input, "existing_lead_id", 512);
  } else if (input.existing_lead_id != null) {
    throw new TypeError("existing_lead_id is only allowed for link_existing");
  }
  return action;
}

function safeDisplayName(evidence) {
  const senderName = String(evidence.sender?.display_name ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/gu, "")
    .trim()
    .slice(0, 200);
  return senderName || "이메일 문의자";
}

function leadDisplayName(evidence) {
  const subject = String(evidence.subject ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/gu, "")
    .trim()
    .slice(0, 200);
  return subject || `${safeDisplayName(evidence)} 문의`;
}

function processKey(tenantId, idempotencyKey) {
  return `outlook-inquiry-registration:${sha256(JSON.stringify({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  }))}`;
}

function processIdentity({
  tenantId,
  idempotencyKey,
  restMessageId,
  action,
  existingLeadId,
}) {
  return Object.freeze({
    process_id: stableId("outlook_inquiry_registration", {
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
    }),
    rest_message_ref: sha256(restMessageId),
    action,
    existing_lead_id: existingLeadId ?? null,
  });
}

function assertSameProcess(prior, expected) {
  const actual = prior?.response;
  if (
    !actual
    || actual.process_id !== expected.process_id
    || actual.rest_message_ref !== expected.rest_message_ref
    || actual.action !== expected.action
    || (actual.existing_lead_id ?? null)
      !== (expected.existing_lead_id ?? null)
  ) {
    throw commandError(
      OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.idempotency_conflict,
      "Inquiry registration request key was already used for another action",
    );
  }
  return actual;
}

function getEvidence(repository, tenantId, evidenceId) {
  return repository.get({
    tenant_id: tenantId,
    model_type: "InquiryEmailEvidence",
    inquiry_email_evidence_id: evidenceId,
  });
}

function getLead(repository, tenantId, leadId) {
  return repository.get({
    tenant_id: tenantId,
    model_type: "Lead",
    lead_id: leadId,
  });
}

function getParty(repository, tenantId, partyId) {
  return repository.get({
    tenant_id: tenantId,
    model_type: "Party",
    party_id: partyId,
  });
}

function safeResult({
  process,
  evidence,
  partyId,
  leadId,
  reused,
}) {
  return Object.freeze({
    outcome: "registered",
    process_id: process.process_id,
    action: process.action,
    inquiry_email_evidence_id: evidence.inquiry_email_evidence_id,
    party_id: partyId,
    lead_id: leadId,
    capture_status: evidence.capture_status,
    steps: Object.freeze({
      message_resolved: "complete",
      evidence_stored: "complete",
      party_resolved: "complete",
      lead_resolved: "complete",
      evidence_linked: "complete",
    }),
    created: Object.freeze({
      evidence: reused.evidence !== true,
      party: reused.party !== true && process.action === "new",
      lead: reused.lead !== true && process.action === "new",
    }),
    idempotent_replay:
      reused.process === true
      || reused.evidence === true
      || reused.link === true,
    raw_content_included: false,
    credential_material_included: false,
    production_ready_claim: false,
  });
}

function completedReplay({
  process,
  emailDmsRepository,
  masterDataRepository,
  crmRepository,
}) {
  const evidence = getEvidence(
    emailDmsRepository,
    process.tenant_id,
    process.inquiry_email_evidence_id,
  );
  const lead = getLead(
    crmRepository,
    process.tenant_id,
    process.lead_id,
  );
  const party = lead
    ? getParty(
      masterDataRepository,
      process.tenant_id,
      lead.party_id,
    )
    : null;
  if (
    !evidence
    || evidence.capture_status !== "complete"
    || evidence.lead_id !== process.lead_id
    || !lead
    || !party
  ) {
    throw commandError(
      OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.link_conflict,
      "Completed inquiry registration records do not reconcile",
      502,
    );
  }
  return safeResult({
    process,
    evidence,
    partyId: party.party_id,
    leadId: lead.lead_id,
    reused: {
      process: true,
      evidence: true,
      party: true,
      lead: true,
      link: true,
    },
  });
}

function senderParty({
  repository,
  tenantId,
  actorId,
  evidence,
  occurredAt,
}) {
  const senderAddress = requiredString(
    evidence.sender,
    "address",
    320,
  ).normalize("NFKC").toLowerCase();
  const identityKey =
    `${tenantId}:outlook-inquiry-email-sha256:${sha256(senderAddress)}`;
  const partyMatches = repository
    .list({ tenant_id: tenantId, model_type: "Party" })
    .filter((party) => party.identity_key === identityKey);
  const personPartyIds = repository
    .list({ tenant_id: tenantId, model_type: "Person" })
    .filter((person) => (
      typeof person.email === "string"
      && person.email.trim().normalize("NFKC").toLowerCase()
        === senderAddress
      && person.party_id
    ))
    .map((person) => person.party_id);
  const contactPartyIds = repository
    .list({ tenant_id: tenantId, model_type: "ContactPoint" })
    .filter((contact) => (
      contact.contact_type === "email"
      && typeof contact.value === "string"
      && contact.value.trim().normalize("NFKC").toLowerCase()
        === senderAddress
      && contact.owner_party_id
    ))
    .map((contact) => contact.owner_party_id);
  const matchingPartyIds = new Set([
    ...partyMatches.map((party) => party.party_id),
    ...personPartyIds,
    ...contactPartyIds,
  ]);
  if (matchingPartyIds.size > 1) {
    throw commandError(
      OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.identity_conflict,
      "More than one Party matches the inquiry sender",
    );
  }
  if (matchingPartyIds.size === 1) {
    const matched = getParty(
      repository,
      tenantId,
      [...matchingPartyIds][0],
    );
    if (!matched) {
      throw commandError(
        OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.identity_conflict,
        "Inquiry sender contact does not reference an existing Party",
      );
    }
    return Object.freeze({
      party: matched,
      reused: true,
    });
  }
  const partyId = stableId("party_inquiry", {
    tenant_id: tenantId,
    sender_address: senderAddress,
  });
  const existing = getParty(repository, tenantId, partyId);
  if (existing) {
    if (existing.identity_key !== identityKey) {
      throw commandError(
        OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.identity_conflict,
        "Inquiry sender Party identity does not reconcile",
      );
    }
    return Object.freeze({ party: existing, reused: true });
  }
  const party = repository.transaction((tx) => {
    const created = tx.create({
      model_type: "Party",
      party_id: partyId,
      tenant_id: tenantId,
      party_type: "person",
      display_name: safeDisplayName(evidence),
      identity_key: identityKey,
      status: "active",
      owner_user_id: actorId,
      synthetic_only: false,
    });
    tx.appendAudit({
      tenant_id: tenantId,
      event_id: `master-data.party.outlook-inquiry:${partyId}`,
      event_type: "master_data.party.outlook_inquiry_created",
      actor_id: actorId,
      object_type: "Party",
      object_id: partyId,
      payload: {
        identity_key_hash: sha256(identityKey),
        source: "outlook_inquiry",
        raw_message_included: false,
      },
      created_at: occurredAt,
    });
    return created;
  });
  return Object.freeze({ party, reused: false });
}

function existingInquiryLead(repository, tenantId, leadId) {
  const lead = getLead(repository, tenantId, leadId);
  if (!lead) {
    throw commandError(
      OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.lead_not_found,
      "The selected inquiry was not found",
      404,
    );
  }
  return Object.freeze({ lead, reused: true });
}

function newInquiryLead({
  repository,
  tenantId,
  actorId,
  party,
  evidence,
}) {
  const leadKey =
    `${tenantId}:outlook-inquiry:${evidence.inquiry_email_evidence_id}`;
  const matches = repository
    .list({ tenant_id: tenantId, model_type: "Lead" })
    .filter((lead) => lead.lead_key === leadKey);
  if (matches.length > 1) {
    throw commandError(
      OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.identity_conflict,
      "More than one Lead matches the inquiry evidence",
    );
  }
  if (matches.length === 1) {
    if (matches[0].party_id !== party.party_id) {
      throw commandError(
        OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.identity_conflict,
        "Inquiry Lead Party does not reconcile",
      );
    }
    return Object.freeze({ lead: matches[0], reused: true });
  }
  const leadId = stableId("lead_inquiry", {
    tenant_id: tenantId,
    inquiry_email_evidence_id:
      evidence.inquiry_email_evidence_id,
  });
  const existing = getLead(repository, tenantId, leadId);
  if (existing) {
    if (
      existing.party_id !== party.party_id
      || existing.lead_key !== leadKey
    ) {
      throw commandError(
        OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.identity_conflict,
        "Inquiry Lead identity does not reconcile",
      );
    }
    return Object.freeze({ lead: existing, reused: true });
  }
  const result = createLead({
    repository,
    actor_id: actorId,
    idempotency_key:
      `outlook-inquiry-lead:${evidence.inquiry_email_evidence_id}`,
    lead: {
      lead_id: leadId,
      tenant_id: tenantId,
      party_id: party.party_id,
      display_name: leadDisplayName(evidence),
      inquiry_status: "new",
      source: "outlook_addin",
      received_at: evidence.received_at,
      next_action: "문의 확인",
      lead_key: leadKey,
      status: "active",
      owner_user_id: actorId,
    },
  });
  return Object.freeze({
    lead: result.lead,
    reused: result.idempotent_replay === true,
  });
}

export function createOutlookInquiryRegistrationService({
  emailDmsRepository,
  masterDataRepository,
  crmRepository,
  mailPort,
  evidenceStorageService,
  clock = () => new Date(),
  checkpoint = async () => {},
} = {}) {
  assertRepository(
    emailDmsRepository,
    [
      "get",
      "update",
      "getIdempotency",
      "recordIdempotency",
      "appendAudit",
    ],
    "Email DMS",
  );
  assertRepository(
    masterDataRepository,
    ["get", "list", "create", "appendAudit", "transaction"],
    "Master Data",
  );
  assertRepository(
    crmRepository,
    [
      "get",
      "list",
      "create",
      "getIdempotency",
      "recordIdempotency",
      "transaction",
    ],
    "CRM",
  );
  if (typeof mailPort?.getOwnMessageMime !== "function") {
    throw commandError(
      OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.runtime_unavailable,
      "Microsoft 365 mail port is unavailable",
      503,
    );
  }
  if (
    typeof evidenceStorageService?.storeMessageEvidence !== "function"
  ) {
    throw commandError(
      OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.runtime_unavailable,
      "Inquiry evidence storage service is unavailable",
      503,
    );
  }
  if (typeof checkpoint !== "function") {
    throw new TypeError("checkpoint must be a function");
  }

  async function recordStep(key, identity, state) {
    const response = Object.freeze({
      ...identity,
      ...state,
      raw_content_included: false,
      credential_material_included: false,
      production_ready_claim: false,
    });
    emailDmsRepository.recordIdempotency({
      tenant_id: state.tenant_id,
      idempotency_key: key,
      operation: "outlook_inquiry_registration",
      response,
      created_at: state.updated_at,
    });
    return response;
  }

  async function register(input = {}) {
    const tenantId = requiredString(input, "tenant_id");
    const actorId = requiredString(input, "actor_id");
    const restMessageId = requiredString(input, "rest_message_id");
    const idempotencyKey = requiredString(
      input,
      "idempotency_key",
      512,
    );
    const action = registrationAction(input);
    const existingLeadId = action === "link_existing"
      ? requiredString(input, "existing_lead_id", 512)
      : null;
    const key = processKey(tenantId, idempotencyKey);
    const identity = processIdentity({
      tenantId,
      idempotencyKey,
      restMessageId,
      action,
      existingLeadId,
    });
    const prior = emailDmsRepository.getIdempotency({
      tenant_id: tenantId,
      idempotency_key: key,
    });
    let priorProcess = null;
    if (prior) {
      priorProcess = assertSameProcess(prior, identity);
      if (priorProcess.outcome === "registered") {
        return completedReplay({
          process: priorProcess,
          emailDmsRepository,
          masterDataRepository,
          crmRepository,
        });
      }
    }

    const message = await mailPort.getOwnMessageMime({
      ...input,
      tenant_id: tenantId,
      user_id: actorId,
      entra_subject_id: requiredString(input, "entra_subject_id"),
      rest_message_id: restMessageId,
    });
    const evidenceId = inquiryEmailEvidenceId({
      tenant_id: tenantId,
      mailbox_address: requiredString(
        message,
        "mailbox_address",
        320,
      ),
      internet_message_id: message.internet_message_id,
      graph_immutable_message_id: message.immutable_message_id,
    });
    if (
      priorProcess?.inquiry_email_evidence_id
      && priorProcess.inquiry_email_evidence_id !== evidenceId
    ) {
      throw commandError(
        OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.idempotency_conflict,
        "Inquiry registration message identity changed during retry",
      );
    }
    const occurredAt = new Date(clock()).toISOString();
    let process = await recordStep(key, identity, {
      tenant_id: tenantId,
      outcome: "in_progress",
      inquiry_email_evidence_id: evidenceId,
      party_id: priorProcess?.party_id ?? null,
      lead_id: priorProcess?.lead_id ?? null,
      completed_step: priorProcess?.completed_step ?? "message_resolved",
      updated_at: occurredAt,
    });
    await checkpoint("message_resolved", process);

    const stored = await evidenceStorageService.storeMessageEvidence({
      tenant_id: tenantId,
      mailbox_address: message.mailbox_address,
      captured_by: actorId,
      idempotency_key:
        `outlook-inquiry-evidence:${process.process_id}`,
      mime_bytes: message.mime_bytes,
      graph_immutable_message_id: message.immutable_message_id,
      internet_message_id: message.internet_message_id,
      message_metadata: message.message_metadata,
    });
    if (stored.outcome === "quarantined") {
      throw commandError(
        OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.evidence_quarantined,
        "Inquiry email evidence was quarantined",
        423,
      );
    }
    let evidence = stored.evidence;
    const expectedLeadId = action === "link_existing"
      ? existingLeadId
      : stableId("lead_inquiry", {
        tenant_id: tenantId,
        inquiry_email_evidence_id: evidenceId,
      });
    if (
      evidence.capture_status === "complete"
      && evidence.lead_id !== expectedLeadId
    ) {
      throw commandError(
        OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.link_conflict,
        "Inquiry evidence is already linked to another inquiry",
      );
    }
    process = await recordStep(key, identity, {
      ...process,
      tenant_id: tenantId,
      outcome: "in_progress",
      inquiry_email_evidence_id: evidenceId,
      completed_step: "evidence_stored",
      updated_at: new Date(clock()).toISOString(),
    });
    await checkpoint("evidence_stored", process);

    let partyResult;
    let leadResult;
    if (action === "link_existing") {
      leadResult = existingInquiryLead(
        crmRepository,
        tenantId,
        existingLeadId,
      );
      partyResult = {
        party: getParty(
          masterDataRepository,
          tenantId,
          leadResult.lead.party_id,
        ),
        reused: true,
      };
      if (!partyResult.party) {
        throw commandError(
          OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.identity_conflict,
          "The selected inquiry Party was not found",
          409,
        );
      }
    } else {
      partyResult = senderParty({
        repository: masterDataRepository,
        tenantId,
        actorId,
        evidence,
        occurredAt: new Date(clock()).toISOString(),
      });
    }
    process = await recordStep(key, identity, {
      ...process,
      tenant_id: tenantId,
      party_id: partyResult.party.party_id,
      completed_step: "party_resolved",
      updated_at: new Date(clock()).toISOString(),
    });
    await checkpoint("party_resolved", process);

    if (action === "new") {
      leadResult = newInquiryLead({
        repository: crmRepository,
        tenantId,
        actorId,
        party: partyResult.party,
        evidence,
      });
    }
    process = await recordStep(key, identity, {
      ...process,
      tenant_id: tenantId,
      lead_id: leadResult.lead.lead_id,
      completed_step: "lead_resolved",
      updated_at: new Date(clock()).toISOString(),
    });
    await checkpoint("lead_resolved", process);

    if (
      evidence.capture_status === "complete"
      && evidence.lead_id !== leadResult.lead.lead_id
    ) {
      throw commandError(
        OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.link_conflict,
        "Inquiry evidence is already linked to another inquiry",
      );
    }
    const linkReused = evidence.capture_status === "complete";
    if (!linkReused) {
      evidence = emailDmsRepository.update({
        tenant_id: tenantId,
        model_type: "InquiryEmailEvidence",
        inquiry_email_evidence_id: evidenceId,
      }, {
        lead_id: leadResult.lead.lead_id,
        capture_status: "complete",
      });
      emailDmsRepository.appendAudit({
        tenant_id: tenantId,
        event_id:
          `inquiry.email_evidence.linked:${evidenceId}`,
        event_type: "inquiry.email_evidence.linked",
        actor_id: actorId,
        object_type: "InquiryEmailEvidence",
        object_id: evidenceId,
        payload: {
          lead_id: leadResult.lead.lead_id,
          party_id: partyResult.party.party_id,
          link_action: action,
          raw_content_included: false,
        },
        created_at: new Date(clock()).toISOString(),
      });
    }
    process = await recordStep(key, identity, {
      ...process,
      tenant_id: tenantId,
      outcome: "registered",
      inquiry_email_evidence_id: evidenceId,
      party_id: partyResult.party.party_id,
      lead_id: leadResult.lead.lead_id,
      completed_step: "evidence_linked",
      updated_at: new Date(clock()).toISOString(),
    });
    await checkpoint("evidence_linked", process);

    return safeResult({
      process,
      evidence,
      partyId: partyResult.party.party_id,
      leadId: leadResult.lead.lead_id,
      reused: {
        process: Boolean(priorProcess),
        evidence: stored.idempotent_replay === true,
        party: partyResult.reused === true,
        lead: leadResult.reused === true,
        link: linkReused,
      },
    });
  }

  return Object.freeze({ register });
}
