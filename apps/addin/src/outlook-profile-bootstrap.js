function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") deepFreeze(child);
  }
  return Object.freeze(value);
}

const OUTLOOK_PRODUCT_IDS = deepFreeze({
  matterFull: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
  inquiryOnly: "952431be-51b8-42a2-9bf6-769a15934e85",
});

// Keep the inquiry bundle's identity metadata self-contained. Importing the
// all-surface catalog here would pull the full event capability fingerprint
// into the 952 artifact even though the entrypoint cannot execute it.
const FIXED_PROFILES = deepFreeze({
  "matter-full": {
    key: "matter-full",
    productId: OUTLOOK_PRODUCT_IDS.matterFull,
  },
  "inquiry-only": {
    key: "inquiry-only",
    productId: OUTLOOK_PRODUCT_IDS.inquiryOnly,
    itemModes: ["read"],
    actions: ["inquiry.create", "inquiry.link"],
  },
});

/**
 * These bindings are compile-time entrypoint decisions.  URL query values are
 * intentionally absent from the product/profile lookup so an Outlook launch
 * cannot turn the inquiry surface into the Matter surface (or vice versa).
 */
export const OUTLOOK_ENTRYPOINTS = deepFreeze({
  matterFull: {
    key: "matter-full",
    productId: OUTLOOK_PRODUCT_IDS.matterFull,
    productionSourceLocation: "/addin/index.html",
    productionBase: "/addin/",
  },
  inquiryOnly: {
    key: "inquiry-only",
    productId: OUTLOOK_PRODUCT_IDS.inquiryOnly,
    productionSourceLocation:
      "/outlook-addin/index.html?tenantId=tenant_amic_matter_vault&clientInquiryOnly=1",
    productionBase: "/outlook-addin/",
  },
});

function entrypointDescriptor(entrypoint) {
  if (entrypoint === "matter-full" || entrypoint === "matterFull") {
    return OUTLOOK_ENTRYPOINTS.matterFull;
  }
  if (entrypoint === "inquiry-only" || entrypoint === "inquiryOnly") {
    return OUTLOOK_ENTRYPOINTS.inquiryOnly;
  }
  throw new RangeError("Unknown Outlook entrypoint");
}

/**
 * Bind the fixed entrypoint profile before looking at any launch query.
 * `clientInquiryOnly` and `tenantId` are presentation hints only; neither is
 * consulted while resolving the capability profile.
 */
export function bootstrapOutlookSurface(
  entrypoint,
  {
    location = globalThis.location,
    globalObject = globalThis,
  } = {},
) {
  const descriptor = entrypointDescriptor(entrypoint);
  const profile = FIXED_PROFILES[descriptor.key];
  const binding = Object.freeze({
    key: descriptor.key,
    productId: descriptor.productId,
    profile,
    productionSourceLocation: descriptor.productionSourceLocation,
    productionBase: descriptor.productionBase,
  });

  // This assignment deliberately precedes all query parsing below.
  if (globalObject && typeof globalObject === "object") {
    globalObject.__LAWOS_OUTLOOK_SURFACE_PROFILE = binding;
  }

  const params = new URLSearchParams(String(location?.search ?? ""));
  const presentation = Object.freeze({
    clientInquiryOnly: params.get("clientInquiryOnly") === "1",
    tenantId: params.get("tenantId") ?? "",
  });
  if (globalObject && typeof globalObject === "object") {
    globalObject.__LAWOS_OUTLOOK_SURFACE_PRESENTATION = presentation;
  }

  return Object.freeze({ binding, presentation });
}
