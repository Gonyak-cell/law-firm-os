export const HOME_METRIC_EVENT_NAME = "matter:home-metric";

const HOME_METRIC_STORE_KEY = "__MATTER_HOME_METRICS__";

function metricTarget(source = globalThis) {
  return source?.window ?? source ?? null;
}

export function homeMetricNowMs(source = globalThis) {
  const target = metricTarget(source);
  const performanceRef = target?.performance ?? source?.performance;
  if (typeof performanceRef?.now === "function") return performanceRef.now();
  return Date.now();
}

export function emitHomeMetric(eventType, detail = {}, source = globalThis) {
  if (!eventType) return null;
  const target = metricTarget(source);
  if (!target) return null;
  const payload = {
    event_type: eventType,
    eventType,
    emitted_at: new Date().toISOString(),
    ...detail
  };

  try {
    const current = Array.isArray(target[HOME_METRIC_STORE_KEY]) ? target[HOME_METRIC_STORE_KEY] : [];
    target[HOME_METRIC_STORE_KEY] = [...current, payload];
  } catch {
  }

  try {
    const CustomEventCtor = target.CustomEvent ?? source?.CustomEvent ?? globalThis.CustomEvent;
    if (typeof target.dispatchEvent === "function" && typeof CustomEventCtor === "function") {
      target.dispatchEvent(new CustomEventCtor(HOME_METRIC_EVENT_NAME, { detail: payload }));
    }
  } catch {
  }

  return payload;
}
