export function parseDesktopDeepLink(candidate) {
  const url = new URL(candidate);
  if (url.protocol !== "matter:") throw new Error("Unsupported desktop deep link scheme");
  return {
    intent: url.hostname,
    id: url.pathname.replace(/^\//, ""),
    raw: candidate
  };
}

export async function resolveDesktopDeepLink({ url, permissionClient }) {
  const route = parseDesktopDeepLink(url);

  if (route.intent === "matter") {
    const allowed = await permissionClient.canReadMatter(route.id);
    if (!allowed) return { view: "denied", reason: "matter_permission_denied" };
    return { view: "matters", matterId: route.id };
  }

  if (route.intent === "auth") {
    return { view: "auth", routeSource: "auth_callback" };
  }

  return { view: "fallback", reason: "unsupported_desktop_route" };
}
