import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { realpathSync, statSync } from "node:fs";

/** Keep each production bundle in its own URL and filesystem profile. */
export const OUTLOOK_ADDIN_STATIC_PROFILES = Object.freeze([
  Object.freeze({ id: "matter-full", prefix: "/addin", rootRelativePath: "." }),
  Object.freeze({ id: "inquiry-only", prefix: "/outlook-addin", rootRelativePath: "outlook-addin" }),
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

function isAtOrWithinRoot(rootPath, candidatePath) {
  return rootPath === candidatePath || isWithinRoot(rootPath, candidatePath);
}

function rejectUnsafePath(pathname) {
  if (typeof pathname !== "string" || pathname.length === 0) return true;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return true;
  if (pathname.includes("\\") || pathname.includes("\0")) return true;

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
  ) return true;
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

/** Resolve a request to a regular file in exactly one bundle profile. */
export function resolveOutlookAddinStaticPath(requestPath, { distRoot } = {}) {
  const pathname = requestPathname(requestPath);
  if (!pathname || typeof distRoot !== "string" || distRoot.length === 0) return null;

  const profile = profileForPath(pathname);
  if (!profile) return null;
  const relativeRequestPath = pathname === "/"
    || pathname === profile.prefix
    || pathname === `${profile.prefix}/`
    ? "index.html"
    : pathname.slice(profile.prefix.length + 1);
  if (!relativeRequestPath || relativeRequestPath.startsWith("/")) return null;
  if (
    profile.id === "matter-full"
    && (
      relativeRequestPath === "outlook-addin"
      || relativeRequestPath.startsWith("outlook-addin/")
    )
  ) return null;

  const configuredRoot = resolve(distRoot, profile.rootRelativePath);
  let distPath;
  let rootPath;
  try {
    distPath = realpathSync(distRoot);
    rootPath = realpathSync(configuredRoot);
  } catch {
    return null;
  }
  if (
    profile.id === "inquiry-only"
    && rootPath !== resolve(distPath, "outlook-addin")
  ) return null;
  if (rootPath !== distPath && !isWithinRoot(distPath, rootPath)) return null;
  const candidatePath = resolve(rootPath, relativeRequestPath);
  if (!isWithinRoot(rootPath, candidatePath)) return null;

  try {
    const resolvedFilePath = realpathSync(candidatePath);
    if (!isWithinRoot(rootPath, resolvedFilePath)) return null;
    if (profile.id === "matter-full") {
      let inquiryRootPath;
      try {
        inquiryRootPath = realpathSync(resolve(distPath, "outlook-addin"));
      } catch {
        inquiryRootPath = null;
      }
      if (inquiryRootPath && isAtOrWithinRoot(inquiryRootPath, resolvedFilePath)) return null;
    }
    if (!statSync(resolvedFilePath).isFile()) return null;
    return Object.freeze({
      profile: profile.id,
      pathname,
      filePath: resolvedFilePath,
      contentType: MIME_TYPES[extname(resolvedFilePath).toLowerCase()] ?? "application/octet-stream",
    });
  } catch {
    return null;
  }
}
