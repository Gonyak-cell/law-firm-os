function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") deepFreeze(child);
  }
  return Object.freeze(value);
}

export const OUTLOOK_PRODUCT_IDS = deepFreeze({
  matterFull: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
  inquiryOnly: "952431be-51b8-42a2-9bf6-769a15934e85",
});

export const OUTLOOK_SURFACE_PROFILES = deepFreeze({
  [OUTLOOK_PRODUCT_IDS.matterFull]: {
    key: "matter-full",
    productId: OUTLOOK_PRODUCT_IDS.matterFull,
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
  },
  [OUTLOOK_PRODUCT_IDS.inquiryOnly]: {
    key: "inquiry-only",
    productId: OUTLOOK_PRODUCT_IDS.inquiryOnly,
    manifestFingerprint: {
      permission: "ReadItem",
      hosts: ["Mailbox"],
      itemForms: ["Message:Read"],
      extensionPoints: ["MessageReadCommandSurface"],
      launchEvents: [],
    },
    itemModes: ["read"],
    actions: ["inquiry.create", "inquiry.link"],
  },
});

export function resolveOutlookSurfaceProfile(productId) {
  const profile = typeof productId === "string" && Object.hasOwn(OUTLOOK_SURFACE_PROFILES, productId)
    ? OUTLOOK_SURFACE_PROFILES[productId]
    : null;
  if (!profile) throw new RangeError("Unknown Outlook manifest ProductId");
  return profile;
}
