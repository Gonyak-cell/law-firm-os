import { randomUUID } from "node:crypto";

export function createCorrelationContext(headers = {}) {
  const correlationId = headers["x-lawos-correlation-id"] ?? headers["X-LawOS-Correlation-Id"] ?? `corr_${randomUUID()}`;
  const causationId = headers["x-lawos-causation-id"] ?? headers["X-LawOS-Causation-Id"] ?? correlationId;
  return Object.freeze({
    correlation_id: String(correlationId),
    causation_id: String(causationId),
    production_ready_claim: false,
  });
}
