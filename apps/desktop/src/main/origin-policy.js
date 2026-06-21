export const APPROVED_DEV_RENDERER_URL = "http://127.0.0.1:5173";
export const PACKAGED_RENDERER_ORIGIN = "file://";

export function approvedRendererOrigins({ devRendererUrl = APPROVED_DEV_RENDERER_URL } = {}) {
  return Object.freeze({
    dev: new URL(devRendererUrl).origin,
    packaged: PACKAGED_RENDERER_ORIGIN
  });
}

export function isApprovedRendererUrl(candidate, options = {}) {
  const origins = approvedRendererOrigins(options);
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }

  if (url.protocol === "file:") return true;
  return url.origin === origins.dev;
}

export function assertApprovedRendererUrl(candidate, options = {}) {
  if (!isApprovedRendererUrl(candidate, options)) {
    throw new Error(`Blocked unapproved desktop renderer origin: ${candidate}`);
  }
  return candidate;
}

export function installNavigationGuards(browserWindow, options = {}) {
  browserWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!isApprovedRendererUrl(targetUrl, options)) event.preventDefault();
  });

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isApprovedRendererUrl(url, options)) return { action: "deny" };
    return { action: "allow" };
  });
}
