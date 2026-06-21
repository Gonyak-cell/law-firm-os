#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contractPath = "contracts/desktop-session-cleanup-contract.json";
const contract = JSON.parse(readFileSync(contractPath, "utf8"));

const requiredCacheClasses = [
  "secure_store_tokens",
  "pending_pkce_state",
  "session_summary_cache",
  "api_response_cache",
  "renderer_memory_cache",
  "service_worker_cache",
  "browser_storage",
  "tenant_shell_state",
  "deep_link_pending_state"
];

assert.equal(contract.schema, "law-firm-os.desktop.session-cleanup-contract.v0.1");
assert.equal(contract.product, "mater");
assert(Array.isArray(contract.required_cache_classes), "required_cache_classes must be an array");

for (const cacheClass of requiredCacheClasses) {
  assert(contract.required_cache_classes.includes(cacheClass), `missing required cache class ${cacheClass}`);
  assert(contract.cleanup_triggers.logout.includes(cacheClass), `logout does not wipe ${cacheClass}`);
  assert(contract.cleanup_triggers.tenant_switch.includes(cacheClass), `tenant switch does not wipe ${cacheClass}`);
}

for (const survivor of contract.forbidden_survivors) {
  assert(!contract.required_cache_classes.includes(survivor), `${survivor} must be a forbidden survivor, not a cache class`);
}

assert.equal(contract.renderer_storage_policy.localStorage_token_allowed, false);
assert.equal(contract.renderer_storage_policy.sessionStorage_token_allowed, false);
assert.equal(contract.renderer_storage_policy.indexedDB_token_allowed, false);
assert.equal(contract.renderer_storage_policy.cache_api_token_allowed, false);
assert.equal(contract.non_claims.cleanup_implemented, false);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      contract: contractPath,
      required_cache_class_count: requiredCacheClasses.length,
      logout_wipes_all_required_cache_classes: true,
      tenant_switch_wipes_all_required_cache_classes: true,
      renderer_token_storage_allowed: false
    },
    null,
    2
  )
);
