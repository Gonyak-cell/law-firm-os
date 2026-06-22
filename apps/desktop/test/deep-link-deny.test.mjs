import assert from "node:assert/strict";
import test from "node:test";
import { DeepLinkError, parseMatterDeepLink } from "../src/main/deepLinks.js";

const forbiddenLinks = [
  "matter://mutation/matter_123",
  "matter://download/doc_123",
  "matter://upload/matter_123",
  "matter://ai/generate?prompt=write",
  "matter://billing/write?amount=100",
  "matter://delivery/execute?task=serve"
];

test("deep links deny action execution hosts", () => {
  for (const link of forbiddenLinks) {
    assert.throws(
      () => parseMatterDeepLink(link),
      (error) => error instanceof DeepLinkError && error.code === "FORBIDDEN_ACTION_LINK",
      link
    );
  }
});

test("deep links deny action execution query parameters on allowed routes", () => {
  const links = [
    "matter://matter/MAT-248?download=true",
    "matter://document/doc_123?action=download",
    "matter://task/task_123?billing_write=true",
    "matter://auth/callback?code=abc&state=def&issuer=idp&delivery_execution=true"
  ];

  for (const link of links) {
    assert.throws(
      () => parseMatterDeepLink(link),
      (error) => error instanceof DeepLinkError && error.code === "FORBIDDEN_ACTION_LINK",
      link
    );
  }
});
