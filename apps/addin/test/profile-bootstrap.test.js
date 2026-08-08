import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import { parseOutlookManifest } from "../../../scripts/lib/outlook-manifest-projection.mjs";
import {
  bootstrapOutlookSurface,
} from "../src/outlook-profile-bootstrap.js";

const addinRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MATTER_PRODUCT_ID = "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
const INQUIRY_PRODUCT_ID = "952431be-51b8-42a2-9bf6-769a15934e85";
const MATTER_SOURCE_URL = "https://d2mthcc8vp3cr2.cloudfront.net/addin/index.html";
const INQUIRY_SOURCE_URL = "https://d2mthcc8vp3cr2.cloudfront.net/outlook-addin/index.html?tenantId=tenant_amic_matter_vault&clientInquiryOnly=1";

test("manifest source locations bind each exact production URL to its fixed entrypoint", async () => {
  const cases = [
    ["matter-full", "manifest.production.xml", MATTER_PRODUCT_ID, MATTER_SOURCE_URL],
    ["inquiry-only", "manifest.inquiry.production.xml", INQUIRY_PRODUCT_ID, INQUIRY_SOURCE_URL],
  ];
  for (const [entrypoint, manifestName, productId, sourceUrl] of cases) {
    const manifest = parseOutlookManifest(
      await readFile(path.join(addinRoot, manifestName), "utf8"),
    );
    assert.deepEqual(manifest.form_source_locations, [sourceUrl]);
    const globalObject = {};
    const result = bootstrapOutlookSurface(entrypoint, {
      location: { search: "?clientInquiryOnly=1&tenantId=attacker" },
      globalObject,
    });
    assert.equal(result.binding.key, entrypoint);
    assert.equal(result.binding.productId, productId);
    assert.equal(globalObject.__LAWOS_OUTLOOK_SURFACE_PROFILE.productId, productId);
  }
});

test("query tampering cannot promote the 952 entrypoint or demote the 8f3 entrypoint", () => {
  const queries = [
    "",
    "?clientInquiryOnly=0",
    "?clientInquiryOnly=1",
    "?clientInquiryOnly=true&tenantId=tenant_attacker&productId=8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
  ];
  for (const search of queries) {
    const inquiryGlobal = {};
    const inquiry = bootstrapOutlookSurface("inquiry-only", {
      location: { search },
      globalObject: inquiryGlobal,
    });
    assert.equal(inquiry.binding.productId, INQUIRY_PRODUCT_ID);
    assert.equal(inquiryGlobal.__LAWOS_OUTLOOK_SURFACE_PROFILE.key, "inquiry-only");

    const matterGlobal = {};
    const matter = bootstrapOutlookSurface("matter-full", {
      location: { search },
      globalObject: matterGlobal,
    });
    assert.equal(matter.binding.productId, MATTER_PRODUCT_ID);
    assert.equal(matterGlobal.__LAWOS_OUTLOOK_SURFACE_PROFILE.key, "matter-full");
  }
});

test("fixed profile is established before the launch query is read", () => {
  const globalObject = {};
  let profileWasBoundBeforeQuery = false;
  const result = bootstrapOutlookSurface("inquiry-only", {
    globalObject,
    location: {
      get search() {
        profileWasBoundBeforeQuery = globalObject.__LAWOS_OUTLOOK_SURFACE_PROFILE?.key === "inquiry-only";
        return "?clientInquiryOnly=1";
      },
    },
  });
  assert.equal(profileWasBoundBeforeQuery, true);
  assert.equal(result.binding.key, "inquiry-only");
  assert.equal(result.presentation.clientInquiryOnly, true);
});

test("the full entry mounts the existing Matter surface after binding 8f3", async () => {
  const { mountMatterSurface } = await import("../src/matter-entry.js?profile-test");
  const globalObject = {};
  let mounted = false;
  const result = await mountMatterSurface({
    globalObject,
    location: { search: "?clientInquiryOnly=1" },
    loadMain: async () => {
      mounted = true;
      assert.equal(globalObject.__LAWOS_OUTLOOK_SURFACE_PROFILE.key, "matter-full");
      assert.equal(globalObject.__LAWOS_OUTLOOK_SURFACE_PROFILE.productId, MATTER_PRODUCT_ID);
      return "matter-mounted";
    },
  });
  assert.equal(mounted, true);
  assert.equal(result, "matter-mounted");
});
