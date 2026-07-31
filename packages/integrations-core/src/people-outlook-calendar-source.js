import { peopleLocalDateKey } from "../../hrx/src/people-intervals.js";

const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;

function requiredId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value.trim())) {
    throw new TypeError(`${field} must be a safe identifier`);
  }
  return value.trim();
}

function safeCode(error, fallback = "OUTLOOK_CALENDAR_SOURCE_UNAVAILABLE") {
  return typeof error?.safe_error_code === "string"
    ? error.safe_error_code
    : fallback;
}

function dateKey(asOf, timezone) {
  if (typeof asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) return asOf;
  return peopleLocalDateKey(asOf, timezone);
}

function sourceKey({ tenant_id, employee_id, provider_identity_id, date }) {
  return `${tenant_id}\u0000${employee_id}\u0000${provider_identity_id}\u0000${date}`;
}

function emptyEvents(employeeIds) {
  return Object.freeze(Object.fromEntries(employeeIds.map((employeeId) => [
    employeeId,
    Object.freeze([]),
  ])));
}

function freezeSource({
  state,
  eventsByEmployeeId,
  lastSuccessAt = null,
  staleAfter = null,
  safeErrorCode = null,
}) {
  return Object.freeze({
    state,
    events_by_employee_id: Object.freeze(eventsByEmployeeId),
    connection_state_by_employee_id: Object.freeze({}),
    last_success_at: lastSuccessAt,
    stale_after: staleAfter,
    safe_error_code: safeErrorCode,
  });
}

export function createUnavailablePeopleOutlookCalendarSource({
  safe_error_code = "OUTLOOK_CALENDAR_SOURCE_UNAVAILABLE",
} = {}) {
  const errorCode = requiredId(safe_error_code, "safe_error_code");

  function read({ employee_ids = [] } = {}) {
    const employeeIds = employee_ids.map((employeeId) => requiredId(employeeId, "employee_id"));
    return freezeSource({
      state: "blocked",
      eventsByEmployeeId: emptyEvents(employeeIds),
      safeErrorCode: errorCode,
    });
  }

  return Object.freeze({
    read,
    async refresh(input = {}) {
      return read(input);
    },
    async whenIdle() {},
  });
}

