import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import { validateOutlookAddinSurfaces } from "../../../scripts/validate-outlook-addin-surfaces.mjs";

const addinRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(addinRoot, "../..");
const contractPath = path.join(repoRoot, "contracts/outlook-addin-surfaces.json");
const baselinePath = path.join(repoRoot, "contracts/outlook-addin-deployment-baseline.json");
const baselineReceipt = JSON.parse(await readFile(baselinePath, "utf8"));

async function validate(overrides = {}) {
  return validateOutlookAddinSurfaces({
    repoRoot,
    contractPath,
    baseline: baselineReceipt,
    ...overrides,
  });
}

async function candidateManifestOverrides() {
  const paths = [
    "apps/addin/manifest.xml",
    "apps/addin/manifest.production.xml",
    "apps/addin/manifest.inquiry.xml",
    "apps/addin/manifest.inquiry.production.xml",
  ];
  return Object.fromEntries(await Promise.all(paths.map(async (manifestPath) => [
    manifestPath,
    (await readFile(path.join(repoRoot, manifestPath), "utf8"))
      .replace("<Version>1.0.1.1</Version>", "<Version>1.1.0.0</Version>"),
  ])));
}

test("both Outlook profiles remain bound to their independently deployed identities", async () => {
  const result = await validate();

  assert.deepEqual(
    result.profiles.map(({ profile, product_id, version }) => ({ profile, product_id, version })),
    [
      {
        profile: "matter-full",
        product_id: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
        version: "1.0.1.1",
      },
      {
        profile: "inquiry-only",
        product_id: "952431be-51b8-42a2-9bf6-769a15934e85",
        version: "1.0.1.1",
      },
    ],
  );
  assert.equal(result.permission_event_assignment_diff, "none");
});

test("the inquiry profile cannot inherit Matter compose or event capabilities", async () => {
  const inquiryProduction = await readFile(
    path.join(repoRoot, "apps/addin/manifest.inquiry.production.xml"),
    "utf8",
  );

  for (const [name, fragment] of [
    ["compose", '<ExtensionPoint xsi:type="MessageComposeCommandSurface" />'],
    ["event", '<ExtensionPoint xsi:type="LaunchEvent" />'],
  ]) {
    await assert.rejects(
      validate({
        manifestOverrides: {
          "apps/addin/manifest.inquiry.production.xml": inquiryProduction.replace(
            "</DesktopFormFactor>",
            `${fragment}</DesktopFormFactor>`,
          ),
        },
        skipProductionHash: true,
      }),
      /inquiry-only production extension_points/u,
      name,
    );
  }
});

test("identity, permissions, requirements, URLs, and current production hashes fail closed", async () => {
  const inquiryProduction = await readFile(
    path.join(repoRoot, "apps/addin/manifest.inquiry.production.xml"),
    "utf8",
  );

  for (const [name, mutated, expected] of [
    [
      "product id",
      inquiryProduction.replace(
        "952431be-51b8-42a2-9bf6-769a15934e85",
        "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
      ),
      /product_id/u,
    ],
    ["permission", inquiryProduction.replace("ReadItem", "ReadWriteMailbox"), /permission/u],
    ["Mailbox requirement", inquiryProduction.replace('MinVersion="1.3"', 'MinVersion="1.14"'), /mailbox_versions/u],
    ["source URL", inquiryProduction.replace("/outlook-addin/index.html", "/addin/index.html"), /form_source_locations/u],
  ]) {
    await assert.rejects(
      validate({
        manifestOverrides: { "apps/addin/manifest.inquiry.production.xml": mutated },
        skipProductionHash: true,
      }),
      expected,
      name,
    );
  }

  await assert.rejects(
    validate({
      manifestOverrides: {
        "apps/addin/manifest.inquiry.production.xml": `${inquiryProduction}\n`,
      },
    }),
    /manifest_sha256/u,
  );
});

