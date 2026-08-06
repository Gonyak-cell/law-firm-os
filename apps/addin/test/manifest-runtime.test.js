import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const addinRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(addinRoot, "../..");

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

function assertLeastPrivilege(manifest, name) {
  assert.match(manifest, /<Permissions>\s*ReadItem\s*<\/Permissions>/u, `${name} must use ReadItem`);
  assert.equal(manifest.includes("ReadWriteMailbox"), false, `${name} must not request ReadWriteMailbox`);
}

function assertNestedLaunchRuntime(manifest, name) {
  assert.match(
    manifest,
    /<Set\s+Name="Mailbox"\s+MinVersion="1\.14"\s*\/>/u,
    `${name} must require Mailbox 1.14 for javascriptRuntimeUrl`,
  );
  assert.match(
    manifest,
    /<VersionOverrides[^>]+xsi:type="VersionOverridesV1_1">[\s\S]*?<Runtimes>[\s\S]*?<Runtime\s+resid="WebViewRuntime\.Url"\s+lifetime="short">[\s\S]*?<Override\s+type="javascript"\s+resid="JSRuntime\.Url"\s*\/>[\s\S]*?<\/Runtime>/u,
    `${name} must declare WebView and classic-Outlook JavaScript event runtimes`,
  );
  assert.match(
    manifest,
    /<LaunchEvent\s+Type="OnMessageSend"\s+FunctionName="onMessageSendHandler"\s+SendMode="PromptUser"\s*\/>/u,
    `${name} must keep optional Smart Alerts fail-open`,
  );
  assert.match(
    manifest,
    /<ExtensionPoint\s+xsi:type="LaunchEvent">[\s\S]*?<SourceLocation\s+resid="WebViewRuntime\.Url"\s*\/>/u,
    `${name} must use the WebView runtime as LaunchEvent source`,
  );
}

test("Client Add-in manifests keep ReadItem-only permissions and the nested event runtime", async () => {
  const [production, local] = await Promise.all([
    read("apps/addin/manifest.production.xml"),
    read("apps/addin/manifest.xml"),
  ]);

  assertLeastPrivilege(production, "production manifest");
  assertLeastPrivilege(local, "local manifest");
  assertNestedLaunchRuntime(production, "production manifest");
  assertNestedLaunchRuntime(local, "local manifest");
});

test("production manifest points Taskpane, Commands, and WebView runtime at the /addin bundle", async () => {
  const production = await read("apps/addin/manifest.production.xml");
  const expectedUrls = [
    'id="Taskpane.Url" DefaultValue="https://d2mthcc8vp3cr2.cloudfront.net/addin/index.html"',
    'id="Commands.Url" DefaultValue="https://d2mthcc8vp3cr2.cloudfront.net/addin/index.html?commands=1"',
    'id="WebViewRuntime.Url" DefaultValue="https://d2mthcc8vp3cr2.cloudfront.net/addin/event-runtime.html"',
    'id="JSRuntime.Url" DefaultValue="https://d2mthcc8vp3cr2.cloudfront.net/addin/event-runtime.js"',
  ];
  for (const expected of expectedUrls) {
    assert.ok(production.includes(expected), `missing production URL: ${expected}`);
  }
  assert.equal(
    production.includes("https://d2mthcc8vp3cr2.cloudfront.net/amic-law-icon.png"),
    false,
    "production icons must be deployed with the isolated /addin bundle",
  );
  assert.match(
    production,
    /https:\/\/d2mthcc8vp3cr2\.cloudfront\.net\/addin\/amic-law-icon\.png/u,
  );
  assert.match(
    production,
    /<SourceLocation\s+DefaultValue="https:\/\/d2mthcc8vp3cr2\.cloudfront\.net\/addin\/index\.html"\s*\/>/u,
    "item form must also load the /addin bundle",
  );
});

