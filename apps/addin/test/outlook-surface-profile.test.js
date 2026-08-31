import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseOutlookManifest } from "../../../scripts/lib/outlook-manifest-projection.mjs";

import {
  OUTLOOK_PRODUCT_IDS,
  OUTLOOK_SURFACE_PROFILES,
  resolveOutlookSurfaceProfile,
} from "../src/outlook-surface-profile.js";

test("exact manifest ProductIds select the frozen Outlook capability profiles", () => {
  assert.deepEqual(resolveOutlookSurfaceProfile(OUTLOOK_PRODUCT_IDS.matterFull), {
    key: "matter-full",
    productId: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
    manifestFingerprint: {
      permission: "ReadWriteItem",
      hosts: ["Mailbox"],
      itemForms: ["Message:Edit", "Message:Read"],
      extensionPoints: [
        "MessageComposeCommandSurface",
        "MessageComposeCommandSurface",
        "MessageReadCommandSurface",
        "MessageReadCommandSurface",
      ],
      launchEvents: [],
    },
    itemModes: ["read", "compose"],
    actions: [
      "inquiry.create",
      "inquiry.link",
      "matter.file-received",
      "matter.file-sent",
      "matter.save-attachments",
      "matter.create-follow-up",
      "matter.review-send-explicitly",
    ],
  });
  assert.deepEqual(resolveOutlookSurfaceProfile(OUTLOOK_PRODUCT_IDS.inquiryOnly), {
    key: "inquiry-only",
    productId: "952431be-51b8-42a2-9bf6-769a15934e85",
    manifestFingerprint: {
      permission: "ReadItem",
      hosts: ["Mailbox"],
      itemForms: ["Message:Read"],
      extensionPoints: ["MessageReadCommandSurface"],
      launchEvents: [],
    },
    itemModes: ["read"],
    actions: ["inquiry.create", "inquiry.link"],
  });

  assert.ok(Object.isFrozen(OUTLOOK_PRODUCT_IDS));
  assert.ok(Object.isFrozen(OUTLOOK_SURFACE_PROFILES));
  for (const profile of Object.values(OUTLOOK_SURFACE_PROFILES)) {
    assert.ok(Object.isFrozen(profile));
    assert.ok(Object.isFrozen(profile.manifestFingerprint));
    assert.ok(Object.isFrozen(profile.manifestFingerprint.hosts));
    assert.ok(Object.isFrozen(profile.manifestFingerprint.itemForms));
    assert.ok(Object.isFrozen(profile.manifestFingerprint.extensionPoints));
    assert.ok(Object.isFrozen(profile.manifestFingerprint.launchEvents));
    assert.ok(Object.isFrozen(profile.itemModes));
    assert.ok(Object.isFrozen(profile.actions));
  }
});

test("profile selection never infers identity from display, query, or Entra inputs", () => {
  for (const value of [
    "AMIC OS",
    "?clientInquiryOnly=1",
    "11111111-1111-4111-8111-111111111111",
    OUTLOOK_PRODUCT_IDS.matterFull.toUpperCase(),
    ` ${OUTLOOK_PRODUCT_IDS.inquiryOnly}`,
    { productId: OUTLOOK_PRODUCT_IDS.matterFull },
    { displayName: "AMIC OS", clientInquiryOnly: true },
    { clientId: OUTLOOK_PRODUCT_IDS.matterFull },
    null,
  ]) {
    assert.throws(() => resolveOutlookSurfaceProfile(value), /Unknown Outlook manifest ProductId/u);
  }
  assert.doesNotMatch(JSON.stringify(OUTLOOK_SURFACE_PROFILES), /display|query|tenant|entra|clientId|client_id/iu);
});

test("each frozen profile fingerprint is derived from its real production manifest", async () => {
  for (const [productId, manifestName] of [
    [OUTLOOK_PRODUCT_IDS.matterFull, "manifest.production.xml"],
    [OUTLOOK_PRODUCT_IDS.inquiryOnly, "manifest.inquiry.production.xml"],
  ]) {
    const profile = resolveOutlookSurfaceProfile(productId);
    const manifest = parseOutlookManifest(await readFile(new URL(`../${manifestName}`, import.meta.url), "utf8"));
    assert.equal(manifest.product_id, productId);
    assert.equal(manifest.permission, profile.manifestFingerprint.permission);
    assert.deepEqual(manifest.top_level_hosts, profile.manifestFingerprint.hosts);
    assert.deepEqual(manifest.rule_fingerprints, profile.manifestFingerprint.itemForms);
    assert.deepEqual(manifest.extension_points, profile.manifestFingerprint.extensionPoints);
    assert.deepEqual(manifest.launch_events, profile.manifestFingerprint.launchEvents);
  }
});
