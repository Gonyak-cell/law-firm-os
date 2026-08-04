import assert from "node:assert/strict";
import test from "node:test";
import { DeepLinkError, parseMatterDeepLink } from "../src/main/deepLinks.js";

test("parser accepts matter document task and auth callback route intents", () => {
  assert.deepEqual(parseMatterDeepLink("matter://matter/MAT-248?tenant=tenant_hash"), {
    type: "matter",
    routeOnly: true,
    matterId: "MAT-248",
    tenantIdHash: "tenant_hash"
  });

  assert.deepEqual(parseMatterDeepLink("matter://document/doc_123?matter=MAT-248&tenant=tenant_hash"), {
    type: "document",
    routeOnly: true,
    documentId: "doc_123",
    matterId: "MAT-248",
    tenantIdHash: "tenant_hash"
  });

  assert.deepEqual(parseMatterDeepLink("matter://task/task_123?matter=MAT-248"), {
    type: "task",
    routeOnly: true,
    taskId: "task_123",
    matterId: "MAT-248",
    tenantIdHash: undefined
  });

  assert.deepEqual(parseMatterDeepLink("matter://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ&session_state=fe1540c3-a69a-469a-9fa3-8a2470936421"), {
    type: "auth_callback",
    routeOnly: true,
    code: "0.ABC_def-123",
    state: "outlook-state:01HQ"
  });

  const reset = parseMatterDeepLink("matter://password-reset/confirm?token=abcdefghijklmnopqrstuvwxyzABCDE_123456");
  assert.deepEqual(reset, {
    type: "password_reset_confirm",
    routeOnly: true,
    token: "abcdefghijklmnopqrstuvwxyzABCDE_123456"
  });

  const tenantBoundToken = "dGVuYW50X2FtaWNfbWF0dGVyX3ZhdWx0.abcdefghijklmnopqrstuvwxyzABCDE_123456";
  assert.deepEqual(parseMatterDeepLink(`matter://password-reset/confirm?token=${tenantBoundToken}`), {
    type: "password_reset_confirm",
    routeOnly: true,
    token: tenantBoundToken
  });
});

test("parser validates scheme route type identifier shape and unknown parameters", () => {
  assert.throws(() => parseMatterDeepLink("https://matter/MAT-248"), (error) => error instanceof DeepLinkError && error.code === "UNSUPPORTED_SCHEME");
  assert.throws(() => parseMatterDeepLink("matter://calendar/view"), (error) => error instanceof DeepLinkError && error.code === "UNSUPPORTED_ROUTE");
  assert.throws(() => parseMatterDeepLink("matter://matter/%2Fsecret"), (error) => error instanceof DeepLinkError && error.code === "INVALID_IDENTIFIER");
  assert.throws(() => parseMatterDeepLink("matter://document/doc_123?extra=true"), (error) => error instanceof DeepLinkError && error.code === "UNKNOWN_QUERY_PARAMETER");
  assert.throws(() => parseMatterDeepLink("matter://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ&issuer=idp"), (error) => error instanceof DeepLinkError && error.code === "UNKNOWN_QUERY_PARAMETER");
  assert.throws(() => parseMatterDeepLink("matter://auth/not-callback?code=0.ABC_def-123&state=outlook-state:01HQ"), (error) => error instanceof DeepLinkError && error.code === "INVALID_AUTH_CALLBACK_PATH");
  assert.throws(() => parseMatterDeepLink("matter://outlook/callback?code=0.ABC_def-123&state=outlook-state:01HQ"), (error) => error instanceof DeepLinkError && error.code === "UNSUPPORTED_ROUTE");
  assert.throws(() => parseMatterDeepLink("https://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ"), (error) => error instanceof DeepLinkError && error.code === "UNSUPPORTED_SCHEME");
  assert.throws(() => parseMatterDeepLink("matter://auth/callback?state=outlook-state:01HQ"), (error) => error instanceof DeepLinkError && error.code === "MISSING_AUTH_CALLBACK_QUERY");
  assert.throws(() => parseMatterDeepLink("matter://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ&state=replay"), (error) => error instanceof DeepLinkError && error.code === "DUPLICATE_QUERY_PARAMETER");
  assert.throws(() => parseMatterDeepLink("matter://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ&session_state=valid&session_state=replay"), (error) => error instanceof DeepLinkError && error.code === "DUPLICATE_QUERY_PARAMETER");
  assert.throws(() => parseMatterDeepLink("matter://auth/callback?code=0.ABC_def-123&state=contains%20space"), (error) => error instanceof DeepLinkError && error.code === "INVALID_AUTH_CALLBACK_STATE");
  assert.throws(() => parseMatterDeepLink("matter://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ&session_state="), (error) => error instanceof DeepLinkError && error.code === "INVALID_AUTH_CALLBACK_SESSION_STATE");
  assert.throws(() => parseMatterDeepLink("matter://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ&session_state=contains%20space"), (error) => error instanceof DeepLinkError && error.code === "INVALID_AUTH_CALLBACK_SESSION_STATE");
  assert.throws(() => parseMatterDeepLink("matter://auth/callback?code=0.ABC_def-123&state=outlook-state:01HQ#fragment"), (error) => error instanceof DeepLinkError && error.code === "INVALID_AUTH_CALLBACK_PATH");
  assert.throws(() => parseMatterDeepLink("matter://password-reset/request?token=abc"), (error) => error instanceof DeepLinkError && error.code === "INVALID_PASSWORD_RESET_PATH");
  assert.throws(() => parseMatterDeepLink("matter://password-reset/confirm"), (error) => error instanceof DeepLinkError && error.code === "MISSING_PASSWORD_RESET_TOKEN");
  assert.throws(() => parseMatterDeepLink("matter://password-reset/confirm?token=short"), (error) => error instanceof DeepLinkError && error.code === "INVALID_PASSWORD_RESET_TOKEN");
  assert.throws(() => parseMatterDeepLink("matter://password-reset/confirm?token=tenant.material.extra"), (error) => error instanceof DeepLinkError && error.code === "INVALID_PASSWORD_RESET_TOKEN");
  assert.throws(() => parseMatterDeepLink("matter://password-reset/confirm?token=tenant%2Fmaterial_abcdefghijklmnopqrstuvwxyz"), (error) => error instanceof DeepLinkError && error.code === "INVALID_PASSWORD_RESET_TOKEN");
  assert.throws(() => parseMatterDeepLink("matter://password-reset/confirm?token=abcdefghijklmnopqrstuvwxyzABCDE_123456&next=https://example.com"), (error) => error instanceof DeepLinkError && error.code === "UNKNOWN_QUERY_PARAMETER");
});