test("host, item, resource, label, and exact local route drift all fail closed", async () => {
  const inquiryLocal = await readFile(path.join(repoRoot, "apps/addin/manifest.inquiry.xml"), "utf8");
  const matterLocal = await readFile(path.join(repoRoot, "apps/addin/manifest.xml"), "utf8");

  const cases = [
    [
      "inquiry route",
      "apps/addin/manifest.inquiry.xml",
      inquiryLocal.replaceAll("/outlook-addin/index.html", "/outlook-addin/other.html"),
      /inquiry-only local (?:url_resources|form_source_locations)/u,
    ],
    [
      "matter cross-route",
      "apps/addin/manifest.xml",
      matterLocal.replaceAll("https://localhost:5186/index.html", "https://localhost:5186/outlook-addin/index.html"),
      /matter-full local (?:url_resources|form_source_locations)/u,
    ],
    [
      "broken resid",
      "apps/addin/manifest.inquiry.xml",
      inquiryLocal.replace('resid="Taskpane.Url"', 'resid="Missing.Url"'),
      /undefined manifest resid references/u,
    ],
    [
      "inquiry label",
      "apps/addin/manifest.inquiry.xml",
      inquiryLocal.replace('DefaultValue="새 문의로 등록"', 'DefaultValue="메일 처리"'),
      /inquiry-only local string_resources/u,
    ],
    [
      "top-level host",
      "apps/addin/manifest.inquiry.xml",
      inquiryLocal.replace('<Host Name="Mailbox" />', '<Host Name="Document" />'),
      /inquiry-only local top_level_hosts/u,
    ],
    [
      "item type",
      "apps/addin/manifest.inquiry.xml",
      inquiryLocal.replace('ItemType="Message"', 'ItemType="Appointment"'),
      /inquiry-only local rule_fingerprints/u,
    ],
  ];

  for (const [name, manifestPath, xml, expected] of cases) {
    await assert.rejects(validate({ manifestOverrides: { [manifestPath]: xml } }), expected, name);
  }
});

test("candidate parsing ignores deceptive XML comments and validates the real permission", async () => {
  const overrides = await candidateManifestOverrides();
  overrides["apps/addin/manifest.inquiry.xml"] = overrides["apps/addin/manifest.inquiry.xml"].replace(
    "<Permissions>ReadItem</Permissions>",
    "<!-- <Permissions>ReadItem</Permissions> --><Permissions>ReadWriteMailbox</Permissions>",
  );

  await assert.rejects(validate({ mode: "candidate", manifestOverrides: overrides }), /permission/u);
});

test("non-URL behavior and XML hierarchy drift fail closed", async () => {
  const inquiryLocal = await readFile(path.join(repoRoot, "apps/addin/manifest.inquiry.xml"), "utf8");
  const matterLocal = await readFile(path.join(repoRoot, "apps/addin/manifest.xml"), "utf8");
  const hierarchyDrift = inquiryLocal
    .replace('          <FunctionFile resid="Commands.Url" />\n', "")
    .replace(
      '              <Group id="clientInquiryGroup">',
      '              <Group id="clientInquiryGroup">\n                <FunctionFile resid="Commands.Url" />',
    );
  const cases = [
    ["rule mode", "apps/addin/manifest.xml", matterLocal.replace('Mode="Or"', 'Mode="And"'), /rule_collection_modes/u],
    ["height", "apps/addin/manifest.inquiry.xml", inquiryLocal.replace("<RequestedHeight>450", "<RequestedHeight>10"), /requested_heights/u],
    ["entity highlighting", "apps/addin/manifest.inquiry.xml", inquiryLocal.replace("<DisableEntityHighlighting>false", "<DisableEntityHighlighting>true"), /disable_entity_highlighting/u],
    ["action type", "apps/addin/manifest.inquiry.xml", inquiryLocal.replace('xsi:type="ShowTaskpane"', 'xsi:type="ExecuteFunction"'), /action_types/u],
    ["hierarchy", "apps/addin/manifest.inquiry.xml", hierarchyDrift, /semantic_manifest_sha256/u],
  ];

  for (const [name, manifestPath, xml, expected] of cases) {
    await assert.rejects(validate({ manifestOverrides: { [manifestPath]: xml } }), expected, name);
  }
});

test("an explicit independent OUTM-01 baseline receipt is required and exact", async () => {
  await assert.rejects(
    validateOutlookAddinSurfaces({ repoRoot, contractPath }),
    /explicit OUTM-01 baseline receipt is required/u,
  );

  const wrongHash = structuredClone(baselineReceipt);
  wrongHash.profiles[1].manifest_sha256 = "0".repeat(64);
  await assert.rejects(validate({ baseline: wrongHash }), /baseline manifest_sha256/u);

  const missingField = structuredClone(baselineReceipt);
  delete missingField.profiles[0].assignment_count;
  await assert.rejects(validate({ baseline: missingField }), /assignment_count is required/u);

  const duplicate = structuredClone(baselineReceipt);
  duplicate.profiles.push(structuredClone(duplicate.profiles[0]));
  await assert.rejects(validate({ baseline: duplicate }), /duplicate baseline ProductId/u);

  const extra = structuredClone(baselineReceipt);
  extra.profiles.push({
    ...structuredClone(extra.profiles[0]),
    product_id: "00000000-0000-0000-0000-000000000000",
  });
  await assert.rejects(validate({ baseline: extra }), /baseline ProductIds mismatch/u);
});
