export const HRX_OBSERVABILITY_BLOCKED_FIELDS = Object.freeze([
  "employee_id",
  "candidate_id",
  "document_body",
  "content",
  "text",
  "prompt",
  "answer",
  "salary",
  "compensation_ref",
  "client_id",
  "matter_id",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function numberValue(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new TypeError(`${field} must be a non-negative number`);
  return parsed;
}

function sanitizeAttributes(attributes = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (HRX_OBSERVABILITY_BLOCKED_FIELDS.includes(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      sanitized[key] = value;
    }
  }
  return Object.freeze(sanitized);
}

export function createHrxObservabilitySpan(input = {}) {
  return Object.freeze({
    span_name: requiredString(input, "span_name"),
    tenant_id: requiredString(input, "tenant_id"),
    component: requiredString(input, "component"),
    operation: requiredString(input, "operation"),
    duration_ms: numberValue(input.duration_ms ?? 0, "duration_ms"),
    outcome: input.outcome ?? "ok",
    attributes: sanitizeAttributes(input.attributes),
  });
}

export function createHrxMetric(input = {}) {
  return Object.freeze({
    metric_name: requiredString(input, "metric_name"),
    tenant_id: requiredString(input, "tenant_id"),
    value: numberValue(input.value ?? 0, "value"),
    unit: input.unit ?? "count",
    tags: sanitizeAttributes(input.tags),
  });
}

export function isHrxSecurityMetricSignal({ outcome = "ok", attributes = {} } = {}) {
  if (outcome === "security") return true;
  if (attributes.security_event === true) return true;
  const status = Number(attributes.status);
  if (status === 401 || status === 403) return true;
  const errorCode = String(attributes.error_code ?? "");
  return errorCode.startsWith("HRX_") && /DENY|FORBIDDEN|UNAUTHORIZED|STEP_UP|CONTEXT|SCOPE|TENANT/.test(errorCode);
}

export function createInMemoryHrxMetricsSink(seed = []) {
  const records = [];
  return Object.freeze({
    emit(record) {
      const metric = createHrxMetric(record);
      records.push(JSON.parse(JSON.stringify(metric)));
      return metric;
    },
    list(query = {}) {
      return Object.freeze(
        records
          .filter((record) => !query.tenant_id || record.tenant_id === query.tenant_id)
          .filter((record) => !query.metric_name || record.metric_name === query.metric_name)
          .map((record) => Object.freeze(JSON.parse(JSON.stringify(record)))),
      );
    },
    seed() {
      for (const item of seed) this.emit(item);
    },
  });
}

export function recordHrxOperationMetrics({ sink, tenant_id, component, operation, duration_ms, outcome = "ok", attributes = {} } = {}) {
  if (!sink || typeof sink.emit !== "function") throw new TypeError("HRX metrics sink emit port is required");
  const tags = { component, operation, outcome, ...attributes };
  const latency = sink.emit({
    metric_name: "hrx.operation.latency_ms",
    tenant_id,
    value: duration_ms,
    unit: "ms",
    tags,
  });
  const emitted = [latency];
  if (outcome !== "ok") {
    emitted.push(sink.emit({
      metric_name: "hrx.operation.error_count",
      tenant_id,
      value: 1,
      unit: "count",
      tags,
    }));
  }
  if (isHrxSecurityMetricSignal({ outcome, attributes })) {
    emitted.push(sink.emit({
      metric_name: "hrx.operation.security_count",
      tenant_id,
      value: 1,
      unit: "count",
      tags: { ...tags, security_event: true },
    }));
  }
  return Object.freeze(emitted);
}
