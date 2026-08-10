import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { profileArtifacts } from "../validate-outlook-release-candidate.mjs";

const contract = {
  build: { root: "dist" },
  profiles: [
    { profile: "matter-full", product_id: "matter", taskpane_html: "index.html" },
    { profile: "inquiry-only", product_id: "inquiry", taskpane_html: "outlook-addin/index.html" },
  ],
  static_deploy: {
    namespaces: [
      { profile: "matter-full", product_id: "matter", source_prefix: "", target_prefix: "addin/" },
      { profile: "inquiry-only", product_id: "inquiry", source_prefix: "outlook-addin/", target_prefix: "outlook-addin/" },
    ],
  },
};
const inventory = [
  { path: "index.html", sha256: "matter-html" },
  { path: "assets/matter.js", sha256: "matter-js" },
  { path: "outlook-addin/index.html", sha256: "inquiry-html" },
  { path: "outlook-addin/assets/inquiry.js", sha256: "inquiry-js" },
];

function page(moduleSource, officeScript = true, duplicate = false, extraScripts = "", headMarkup = "", moduleAttributes = "crossorigin", officeAttributes = "") {
  const office = officeScript ? `<script ${officeAttributes ? `${officeAttributes} ` : ""}src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>` : "";
  const second = duplicate ? `<script src="${moduleSource}" type="module"></script>` : "";
  return `<html><head><title>AMIC OS</title>${headMarkup}</head><body><script type="module" ${moduleAttributes} src="${moduleSource}"></script>${second}${office}${extraScripts}</body></html>`;
}

