import { realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const MATTER_APP_SCHEME = "matter-app";
export const MATTER_APP_ORIGIN = `${MATTER_APP_SCHEME}://app`;
export const MATTER_APP_WEB_ROOT = join(moduleDir, "../renderer/web");
export const MATTER_APP_CONTENT_SECURITY_POLICY = "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://127.0.0.1:* https:; worker-src 'self' blob:; form-action 'self'";

export function matterAppRendererUrl() {
  const url = new URL(`${MATTER_APP_ORIGIN}/index.html`);
  url.searchParams.set("desktop", "1");
  return url.toString();
}

export function registerMatterAppScheme(protocol) {
  protocol.registerSchemesAsPrivileged([{
    scheme: MATTER_APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  }]);
}

function decodedRequestPath(candidate) {
  if (typeof candidate !== "string" || !candidate.startsWith(MATTER_APP_ORIGIN)) return null;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (
    url.protocol !== `${MATTER_APP_SCHEME}:`
    || url.hostname !== "app"
    || url.port
    || url.username
    || url.password
  ) return null;

  const rawPath = candidate.slice(MATTER_APP_ORIGIN.length).split(/[?#]/u, 1)[0] || "/";
  let decoded = rawPath;
  try {
    for (let depth = 0; depth < 3; depth += 1) {
      if (/%(?:2f|5c)/iu.test(decoded)) return null;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.includes("\\") || decoded.includes("\0")) return null;
  if (/%[0-9a-f]{2}/iu.test(decoded)) return null;
  const segments = decoded.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  return decoded === "/" ? "/index.html" : decoded;
}

function isContainedPath(root, candidate) {
  const child = relative(root, candidate);
  return child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child);
}

export function resolveMatterAppRequestPath(candidate, {
  webRoot = MATTER_APP_WEB_ROOT,
  realpathSyncImpl = realpathSync,
  statSyncImpl = statSync,
} = {}) {
  const requestPath = decodedRequestPath(candidate);
  if (!requestPath) return null;
  try {
    const canonicalRoot = realpathSyncImpl(webRoot);
    const unresolvedPath = resolve(canonicalRoot, `.${requestPath}`);
    if (!isContainedPath(canonicalRoot, unresolvedPath)) return null;
    const canonicalPath = realpathSyncImpl(unresolvedPath);
    if (!isContainedPath(canonicalRoot, canonicalPath) || !statSyncImpl(canonicalPath).isFile()) return null;
    return canonicalPath;
  } catch {
    return null;
  }
}

export function installMatterAppProtocol({
  protocol,
  net,
  webRoot = MATTER_APP_WEB_ROOT,
} = {}) {
  protocol.handle(MATTER_APP_SCHEME, async (request) => {
    const filePath = resolveMatterAppRequestPath(request?.url, { webRoot });
    if (!filePath) return new Response("Not found", { status: 404 });
    try {
      const response = await net.fetch(pathToFileURL(filePath).toString());
      const headers = new Headers(response.headers);
      headers.set("Content-Security-Policy", MATTER_APP_CONTENT_SECURITY_POLICY);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
}
