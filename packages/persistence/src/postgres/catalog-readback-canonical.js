import { createHash } from "node:crypto";

import {
  canonicalizeJson,
} from "../../../runtime-auth/src/runtime-safety-approval-contract.js";

export function deepFreezeCatalogReadbackValue(value) {
  if (!value || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreezeCatalogReadbackValue(child);
  }
  return Object.isFrozen(value) ? value : Object.freeze(value);
}

export function catalogReadbackCanonicalSnapshot(value) {
  return deepFreezeCatalogReadbackValue(
    JSON.parse(canonicalizeJson(value)),
  );
}

export function catalogReadbackCanonicalSha256(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
    .digest("hex");
}

export function catalogReadbackBytesSha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
