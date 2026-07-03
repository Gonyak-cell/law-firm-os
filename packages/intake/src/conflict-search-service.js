import { appendIntakeAuditEvent } from "./audit.js";

const PARTY_MODEL_TYPES = Object.freeze(["Party", "Organization", "Person", "Entity", "ClientGroup", "PartyAlias"]);
const CONFLICT_MATTER_PARTY_ROLES = Object.freeze(["adverse_party", "counterparty", "opposing_counsel", "related_party"]);
const CORPORATE_SUFFIXES = Object.freeze([
  "주식회사",
  "유한회사",
  "유한책임회사",
  "합명회사",
  "합자회사",
  "사단법인",
  "재단법인",
  "법무법인",
  "회계법인",
  "노무법인",
  "의료법인",
  "학교법인",
  "corporation",
  "company",
  "limited",
  "incorporated",
  "corp",
  "inc",
  "ltd",
  "llc",
  "co",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function safeId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 96);
}

function aliasValue(input) {
  if (typeof input === "string") return input;
  return input?.alias_value ?? input?.display_name ?? input?.legal_name ?? input?.name ?? input?.value ?? null;
}

function addTerm(terms, value, source = "input") {
  const text = aliasValue(value);
  const normalized = normalizeConflictName(text);
  if (!normalized) return;
  if (terms.some((term) => term.normalized === normalized)) return;
  terms.push(Object.freeze({ raw: String(text).trim(), normalized, source }));
}

function bigrams(value) {
  if (value.length < 2) return [value];
  return Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2));
}

