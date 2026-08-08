import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  resolveOutlookAddinStaticPath,
  startOutlookAddinStaticServer,
} from "../lib/outlook-addin-static-server.mjs";

const REPO_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST_ROOT = resolve(REPO_ROOT, "apps/addin/dist");

async function fetchRoute(origin, pathname) {
  const url = new URL(origin);
  return new Promise((resolvePromise, reject) => {
    const request = httpRequest({
      hostname: url.hostname,
      method: "GET",
      path: pathname,
      port: url.port,
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolvePromise({
        body: Buffer.concat(chunks).toString("utf8"),
        contentType: response.headers["content-type"] ?? null,
        status: response.statusCode,
      }));
    });
    request.on("error", reject);
    request.end();
  });
}

function assetPath(html, extension, prefix) {
  const escapedExtension = extension.replace(".", "\\.");
  const escapedPrefix = prefix.replace("/", "\\/");
  const match = html.match(new RegExp(`(?:src|href)="(${escapedPrefix}/assets/[^"]+${escapedExtension})"`));
  assert.ok(match?.[1], `built ${prefix} HTML should reference a ${extension} asset`);
  assert.match(match[1], new RegExp(`${escapedPrefix}/assets/[^/]+-${basename(match[1]).split("-").at(-1)}`));
  return match[1];
}

function builtAssetPath(prefix, extension) {
  const directory = prefix === "/addin"
    ? resolve(DIST_ROOT, "assets")
    : resolve(DIST_ROOT, "outlook-addin/assets");
  const asset = readdirSync(directory).find((name) => name.endsWith(extension));
  assert.ok(asset, `built ${prefix} output should contain a ${extension} asset`);
  assert.match(asset, new RegExp(`^[^/]+-[A-Za-z0-9_-]+\\${extension}$`));
  return `${prefix}/assets/${asset}`;
}

test("built full and inquiry bundles are served only from their own prefixes", async () => {
  const web = await startOutlookAddinStaticServer({ distRoot: DIST_ROOT });
  try {
    const main = await fetchRoute(web.origin, "/addin/index.html?test=outm36");
    const mainPrefix = await fetchRoute(web.origin, "/addin/?test=outm36");
    const inquiry = await fetchRoute(web.origin, "/outlook-addin/index.html?test=outm36");
    const inquiryPrefix = await fetchRoute(web.origin, "/outlook-addin/?test=outm36");
    const alias = await fetchRoute(web.origin, "/?test=outm36");

    assert.equal(main.status, 200);
    assert.equal(main.contentType, "text/html; charset=utf-8");
    assert.equal(mainPrefix.status, 200);
    assert.equal(mainPrefix.body, main.body);
    assert.equal(inquiry.status, 200);
    assert.equal(inquiry.contentType, "text/html; charset=utf-8");
    assert.equal(inquiryPrefix.status, 200);
    assert.equal(inquiryPrefix.body, inquiry.body);
    assert.equal(alias.status, 200);
    assert.equal(alias.contentType, "text/html; charset=utf-8");
    assert.equal(alias.body, main.body, "root is only the optional main-profile alias");
    assert.match(main.body, /\/addin\/assets\//u);
    assert.doesNotMatch(main.body, /\/outlook-addin\/assets\//u);
    assert.match(inquiry.body, /\/outlook-addin\/assets\//u);
    assert.doesNotMatch(inquiry.body, /\/addin\/assets\//u);

    const mainJs = assetPath(main.body, ".js", "/addin");
    const mainCss = builtAssetPath("/addin", ".css");
    const inquiryJs = assetPath(inquiry.body, ".js", "/outlook-addin");
    const inquiryCss = assetPath(inquiry.body, ".css", "/outlook-addin");
    for (const [path, mime] of [
      [mainJs, "text/javascript; charset=utf-8"],
      [mainCss, "text/css; charset=utf-8"],
      [inquiryJs, "text/javascript; charset=utf-8"],
      [inquiryCss, "text/css; charset=utf-8"],
    ]) {
      const asset = await fetchRoute(web.origin, path);
      assert.equal(asset.status, 200, path);
      assert.equal(asset.contentType, mime, path);
      assert.ok(asset.body.length > 0, path);
    }

    for (const path of [
      "/addin/outlook-addin/index.html",
      inquiryJs.replace("/outlook-addin/", "/addin/outlook-addin/"),
      "/outlook-addin/addin/index.html",
      "/addin/%2e%2e/outlook-addin/index.html",
      "/addin/%252e%252e/index.html",
      "/outlook-addin/%2e%2e/index.html",
      "/addin/does-not-exist.js",
      "/outlook-addin/does-not-exist.css",
    ]) {
      const denied = await fetchRoute(web.origin, path);
      assert.equal(denied.status, 404, path);
    }
  } finally {
    await new Promise((resolvePromise) => web.server.close(resolvePromise));
  }
});

test("resolver rejects symlink escapes and profile-root symlink escapes", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "lawos-outlook-addin-static-"));
  try {
    const distRoot = join(tempRoot, "dist");
    const outsideRoot = join(tempRoot, "outside");
    mkdirSync(join(distRoot, "outlook-addin"), { recursive: true });
    mkdirSync(outsideRoot, { recursive: true });
    writeFileSync(join(distRoot, "index.html"), "main");
    writeFileSync(join(distRoot, "outlook-addin", "index.html"), "inquiry");
    writeFileSync(join(outsideRoot, "escaped.js"), "escaped");
    symlinkSync(join(outsideRoot, "escaped.js"), join(distRoot, "escaped.js"));

    assert.equal(
      resolveOutlookAddinStaticPath("/addin/escaped.js", { distRoot }),
      null,
    );
    assert.equal(
      resolveOutlookAddinStaticPath("/addin/index.html", { distRoot })?.profile,
      "matter-full",
    );

    const externalInquiryRoot = join(tempRoot, "external-inquiry");
    mkdirSync(externalInquiryRoot);
    writeFileSync(join(externalInquiryRoot, "index.html"), "external");
    rmSync(join(distRoot, "outlook-addin"), { recursive: true, force: true });
    symlinkSync(externalInquiryRoot, join(distRoot, "outlook-addin"));
    assert.equal(
      resolveOutlookAddinStaticPath("/outlook-addin/index.html", { distRoot }),
      null,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("static server rejects non-loopback bindings", async () => {
  for (const host of ["0.0.0.0", "::", "192.0.2.1", "example.invalid"]) {
    await assert.rejects(
      startOutlookAddinStaticServer({ distRoot: DIST_ROOT, host }),
      /OUTLOOK_ADDIN_STATIC_SERVER_LOOPBACK_HOST_REQUIRED/u,
      host,
    );
  }

  for (const host of ["127.0.0.1", "::1", "localhost"]) {
    const web = await startOutlookAddinStaticServer({
      distRoot: DIST_ROOT,
      host,
    });
    try {
      const address = web.server.address();
      assert.equal(typeof address, "object");
      assert.ok(["127.0.0.1", "::1"].includes(address.address));
      assert.equal(new URL(web.origin).protocol, "http:");
    } finally {
      await new Promise((resolvePromise) => web.server.close(resolvePromise));
    }
  }
});
