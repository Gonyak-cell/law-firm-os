export const FORMAL_PACKAGE_RENDERER_ORIGIN = "matter-app://app";
export const FORMAL_PACKAGE_RENDERER_PATH = "/index.html";

function formalPackageRendererUrlFrom(candidate) {
  try {
    return candidate instanceof URL ? new URL(candidate.href) : new URL(candidate);
  } catch {
    throw new TypeError("formal package renderer URL must be a valid URL");
  }
}

export function assertFormalPackageRendererUrl(candidate) {
  const url = formalPackageRendererUrlFrom(candidate);
  const desktopValues = url.searchParams.getAll("desktop");
  if (
    url.protocol !== "matter-app:"
    || url.hostname !== "app"
    || url.port
    || url.username
    || url.password
    || url.pathname !== FORMAL_PACKAGE_RENDERER_PATH
    || desktopValues.length !== 1
    || desktopValues[0] !== "1"
  ) {
    throw new TypeError("formal package renderer URL must use the matter-app://app index route with desktop=1");
  }
  return url;
}

export function formalPackageRendererUrl(section, view = "people") {
  if (typeof section !== "string" || section.length === 0) {
    throw new TypeError("formal package renderer section is required");
  }
  const url = new URL(`${FORMAL_PACKAGE_RENDERER_ORIGIN}${FORMAL_PACKAGE_RENDERER_PATH}`);
  url.searchParams.set("desktop", "1");
  url.searchParams.set("locale", "ko");
  url.searchParams.set("view", view);
  url.searchParams.set("ctx", "allow");
  url.hash = section.startsWith("#") ? section : `#${section}`;
  return url.toString();
}