function diceCoefficient(left, right) {
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  const counts = new Map();
  for (const value of leftBigrams) counts.set(value, (counts.get(value) ?? 0) + 1);
  let overlap = 0;
  for (const value of rightBigrams) {
    const count = counts.get(value) ?? 0;
    if (count <= 0) continue;
    overlap += 1;
    counts.set(value, count - 1);
  }
  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function hasHangul(value) {
  return /[가-힣]/.test(value);
}

export function normalizeConflictName(value) {
  let text = String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim();
  if (!text) return "";
  text = text
    .replace(/[({\[\u3010]\s*주\s*[)}\]\u3011]/g, "")
    .replace(/㈜/g, "");
  for (const suffix of CORPORATE_SUFFIXES) {
    text = text.replace(new RegExp(suffix, "gi"), "");
  }
  return text.replace(/[\s.,'"+\-_/\\|:;()[\]{}<>·ㆍ]/g, "");
}

export function scoreConflictNameMatch(left, right) {
  const normalizedLeft = normalizeConflictName(left);
  const normalizedRight = normalizeConflictName(right);
  if (!normalizedLeft || !normalizedRight) return Object.freeze({ matched: false, score: 0, match_kind: "none" });
  if (normalizedLeft === normalizedRight) return Object.freeze({ matched: true, score: 1, match_kind: "exact_normalized" });
  const shorter = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longer = normalizedLeft.length > normalizedRight.length ? normalizedLeft : normalizedRight;
  if (shorter.length >= 3 && longer.includes(shorter)) {
    return Object.freeze({ matched: true, score: shorter.length / longer.length, match_kind: "partial_normalized" });
  }
  if (hasHangul(`${normalizedLeft}${normalizedRight}`) && normalizedLeft.length >= 4 && normalizedRight.length >= 4) {
    const score = diceCoefficient(normalizedLeft, normalizedRight);
    if (score >= 0.6) return Object.freeze({ matched: true, score, match_kind: "fuzzy_normalized" });
    return Object.freeze({ matched: false, score, match_kind: "fuzzy_miss" });
  }
  return Object.freeze({ matched: false, score: 0, match_kind: "none" });
}

function collectSearchTerms({ repository, search, sourceRepositories }) {
  const terms = [];
  const check = repository.get?.({
    tenant_id: search.tenant_id,
    model_type: "ConflictCheck",
    conflict_check_id: search.conflict_check_id,
  });
  const snapshot = search.party_snapshot ?? check?.party_snapshot ?? {};
  for (const value of [search.query, search.display_name, search.party_name]) addTerm(terms, value, "search");
  for (const value of search.aliases ?? []) addTerm(terms, value, "search_alias");
  for (const value of search.party_names ?? []) addTerm(terms, value, "party_name");
  for (const value of snapshot.aliases ?? []) addTerm(terms, value, "snapshot_alias");
  const partyIds = Object.freeze([...(search.party_ids ?? []), ...(snapshot.party_ids ?? [])]);
  for (const partyId of partyIds) {
    const party = sourceRepositories.masterDataRepository?.get?.({
      tenant_id: search.tenant_id,
      model_type: "Party",
      party_id: partyId,
    });
    addTerm(terms, party?.display_name, "party_master");
  }
  return Object.freeze(terms);
}

function candidateName(record) {
  return record.display_name ?? record.legal_name ?? record.alias_value ?? record.name ?? null;
}

function candidatePartyId(record) {
  return (
    record.party_id ??
    record.primary_party_id ??
    record.matched_party_id ??
    record.matter_party_id ??
    record.organization_id ??
    record.person_id ??
    record.entity_id ??
    record.client_group_id ??
    record.party_alias_id ??
    record.resource_id ??
    null
  );
}

function sourceRecordRef(modelType, record) {
  const id =
    record.party_alias_id ??
    record.organization_id ??
    record.person_id ??
    record.entity_id ??
    record.client_group_id ??
    record.party_id ??
    record.matter_party_id ??
    record.resource_id;
  return `${modelType}:${id}`;
}

function collectCandidates(search, sourceRepositories) {
  const candidates = [];
  const master = sourceRepositories.masterDataRepository;
  if (master?.list) {
    for (const modelType of PARTY_MODEL_TYPES) {
      for (const record of master.list({ tenant_id: search.tenant_id, model_type: modelType })) {
        const name = candidateName(record);
        if (!normalizeConflictName(name)) continue;
        candidates.push(Object.freeze({
          model_type: modelType,
          display_name: name,
          matched_party_id: candidatePartyId(record),
          hit_source: "party_master",
          source_record_ref: sourceRecordRef(modelType, record),
          severity: modelType === "PartyAlias" ? "medium" : "low",
        }));
      }
    }
  }
  const matterRepository = sourceRepositories.matterRepository;
  if (matterRepository?.list) {
    for (const record of matterRepository.list({ tenant_id: search.tenant_id, model_type: "MatterParty" })) {
      if (!CONFLICT_MATTER_PARTY_ROLES.includes(record.party_role)) continue;
      const name = candidateName(record);
      if (!normalizeConflictName(name)) continue;
      candidates.push(Object.freeze({
        model_type: "MatterParty",
        display_name: name,
        matched_party_id: candidatePartyId(record),
        hit_source: "former_matter",
        source_record_ref: sourceRecordRef("MatterParty", record),
        severity: record.party_role === "adverse_party" ? "high" : "medium",
        matter_id: record.matter_id,
        party_role: record.party_role,
      }));
    }
  }
  return Object.freeze(candidates);
}

function selfRefsForSearch({ repository, search, sourceRepositories }) {
  const check = repository.get?.({
    tenant_id: search.tenant_id,
    model_type: "ConflictCheck",
    conflict_check_id: search.conflict_check_id,
  });
  const partyIds = new Set([...(search.party_ids ?? []), ...(search.party_snapshot?.party_ids ?? []), ...(check?.party_snapshot?.party_ids ?? [])]);
  const normalizedNames = new Set();
  for (const partyId of partyIds) {
    const party = sourceRepositories.masterDataRepository?.get?.({
      tenant_id: search.tenant_id,
      model_type: "Party",
      party_id: partyId,
    });
    const normalized = normalizeConflictName(party?.display_name);
    if (normalized) normalizedNames.add(normalized);
  }
  return Object.freeze({ partyIds, normalizedNames });
}

function findMatches(terms, candidates, selfRefs = { partyIds: new Set(), normalizedNames: new Set() }) {
  const bestByRef = new Map();
  for (const term of terms) {
    for (const candidate of candidates) {
      if (selfRefs.partyIds.has(candidate.matched_party_id)) continue;
      if (candidate.hit_source === "party_master" && selfRefs.normalizedNames.has(normalizeConflictName(candidate.display_name))) continue;
      const score = scoreConflictNameMatch(term.raw, candidate.display_name);
      if (!score.matched) continue;
      const current = bestByRef.get(candidate.source_record_ref);
      const next = Object.freeze({ term, candidate, score });
      if (!current || score.score > current.score.score) bestByRef.set(candidate.source_record_ref, next);
    }
  }
  return Object.freeze(
    [...bestByRef.values()]
      .sort((left, right) => right.score.score - left.score.score || left.candidate.source_record_ref.localeCompare(right.candidate.source_record_ref))
      .slice(0, 25),
  );
}

function createHitRecord({ tx, search, match, actor_id, audit_hint_ref, owner_user_id, index }) {
  const conflictHitId = safeId(`hit_${search.conflict_search_id}_${match.candidate.source_record_ref}_${index}`);
  const record = tx.create({
    model_type: "ConflictHit",
    conflict_hit_id: conflictHitId,
    tenant_id: search.tenant_id,
    conflict_check_id: search.conflict_check_id,
    matched_party_id: match.candidate.matched_party_id,
    hit_source: match.candidate.hit_source,
    source_record_ref: match.candidate.source_record_ref,
    severity: match.candidate.severity,
    audit_hint_ref,
    status: "review_required",
    owner_user_id,
    matched_display_name: match.candidate.display_name,
    matched_model_type: match.candidate.model_type,
    matched_party_role: match.candidate.party_role ?? null,
    source_matter_ref_included: false,
    match_kind: match.score.match_kind,
    match_score: Number(match.score.score.toFixed(3)),
    normalized_query: match.term.normalized,
    raw_hit_payload_visible: false,
    created_by: actor_id,
  });
  appendIntakeAuditEvent({
    repository: tx,
    event: {
      tenant_id: record.tenant_id,
      actor_id,
      action: "conflict.hit.create",
      object_type: "ConflictHit",
      object_id: record.conflict_hit_id,
      idempotency_key: `${search.conflict_search_id}:hit:${index}`,
      metadata: { hit_source: record.hit_source, severity: record.severity, match_kind: record.match_kind },
    },
  });
  return record;
}

export function executeConflictSearch({
  repository,
  search,
  actor_id,
  idempotency_key,
  source_repositories,
  masterDataRepository,
  matterRepository,
} = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(search, "tenant_id");
  requiredString(search, "conflict_check_id");
  const replay = repository.getIdempotency({ tenant_id: search.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  const aliases = Object.freeze([...(search.aliases ?? [])]);
  const relationshipRefs = Object.freeze([...(search.relationship_refs ?? [])]);
  const sourceRepositories = Object.freeze({
    ...(source_repositories ?? {}),
    masterDataRepository: masterDataRepository ?? source_repositories?.masterDataRepository,
    matterRepository: matterRepository ?? source_repositories?.matterRepository,
  });
  const terms = collectSearchTerms({ repository, search: { ...search, aliases }, sourceRepositories });
  const matches = findMatches(
    terms,
    collectCandidates(search, sourceRepositories),
    selfRefsForSearch({ repository, search, sourceRepositories }),
  );
  const auditHintRef = search.audit_hint_ref ?? `audit:${search.tenant_id}:${search.conflict_check_id}:search`;
  const ownerUserId = search.owner_user_id ?? actor_id;

  return repository.transaction((tx) => {
    const hits = matches.map((match, index) =>
      createHitRecord({ tx, search, match, actor_id, audit_hint_ref: auditHintRef, owner_user_id: ownerUserId, index }),
    );
    if (hits.length > 0) {
      tx.update(
        { tenant_id: search.tenant_id, model_type: "ConflictCheck", conflict_check_id: search.conflict_check_id },
        { status: "review_required", updates_database_rows: true },
      );
    }
    const record = tx.create({
      ...search,
      model_type: "ConflictSearch",
      conflict_search_id: search.conflict_search_id,
      aliases,
      relationship_refs: relationshipRefs,
      normalized_terms: terms.map((term) => term.normalized),
      generated_hit_ids: hits.map((hit) => hit.conflict_hit_id),
      caller_supplied_hit_count_ignored: search.hit_count !== undefined,
      hit_count: hits.length,
      raw_query_included: false,
      status: "executed",
    });
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "conflict.search.executed",
        object_type: "ConflictSearch",
        object_id: record.conflict_search_id,
        idempotency_key,
        metadata: { alias_count: aliases.length, relationship_ref_count: relationshipRefs.length, hit_count: hits.length },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      conflict_search: record,
      conflict_hits: Object.freeze(hits),
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "conflict_search_execute", response });
    return response;
  });
}
