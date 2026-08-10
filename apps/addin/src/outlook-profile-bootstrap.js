function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") deepFreeze(child);
  }
  return Object.freeze(value);
}

function injectedBuildProfile() {
  if (typeof __LAWOS_OUTLOOK_BUILD_PROFILE__ === "undefined") {
    throw new RangeError("Outlook build profile is unavailable");
  }
  return __LAWOS_OUTLOOK_BUILD_PROFILE__;
}

function entrypointDescriptor(entrypoint, buildProfile) {
  if (
    !buildProfile
    || typeof buildProfile !== "object"
    || Array.isArray(buildProfile)
    || entrypoint !== buildProfile.key
  ) {
    throw new RangeError("Unknown Outlook entrypoint");
  }
  return deepFreeze({
    key: buildProfile.key,
    productId: buildProfile.productId,
    productionSourceLocation: buildProfile.productionSourceLocation,
    productionBase: buildProfile.productionBase,
    ...(Array.isArray(buildProfile.itemModes) ? { itemModes: [...buildProfile.itemModes] } : {}),
    ...(Array.isArray(buildProfile.actions) ? { actions: [...buildProfile.actions] } : {}),
  });
}

/**
 * Bind the fixed entrypoint profile before looking at any launch query.
 * `clientInquiryOnly` and `tenantId` are presentation hints only; neither is
 * consulted while resolving the capability profile.
 */
export function bootstrapOutlookSurface(
  entrypoint,
  {
    buildProfile = injectedBuildProfile(),
    location = globalThis.location,
    globalObject = globalThis,
  } = {},
) {
  const descriptor = entrypointDescriptor(entrypoint, buildProfile);
  const profile = deepFreeze({
    key: descriptor.key,
    productId: descriptor.productId,
    ...(descriptor.itemModes ? { itemModes: descriptor.itemModes } : {}),
    ...(descriptor.actions ? { actions: descriptor.actions } : {}),
  });
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
