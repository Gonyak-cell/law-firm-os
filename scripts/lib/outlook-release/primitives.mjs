import { createHash } from "node:crypto";

import { PRODUCT_IDS, SHA256 } from "./constants.mjs";

const SENSITIVE_KEY = /^(?:access_token|authorization|client_secret|cookie|environment_values|id_token|mime_bytes|raw_body|refresh_token|webhook_signature)$/iu;
const SECRET_VALUE = /-----BEGIN (?:RSA )?PRIVATE KEY-----|\b(?:access_token|client_secret|refresh_token)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{16,}/iu;
const PLACEHOLDER = /(?:^|[^a-z])(?:dummy|example|fake|pending|placeholder|tbd|todo|unknown)(?:[^a-z]|$)|test-host-version/iu;

export function sha256(value, encoding = "hex") {
  return createHash("sha256").update(value).digest(encoding);
}

export function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export function concreteText(value, name) {
  const text = requiredText(value, name);
  if (PLACEHOLDER.test(text)) throw new Error(`${name} contains a placeholder value`);
  return text;
}

export function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right), "en"));
}

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(sorted(Object.keys(value)).map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function assertEqual(actual, expected, name) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertExactKeys(value, expected, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object with exact fields`);
  }
  assertEqual(sorted(Object.keys(value)), sorted(expected), `${name} fields`);
}

export function assertSha256(value, name) {
  if (!SHA256.test(value ?? "")) throw new Error(`${name} must be an exact SHA-256`);
  return value;
}

export function assertSafeRelativePath(value, name) {
  const candidate = requiredText(value, name);
  const segments = candidate.split("/");
  if (candidate.startsWith("/") || candidate.includes("\\") || candidate.includes("\0")
    || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${name} is unsafe`);
  }
  return candidate;
}

export function utcMillis(value, name = "UTC timestamp") {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{3}))?Z$/u.exec(
    typeof value === "string" ? value : "",
  );
  if (!match) {
    if (name) throw new Error(`${name} must be an exact UTC timestamp`);
    return null;
  }
  const canonicalTimestamp = `${match[1]}.${match[2] ?? "000"}Z`;
  const milliseconds = Date.parse(canonicalTimestamp);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== canonicalTimestamp) {
    if (name) throw new Error(`${name} must be an exact UTC timestamp`);
    return null;
  }
  return milliseconds;
}

export function profileMap(profiles, name) {
  const allowed = new Set(PRODUCT_IDS);
  const byId = new Map();
  for (const profile of profiles ?? []) {
    if (!allowed.has(profile.product_id) || byId.has(profile.product_id)) {
      throw new Error(`${name} ProductIds are invalid or duplicated`);
    }
    byId.set(profile.product_id, profile);
  }
  if (byId.size !== PRODUCT_IDS.length) throw new Error(`${name} must contain both ProductIds`);
  return byId;
}

export function inventorySha256(inventory) {
  return sha256(`${JSON.stringify(inventory)}\n`);
}

export function assertNoSensitiveMaterial(value, name = "release receipt") {
  const visit = (node, pointer) => {
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      if (SENSITIVE_KEY.test(key)) throw new Error(`${name} contains forbidden field ${pointer}.${key}`);
      if (typeof child === "string" && SECRET_VALUE.test(child)) {
        throw new Error(`${name} contains secret-like material at ${pointer}.${key}`);
      }
      visit(child, `${pointer}.${key}`);
    }
  };
  visit(value, "$");
}
