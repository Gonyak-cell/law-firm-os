import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { evidenceFail } from "./profile-media-evidence-shared.mjs";
import { canonicalRegularFile } from "./profile-photo-operation-root.mjs";

export function privateDesktopStateFingerprint(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 4096) {
    evidenceFail("DESKTOP_STATE_INVALID", "desktop install state adapter returned an invalid value");
  }
  return createHash("sha256").update(value).digest("hex");
}

export function createDesktopMarkerAdapter(path) {
  canonicalRegularFile(path, "desktop install marker");
  return () => {
    canonicalRegularFile(path, "desktop install marker");
    const stat = statSync(path);
    return createHash("sha256")
      .update(readFileSync(path))
      .update(`${stat.dev}:${stat.ino}:${stat.size}:${stat.ctimeMs}`)
      .digest("hex");
  };
}

export function describeDesktopMarker(path) {
  canonicalRegularFile(path, "desktop install marker");
  const bytes = readFileSync(path);
  if (bytes.length === 0) evidenceFail("DESKTOP_STATE_INVALID", "desktop install marker must not be empty");
  return Object.freeze({ sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
}
