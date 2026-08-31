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
  assert.match(manifest, /<Permissions>\s*ReadWriteItem\s*<\/Permissions>/u, `${name} must use ReadWriteItem for explicit compose attachment writes`);
  assert.equal(manifest.includes("ReadWriteMailbox"), false, `${name} must not request ReadWriteMailbox`);
}

function assertNoAutomaticSendRuntime(manifest, name) {
  assert.match(
    manifest,
    /<Set\s+Name="Mailbox"\s+MinVersion="1\.14"\s*\/>/u,
    `${name} must keep the Mailbox 1.14 startup baseline`,
  );
  assert.doesNotMatch(manifest, /OnMessageSend|LaunchEvent|<Runtimes>|WebViewRuntime\.Url|JSRuntime\.Url/u,
    `${name} must never intercept an ordinary Send action`);
}

function assertOfficialBrand(manifest, name) {
  assert.match(manifest, /<Version>1\.3\.0\.3<\/Version>/u, `${name} must use the release candidate version`);
  assert.match(manifest, /<ProviderName>AMIC OS<\/ProviderName>/u, `${name} must use the official provider name`);
  assert.match(manifest, /<DisplayName\s+DefaultValue="AMIC OS"\s*\/>/u, `${name} must use the official app name`);
  assert.equal(
    manifest.match(/<bt:String\s+id="Group\.Label"\s+DefaultValue="AMIC OS"\s*\/>/gu)?.length,
    2,
    `${name} must use the official ribbon group name in both overrides`,
  );
  assert.doesNotMatch(manifest, /Law Firm OS|LawOS/u, `${name} must not expose a legacy product name`);
}

test("Matter Add-in manifests use item-scoped write permission without automatic Send interception", async () => {
  const [production, local] = await Promise.all([
    read("apps/addin/manifest.production.xml"),
    read("apps/addin/manifest.xml"),
  ]);

  assertLeastPrivilege(production, "production manifest");
  assertLeastPrivilege(local, "local manifest");
  assertNoAutomaticSendRuntime(production, "production manifest");
  assertNoAutomaticSendRuntime(local, "local manifest");
  assertOfficialBrand(production, "production manifest");
  assertOfficialBrand(local, "local manifest");
});

