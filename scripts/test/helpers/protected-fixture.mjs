import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { openProtectedEvidenceRoot, sha256 } from "../../lib/outlook-release-gates.mjs";

export async function createProtectedFixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "amic-outlook-protected-"));
  await chmod(root, 0o700);
  return root;
}

export async function writeProtectedJson(root, evidenceRef, value) {
  const target = path.join(root, evidenceRef);
  const parent = path.dirname(target);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  await chmod(parent, 0o700);
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await writeFile(target, bytes, { mode: 0o600 });
  await chmod(target, 0o600);
  return { evidence_ref: evidenceRef, evidence_sha256: sha256(bytes) };
}

export function trustedRoot(root) {
  return openProtectedEvidenceRoot(root);
}
