import { types } from "node:util";

export const OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION =
  "lawos.outlook-desktop-autoconnect-roster.v1";
export const OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE =
  "outlook.connection.manage";

const REQUIRED_ROSTER_SIZE = 10;
const ROOT_FIELDS = new Set(["schema_version", "roster_version", "entries"]);
const ENTRY_FIELDS = new Set([
  "tenant_id",
  "user_id",
  "entra_subject_id",
  "enabled",
]);
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const PARSED_ROSTERS = new WeakSet();

function invalidRoster(reason) {
  return Object.assign(new Error("outlook_desktop_roster_invalid"), {
    safe_error_code: "OUTLOOK_DESKTOP_ROSTER_INVALID",
    reason,
    status: 503,
  });
}

function objectDataSnapshot(value, fields, reason) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || types.isProxy(value)
  ) {
    throw invalidRoster(reason);
  }
  let prototype;
  let descriptors;
  try {
    prototype = Object.getPrototypeOf(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    throw invalidRoster(reason);
  }
  const keys = Reflect.ownKeys(descriptors);
  if (
    (prototype !== Object.prototype && prototype !== null)
    || keys.length !== fields.size
    || keys.some((key) => {
      const descriptor = descriptors[key];
      return typeof key !== "string"
        || !fields.has(key)
        || !("value" in descriptor)
        || descriptor.enumerable !== true;
    })
  ) {
    throw invalidRoster(reason);
  }
  return Object.freeze(Object.fromEntries(
    [...fields].map((field) => [field, descriptors[field].value]),
  ));
}

function entryArraySnapshot(value) {
  if (!Array.isArray(value) || types.isProxy(value)) {
    throw invalidRoster("entry_count_invalid");
  }
  let prototype;
  let descriptors;
  try {
    prototype = Object.getPrototypeOf(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    throw invalidRoster("entry_count_invalid");
  }
  const lengthDescriptor = descriptors.length;
  if (
    prototype !== Array.prototype
    || !("value" in (lengthDescriptor ?? {}))
    || lengthDescriptor.value !== REQUIRED_ROSTER_SIZE
    || lengthDescriptor.enumerable !== false
    || Reflect.ownKeys(descriptors).length !== REQUIRED_ROSTER_SIZE + 1
  ) {
    throw invalidRoster("entry_count_invalid");
  }
  const entries = [];
  for (let index = 0; index < REQUIRED_ROSTER_SIZE; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor
      || !("value" in descriptor)
      || descriptor.enumerable !== true
    ) {
      throw invalidRoster("entry_count_invalid");
    }
    entries.push(descriptor.value);
  }
  return Object.freeze(entries);
}

function rosterString(value, field) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!IDENTIFIER_PATTERN.test(normalized)) {
    throw invalidRoster(`${field}_invalid`);
  }
  return normalized;
}

function tupleKey(value) {
  return `${value.tenant_id}\0${value.user_id}\0${value.entra_subject_id}`;
}

export function parseOutlookDesktopAutoconnectRoster(input) {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      throw invalidRoster("json_invalid");
    }
  }
  value = objectDataSnapshot(value, ROOT_FIELDS, "root_fields_invalid");
  if (
    value.schema_version
    !== OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION
  ) {
    throw invalidRoster("schema_version_invalid");
  }
  const rosterVersion = rosterString(value.roster_version, "roster_version");
  const rawEntries = entryArraySnapshot(value.entries);

  const seen = new Set();
  const entries = rawEntries.map((rawEntry) => {
    const entry = objectDataSnapshot(
      rawEntry,
      ENTRY_FIELDS,
      "entry_fields_invalid",
    );
    if (entry.enabled !== true) {
      throw invalidRoster("entry_enabled_invalid");
    }
    const normalized = Object.freeze({
      tenant_id: rosterString(entry.tenant_id, "tenant_id"),
      user_id: rosterString(entry.user_id, "user_id"),
      entra_subject_id: rosterString(
        entry.entra_subject_id,
        "entra_subject_id",
      ),
      enabled: true,
    });
    const key = tupleKey(normalized);
    if (seen.has(key)) throw invalidRoster("entry_duplicate");
    seen.add(key);
    return normalized;
  });

  if (new Set(entries.map((entry) => entry.tenant_id)).size !== 1) {
    throw invalidRoster("tenant_count_invalid");
  }
  if (new Set(entries.map((entry) => entry.user_id)).size !== REQUIRED_ROSTER_SIZE) {
    throw invalidRoster("user_id_unique_count_invalid");
  }
  if (new Set(entries.map((entry) => entry.entra_subject_id)).size !== REQUIRED_ROSTER_SIZE) {
    throw invalidRoster("entra_subject_id_unique_count_invalid");
  }

  const roster = Object.freeze({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: rosterVersion,
    entries: Object.freeze(entries),
  });
  PARSED_ROSTERS.add(roster);
  return roster;
}

function parsedRoster(value) {
  return Boolean(value && PARSED_ROSTERS.has(value));
}

function decision(status, safeErrorCode, rosterVersion) {
  return Object.freeze({
    status,
    eligible: status === "approved",
    safe_error_code: safeErrorCode,
    roster_version: rosterVersion,
  });
}

export function evaluateOutlookDesktopEntitlement({
  principal,
  roster,
} = {}) {
  if (!parsedRoster(roster)) {
    return decision(
      "unknown",
      "OUTLOOK_DESKTOP_ROSTER_UNAVAILABLE",
      null,
    );
  }

  const tenantId = String(principal?.tenant_id ?? "").trim();
  const userId = String(principal?.user_id ?? "").trim();
  const subjectId = String(principal?.entra_subject_id ?? "").trim();
  if (!tenantId || !userId || !subjectId) {
    return decision(
      "disabled",
      "OUTLOOK_DESKTOP_IDENTITY_BINDING_REQUIRED",
      roster.roster_version,
    );
  }
  if (
    !Array.isArray(principal?.scopes)
    || !principal.scopes.includes(OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE)
  ) {
    return decision(
      "disabled",
      "OUTLOOK_DESKTOP_PERMISSION_REQUIRED",
      roster.roster_version,
    );
  }

  const membership = roster.entries.find((entry) => (
    entry.tenant_id === tenantId
    && entry.user_id === userId
    && entry.entra_subject_id === subjectId
  ));
  if (!membership) {
    return decision(
      "disabled",
      "OUTLOOK_DESKTOP_NOT_ENTITLED",
      roster.roster_version,
    );
  }
  if (!membership.enabled) {
    return decision(
      "disabled",
      "OUTLOOK_DESKTOP_ENTITLEMENT_DISABLED",
      roster.roster_version,
    );
  }
  return decision("approved", null, roster.roster_version);
}