test("Matter command surfaces use one neutral task-pane opener", async () => {
  const manifests = await Promise.all([
    read("apps/addin/manifest.production.xml"),
    read("apps/addin/manifest.xml"),
  ]);
  for (const manifest of manifests) {
    assert.equal((manifest.match(/<Action xsi:type="ShowTaskpane">/gu) ?? []).length, 4);
    assert.equal((manifest.match(/TaskpaneButton\.Label" DefaultValue="작업창 열기"/gu) ?? []).length, 2);
    assert.equal((manifest.match(/TaskpaneButton\.Tooltip" DefaultValue="AMIC OS 우측 패널을 엽니다\."/gu) ?? []).length, 2);
    assert.doesNotMatch(manifest, /ExecuteFunction/u);
  }
});

test("Outlook task-pane documents and copy use the official AMIC OS name", async () => {
  const [taskPaneHtml, mainSource, authSource, httpSource] = await Promise.all([
    read("apps/addin/index.html"),
    read("apps/addin/src/main.jsx"),
    read("apps/addin/src/addin-auth.js"),
    read("apps/addin/src/addin-http.js"),
  ]);

  assert.match(taskPaneHtml, /<title>AMIC OS<\/title>/u);
  assert.match(mainSource, /actionLabel:\s*"AMIC OS 로그인"/u);
  assert.match(mainSource, /AMIC OS 로그인이 필요합니다\./u);
  assert.doesNotMatch(mainSource, /AMIC OS에 로그인되어 있습니다\./u);
  assert.match(authSource, /AMIC OS 세션만 저장할 수 있습니다\./u);
  assert.match(httpSource, /AMIC OS API request timed out/u);

  for (const [name, source] of [
    ["task pane HTML", taskPaneHtml],
    ["task pane copy", mainSource],
    ["authentication copy", authSource],
    ["HTTP copy", httpSource],
  ]) {
    assert.doesNotMatch(
      source,
      /Law Firm OS|LawOS 메일 보관|LawOS 로그인|LawOS에 로그인|LawOS 응답|LawOS 세션|LawOS API request/u,
      `${name} must not expose a legacy product name`,
    );
  }
});

test("inquiry registration helpers stay in the inquiry-only entry point", async () => {
  const [mainSource, inquirySource] = await Promise.all([
    read("apps/addin/src/main.jsx"),
    read("apps/addin/src/inquiry-entry.jsx"),
  ]);

  assert.match(inquirySource, /buildInquiryRegistrationRequest\(/u);
  assert.match(inquirySource, /from\s+"\.\/inquiry-actions\.js"/u);
  assert.doesNotMatch(
    mainSource,
    /buildInquiryRegistrationRequest|inquiryResultCopy|registerInquiryAction|inquiry-actions\.js/u,
    "matter-full must not import or invoke inquiry-only helpers",
  );
});

test("production manifest points Taskpane and Commands at the /addin bundle", async () => {
  const production = await read("apps/addin/manifest.production.xml");
  const expectedUrls = [
    'id="Taskpane.Url" DefaultValue="https://d2mthcc8vp3cr2.cloudfront.net/addin/index.html"',
    'id="Commands.Url" DefaultValue="https://d2mthcc8vp3cr2.cloudfront.net/addin/index.html?commands=1"',
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

test("production build and runtime-config entry points are present without an automatic-send bundle", async () => {
  const viteConfig = await read("apps/addin/vite.config.js");
  const packageJson = JSON.parse(await read("apps/addin/package.json"));
  const authSource = await read("apps/addin/src/addin-auth.js");
  const sessionAuthSource = await read("apps/api/src/session-auth.js");

  assert.match(viteConfig, /base:\s*mode\s*===\s*"production"\s*\?\s*"\/addin\/"\s*:\s*"\/"/u);
  assert.doesNotMatch(packageJson.scripts.build, /vite\.event|outlook-event-runtime-artifact|event-runtime/u);
  assert.match(authSource, /DEFAULT_OAUTH_START_PATH\s*=\s*"\/addin\/oauth-start\.html"/u);
  assert.match(authSource, /\/api\/auth\/office-sso\/config/u);
  assert.match(sessionAuthSource, /GET\s+\/api\/auth\/office-sso\/config/u);
  assert.match(sessionAuthSource, /pathname\s*===\s*"\/api\/auth\/office-sso\/config"/u);

  for (const relativePath of [
    "apps/addin/public/oauth-start.html",
    "apps/addin/public/oauth-start.js",
    "apps/addin/public/oauth-callback.html",
    "apps/addin/public/oauth-callback.js",
    "apps/addin/public/amic-law-icon.png",
    "apps/addin/public/amic-law-logo.svg",
    "apps/addin/public/.well-known/microsoft-officeaddins-allowed.json",
    "apps/web/public/.well-known/microsoft-officeaddins-allowed.json",
  ]) {
    await access(path.join(repoRoot, relativePath), constants.R_OK);
  }
  for (const relativePath of [
    "apps/addin/public/event-runtime.html",
    "apps/addin/public/event-runtime.js",
    "apps/addin/vite.event.config.js",
  ]) {
    await assert.rejects(access(path.join(repoRoot, relativePath), constants.R_OK), { code: "ENOENT" });
  }
});

test("Matter filing header ships the canonical AMIC Law wordmark byte-for-byte", async () => {
  const [canonical, addinLogo] = await Promise.all([
    readFile(path.join(repoRoot, "apps/web/src/assets/amic-law.svg")),
    readFile(path.join(repoRoot, "apps/addin/public/amic-law-logo.svg")),
  ]);

  assert.deepEqual(addinLogo, canonical);
});

test("automatic-send JavaScript runtimes are not allowed at either host root", async () => {
  const [local, production] = await Promise.all([
    read("apps/addin/public/.well-known/microsoft-officeaddins-allowed.json"),
    read("apps/web/public/.well-known/microsoft-officeaddins-allowed.json"),
  ]);

  assert.deepEqual(JSON.parse(local), { allowed: [] });
  assert.deepEqual(JSON.parse(production), { allowed: [] });
});

test("task pane delegates explicit OAuth, filing, and activity orchestration without a send handler", async () => {
  const mainSource = await read("apps/addin/src/main.jsx");

  assert.match(mainSource, /import\s*\{[\s\S]*?openOfficeOAuthDialog[\s\S]*?\}\s*from\s*"\.\/addin-auth\.js"/u);
  assert.match(mainSource, /await\s+openOfficeOAuthDialog\(\{[\s\S]*?onComplete:/u);
  assert.match(mainSource, /import\s*\{[\s\S]*?fileOutlookEmailWithAttachments[\s\S]*?\}\s*from\s*"\.\/outlook-filing-orchestration\.js"/u);
  assert.match(mainSource, /import\s*\{[\s\S]*?fileOutlookEmail[\s\S]*?\}\s*from\s*"\.\/outlook-filing\.js"/u);
  assert.match(mainSource, /import\s*\{[\s\S]*?loadOutlookMatterActivity[\s\S]*?\}\s*from\s*"\.\/outlook-matter-activity\.js"/u);
  assert.match(mainSource, /await\s+fileOutlookEmailWithAttachments\(\{[\s\S]*?previousReceipt:[\s\S]*?readAttachments:/u);
  assert.match(mainSource, /readAttachments:\s*async[\s\S]*?isOutlookActionContextCurrent\(\{[\s\S]*?sourceItem:\s*currentItem[\s\S]*?readOutlookAttachments\(\{\s*item:\s*sourceOfficeItem/u);
  assert.match(mainSource, /await\s+fileOutlookEmail\(\{[\s\S]*?mode:\s*"sent"/u);
  assert.match(mainSource, /loadOutlookMatterActivity\(\{\s*matterId,\s*requestJson\s*\}\)/u);
  assert.doesNotMatch(mainSource, /await\s+refreshMatter\(nextMatterId\)/u);
  assert.doesNotMatch(mainSource, /handleOutlookMessageSend|registerOutlookSendHandler|onMessageSendHandler/u);
  assert.match(mainSource, /const initialItem = currentOfficeItemSnapshot\(\);[\s\S]*?setItem\(initialItem\);[\s\S]*?subscribeToOutlookItemChanges\(\{/u);
  assert.match(mainSource, /subscribeToOutlookItemChanges\(\{[\s\S]*?setItem\(nextItem\)[\s\S]*?resetItemActionResults\(\)/u);
  assert.match(mainSource, /resetItemActionResults\(\)[\s\S]*?setAttachmentResult\(null\)/u);
  assert.match(mainSource, /readCurrentOutlookItem\(\{\s*includeTimestamps:\s*true,\s*requireStableIdentity:\s*true\s*\}\)/u);
  assert.equal(mainSource.includes("dateTimeModified"), false);
  assert.equal(mainSource.includes("currentItem ?? item"), false);
  assert.match(mainSource, /isOutlookActionContextCurrent\(\{[\s\S]*?sourceMatterId:\s*matterId,[\s\S]*?currentMatterId:\s*selectedMatterIdRef\.current/u);
  assert.doesNotMatch(mainSource, /saveOutlookAttachments\(/u);
  assert.match(mainSource, /fetchAddinApi\(\{[\s\S]*?timeoutMs,[\s\S]*?fetchImpl:\s*window\.fetch\.bind\(window\)/u);
  assert.match(mainSource, /startOfficeTaskPane\(\{/u);
  assert.doesNotMatch(mainSource, /window\.confirm/u);
  assert.doesNotMatch(mainSource, /data-testid="outlook-disconnect-confirmation"/u);
  assert.doesNotMatch(mainSource, /data-testid="outlook-disconnect-confirm-button"/u);
  assert.doesNotMatch(mainSource, /window\.confirm\s*\(/u);
  assert.doesNotMatch(mainSource, /data-testid="(?:outlook-)?connection-settings"/u);
  assert.match(mainSource, /async\s+function\s+disconnectOutlook\(\)/u);
  assert.match(mainSource, /action:\s*disconnectOutlook,[\s\S]*?actionTestId:\s*"outlook-cleanup-retry-button"/u);
  assert.match(mainSource, /data-testid=\{intervention\.actionTestId\}/u);
  assert.match(mainSource, /if \(!graphConnected && !credentialCleanupPending\) return;/u);
  assert.match(mainSource, /else if \(credentialCleanupPending\) \{[\s\S]*?visibleMessage: "Outlook 연결 정보 정리가 필요합니다\."/u);
  assert.match(mainSource, /requestJson\("\/api\/outlook\/readiness"\)/u);
  assert.match(mainSource, /data-testid=\{intervention\.testId\}/u);
  assert.ok(mainSource.includes('render: () => createRoot(document.getElementById("root")).render(<App />)'), "task pane must delegate the first render");
  assert.match(mainSource, /waitForReady:\s*ensureOfficeReady,[\s\S]*?register:\s*registerOutlookCommandBridgeOnce/u);
  assert.doesNotMatch(mainSource, /async\s+function\s+mount\s*\([^)]*\)\s*\{[\s\S]*?await\s+(?:window\.Office\.onReady|ensureOfficeReady)/u);
});
