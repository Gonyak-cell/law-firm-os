import { inventorySha256, sha256 } from "../../lib/outlook-release/primitives.mjs";
import { writeProtectedBytes, writeProtectedJson } from "./protected-fixture.mjs";

const clone = (value) => structuredClone(value);
const serialized = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function manifestBytes(profile) {
  const sourceLocation = profile.source_locations[0].replaceAll("&", "&amp;");
  const launchEvent = profile.profile === "matter-full"
    ? '  <LaunchEvent Type="OnMessageSend" FunctionName="onMessageSendHandler" SendMode="PromptUser" />\n'
    : "";
  return Buffer.from([
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<OfficeApp>",
    `  <Id>${profile.product_id}</Id>`,
    `  <Version>${profile.rollback_version}</Version>`,
    `  <Permissions>${profile.permission}</Permissions>`,
    `  <SourceLocation DefaultValue="${sourceLocation}" />`,
    launchEvent.trimEnd(),
    "</OfficeApp>",
    "",
  ].filter((line) => line !== "").join("\n"));
}

function assetDefinitions(profile, {
  inquiryAssetPrefix = "/outlook-addin", inquiryStylesheetPrefix = null,
} = {}) {
  const matter = profile.profile === "matter-full";
  const entryPath = matter ? "assets/rollback-matter.js" : "outlook-addin/assets/rollback-inquiry.js";
  const taskpaneSrc = matter ? `/addin/${entryPath}` : `${inquiryAssetPrefix}/assets/rollback-inquiry.js`;
  const stylesheet = !matter && inquiryStylesheetPrefix
    ? `<link rel="stylesheet" href="${inquiryStylesheetPrefix}/assets/rollback-inquiry.css">`
    : "";
  const entries = [
    [profile.taskpane_html.path, Buffer.from(`<html><body data-profile="${profile.profile}">${stylesheet}<script type="module" src="${taskpaneSrc}"></script></body></html>\n`)],
    [entryPath, Buffer.from(`export const rollbackProductId = ${JSON.stringify(profile.product_id)};\n`)],
  ];
  if (!matter && inquiryStylesheetPrefix) {
    entries.push(["outlook-addin/assets/rollback-inquiry.css", Buffer.from("body { color: #111; }\n")]);
  }
  if (matter) {
    entries.push(
      ["event-runtime.html", Buffer.from('<html><script src="./event-runtime.js"></script></html>\n')],
      ["event-runtime.js", Buffer.from('globalThis.__amicRollbackEventRuntime = "1.0.1.1";\n')],
    );
  }
  return entries;
}

function artifactRef(profile, file) {
  return `.omo/evidence/fixture/rollback/${profile.profile}/${file}`;
}

async function writeProfile(root, profile, baselineProfile, options) {
  const manifest = manifestBytes(profile);
  profile.rollback_manifest_sha256 = sha256(manifest);
  baselineProfile.manifest_sha256 = profile.rollback_manifest_sha256;
  profile.protected_manifest_ref = artifactRef(profile, "manifest.xml");
  const manifestUrl = new URL(profile.rollback_manifest_url);
  manifestUrl.pathname = manifestUrl.pathname.replace(/manifest-[a-f0-9]{64}\.xml$/u, `manifest-${profile.rollback_manifest_sha256}.xml`);
  profile.rollback_manifest_url = manifestUrl.href;
  await writeProtectedBytes(root, profile.protected_manifest_ref, manifest);

  const artifacts = [];
  for (const [file, bytes] of assetDefinitions(profile, options)) {
    const ref = artifactRef(profile, file);
    await writeProtectedBytes(root, ref, bytes);
    artifacts.push({ path: file, byte_size: bytes.byteLength, sha256: sha256(bytes), protected_artifact_ref: ref });
  }
  const entry = artifacts.find(({ path: file }) => file.endsWith(".js") && !file.startsWith("event-runtime"));
  const taskpane = artifacts.find(({ path: file }) => file === profile.taskpane_html.path);
  const event = artifacts.find(({ path: file }) => file === "event-runtime.js") ?? null;
  profile.taskpane_html = { path: taskpane.path, sha256: taskpane.sha256, protected_artifact_ref: taskpane.protected_artifact_ref };
  profile.entry_bundle = { path: entry.path, sha256: entry.sha256, protected_artifact_ref: entry.protected_artifact_ref };
  profile.event_runtime = event == null
    ? null : { path: event.path, sha256: event.sha256, protected_artifact_ref: event.protected_artifact_ref };
  const normalized = artifacts.map(({ path, byte_size, sha256: digest }) => ({ path, byte_size, sha256: digest }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  const inventoryDigest = inventorySha256(normalized);
  const inventoryRef = artifactRef(profile, "static-inventory.json");
  const inventoryProof = {
    schema_version: "amic-os.outlook-rollback-inventory.v1", proof_class: "rollback_static_inventory",
    source_sha: profile.source_sha, product_id: profile.product_id, profile: profile.profile,
    version: profile.rollback_version, manifest_sha256: profile.rollback_manifest_sha256,
    source_locations: profile.source_locations, artifact_count: artifacts.length,
    inventory_sha256: inventoryDigest, artifacts,
  };
  const inventoryBytes = serialized(inventoryProof);
  await writeProtectedJson(root, inventoryRef, inventoryProof);
  profile.static_inventory = {
    artifact_count: artifacts.length, inventory_sha256: inventoryDigest,
    protected_inventory_ref: inventoryRef, protected_inventory_sha256: sha256(inventoryBytes),
  };
}

export async function createRollbackEvidenceFixture(root, baseline, rollback, options = {}) {
  const baselineValue = clone(baseline);
  const rollbackValue = clone(rollback);
  for (const profile of rollbackValue.profiles) {
    const baselineProfile = baselineValue.profiles.find(({ product_id }) => product_id === profile.product_id);
    await writeProfile(root, profile, baselineProfile, options);
  }
  const baselineArtifactBytes = serialized(baselineValue);
  const rollbackArtifactBytes = serialized(rollbackValue);
  return { baseline: baselineValue, rollback: rollbackValue, baselineArtifactBytes, rollbackArtifactBytes };
}