async function withPages({ matterSource = "/addin/assets/matter.js", inquirySource = "/outlook-addin/assets/inquiry.js", officeScript = true, duplicate = false, extraScripts = "", headMarkup = "", moduleAttributes = "crossorigin", officeAttributes = "", profileContract = contract, profileInventory = inventory } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "outlook-profile-artifacts-"));
  await mkdir(path.join(root, "dist/outlook-addin"), { recursive: true });
  await writeFile(path.join(root, "dist/index.html"), page(matterSource, officeScript, duplicate, extraScripts, headMarkup, moduleAttributes, officeAttributes));
  await writeFile(path.join(root, "dist/outlook-addin/index.html"), page(inquirySource, officeScript, duplicate, extraScripts, headMarkup, moduleAttributes, officeAttributes));
  try {
    return await profileArtifacts(profileContract, profileInventory, { root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("profileArtifacts accepts exact root-relative profile namespaces and non-module Office.js", async () => {
  const artifacts = await withPages();
  assert.deepEqual(artifacts.map(({ bundle_path }) => bundle_path), ["assets/matter.js", "outlook-addin/assets/inquiry.js"]);
  await assert.rejects(() => withPages({ officeScript: false }));
});

test("profileArtifacts rejects unrelated scripts and document base overrides", async () => {
  await assert.rejects(() => withPages({ extraScripts: '<script src="https://attacker.invalid/evil.js"></script>' }));
  await assert.rejects(() => withPages({ extraScripts: "<script>window.attacker = true;</script>" }));
  await assert.rejects(() => withPages({ headMarkup: '<base href="https://attacker.invalid/">' }));
  await assert.rejects(() => withPages({ extraScripts: '<script type="importmap">{"imports":{}}</script>' }));
  await assert.rejects(() => withPages({ extraScripts: '<script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>' }));
  await assert.rejects(() => withPages({ extraScripts: '<script type="text/javascript" type="application/javascript" src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>' }));
  await assert.rejects(() => withPages({ extraScripts: '<script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>' }));
  await assert.rejects(() => withPages({ moduleAttributes: 'crossorigin onload="window.attacker=1"' }));
  await assert.rejects(() => withPages({ officeAttributes: "defer" }));
  await assert.rejects(() => withPages({ moduleAttributes: "crossorigin crossorigin" }));
  await assert.rejects(() => withPages({ moduleAttributes: 'crossorigin="anonymous"' }));
});

test("profileArtifacts rejects inert-context and malformed-context script text", async () => {
  const fakeOffice = '<script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>';
  const contexts = [
    `<!-- ${fakeOffice} -->`, `<!-- ${fakeOffice} --!>`, `<template>${fakeOffice}</template>`, `<noscript>${fakeOffice}</noscript>`,
    `<textarea>${fakeOffice}</textarea>`, `<title>${fakeOffice}</title>`, `<xmp>${fakeOffice}</xmp>`,
    `<iframe>${fakeOffice}</iframe>`, `<noembed>${fakeOffice}</noembed>`, `<noframes>${fakeOffice}</noframes>`, `<svg>${fakeOffice}</svg>`, `<math>${fakeOffice}</math>`, `<listing>${fakeOffice}</listing>`,
    `<plaintext>${fakeOffice}`, `<!-- ${fakeOffice}`, `<template>${fakeOffice}`, `<title>${fakeOffice}`, "<script",
    `<div data-x="prefix ${fakeOffice}></div>`, `<div data-x=prefix${fakeOffice}></div>`,
    `<![CDATA[${fakeOffice}]]>`, `<!foo ${fakeOffice}>`, `<?foo ${fakeOffice}>`, `<\/script\t\n data-extra>`,
  ];
  for (const headMarkup of contexts) {
    await assert.rejects(() => withPages({ officeScript: false, headMarkup }));
  }
  for (const [headMarkup, error] of [[`<div${fakeOffice}>`, /nested markup in a tag/iu], [`<!doctype html ${fakeOffice}>`, /non-canonical markup declaration/iu]]) {
    await assert.rejects(() => withPages({ officeScript: false, headMarkup }), error);
  }
  await withPages({ headMarkup: "<!doctype html>" });
  await assert.rejects(() => withPages({ officeScript: false, headMarkup: `<div data-x="prefix ${fakeOffice}"></div>` }));
  await assert.rejects(() => withPages({ officeScript: false, headMarkup: `<div data-x='prefix ${fakeOffice}'></div>` }));
});

test("profileArtifacts rejects named HTML references before inventory path derivation", async () => {
  const entityInventory = [...inventory, { path: "assets/&sol;/evil.js", sha256: "entity-js" }];
  await assert.rejects(() => withPages({
    matterSource: "/addin/assets/&sol;/evil.js",
    profileInventory: entityInventory,
  }));
});

test("profileArtifacts rejects unsafe module sources before URL/path derivation", async () => {
  const cases = [
    { matterSource: "https://attacker.invalid/addin/assets/matter.js" },
    { matterSource: "//attacker.invalid/addin/assets/matter.js" },
    { matterSource: "https://user:pass@attacker.invalid/addin/assets/matter.js" },
    { matterSource: "/outlook-addin/assets/inquiry.js" },
    { matterSource: "/addin/assets/matter.js?cache=1" },
    { matterSource: "/addin/assets/matter.js#fragment" },
    { matterSource: "/addin/assets/%2e%2e/evil.js" },
    { matterSource: "/addin/assets/%2f/evil.js" },
    { matterSource: "/addin/assets/%5c/evil.js" },
    { matterSource: "/addin/assets/../evil.js" },
    { matterSource: "/addin//assets/matter.js" },
    { matterSource: "\\addin\\assets\\matter.js" },
    { inquirySource: "/addin/assets/matter.js" },
    { inquirySource: "/outlook-addin/assets/../evil.js" },
    { inquirySource: "/outlook-addin/assets/%2e%2e/evil.js" },
  ];
  for (const values of cases) {
    await assert.rejects(() => withPages(values), /module script source|root-relative|namespace|path/i, JSON.stringify(values));
  }
  await assert.rejects(() => withPages({ duplicate: true }));
});

test("profileArtifacts accepts module src before type but rejects duplicate module tags", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "outlook-profile-artifacts-order-"));
  await mkdir(path.join(root, "dist/outlook-addin"), { recursive: true });
  await writeFile(path.join(root, "dist/index.html"), '<title>AMIC OS</title><script src="/addin/assets/matter.js" type="module" crossorigin></script><script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>');
  await writeFile(path.join(root, "dist/outlook-addin/index.html"), '<title>AMIC OS</title><script src="/outlook-addin/assets/inquiry.js" type="module" crossorigin></script><script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>');
  try {
    const artifacts = await profileArtifacts(contract, inventory, { root });
    assert.equal(artifacts.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("profileArtifacts uses contract namespace prefixes instead of profile-name conditionals", async () => {
  const customContract = structuredClone(contract);
  customContract.static_deploy.namespaces[0].target_prefix = "custom/";
  customContract.static_deploy.namespaces[0].source_prefix = "custom-source/";
  const customInventory = inventory.map((entry) => entry.path === "assets/matter.js"
    ? { ...entry, path: "custom-source/assets/matter.js" }
    : entry);
  const artifacts = await withPages({
    matterSource: "/custom/assets/matter.js",
    profileContract: customContract,
    profileInventory: customInventory,
  });
  assert.equal(artifacts[0].bundle_path, "custom-source/assets/matter.js");
});

test("profileArtifacts fails closed when profile-to-static namespace binding is missing or duplicated", async () => {
  const unknownProduct = structuredClone(contract);
  unknownProduct.profiles[0].product_id = "unknown-product";
  await assert.rejects(() => withPages({ profileContract: unknownProduct }), /exactly one matching static namespace contract row/i);

  const duplicate = structuredClone(contract);
  duplicate.static_deploy.namespaces.push({ ...duplicate.static_deploy.namespaces[0] });
  await assert.rejects(() => withPages({ profileContract: duplicate }), /exactly one matching static namespace contract row/i);
});
