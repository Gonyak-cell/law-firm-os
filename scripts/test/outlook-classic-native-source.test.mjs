import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");

async function source(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

test("Classic Outlook adapter is compose-click-only and exact-version bound", async () => {
  const [project, addIn, pipe, contracts] = await Promise.all([
    source("apps/outlook-classic-native/AMIC.OS.Vault.Outlook.csproj"),
    source("apps/outlook-classic-native/VaultOutlookAddIn.cs"),
    source("apps/outlook-classic-native/AttachPipeServer.cs"),
    source("apps/outlook-classic-native/ComContracts.cs"),
  ]);

  assert.match(project, /<TargetFramework>net48<\/TargetFramework>/u);
  assert.match(project, /<PlatformTarget>AnyCPU<\/PlatformTarget>/u);
  assert.doesNotMatch(project, /VSTO|SignAssembly|AssemblyOriginatorKeyFile/iu);

  assert.match(addIn, /Microsoft\.Outlook\.Mail\.Compose/u);
  assert.match(addIn, /label=""Vault에서 첨부""/u);
  assert.match(addIn, /private const int OutlookByValue = 1;/u);
  assert.match(addIn, /dynamicAttachments\.Add\(\s*pending\.TempFilePath,\s*OutlookByValue/su);
  assert.match(addIn, /attachedBytes == pending\.Metadata\.exact_version\.byte_size/u);
  assert.match(addIn, /activeServers\.TryRemove\(request\.RequestId, out removed\).*removed\.Dispose\(\)/su);
  assert.doesNotMatch(addIn, /ItemChanged|SelectionChange|NewInspector|HttpClient|WebRequest|GraphServiceClient/iu);

  assert.match(pipe, /WindowsIdentity\.GetCurrent\(\)\.User/u);
  assert.match(pipe, /SetAccessRuleProtection\(true, false\)/u);
  assert.match(pipe, /GetNamedPipeClientProcessId/u);
  assert.match(pipe, /client\.MainModule\.FileName/u);
  assert.match(pipe, /string\.Equals\(actualPath, expectedPath, StringComparison\.OrdinalIgnoreCase\)/u);
  assert.match(pipe, /metadata\.installation_ref_sha256 != request\.InstallationRefSha256/u);
  assert.match(pipe, /metadata\.compose_target_sha256 != request\.ComposeTargetSha256/u);
  assert.match(pipe, /metadata\.exact_version\.byte_size != byteLength/u);
  assert.match(pipe, /AttachRequest\.Hex\(digest\.Hash\) != expectedSha256/u);
  assert.match(pipe, /FileMode\.CreateNew/u);
  assert.match(pipe, /File\.Delete\(tempFilePath\)/u);
  assert.match(contracts, /IDTExtensibility2/u);
  assert.match(contracts, /IRibbonExtensibility/u);
});

test("AMIC OS NSIS installer bundles and user-registers the Classic adapter without remote deletion", async () => {
  const [builder, nsis, buildScript] = await Promise.all([
    source("apps/desktop/electron-builder.yml"),
    source("apps/desktop/build/installer.nsh"),
    source("scripts/build-matter-desktop-win-installer.mjs"),
  ]);

  assert.match(builder, /nsis:\s+include: build\/installer\.nsh\s+perMachine: false/su);
  assert.match(nsis, /!macro customInstall/u);
  assert.match(nsis, /!macro customUnInstall/u);
  assert.match(nsis, /SetRegView 32/u);
  assert.match(nsis, /SetRegView 64/u);
  assert.match(nsis, /WriteRegStr HKCU "Software\\Microsoft\\Office\\Outlook\\Addins\\\$\{AMIC_OUTLOOK_PROGID\}"/u);
  assert.match(nsis, /WriteRegDWORD HKCU .*"LoadBehavior" 3/u);
  assert.match(nsis, /DeleteRegKey HKCU "Software\\Microsoft\\Office\\Outlook\\Addins\\\$\{AMIC_OUTLOOK_PROGID\}"/u);
  assert.match(nsis, /RMDir \/r "\$LOCALAPPDATA\\AMIC OS\\OutlookAttachments"/u);
  assert.doesNotMatch(nsis, /HKLM|Invoke-WebRequest|curl|vault_documents|immutable_versions|audit_records/iu);

  assert.match(buildScript, /"dotnet",\s*\["build", classicOutlookProjectPath/su);
  assert.match(buildScript, /\.release-provenance\/classic-outlook/u);
  assert.match(buildScript, /classic_outlook_adapter_bundled: true/u);
  assert.match(buildScript, /Classic Outlook adapter must match the exact built DLL/u);
});
