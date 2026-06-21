import assert from "node:assert/strict";
import test from "node:test";
import { DeepLinkError, parseMaterDeepLink } from "../src/main/deepLinks.js";

test("parser accepts matter document task and auth callback route intents", () => {
  assert.deepEqual(parseMaterDeepLink("mater://matter/MAT-248?tenant=tenant_hash"), {
    type: "matter",
    routeOnly: true,
    matterId: "MAT-248",
    tenantIdHash: "tenant_hash"
  });

  assert.deepEqual(parseMaterDeepLink("mater://document/doc_123?matter=MAT-248&tenant=tenant_hash"), {
    type: "document",
    routeOnly: true,
    documentId: "doc_123",
    matterId: "MAT-248",
    tenantIdHash: "tenant_hash"
  });

  assert.deepEqual(parseMaterDeepLink("mater://task/task_123?matter=MAT-248"), {
    type: "task",
    routeOnly: true,
    taskId: "task_123",
    matterId: "MAT-248",
    tenantIdHash: undefined
  });

  assert.deepEqual(parseMaterDeepLink("mater://auth/callback?code=abc&state=def&issuer=idp"), {
    type: "auth_callback",
    routeOnly: true,
    code: "abc",
    state: "def",
    issuer: "idp"
  });
});

test("parser validates scheme route type identifier shape and unknown parameters", () => {
  assert.throws(() => parseMaterDeepLink("https://matter/MAT-248"), (error) => error instanceof DeepLinkError && error.code === "UNSUPPORTED_SCHEME");
  assert.throws(() => parseMaterDeepLink("mater://calendar/view"), (error) => error instanceof DeepLinkError && error.code === "UNSUPPORTED_ROUTE");
  assert.throws(() => parseMaterDeepLink("mater://matter/%2Fsecret"), (error) => error instanceof DeepLinkError && error.code === "INVALID_IDENTIFIER");
  assert.throws(() => parseMaterDeepLink("mater://document/doc_123?extra=true"), (error) => error instanceof DeepLinkError && error.code === "UNKNOWN_QUERY_PARAMETER");
  assert.throws(() => parseMaterDeepLink("mater://auth/callback?code=abc&state=def&issuer=idp&next=https://example.com"), (error) => error instanceof DeepLinkError && error.code === "UNKNOWN_QUERY_PARAMETER");
});
