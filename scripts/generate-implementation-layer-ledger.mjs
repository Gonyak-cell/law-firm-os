#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = "docs/closeout-packs";
const outputJson = "docs/closeout-pack-plan/implementation-layer-ledger.json";
const outputMd = "docs/closeout-pack-plan/implementation-layer-ledger.md";
const contractPath = "contracts/runtime-readiness-contract.json";

function packNumber(id) {
  const match = /^CP00-(\d{3,})$/.exec(id ?? "");
  return match ? Number(match[1]) : Number.NaN;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function hasDescriptorEvidence(manifest) {
  const text = JSON.stringify(manifest).toLowerCase();
  return (
    manifest.implementation_summary?.descriptor_only === true ||
    manifest.program?.descriptor_only === true ||
    manifest.no_write_attestation?.validates_scope_contract_foundation_descriptor_only === true ||
    text.includes("descriptor_only") ||
    text.includes("descriptor verified")
  );
}

function classify(manifest, boundary) {
  const number = packNumber(manifest.pack_id);
  if (number >= boundary && manifest.implementation_layer) {
    return {
      implementation_layer: manifest.implementation_layer,
      layer_source: "declared",
      derivation_reason: "boundary-or-later manifest declared implementation_layer",
    };
  }
  if (hasDescriptorEvidence(manifest)) {
    return {
      implementation_layer: "descriptor",
      layer_source: "derived_descriptor",
      derivation_reason: "manifest contains descriptor-only or descriptor-verified evidence",
    };
  }
  return {
    implementation_layer: "descriptor",
    layer_source: "undeclared_legacy",
    derivation_reason: "pre-boundary pack has no implementation_layer declaration and is not retroactively claimed runtime",
  };
}

export async function buildImplementationLayerLedger() {
  const contractText = await readFile(contractPath, "utf8");
  const contract = JSON.parse(contractText);
  const entries = await readdir(root, { withFileTypes: true });
  const packs = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^cp00-\d+$/i.test(entry.name)) continue;
    const manifestPath = path.join(root, entry.name, "manifest.json");
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch {
      continue;
    }
    const layer = classify(manifest, contract.implementation_layer_start_pack_number);
    packs.push({
      pack_id: manifest.pack_id,
      pack_number: packNumber(manifest.pack_id),
      status: manifest.status,
      risk_class: manifest.risk_class,
      unit_count: manifest.unit_count,
      program_id: manifest.program_id,
      manifest_ref: manifestPath,
      ...layer,
      runtime_ready: manifest.runtime_ready === true,
    });
  }
  packs.sort((a, b) => a.pack_number - b.pack_number);
  const layer_counts = {};
  const layer_source_counts = {};
  for (const pack of packs) {
    layer_counts[pack.implementation_layer] = (layer_counts[pack.implementation_layer] ?? 0) + 1;
    layer_source_counts[pack.layer_source] = (layer_source_counts[pack.layer_source] ?? 0) + 1;
  }
  return {
    schema_version: "law-firm-os.implementation-layer-ledger.v0.1",
    generated_by: "scripts/generate-implementation-layer-ledger.mjs",
    contract_ref: contractPath,
    contract_sha256: sha256(contractText),
    implementation_layer_start_pack_number: contract.implementation_layer_start_pack_number,
    implementation_layer_start_pack_id: contract.implementation_layer_start_pack_id,
    retroactive_manifest_edits: "forbidden",
    packs,
    summary: {
      pack_count: packs.length,
      runtime_ready_packs: packs.filter((pack) => pack.runtime_ready).length,
      layer_counts,
      layer_source_counts,
      declared_before_boundary_count: packs.filter((pack) => pack.pack_number < contract.implementation_layer_start_pack_number && pack.layer_source === "declared").length,
    },
  };
}

function markdownFor(ledger) {
  const lines = [
    "# Implementation Layer Ledger",
    "",
    "Status: derived, read-only classification of closeout pack manifests. Closed packs are not edited and are not retroactively claimed runtime-ready.",
    "",
    "## Summary",
    "",
    `- Pack count: ${ledger.summary.pack_count}`,
    `- Runtime-ready packs: ${ledger.summary.runtime_ready_packs}`,
    `- Start boundary: ${ledger.implementation_layer_start_pack_id}`,
    `- Layer counts: ${JSON.stringify(ledger.summary.layer_counts)}`,
    `- Layer source counts: ${JSON.stringify(ledger.summary.layer_source_counts)}`,
    `- Declared before boundary: ${ledger.summary.declared_before_boundary_count}`,
    "",
    "## Packs",
    "",
    "| pack | layer | source | runtime_ready | units | reason |",
    "|---|---|---|---|---|---|",
  ];
  for (const pack of ledger.packs) {
    lines.push(`| ${pack.pack_id} | ${pack.implementation_layer} | ${pack.layer_source} | ${pack.runtime_ready} | ${pack.unit_count} | ${pack.derivation_reason} |`);
  }
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ledger = await buildImplementationLayerLedger();
  await mkdir(path.dirname(outputJson), { recursive: true });
  await writeFile(outputJson, `${JSON.stringify(ledger, null, 2)}\n`);
  await writeFile(outputMd, markdownFor(ledger));
  console.log(`Generated ${outputJson} with ${ledger.summary.pack_count} packs.`);
}