export function createPeopleOutlookCalendarSource({
  identityRegistry,
  consentService,
  calendarCache,
  calendarViewAdapter = null,
  refreshConsent = null,
  resolveSubjectAddress = null,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!identityRegistry || typeof identityRegistry.get !== "function") {
    throw new TypeError("provider identity registry is required");
  }
  if (!consentService || typeof consentService.resolveCredential !== "function") {
    throw new TypeError("Outlook consent service is required");
  }
  if (!calendarCache || typeof calendarCache.get !== "function" || typeof calendarCache.put !== "function") {
    throw new TypeError("Outlook calendar cache is required");
  }
  if (calendarViewAdapter !== null && typeof calendarViewAdapter?.read !== "function") {
    throw new TypeError("Outlook calendarView adapter read port is required");
  }
  if (refreshConsent !== null && typeof refreshConsent !== "function") {
    throw new TypeError("refreshConsent must be a function");
  }
  if (resolveSubjectAddress !== null && typeof resolveSubjectAddress !== "function") {
    throw new TypeError("resolveSubjectAddress must be a function");
  }

  const inFlight = new Map();
  const failures = new Map();

  function resolveCredential(tenantId, identity) {
    return consentService.resolveCredential({
      tenant_id: tenantId,
      consent_ref: identity.consent_ref,
      ...(refreshConsent
        ? {
            refresh: (input) => refreshConsent({
              ...input,
              tenant_id: tenantId,
              provider_identity_id: identity.provider_identity_id,
              provider_subject_id: identity.provider_subject_id,
            }),
          }
        : {}),
    });
  }

  function scheduleRefresh({
    tenantId,
    employeeId,
    identity,
    credentialRef,
    date,
    timezone,
  }) {
    const key = sourceKey({
      tenant_id: tenantId,
      employee_id: employeeId,
      provider_identity_id: identity.provider_identity_id,
      date,
    });
    if (inFlight.has(key)) return inFlight.get(key);
    if (!calendarViewAdapter) {
      failures.set(key, "OUTLOOK_CALENDAR_ADAPTER_REQUIRED");
      return null;
    }
    const task = Promise.resolve()
      .then(async () => {
        const subjectAddress = resolveSubjectAddress
          ? await resolveSubjectAddress({
              tenant_id: tenantId,
              employee_id: employeeId,
              provider_identity_id: identity.provider_identity_id,
              provider_subject_id: identity.provider_subject_id,
            })
          : null;
        const loaded = await calendarViewAdapter.read({
          date,
          timezone,
          credential_ref: credentialRef,
          ...(typeof subjectAddress === "string" && subjectAddress.trim()
            ? { subject_address: subjectAddress.trim() }
            : {}),
        });
        calendarCache.put({
          tenant_id: tenantId,
          employee_id: employeeId,
          provider_identity_id: identity.provider_identity_id,
          date,
          events: loaded?.events,
          fetched_at: clock(),
          etag: loaded?.etag,
          delta_ref: loaded?.delta_ref,
        });
        failures.delete(key);
      })
      .catch((error) => {
        failures.set(key, safeCode(error));
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, task);
    return task;
  }

  function inspectEmployee({
    tenantId,
    employeeId,
    date,
    timezone,
    schedule,
  }) {
    const identity = identityRegistry.get({
      tenant_id: tenantId,
      employee_id: employeeId,
    });
    if (!identity) {
      return Object.freeze({
        state: "not_connected",
        events: Object.freeze([]),
        last_success_at: null,
        stale_after: null,
        safe_error_code: null,
      });
    }

    let credential;
    try {
      credential = resolveCredential(tenantId, identity);
    } catch (error) {
      return Object.freeze({
        state: "blocked",
        events: Object.freeze([]),
        last_success_at: null,
        stale_after: null,
        safe_error_code: safeCode(error, "OUTLOOK_CONSENT_NOT_ACTIVE"),
      });
    }

    const input = {
      tenant_id: tenantId,
      employee_id: employeeId,
      provider_identity_id: identity.provider_identity_id,
      date,
    };
    const cached = calendarCache.get(input);
    const key = sourceKey(input);
    if (schedule && cached.state !== "ok") {
      scheduleRefresh({
        tenantId,
        employeeId,
        identity,
        credentialRef: credential.credential_ref,
        date,
        timezone,
      });
    }
    if (cached.state === "ok" || cached.state === "stale") {
      return Object.freeze({
        state: cached.state,
        events: cached.events ?? Object.freeze([]),
        last_success_at: cached.last_success_at,
        stale_after: cached.stale_after,
        safe_error_code: cached.state === "stale"
          ? failures.get(key) ?? "OUTLOOK_CALENDAR_STALE"
          : null,
      });
    }
    return Object.freeze({
      state: "blocked",
      events: Object.freeze([]),
      last_success_at: null,
      stale_after: null,
      safe_error_code: failures.get(key)
        ?? (calendarViewAdapter
          ? "OUTLOOK_CALENDAR_REFRESH_PENDING"
          : "OUTLOOK_CALENDAR_ADAPTER_REQUIRED"),
    });
  }

  function snapshot({
    tenant_id,
    employee_ids = [],
    as_of,
    timezone = "Asia/Seoul",
  } = {}, { schedule = true } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const employeeIds = [...new Set(employee_ids.map((employeeId) => requiredId(employeeId, "employee_id")))].sort();
    const date = dateKey(as_of, timezone);
    const inspected = employeeIds.map((employeeId) => [
      employeeId,
      inspectEmployee({ tenantId, employeeId, date, timezone, schedule }),
    ]);
    const connected = inspected.filter(([, item]) => item.state !== "not_connected");
    const usable = connected.filter(([, item]) => item.state === "ok" || item.state === "stale");
    const blocked = connected.filter(([, item]) => item.state === "blocked");
    const stale = connected.filter(([, item]) => item.state === "stale");
    const state = connected.length === 0 || (blocked.length === 0 && stale.length === 0)
      ? "ok"
      : usable.length === 0
        ? "blocked"
        : "stale";
    const freshness = usable
      .map(([, item]) => item)
      .filter((item) => item.last_success_at)
      .sort((left, right) => left.last_success_at.localeCompare(right.last_success_at));
    const staleThresholds = usable
      .map(([, item]) => item.stale_after)
      .filter((value) => typeof value === "string")
      .sort();
    const firstFailure = [...blocked, ...stale]
      .map(([, item]) => item.safe_error_code)
      .find((value) => typeof value === "string") ?? null;

    return freezeSource({
      state,
      eventsByEmployeeId: Object.fromEntries(inspected.map(([employeeId, item]) => [
        employeeId,
        item.events,
      ])),
      lastSuccessAt: freshness[0]?.last_success_at ?? null,
      staleAfter: staleThresholds[0] ?? null,
      safeErrorCode: firstFailure,
    });
  }

  async function refresh(input = {}) {
    snapshot(input, { schedule: true });
    await Promise.all([...inFlight.values()]);
    return snapshot(input, { schedule: false });
  }

  return Object.freeze({
    read(input = {}) {
      return snapshot(input, { schedule: true });
    },
    refresh,
    async whenIdle() {
      await Promise.all([...inFlight.values()]);
    },
  });
}
