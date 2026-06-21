import assert from "node:assert/strict";
import test from "node:test";
import { DeepLinkError, parseMaterDeepLink } from "../src/main/deepLinks.js";

const forbiddenLinks = [
  "mater://mutation/matter_123",
  "mater://download/doc_123",
  "mater://upload/matter_123",
  "mater://ai/generate?prompt=write",
  "mater://billing/write?amount=100",
  "mater://delivery/execute?task=serve"
];

test("deep links deny action execution hosts", () => {
  for (const link of forbiddenLinks) {
    assert.throws(
      () => parseMaterDeepLink(link),
      (error) => error instanceof DeepLinkError && error.code === "FORBIDDEN_ACTION_LINK",
      link
    );
  }
});

test("deep links deny action execution query parameters on allowed routes", () => {
  const links = [
    "mater://matter/MAT-248?download=true",
    "mater://document/doc_123?action=download",
    "mater://task/task_123?billing_write=true",
    "mater://auth/callback?code=abc&state=def&issuer=idp&delivery_execution=true"
  ];

  for (const link of links) {
    assert.throws(
      () => parseMaterDeepLink(link),
      (error) => error instanceof DeepLinkError && error.code === "FORBIDDEN_ACTION_LINK",
      link
    );
  }
});
