import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFormalPackageRendererUrl,
  formalPackageRendererUrl,
} from "../lib/formal-package-renderer-url.mjs";

test("formal package navigation uses the production origin and round-trips query/hash state", () => {
  const route = formalPackageRendererUrl("#matter-billing", "matters");
  const url = assertFormalPackageRendererUrl(route);

  assert.equal(url.protocol, "matter-app:");
  assert.equal(url.hostname, "app");
  assert.equal(url.pathname, "/index.html");
  assert.equal(url.searchParams.get("desktop"), "1");
  assert.equal(url.searchParams.get("locale"), "ko");
  assert.equal(url.searchParams.get("view"), "matters");
  assert.equal(url.searchParams.get("ctx"), "allow");
  assert.equal(url.hash, "#matter-billing");

  const preserved = assertFormalPackageRendererUrl(
    "matter-app://app/index.html?desktop=1&locale=ko&view=matters&ctx=allow&intent=keep#matter-billing",
  );
  assert.equal(preserved.searchParams.get("intent"), "keep");
  assert.equal(preserved.hash, "#matter-billing");
});

test("formal package URL validation rejects file URLs, credentials, ports, and wrong scheme, host, or path", () => {
  for (const candidate of [
    "file:///Applications/matter.app/Contents/Resources/app/src/renderer/web/index.html?desktop=1",
    "https://app/index.html?desktop=1",
    "matter-app://evil/index.html?desktop=1",
    "matter-app://app/not-index.html?desktop=1",
    "matter-app://user:password@app/index.html?desktop=1",
    "matter-app://app:password@index/index.html?desktop=1",
    "matter-app://app:443/index.html?desktop=1",
    "matter-app://app/index.html",
    "matter-app://app/index.html?desktop=0",
    "matter-app://app/index.html?desktop=1&desktop=1",
    "matter-app://app/index.html?desktop=1&desktop=0",
  ]) {
    assert.throws(() => assertFormalPackageRendererUrl(candidate), TypeError, candidate);
  }
});
