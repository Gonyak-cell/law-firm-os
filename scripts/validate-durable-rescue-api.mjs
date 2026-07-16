#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  LAWOS_DURABLE_RUNTIME_HOME,
  lawosDurableStorePathOptions,
  readOrCreateLocalSessionSecret,
} from "../apps/api/src/local-durable-store-paths.js";
import { startApiServer } from "../apps/api/src/server.js";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { VAULT_BRIDGE_TOKEN_HEADER } from "../apps/api/src/matter-runtime-context.js";

const TENANT_ID = "tenant_amic_matter_vault";
const PROBE_TERMS = ["그래비티랩스", "오윤록 외 2명", "새빗켐", "DEAL", "Project Tempus"];
const BRIDGE_TOKEN = "durable-data-rescue-api-validator-token";
const ARTIFACT_PATH = "artifacts/manual-qa/durable-data-rescue-api-2026-07-09.json";

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function permissionContext() {
  return {
    principal: {
      tenant_id: TENANT_ID,
      tenant_ids: [TENANT_ID],
      user_id: "durable_rescue_api_validator",
      role_ids: ["lawos_admin"],
      group_ids: ["group_matter_vault_admins"],
      scopes: ["tenant.admin", "matter.read", "matter.write", "audit.read"],
      assurance_level: "password",
    },
    rules: [{ id: "durable-rescue-api-validator-allow", effect: "allow", action: "*" }],
    object_acl: [],
  };
}

async function closeServer(started) {
  await new Promise((resolveClose) => started.server.close(resolveClose));
}

async function fetchLookup({ baseUrl, term }) {
  const url = new URL("/api/matters/vault-bridge/matter-lookup", baseUrl);
  url.searchParams.set("tenant_id", TENANT_ID);
  url.searchParams.set("permission_ref", "durable_rescue_api_validator");
  url.searchParams.set("audit_hint_ref", `durable_rescue_api_${term.replace(/\s+/g, "_")}`);
  url.searchParams.set("q", term);
  const response = await fetch(url, {
    headers: {
      [VAULT_BRIDGE_TOKEN_HEADER]: BRIDGE_TOKEN,
      [PERMISSION_CONTEXT_HEADER]: JSON.stringify(permissionContext()),
    },
  });
  const body = await response.json();
  const bodyText = JSON.stringify(body);
  return {
    term,
    status: response.status,
    outcome: body.outcome,
    item_count: Array.isArray(body.items) ? body.items.length : 0,
    term_present_in_response: bodyText.includes(term) || (term === "오윤록 외 2명" && bodyText.includes("오윤록")),
    items: (body.items ?? []).map((item) => ({
      matter_id: item.matter_id,
      matter_code: item.matter_code,
      matter_name: item.matter_name,
      client_display_name: item.client_display_name,
      source_revision: item.source_revision,
      production_ready_claim: item.production_ready_claim,
    })),
    safe_error_codes: body.safe_error_codes ?? [],
    production_ready_claim: body.production_ready_claim,
  };
}

async function main() {
  const previousEnv = {
    LAWOS_VAULT_BRIDGE_ENABLED: process.env.LAWOS_VAULT_BRIDGE_ENABLED,
    LAWOS_VAULT_BRIDGE_TOKEN: process.env.LAWOS_VAULT_BRIDGE_TOKEN,
    LAWOS_VAULT_BRIDGE_ALLOWED_TENANT_IDS: process.env.LAWOS_VAULT_BRIDGE_ALLOWED_TENANT_IDS,
  };
  process.env.LAWOS_VAULT_BRIDGE_ENABLED = "true";
  process.env.LAWOS_VAULT_BRIDGE_TOKEN = BRIDGE_TOKEN;
  process.env.LAWOS_VAULT_BRIDGE_ALLOWED_TENANT_IDS = TENANT_ID;

  let started;
  try {
    started = await startApiServer({
      port: 0,
      runtimeProfile: "operational",
      sessionSecret: readOrCreateLocalSessionSecret(),
      ...lawosDurableStorePathOptions({ root: LAWOS_DURABLE_RUNTIME_HOME }),
    });
    const baseUrl = `http://${started.host}:${started.port}`;
    const probes = [];
    for (const term of PROBE_TERMS) probes.push(await fetchLookup({ baseUrl, term }));
    for (const probe of probes) {
      assert.equal(probe.status, 200, `${probe.term} API status should be 200`);
      assert.equal(probe.outcome, "passed", `${probe.term} API outcome should pass`);
      assert.equal(probe.item_count > 0, true, `${probe.term} should return at least one item`);
      assert.equal(probe.term_present_in_response, true, `${probe.term} should appear in API response`);
    }
    const receipt = {
      schema_version: "law-firm-os.durable-data-rescue-api-validation.v0.1",
      validator: "durable-data-rescue-api",
      outcome: "passed",
      generated_at: new Date().toISOString(),
      durable_runtime_home: LAWOS_DURABLE_RUNTIME_HOME,
      api_base_url: baseUrl,
      tenant_id: TENANT_ID,
      probe_terms: PROBE_TERMS,
      probes,
      production_ready_claim: false,
      go_live_claim: false,
      public_release_claim: false,
    };
    const artifact = resolve(ARTIFACT_PATH);
    writeJson(artifact, receipt);
    console.log(JSON.stringify({ outcome: receipt.outcome, validator: receipt.validator, artifact, probe_count: probes.length }, null, 2));
  } finally {
    if (started) await closeServer(started);
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