test("production build and runtime-config entry points are present", async () => {
  const viteConfig = await read("apps/addin/vite.config.js");
  const eventViteConfig = await read("apps/addin/vite.event.config.js");
  const eventEntrySource = await read("apps/addin/src/outlook-event-entry.js");
  const eventRuntimeSource = await read("apps/addin/src/outlook-event-runtime.js");
  const authSource = await read("apps/addin/src/addin-auth.js");
  const sessionAuthSource = await read("apps/api/src/session-auth.js");

  assert.match(viteConfig, /base:\s*mode\s*===\s*"production"\s*\?\s*"\/addin\/"\s*:\s*"\/"/u);
  assert.match(eventViteConfig, /formats:\s*\["iife"\]/u);
  assert.match(eventViteConfig, /fileName:\s*\(\)\s*=>\s*"event-runtime\.js"/u);
  assert.match(eventEntrySource, /createOutlookEventRuntime\(\)/u);
  assert.match(eventEntrySource, /runtime\.register\(\)/u);
  assert.doesNotMatch(eventEntrySource, /Office\.onReady\s*\(/u);
  assert.match(eventRuntimeSource, /icon:\s*"Icon\.16x16"/u);
  assert.match(authSource, /DEFAULT_OAUTH_START_PATH\s*=\s*"\/addin\/oauth-start\.html"/u);
  assert.match(authSource, /\/api\/auth\/office-sso\/config/u);
  assert.match(sessionAuthSource, /GET\s+\/api\/auth\/office-sso\/config/u);
  assert.match(sessionAuthSource, /pathname\s*===\s*"\/api\/auth\/office-sso\/config"/u);

  for (const relativePath of [
    "apps/addin/public/oauth-start.html",
    "apps/addin/public/oauth-start.js",
    "apps/addin/public/oauth-callback.html",
    "apps/addin/public/oauth-callback.js",
    "apps/addin/public/event-runtime.html",
    "apps/addin/public/event-runtime.js",
    "apps/addin/public/amic-law-icon.png",
    "apps/addin/public/.well-known/microsoft-officeaddins-allowed.json",
    "apps/web/public/.well-known/microsoft-officeaddins-allowed.json",
  ]) {
    await access(path.join(repoRoot, relativePath), constants.R_OK);
  }
});

test("classic Outlook runtime URLs are explicitly allowed at each host root", async () => {
  const [local, production] = await Promise.all([
    read("apps/addin/public/.well-known/microsoft-officeaddins-allowed.json"),
    read("apps/web/public/.well-known/microsoft-officeaddins-allowed.json"),
  ]);

  assert.deepEqual(JSON.parse(local), {
    allowed: ["https://localhost:5186/event-runtime.js"],
  });
  assert.deepEqual(JSON.parse(production), {
    allowed: ["https://d2mthcc8vp3cr2.cloudfront.net/addin/event-runtime.js"],
  });
});

test("task pane delegates OAuth, attachment, and send-event orchestration to the tested runtime helpers", async () => {
  const mainSource = await read("apps/addin/src/main.jsx");

  assert.match(mainSource, /import\s*\{[\s\S]*?openOfficeOAuthDialog[\s\S]*?\}\s*from\s*"\.\/addin-auth\.js"/u);
  assert.match(mainSource, /await\s+openOfficeOAuthDialog\(\{[\s\S]*?onComplete:/u);
  assert.match(mainSource, /buildInquiryRegistrationRequest\(\{\s*action,\s*rest_message_id:/u);
  assert.match(mainSource, /import\s*\{\s*saveOutlookAttachments\s*\}\s*from\s*"\.\/outlook-attachment-actions\.js"/u);
  assert.match(mainSource, /await\s+saveOutlookAttachments\(\{[\s\S]*?currentItem,[\s\S]*?matterId,/u);
  assert.match(mainSource, /handleOutlookMessageSend\(\{[\s\S]*?readMessage:\s*\(options\)\s*=>\s*readOutlookComposeMessage\(\{/u);
  assert.match(mainSource, /registerOutlookSendHandler\(\{\s*Office:\s*window\.Office,\s*handler:\s*onMessageSendHandler,?\s*\}\)/u);
  assert.match(mainSource, /subscribeToOutlookItemChanges\(\{[\s\S]*?setItem\(officeItemSnapshot\(\)\)[\s\S]*?resetItemActionResults\(\)/u);
  assert.match(mainSource, /readCurrentOutlookItem\(\{\s*includeTimestamps:\s*true,\s*requireStableIdentity:\s*true\s*\}\)/u);
  assert.equal(mainSource.includes("dateTimeModified"), false);
  assert.equal(mainSource.includes("currentItem ?? item"), false);
  assert.match(mainSource, /isOutlookActionContextCurrent\(\{[\s\S]*?sourceMatterId:\s*matterId,[\s\S]*?currentMatterId:\s*selectedMatterIdRef\.current/u);
  assert.match(mainSource, /isFiledEmailContextCurrent\(\{\s*emailResult,\s*currentItem,\s*matterId\s*\}\)/u);
  assert.match(mainSource, /fetchAddinApi\(\{[\s\S]*?timeoutMs,[\s\S]*?fetchImpl:\s*window\.fetch\.bind\(window\)/u);
  assert.match(mainSource, /icon:\s*"Icon\.16x16"/u);
  assert.match(mainSource, /startOfficeTaskPane\(\{/u);
  assert.ok(mainSource.includes('render: () => createRoot(document.getElementById("root")).render(<App />)'), "task pane must delegate the first render");
  assert.match(mainSource, /waitForReady:\s*ensureOfficeReady,[\s\S]*?register:\s*registerOutlookEventHandlersOnce/u);
  assert.doesNotMatch(mainSource, /async\s+function\s+mount\s*\([^)]*\)\s*\{[\s\S]*?await\s+(?:window\.Office\.onReady|ensureOfficeReady)/u);
});
