import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

function localDistUrl(prefix, relativePath, outputPrefix = prefix) {
  return new URL(`../dist/${outputPrefix ? `${outputPrefix}/` : ""}${relativePath}`, import.meta.url);
}

async function generatedJavaScriptGraph(html, prefix, outputPrefix = prefix) {
  const scriptSource = html.match(/<script type="module" crossorigin src="([^"]+)"/u)?.[1];
  assert.ok(scriptSource, `${prefix} entry script is present`);
  const rootRelative = scriptSource.replace(new RegExp(`^/${prefix}/`, "u"), "");
  const queue = [rootRelative];
  const visited = new Set();
  while (queue.length > 0) {
    const relativePath = queue.shift();
    if (visited.has(relativePath)) continue;
    visited.add(relativePath);
    const source = await readFile(localDistUrl(prefix, relativePath, outputPrefix), "utf8");
    const imports = source.matchAll(/(?:from|import\s*\()\s*["']([^"']+)["']/gu);
    for (const [, specifier] of imports) {
      if (!specifier.startsWith(".") || !specifier.endsWith(".js")) continue;
      const target = new URL(specifier, `https://artifact.test/${prefix}/${relativePath}`);
      assert.equal(target.origin, "https://artifact.test");
      assert.ok(target.pathname.startsWith(`/${prefix}/`));
      queue.push(target.pathname.slice(prefix.length + 2));
    }
  }
  return [...visited].map((relativePath) => `${prefix}/${relativePath}`);
}

async function generatedAssetFiles(prefix, outputPrefix = prefix) {
  const directory = new URL(
    `../dist/${outputPrefix ? `${outputPrefix}/` : ""}assets/`,
    import.meta.url,
  );
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => `${prefix}/assets/${entry.name}`)
    .sort();
}

async function assertLocalStylesheet(html, prefix, outputPrefix = prefix) {
  const stylesheet = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)"/u)?.[1];
  assert.ok(stylesheet, `${prefix} stylesheet is present`);
  const relativePath = stylesheet.replace(new RegExp(`^/${prefix}/`, "u"), "");
  await readFile(localDistUrl(prefix, relativePath, outputPrefix), "utf8");
}

test("full and inquiry entry artifacts are separate and 952 has no event runtime", async () => {
  const fullHtml = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const inquiryHtml = await readFile(new URL("../dist/outlook-addin/index.html", import.meta.url), "utf8");
  assert.match(fullHtml, /src="\/addin\/assets\//u);
  assert.match(inquiryHtml, /src="\/outlook-addin\/assets\//u);
  await assert.rejects(
    readFile(new URL("../dist/outlook-addin/event-runtime.js", import.meta.url)),
    { code: "ENOENT" },
  );
  const fullGraph = await generatedJavaScriptGraph(fullHtml, "addin", "");
  const inquiryGraph = await generatedJavaScriptGraph(inquiryHtml, "outlook-addin");
  await assertLocalStylesheet(inquiryHtml, "outlook-addin");
  assert.deepEqual(
    fullGraph.filter((asset) => asset.endsWith(".js")).sort(),
    await generatedAssetFiles("addin", ""),
  );
  assert.deepEqual(
    inquiryGraph.filter((asset) => asset.endsWith(".js")).sort(),
    await generatedAssetFiles("outlook-addin"),
  );
  assert.ok(fullGraph.some((asset) => /\/main-[^/]+\.js$/u.test(asset)));
  assert.ok(inquiryGraph.length > 0);
  assert.equal(inquiryGraph.some((asset) => /event-runtime\.js$/u.test(asset)), false);
});
