import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const MATTER_IDENTITY = Object.freeze({
  key: "matter-full",
  productId: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
  sourceLocation: "/addin/index.html",
});
const INQUIRY_IDENTITY = Object.freeze({
  key: "inquiry-only",
  productId: "952431be-51b8-42a2-9bf6-769a15934e85",
  sourceLocation:
    "/outlook-addin/index.html?tenantId=tenant_amic_matter_vault&clientInquiryOnly=1",
  redirectPath: "/outlook-addin/index.html",
});

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

async function generatedJavaScriptGraphText(assets, prefix, outputPrefix = prefix) {
  const sources = await Promise.all(
    assets
      .filter((asset) => asset.endsWith(".js"))
      .map((asset) => readFile(
        localDistUrl(prefix, asset.slice(prefix.length + 1), outputPrefix),
        "utf8",
      )),
  );
  return sources.join("\n");
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

function assertIdentityIsolation(graphText, own, opposite, { rejectOppositeKey = true } = {}) {
  assert.match(graphText, new RegExp(own.productId, "u"), `${own.key} graph retains its ProductId`);
  assert.match(
    graphText,
    new RegExp(own.sourceLocation.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
    `${own.key} graph retains its SourceLocation`,
  );
  assert.match(graphText, new RegExp(own.key, "u"), `${own.key} graph retains its profile key`);
  for (const [label, marker] of [
    ["ProductId", opposite.productId],
    ["SourceLocation", opposite.sourceLocation],
    ...(rejectOppositeKey ? [["profile key", opposite.key]] : []),
  ]) {
    assert.doesNotMatch(
      graphText,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
      `${own.key} graph must not contain the opposite ${label}`,
    );
  }
}

test("profile artifacts have exact identity bytes and 952 has no Matter runtime", async () => {
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
  const fullGraphText = await generatedJavaScriptGraphText(fullGraph, "addin", "");
  const inquiryGraphText = await generatedJavaScriptGraphText(inquiryGraph, "outlook-addin");
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
  // The Matter catalog may describe inquiry-only actions, but its executable
  // identity must never carry the 952 ProductId or SourceLocation.
  assertIdentityIsolation(fullGraphText, MATTER_IDENTITY, INQUIRY_IDENTITY, {
    rejectOppositeKey: false,
  });
  assertIdentityIsolation(inquiryGraphText, INQUIRY_IDENTITY, MATTER_IDENTITY);
  assert.match(
    inquiryGraphText,
    new RegExp(INQUIRY_IDENTITY.redirectPath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
    "952 graph retains its own NAA redirect path",
  );
  assert.doesNotMatch(
    inquiryGraphText,
    /\/addin\/index\.html/u,
    "952 graph must not contain the 8f3 NAA redirect path",
  );

  for (const marker of [
    "mail.save-with-attachments",
    "matter.search",
    "task.create",
    "time-entry.draft",
    "all-functions",
    "메일 및 첨부 파일 저장",
    "저장 위치 선택",
    "관련 작업 만들기",
    "시간 기록 초안",
    "추가 작업",
    "OUTLOOK_ADDIN_MATTER_INACTIVE",
    "OUTLOOK_MATTER_SELECTION_REQUIRED",
    "OUTLOOK_MATTER_SELECTION_STALE",
    "이 Matter는 현재 저장 작업을 받을 수 없습니다. 상태를 확인해 주세요.",
    "현재 메일에서 Matter를 다시 선택해 주세요.",
    "Matter 권한 또는 상태가 바뀌었습니다. 다시 선택해 주세요.",
    "OUTLOOK_ITEM_CONTENT_ERROR_CODES",
    "OUTLOOK_ATTACHMENT_CONTENT_UNAVAILABLE",
    "OUTLOOK_ATTACHMENT_CONTENT_UNSUPPORTED",
    "OUTLOOK_ATTACHMENT_ID_REQUIRED",
    "OUTLOOK_ATTACHMENT_BASE64_INVALID",
    "OUTLOOK_ATTACHMENT_TOO_LARGE",
    "OUTLOOK_ATTACHMENT_DUPLICATE_ID",
    "MAX_OUTLOOK_ATTACHMENT_BYTES",
    "getAttachmentContentAsync",
  ]) {
    assert.doesNotMatch(
      inquiryGraphText,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
      `952 graph must not contain the Matter marker: ${marker}`,
    );
  }
  assert.doesNotMatch(
    inquiryGraphText,
    /(?:attachment|첨부)[\s\S]{0,160}2097152|2097152[\s\S]{0,160}(?:attachment|첨부)/iu,
    "952 graph must not contain the attachment size capability constant",
  );
  for (const marker of ["inquiry.entry", "문의 기능"]) {
    assert.match(
      inquiryGraphText,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
      `952 graph must retain its inquiry marker: ${marker}`,
    );
  }
});
