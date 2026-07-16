function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requirePort(port, name, methods) {
  if (!port || typeof port !== "object") throw new TypeError(`HRX AI retrieval requires ${name} port`);
  for (const method of methods) {
    if (typeof port[method] !== "function") throw new TypeError(`HRX AI ${name} port missing ${method}`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeSourceForPrompt(source = {}) {
  return Object.freeze({
    source_ref: source.source_ref,
    source_type: source.source_type,
    sensitivity: source.sensitivity,
    title: source.title ?? null,
    tags: Object.freeze([...(source.tags ?? [])]),
  });
}

function sanitizeChunkForPrompt(chunk = {}) {
  return Object.freeze({
    source_ref: chunk.source_ref,
    chunk_id: chunk.chunk_id,
    chunk_hash: chunk.chunk_hash,
    matched_terms: Object.freeze([...(chunk.matched_terms ?? [])]),
    score: chunk.score ?? 0,
    raw_payload_present: false,
  });
}

export function buildHrxRagPromptContext(sources = [], chunks = []) {
  return Object.freeze({
    source_refs: Object.freeze(sources.map((source) => source.source_ref)),
    sources: Object.freeze(sources.map(sanitizeSourceForPrompt)),
    matched_chunks: Object.freeze(chunks.map(sanitizeChunkForPrompt)),
    source_count: sources.length,
    context_payload_policy: "metadata_only",
  });
}

function uniqueSourcesByRef(sources = []) {
  const byRef = new Map();
  for (const source of sources) {
    if (!byRef.has(source.source_ref)) byRef.set(source.source_ref, source);
  }
  return [...byRef.values()];
}

export function createHrxPermissionAwareRetriever({ registry, authz, chunkIndex = null } = {}) {
  requirePort(registry, "source registry", ["search"]);
  requirePort(authz, "authz", ["evaluate"]);
  if (chunkIndex) requirePort(chunkIndex, "source chunk index", ["search"]);

  return Object.freeze({
    async retrieve(context = {}, query = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const actorId = requiredString(context, "actor_id");
      const question = requiredString(query, "query");
      const chunkMatches = chunkIndex
        ? chunkIndex.search({
            tenant_id: tenantId,
            query: question,
            limit: query.limit,
          })
        : [];
      const chunkSourceRefs = [...new Set(chunkMatches.map((chunk) => chunk.source_ref))];
      const candidates = uniqueSourcesByRef([
        ...registry.search({
          tenant_id: tenantId,
          query: question,
          source_types: query.source_types,
          tags: query.tags,
          limit: query.limit,
        }),
        ...(
          chunkSourceRefs.length > 0
            ? registry.search({
                tenant_id: tenantId,
                source_refs: chunkSourceRefs,
                source_types: query.source_types,
                limit: chunkSourceRefs.length,
              })
            : []
        ),
      ]).slice(0, Number.isInteger(query.limit) && query.limit > 0 ? query.limit : 10);
      const allowedSources = [];
      const deniedSourceRefs = [];
      const decisions = [];

      for (const source of candidates) {
        const decision = await authz.evaluate({
          tenant_id: tenantId,
          actor_id: actorId,
          actor_role: context.actor_role ?? null,
          actor_scopes: Object.freeze([...(context.hrx_scopes ?? [])]),
          action: "hrx.ai.source.retrieve",
          purpose: query.purpose ?? "ai_assistance",
          resource: {
            tenant_id: tenantId,
            resource_type: "hrx.ai_source",
            resource_id: source.source_ref,
            source_ref: source.source_ref,
            source_type: source.source_type,
            sensitivity: source.sensitivity,
          },
        });
        decisions.push(Object.freeze({
          source_ref: source.source_ref,
          effect: decision?.effect ?? "deny",
          reason: decision?.reason ?? "hrx_ai_authz_no_decision",
        }));
        if (decision?.effect === "allow") {
          allowedSources.push(source);
        } else {
          deniedSourceRefs.push(source.source_ref);
        }
      }

      return Object.freeze({
        query: question,
        candidate_count: candidates.length,
        allowed_sources: Object.freeze(allowedSources.map((source) => Object.freeze(clone(source)))),
        denied_source_refs: Object.freeze(deniedSourceRefs),
        decisions: Object.freeze(decisions),
        matched_chunks: Object.freeze(chunkMatches.filter((chunk) => allowedSources.some((source) => source.source_ref === chunk.source_ref))),
        prompt_context: buildHrxRagPromptContext(
          allowedSources,
          chunkMatches.filter((chunk) => allowedSources.some((source) => source.source_ref === chunk.source_ref)),
        ),
      });
    },
  });
}
