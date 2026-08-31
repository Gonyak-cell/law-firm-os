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
const MATTER_BUILD_PROFILE = Object.freeze({
  key: "matter-full",
  productId: MATTER_PRODUCT_ID,
  productionSourceLocation: "/addin/index.html",
  productionBase: "/addin/",
  vaultExactAttachmentEnabled: false,
  vaultSourceSaveEnabled: false,
});
const INQUIRY_BUILD_PROFILE = Object.freeze({
  key: "inquiry-only",
  productId: INQUIRY_PRODUCT_ID,
  productionSourceLocation:
    "/outlook-addin/index.html?tenantId=tenant_amic_matter_vault&clientInquiryOnly=1",
  productionBase: "/outlook-addin/",
  vaultExactAttachmentEnabled: false,
  vaultSourceSaveEnabled: false,
  itemModes: ["read"],
  actions: ["inquiry.create", "inquiry.link"],
});

test("manifest source locations bind each exact production URL to its fixed entrypoint", async () => {
  const cases = [
    [MATTER_BUILD_PROFILE, "manifest.production.xml", MATTER_SOURCE_URL],
    [INQUIRY_BUILD_PROFILE, "manifest.inquiry.production.xml", INQUIRY_SOURCE_URL],
  ];
  for (const [buildProfile, manifestName, sourceUrl] of cases) {
    const manifest = parseOutlookManifest(
      await readFile(path.join(addinRoot, manifestName), "utf8"),
    );
    assert.deepEqual(manifest.form_source_locations, [sourceUrl]);
    const globalObject = {};
    const result = bootstrapOutlookSurface(buildProfile.key, {
      buildProfile,
      build: "addin@source-sha-test",
      location: { search: "?clientInquiryOnly=1&tenantId=attacker" },
      globalObject,
    });
    assert.equal(result.binding.key, buildProfile.key);
    assert.equal(result.binding.productId, buildProfile.productId);
    assert.equal(result.binding.productionSourceLocation, buildProfile.productionSourceLocation);
    assert.equal(result.binding.build, "addin@source-sha-test");
    assert.equal(result.binding.profile.vaultExactAttachmentEnabled, false);
    assert.equal(result.binding.profile.vaultSourceSaveEnabled, false);
    assert.equal(globalObject.__LAWOS_OUTLOOK_SURFACE_PROFILE.productId, buildProfile.productId);
  }
});

test("only the sealed Matter build profile can enable exact Vault attachment", () => {
  const disabled = bootstrapOutlookSurface("matter-full", {
    buildProfile: MATTER_BUILD_PROFILE,
    globalObject: {},
    location: { search: "?vaultExactAttachmentEnabled=1" },
  });
  assert.equal(disabled.binding.profile.vaultExactAttachmentEnabled, false);

  const enabledProfile = Object.freeze({
    ...MATTER_BUILD_PROFILE,
    vaultExactAttachmentEnabled: true,
  });
  const enabled = bootstrapOutlookSurface("matter-full", {
    buildProfile: enabledProfile,
    globalObject: {},
    location: { search: "?vaultExactAttachmentEnabled=0" },
  });
  assert.equal(enabled.binding.profile.vaultExactAttachmentEnabled, true);
  assert.ok(Object.isFrozen(enabled.binding.profile));
});

test("only the sealed Matter build profile can enable Vault source save", () => {
  const disabled = bootstrapOutlookSurface("matter-full", {
    buildProfile: MATTER_BUILD_PROFILE,
    globalObject: {},
    location: { search: "?vaultSourceSaveEnabled=1" },
  });
  assert.equal(disabled.binding.profile.vaultSourceSaveEnabled, false);

  const enabledProfile = Object.freeze({
    ...MATTER_BUILD_PROFILE,
    vaultSourceSaveEnabled: true,
  });
  const enabled = bootstrapOutlookSurface("matter-full", {
    buildProfile: enabledProfile,
    globalObject: {},
    location: { search: "?vaultSourceSaveEnabled=0" },
  });
  assert.equal(enabled.binding.profile.vaultSourceSaveEnabled, true);
  assert.ok(Object.isFrozen(enabled.binding.profile));
});

test("build revision is sealed into the fixed surface binding and rejects unsafe input", () => {
  const globalObject = {};
  const result = bootstrapOutlookSurface("matter-full", {
    buildProfile: MATTER_BUILD_PROFILE,
    build: "addin@09ad50c275292899a03b46962493cf39ce714b09",
    globalObject,
    location: { search: "" },
  });
  assert.equal(result.binding.build, "addin@09ad50c275292899a03b46962493cf39ce714b09");
  assert.equal(globalObject.__LAWOS_OUTLOOK_SURFACE_PROFILE.build, result.binding.build);

  assert.throws(() => bootstrapOutlookSurface("matter-full", {
    buildProfile: MATTER_BUILD_PROFILE,
    build: " addin@source-sha-test ",
    globalObject: {},
    location: { search: "" },
  }), /Invalid Outlook build identity/u);
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
      buildProfile: INQUIRY_BUILD_PROFILE,
      location: { search },
      globalObject: inquiryGlobal,
    });
    assert.equal(inquiry.binding.productId, INQUIRY_PRODUCT_ID);
    assert.equal(inquiryGlobal.__LAWOS_OUTLOOK_SURFACE_PROFILE.key, "inquiry-only");

    const matterGlobal = {};
    const matter = bootstrapOutlookSurface("matter-full", {
      buildProfile: MATTER_BUILD_PROFILE,
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
    buildProfile: INQUIRY_BUILD_PROFILE,
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
    buildProfile: MATTER_BUILD_PROFILE,
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
