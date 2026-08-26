#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseOutlookManifest } from "./lib/outlook-manifest-projection.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sorted(values) {
  return [...values].sort();
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function normalizedBaselineProfiles(baseline) {
  if (!baseline || typeof baseline !== "object" || !Array.isArray(baseline.profiles)) {
    throw new Error("explicit OUTM-01 baseline receipt is required");
  }
  if (baseline.profiles.length === 0) throw new Error("baseline profiles must not be empty");

  const byId = new Map();
  for (const profile of baseline.profiles) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      throw new Error("baseline profile must be an object");
    }
    for (const field of [
      "product_id",
      "version",
      "manifest_sha256",
      "assignment_count",
      "assignment_fingerprint_sha256",
    ]) {
      if (profile[field] === undefined || profile[field] === null) {
        throw new Error(`baseline profile ${field} is required`);
      }
    }
    if (byId.has(profile.product_id)) throw new Error(`duplicate baseline ProductId ${profile.product_id}`);
    byId.set(profile.product_id, profile);
  }
  return byId;
}

function validateProjection({ profile, environment, projection, contract, mode }) {
  const prefix = `${profile.profile} ${environment}`;
  assertEqual(projection.product_id, profile.product_id, `${prefix} product_id`);
  assertEqual(
    projection.version,
    mode === "candidate" ? profile.candidate_version : contract.deployed_baseline_version,
    `${prefix} version`,
  );
  assertEqual(projection.provider_name, profile.provider_name, `${prefix} provider_name`);
  assertEqual(projection.display_name, profile.display_name, `${prefix} display_name`);
  assertEqual(projection.permission, profile.permission, `${prefix} permission`);
  const expected = {
    ...profile.manifest_fingerprint,
    ...profile.environment_fingerprints[environment],
  };
  const { semantic_manifest_sha256: semanticHash, ...diagnosticFields } = expected;
  for (const field of Object.keys(diagnosticFields)) {
    assertEqual(projection[field], expected[field], `${prefix} ${field}`);
  }
  assertEqual(projection.semantic_manifest_sha256, semanticHash, `${prefix} semantic_manifest_sha256`);
}

export async function validateOutlookAddinSurfaces({
  repoRoot = defaultRepoRoot,
  contractPath = path.join(repoRoot, "contracts/outlook-addin-surfaces.json"),
  baseline,
  manifestOverrides = {},
  mode = "baseline",
} = {}) {
  if (!new Set(["baseline", "candidate"]).has(mode)) throw new Error(`unsupported mode: ${mode}`);
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  if (contract?.schema_version !== 3) throw new Error("Outlook surface schema_version must be 3");
  const baselineById = normalizedBaselineProfiles(baseline);
  const contractIds = contract.profiles.map((profile) => profile.product_id);
  if (new Set(contractIds).size !== contractIds.length) throw new Error("duplicate ProductId across Outlook profiles");
  assertEqual(sorted([...baselineById.keys()]), sorted(contractIds), "baseline ProductIds");

  for (const profile of contract.profiles) {
    const baselineProfile = baselineById.get(profile.product_id);
    for (const field of ["version", "manifest_sha256"]) {
      const expected = field === "version"
        ? contract.deployed_baseline_version
        : profile[field === "manifest_sha256" ? "baseline_manifest_sha256" : field];
      assertEqual(baselineProfile[field], expected, `${profile.profile} baseline ${field}`);
    }
  }

  if (mode === "baseline") {
    return {
      mode,
      profiles: contract.profiles.map((profile) => ({
        profile: profile.profile,
        product_id: profile.product_id,
        version: contract.deployed_baseline_version,
        permission: profile.permission,
        mailbox_min_version: profile.mailbox_min_version,
        manifest_sha256: profile.baseline_manifest_sha256,
      })),
      permission_event_diff: "none",
    };
  }

  const results = [];
  for (const profile of contract.profiles) {
    const projections = {};
    for (const environment of ["local", "production"]) {
      const manifestPath = profile.manifests[environment];
      const xml = manifestOverrides[manifestPath] ?? (await readFile(path.join(repoRoot, manifestPath), "utf8"));
      const projection = parseOutlookManifest(xml);
      validateProjection({ profile, environment, projection, contract, mode });
      projections[environment] = projection;
    }

    for (const field of profile.local_production_equal_fields) {
      assertEqual(projections.local[field], projections.production[field], `${profile.profile} local/production ${field}`);
    }
    results.push({
      profile: profile.profile,
      product_id: profile.product_id,
      version: projections.production.version,
      permission: projections.production.permission,
      mailbox_min_version: profile.mailbox_min_version,
      manifest_sha256: sha256(
        manifestOverrides[profile.manifests.production]
          ?? (await readFile(path.join(repoRoot, profile.manifests.production), "utf8")),
      ),
      semantic_sha256: projections.production.semantic_manifest_sha256,
    });
  }
  return { mode, profiles: results, permission_event_diff: "none" };
}

async function main() {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf("--mode");
  const baselineIndex = args.indexOf("--baseline");
  const mode = modeIndex >= 0 ? args[modeIndex + 1] : "baseline";
  if (baselineIndex < 0 || !args[baselineIndex + 1]) throw new Error("explicit --baseline receipt is required");
  const baseline = JSON.parse(await readFile(path.resolve(args[baselineIndex + 1]), "utf8"));
  const result = await validateOutlookAddinSurfaces({ mode, baseline });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
