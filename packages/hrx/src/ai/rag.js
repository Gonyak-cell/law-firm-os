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

export function buildHrxRagPromptContext(sources = []) {
  return Object.freeze({
    source_refs: Object.freeze(sources.map((source) => source.source_ref)),
    sources: Object.freeze(sources.map(sanitizeSourceForPrompt)),
    source_count: sources.length,
    context_payload_policy: "metadata_only",
  });
}

export function createHrxPermissionAwareRetriever({ registry, authz } = {}) {
  requirePort(registry, "source registry", ["search"]);
  requirePort(authz, "authz", ["evaluate"]);

  return Object.freeze({
    async retrieve(context = {}, query = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const actorId = requiredString(context, "actor_id");
      const question = requiredString(query, "query");
      const candidates = registry.search({
        tenant_id: tenantId,
        query: question,
        source_types: query.source_types,
        tags: query.tags,
        limit: query.limit,
      });
      const allowedSources = [];
      const deniedSourceRefs = [];
      const decisions = [];

      for (const source of candidates) {
        const decision = await authz.evaluate({
          tenant_id: tenantId,
          actor_id: actorId,
          actor_role: context.actor_role ?? null,
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
        prompt_context: buildHrxRagPromptContext(allowedSources),
      });
    },
  });
}
