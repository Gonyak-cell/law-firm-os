#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const localSecretFile = ".env.matter-vault-r4.local";
const localSecretPath = path.join(ROOT, localSecretFile);
const requiredKeys = [
  "MATTER_VAULT_R4_PRODUCTION_BASE_URL",
  "MATTER_VAULT_R4_PRODUCTION_TENANT_ID",
  "MATTER_VAULT_R4_OPERATOR_ACTOR",
  "MATTER_VAULT_R4_OPERATOR_TOKEN",
  "MATTER_VAULT_R4_MIGRATION_WINDOW",
];
const placeholderPatterns = [
  /^$/,
  /^changeme$/i,
  /^replace-me$/i,
  /^pilot-YYYY-MM-DD$/i,
  /^https:\/\/example\.invalid/i,
];

function parseEnv(text) {
  const out = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out.set(key, value);
  }
  return out;
}

const errors = [];

if (!existsSync(localSecretPath)) {
  errors.push(`${localSecretFile}: missing. Copy .env.matter-vault-r4.local.example to ${localSecretFile} and fill values locally.`);
} else {
  const values = parseEnv(readFileSync(localSecretPath, "utf8"));
  for (const key of requiredKeys) {
    const value = values.get(key) ?? "";
    if (placeholderPatterns.some((pattern) => pattern.test(value))) {
      errors.push(`${key}: missing_or_placeholder`);
    }
  }

  const baseUrl = values.get("MATTER_VAULT_R4_PRODUCTION_BASE_URL") ?? "";
  if (baseUrl && !/^https:\/\//i.test(baseUrl)) {
    errors.push("MATTER_VAULT_R4_PRODUCTION_BASE_URL: must use https");
  }
}

if (errors.length > 0) {
  console.error("Matter-Vault R4 local secret validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Matter-Vault R4 local secret validation passed.");
for (const key of requiredKeys) {
  console.log(`${key}: present`);
}
console.log("secret_values_printed: false");
