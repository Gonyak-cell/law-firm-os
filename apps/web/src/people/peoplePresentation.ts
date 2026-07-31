export const UNRESOLVED_EMPLOYEE_LABEL = "구성원 이름 확인 필요";

const UUID_TOKEN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const HEX_TOKEN = /(?:^|[^0-9a-f])[0-9a-f]{32}(?=$|[^0-9a-f])/i;
const EMAIL_TOKEN = /[^\s@]+@[^\s@]+/;
const IDENTIFIER_PREFIX_TOKEN = /(?:^|[^a-z0-9])(?:employee|emp|user|usr|member|account|acct|principal|identity|login|profile|actor|staff|worker|object|oid|aad|azure[-_]?ad|approval|request|leave|candidate|document|audit|record|hrx|matter|org|manager|event|id|uuid|token|ref|opaque)(?:[-_:.\/][a-z0-9][a-z0-9._:\/-]*)+(?:$|[^a-z0-9])/i;
const MIXED_OPAQUE_TOKEN = /(?:^|[^a-z0-9])(?=[a-z0-9_-]{12,}(?:$|[^a-z0-9]))(?=[a-z0-9_-]*[a-z])(?=[a-z0-9_-]*\d)[a-z0-9_-]+/i;
const CODE_LIKE_TOKEN = /^(?=.*\d)(?=.*[-_:.\/])[a-z0-9._:\/-]+$/i;

function containsReference(value: string, reference: unknown) {
  const normalized = typeof reference === "string" ? reference.trim() : "";
  if (!normalized) return false;
  if (value.toLowerCase() === normalized.toLowerCase()) return true;
  if (/^[a-z]+$/i.test(normalized)) return false;
  return value.toLowerCase().includes(normalized.toLowerCase());
}

export function safePeopleLabel(
  value: unknown,
  {
    identifiers = [],
    fallback = "",
  }: {
    identifiers?: unknown[];
    fallback?: string;
  } = {},
) {
  const label = typeof value === "string" ? value.trim() : "";
  if (
    !label
    || EMAIL_TOKEN.test(label)
    || UUID_TOKEN.test(label)
    || HEX_TOKEN.test(label)
    || IDENTIFIER_PREFIX_TOKEN.test(label)
    || MIXED_OPAQUE_TOKEN.test(label)
    || CODE_LIKE_TOKEN.test(label)
    || identifiers.some((identifier) => containsReference(label, identifier))
  ) {
    return fallback;
  }
  return label;
}

export function safeEmployeeLabel(
  employee: { employee_id?: unknown; user_id?: unknown; display_name?: unknown } | null | undefined,
  fallback = UNRESOLVED_EMPLOYEE_LABEL,
) {
  return safePeopleLabel(employee?.display_name, {
    identifiers: [employee?.employee_id, employee?.user_id],
    fallback,
  });
}
