import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { SHA256 } from "./constants.mjs";
import { assertEqual, assertSafeRelativePath, sha256 } from "./primitives.mjs";

const SECRET_VALUE = /-----BEGIN (?:RSA )?PRIVATE KEY-----|\b(?:access_token|client_secret|refresh_token)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{16,}/iu;

export function normalizeInventory(entries, contract) {
  const seen = new Set();
  const forbiddenSuffixes = contract.build?.forbidden_path_suffixes ?? [];
  return (entries ?? []).map((entry) => {
    const file = assertSafeRelativePath(entry.path, "build inventory path");
    if (seen.has(file)) throw new Error(`duplicate build path: ${file}`);
    seen.add(file);
    if (forbiddenSuffixes.some((suffix) => file.endsWith(suffix))) throw new Error(`forbidden build artifact: ${file}`);
    if (!Number.isSafeInteger(entry.byte_size) || entry.byte_size < 1 || !SHA256.test(entry.sha256 ?? "")) {
      throw new Error(`invalid build artifact metadata: ${file}`);
    }
    return { path: file, byte_size: entry.byte_size, sha256: entry.sha256 };
  }).sort((left, right) => left.path.localeCompare(right.path, "en"));
}

export function validateBuildInventories(firstEntries, secondEntries, contract) {
  const first = normalizeInventory(firstEntries, contract);
  const second = normalizeInventory(secondEntries, contract);
  for (const required of contract.build?.required_static_paths ?? []) {
    if (!first.some(({ path: file }) => file === required)) throw new Error(`required build artifact missing: ${required}`);
  }
  assertEqual(second, first, "deterministic double-build inventory");
  return {
    builds_identical: true,
    artifact_count: first.length,
    inventory_sha256: sha256(`${JSON.stringify(first)}\n`),
    inventory: first,
  };
}

export async function collectBuildInventory(root, contract) {
  const output = [];
  const walk = async (directory, prefix = "") => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) throw new Error(`build artifact must not be a symlink: ${relative}`);
      if (metadata.isDirectory()) await walk(absolute, relative);
      else if (metadata.isFile()) {
        const bytes = await readFile(absolute);
        const text = bytes.includes(0) ? "" : bytes.toString("utf8");
        for (const pattern of contract.build?.forbidden_text_patterns ?? []) {
          if (text.includes(pattern)) throw new Error(`build artifact contains forbidden source/secret marker: ${relative}`);
        }
        if (SECRET_VALUE.test(text) || (/MIME-Version:/iu.test(text) && /(?:^|\r?\n)Content-Type:/iu.test(text))) {
          throw new Error(`build artifact contains secret-like or raw MIME material: ${relative}`);
        }
        output.push({ path: relative, byte_size: bytes.byteLength, sha256: sha256(bytes) });
      }
    }
  };
  await walk(root);
  return normalizeInventory(output, contract);
}
