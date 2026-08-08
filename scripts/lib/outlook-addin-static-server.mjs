import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";

/**
 * The two Outlook profiles are separate build roots.  Keeping the mapping
 * here, rather than deriving a path from the request, prevents the full
 * profile from falling through to the inquiry bundle (or vice versa).
 */
export const OUTLOOK_ADDIN_STATIC_PROFILES = Object.freeze([
  Object.freeze({
    id: "matter-full",
    prefix: "/addin",
    rootRelativePath: ".",
  }),
  Object.freeze({
    id: "inquiry-only",
    prefix: "/outlook-addin",
    rootRelativePath: "outlook-addin",
  }),
]);

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
});

function isWithinRoot(rootPath, candidatePath) {
  const child = relative(rootPath, candidatePath);
  return child !== ""
    && child !== ".."
    && !child.startsWith(`..${sep}`)
    && !child.startsWith(sep)
    && !isAbsolute(child);
}

function rejectUnsafePath(pathname) {
  if (typeof pathname !== "string" || pathname.length === 0) return true;
  // request.url is a path, not an absolute URL.  Reject protocol-relative and
  // absolute forms so a proxy cannot make the resolver interpret another host.
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return true;
  if (pathname.includes("\\") || pathname.includes("\0")) return true;

  // Preserve dot segments until after decoding.  URL.pathname normalizes them
  // too early, which would turn an encoded traversal into a valid profile path.
  const rawPathname = pathname.split(/[?#]/u, 1)[0];
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(rawPathname);
  } catch {
    return true;
  }
  if (
    decodedPathname !== rawPathname && decodedPathname.includes("%")
    || decodedPathname.includes("\\")
    || decodedPathname.includes("\0")
    || decodedPathname.includes("?")
    || decodedPathname.includes("#")
  ) {
    // A second encoded traversal (for example %252e%252e) must not become
    // meaningful after the first decode.  There are no percent-bearing
    // generated asset names, so rejecting residual escapes is intentional.
    return true;
  }
  if (!decodedPathname.startsWith("/") || decodedPathname.startsWith("//")) return true;

  if (decodedPathname === "/") return false;
  const segments = decodedPathname.slice(1).split("/");
  for (const [index, segment] of segments.entries()) {
    if (segment === "" && index === segments.length - 1 && decodedPathname.endsWith("/")) continue;
    if (segment === "" || segment === "." || segment === "..") return true;
  }
  return false;
}

function requestPathname(requestPath) {
  if (typeof requestPath !== "string") return null;
  // Strip the query without URL-normalizing the path.  This is deliberately
  // not `new URL(...).pathname`, because URL normalization erases `..` proof.
  const rawPathname = requestPath.split(/[?#]/u, 1)[0];
  if (rejectUnsafePath(requestPath)) return null;
  try {
    return decodeURIComponent(rawPathname);
  } catch {
    return null;
  }
}

function profileForPath(pathname) {
  if (pathname === "/") return OUTLOOK_ADDIN_STATIC_PROFILES[0];
  return OUTLOOK_ADDIN_STATIC_PROFILES.find(({ prefix }) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  )) ?? null;
}

/**
 * Resolve an Outlook add-in request to a regular file inside exactly one
 * profile root.  `null` means fail closed (malformed, traversal, missing,
 * symlink escape, directory, or cross-profile request).
 */
export function resolveOutlookAddinStaticPath(
  requestPath,
  { distRoot } = {},
) {
  const pathname = requestPathname(requestPath);
  if (!pathname || typeof distRoot !== "string" || distRoot.length === 0) return null;

  const profile = profileForPath(pathname);
  if (!profile) return null;
  const relativeRequestPath = pathname === "/" || pathname === profile.prefix || pathname === `${profile.prefix}/`
    ? "index.html"
    : pathname.slice(profile.prefix.length + 1);
  if (!relativeRequestPath || relativeRequestPath.startsWith("/")) return null;

  // The full bundle's dist root contains the inquiry output after the second
  // Vite build.  Never allow `/addin/...` to address that nested profile.
  if (
    profile.id === "matter-full"
    && (
      relativeRequestPath === "outlook-addin"
      || relativeRequestPath.startsWith("outlook-addin/")
    )
  ) {
    return null;
  }

  const configuredRoot = resolve(distRoot, profile.rootRelativePath);
  let distPath;
  try {
    distPath = realpathSync(distRoot);
  } catch {
    return null;
  }
  let rootPath;
  try {
    rootPath = realpathSync(configuredRoot);
  } catch {
    return null;
  }
  if (rootPath !== distPath && !isWithinRoot(distPath, rootPath)) return null;
  const candidatePath = resolve(rootPath, relativeRequestPath);
  if (!isWithinRoot(rootPath, candidatePath)) return null;

  let resolvedFilePath;
  try {
    resolvedFilePath = realpathSync(candidatePath);
    if (!isWithinRoot(rootPath, resolvedFilePath)) return null;
    if (!statSync(resolvedFilePath).isFile()) return null;
  } catch {
    return null;
  }

  return Object.freeze({
    profile: profile.id,
    pathname,
    filePath: resolvedFilePath,
    contentType: MIME_TYPES[extname(resolvedFilePath).toLowerCase()] ?? "application/octet-stream",
  });
}

function writeNotFound(response) {
  response.writeHead(404, {
    "cache-control": "no-store",
    "content-type": "text/plain; charset=utf-8",
  });
  response.end("not found");
}

/** Start the tiny native static server used by both local browser proofs. */
export async function startOutlookAddinStaticServer({
  distRoot,
  host = "127.0.0.1",
  port = 0,
} = {}) {
  const server = createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, {
        allow: "GET, HEAD",
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("method not allowed");
      return;
    }
    const resolved = resolveOutlookAddinStaticPath(request.url ?? "", { distRoot });
    if (!resolved) {
      writeNotFound(response);
      return;
    }
    try {
      const body = readFileSync(resolved.filePath);
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-length": body.byteLength,
        "content-type": resolved.contentType,
      });
      if (request.method === "HEAD") response.end();
      else response.end(body);
    } catch {
      writeNotFound(response);
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("OUTLOOK_ADDIN_STATIC_SERVER_ADDRESS_UNAVAILABLE"));
        return;
      }
      resolvePromise({
        server,
        origin: `http://${host}:${address.port}`,
      });
    });
  });
}
