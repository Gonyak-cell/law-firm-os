#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contractPath = "contracts/desktop-deep-link-contract.json";
const contract = JSON.parse(readFileSync(contractPath, "utf8"));

const allowedRouteIds = ["matter", "document", "task", "auth_callback"];
const forbiddenActions = [
  "mutation",
  "download",
  "upload",
  "ai_generate",
  "billing_write",
  "delivery_execution",
  "file_bridge",
  "open_external_url",
  "execute_command"
];

assert.equal(contract.schema, "law-firm-os.desktop.deep-link-contract.v0.2");
assert.equal(contract.product, "matter");
assert.equal(contract.status, "route_intents_active");
assert(Array.isArray(contract.allowed_routes), "allowed_routes must be an array");

const actualRouteIds = contract.allowed_routes.map((route) => route.id).sort();
assert.deepEqual(actualRouteIds, [...allowedRouteIds].sort(), "deep link contract must allow matter, document, task, and auth_callback only");

for (const route of contract.allowed_routes) {
  assert.equal(route.scheme, "matter", `${route.id} route must use matter scheme`);
  assert.equal(route.may_mutate_product_state, false, `${route.id} must not mutate product state`);
  assert.equal(route.may_download, false, `${route.id} must not download`);
  assert.equal(route.may_upload, false, `${route.id} must not upload`);
  assert.equal(route.may_ai_generate, false, `${route.id} must not AI generate`);
  if (route.id !== "auth_callback") {
    assert.equal(route.executes_action, "route_intent_only", `${route.id} must be route intent only`);
    assert.equal(route.requires_backend_permission_recheck, true, `${route.id} must require permission recheck`);
    assert.equal(route.requires_open_audit, true, `${route.id} must require open audit`);
  }
}

for (const forbiddenAction of forbiddenActions) {
  assert(contract.forbidden_actions.includes(forbiddenAction), `missing forbidden action ${forbiddenAction}`);
  assert(!actualRouteIds.includes(forbiddenAction), `${forbiddenAction} must not be an allowed route`);
}

assert.equal(contract.validation_rules.scheme_required, "matter");
assert.equal(contract.validation_rules.route_id_allowlist_required, true);
assert.equal(contract.validation_rules.identifier_shape_required, true);
assert.equal(contract.validation_rules.unknown_query_parameters_rejected, true);
assert.equal(contract.validation_rules.backend_permission_recheck_for_workspace_routes, true);
assert.equal(contract.validation_rules.renderer_receives_route_intent_only, true);
assert.equal(contract.non_claims.deep_link_parser_implemented, false);
assert.equal(contract.non_claims.notification_integration_implemented, false);
assert.equal(contract.non_claims.production_deep_link_ready, false);
assert.equal(contract.non_claims.public_release_ready, false);
assert.equal(contract.non_claims.owner_approval_recorded, false);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      contract: contractPath,
      allowed_routes: allowedRouteIds,
      route_intent_only: true,
      forbidden_actions_checked: forbiddenActions.length,
      parser_implemented_claim: false,
      owner_approval_recorded: false
    },
    null,
    2
  )
);
