import { createHash } from "node:crypto";

export const PRECEDENT_SOURCE_KINDS = Object.freeze([
  "internal_matter_document",
  "case_law_document",
]);

const SOURCE_KIND_SET = new Set(PRECEDENT_SOURCE_KINDS);

function requiredText(value, field, maxLength = 500) {
  const text = String(value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (!text) throw new TypeError(`${field} is required`);
  if (text.length > maxLength) throw new TypeError(`${field} exceeds ${maxLength} characters`);
  return text;
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return requiredText(value, field, maxLength);
}

function requiredId(value, field) {
  const text = requiredText(value, field, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(text)) {
    throw new TypeError(`${field} is invalid`);
  }
  return text;
}

function requiredSha256(value) {
  const digest = requiredText(value, "content_sha256", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError("content_sha256 must be a lowercase SHA-256 digest");
  return digest;
}

function decisionDate(value) {
  const text = requiredText(value, "decision_date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(text) || new Date(`${text}T00:00:00.000Z`).toISOString().slice(0, 10) !== text) {
    throw new TypeError("decision_date must be a valid YYYY-MM-DD date");
  }
  return text;
}

function safeHttpsUrl(value) {
  const text = requiredText(value, "source_url", 2048);
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new TypeError("source_url must be a valid HTTPS URL");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) {
    throw new TypeError("source_url must be a credential-free HTTPS URL without a fragment");
  }
  return parsed.toString();
}

export function normalizePrecedentText(value, { maxLength = 1_000_000, lowercase = false } = {}) {
  const text = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (text.length > maxLength) throw new TypeError(`precedent text exceeds ${maxLength} characters`);
  return lowercase ? text.toLocaleLowerCase("ko-KR") : text;
}

export function createPrecedentSource(input = {}) {
  const sourceKind = requiredText(input.source_kind, "source_kind", 40);
  if (!SOURCE_KIND_SET.has(sourceKind)) throw new TypeError("source_kind is not supported");
  const source = {
    tenant_id: requiredId(input.tenant_id, "tenant_id"),
    source_id: requiredId(input.source_id, "source_id"),
    source_kind: sourceKind,
    matter_id: requiredId(input.matter_id, "matter_id"),
    document_id: requiredId(input.document_id, "document_id"),
    version_id: requiredId(input.version_id, "version_id"),
    content_sha256: requiredSha256(input.content_sha256),
    title: requiredText(input.title, "title", 300),
    court: optionalText(input.court, "court", 200),
    case_number: optionalText(input.case_number, "case_number", 200),
    decision_date: input.decision_date == null || String(input.decision_date).trim() === ""
      ? null
      : decisionDate(input.decision_date),
    source_url: input.source_url == null || String(input.source_url).trim() === ""
      ? null
      : safeHttpsUrl(input.source_url),
    source_reference: optionalText(input.source_reference, "source_reference", 500),
  };
  if (sourceKind === "case_law_document" && [
    source.court,
    source.case_number,
    source.decision_date,
    source.source_url,
    source.source_reference,
  ].some((value) => value == null)) {
    throw new TypeError("case_law_document requires court, case_number, decision_date, source_url, and source_reference");
  }
  return Object.freeze(source);
}

function assertAllowed(decision) {
  if (decision?.effect !== "allow") {
    throw Object.assign(new Error("precedent corpus operation is not allowed"), {
      safe_error_code: "PRECEDENT_CORPUS_PERMISSION_DENIED",
      status: 403,
    });
  }
}

export function createPrecedentCorpusService({ repository, authorize } = {}) {
  if (!repository || typeof repository.registerSource !== "function"
      || typeof repository.disableSource !== "function"
      || typeof repository.unapproveSource !== "function") {
    throw new TypeError("precedent repository is required");
  }
  if (typeof authorize !== "function") throw new TypeError("precedent corpus authorization callback is required");
  return Object.freeze({
    async register(input = {}) {
      const source = createPrecedentSource(input);
      assertAllowed(await authorize({
        action: "dms:precedent:source:register",
        resource: {
          tenant_id: source.tenant_id,
          matter_id: source.matter_id,
          resource_type: "precedent_source",
          resource_id: source.document_id,
        },
      }));
      return repository.registerSource({ ...input, ...source });
    },
    async disable(input = {}) {
      const tenantId = requiredId(input.tenant_id, "tenant_id");
      const sourceId = requiredId(input.source_id, "source_id");
      assertAllowed(await authorize({
        action: "dms:precedent:source:disable",
        resource: {
          tenant_id: tenantId,
          resource_type: "precedent_source",
          resource_id: sourceId,
        },
      }));
      return repository.disableSource({ ...input, tenant_id: tenantId, source_id: sourceId });
    },
    async unapprove(input = {}) {
      const tenantId = requiredId(input.tenant_id, "tenant_id");
      const sourceId = requiredId(input.source_id, "source_id");
      assertAllowed(await authorize({
        action: "dms:precedent:source:unapprove",
        resource: {
          tenant_id: tenantId,
          resource_type: "precedent_source",
          resource_id: sourceId,
        },
      }));
      return repository.unapproveSource({ ...input, tenant_id: tenantId, source_id: sourceId });
    },
  });
}

export async function importApprovedPrecedentSources({ service, sources, batch_id, approval = {} } = {}) {
  if (!service || typeof service.register !== "function") throw new TypeError("precedent corpus service is required");
  if (!Array.isArray(sources) || sources.length < 1 || sources.length > 500) {
    throw new TypeError("approved precedent import must contain between 1 and 500 sources");
  }
  const batchId = requiredId(batch_id, "batch_id");
  const inputBySourceId = new Map();
  const ordered = sources.map((input) => {
    const source = createPrecedentSource(input);
    if (inputBySourceId.has(source.source_id)) {
      throw new TypeError(`approved precedent import contains duplicate source_id ${source.source_id}`);
    }
    inputBySourceId.set(source.source_id, input);
    return source;
  }).sort((a, b) => a.source_id.localeCompare(b.source_id));
  const results = [];
  for (const source of ordered) {
    const idempotencyDigest = createHash("sha256")
      .update(`${batchId}\u0000${source.source_id}`)
      .digest("hex");
    results.push(await service.register({
      ...source,
      actor_id: inputBySourceId.get(source.source_id)?.actor_id,
      approval_id: inputBySourceId.get(source.source_id)?.approval_id ?? approval.approval_id,
      approval_batch_id: batchId,
      approval_decision_id: inputBySourceId.get(source.source_id)?.approval_decision_id
        ?? approval.approval_decision_id,
      approval_authority: inputBySourceId.get(source.source_id)?.approval_authority
        ?? approval.approval_authority,
      approved_by: inputBySourceId.get(source.source_id)?.approved_by ?? approval.approved_by,
      approved_at: inputBySourceId.get(source.source_id)?.approved_at ?? approval.approved_at,
      idempotency_key: `precedent-import:${idempotencyDigest}`,
    }));
  }
  return Object.freeze({
    batch_id: batchId,
    imported_count: results.length,
    source_ids: Object.freeze(results.map((result) => result.source.source_id)),
    production_ready_claim: false,
  });
}
