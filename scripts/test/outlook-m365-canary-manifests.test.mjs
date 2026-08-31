import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { parseOutlookManifest } from "../lib/outlook-manifest-projection.mjs";
import { validateOutlookM365CanaryManifestSet } from "../validate-outlook-m365-canary-manifests.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(await readFile(
  path.join(repoRoot, "contracts/outlook-m365-canary-manifest-set.json"),
  "utf8",
));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function seal(value) {
  const { manifest_set_sha256: _omitted, ...projection } = value;
  value.manifest_set_sha256 = sha256(JSON.stringify(projection));
  return value;
}

function changedContract(mutate) {
  const value = structuredClone(contract);
  mutate(value);
  return seal(value);
}

function bindFile(value, relativePath, contents) {
  const digest = sha256(contents);
  value.source_artifacts.find((artifact) => artifact.path === relativePath).sha256 = digest;
  for (const stage of value.stages) {
    if (stage.manifest_path === relativePath) stage.manifest_sha256 = digest;
  }
  if (value.rollback_removal.rollback_to_taskpane_only.manifest_path === relativePath) {
    value.rollback_removal.rollback_to_taskpane_only.manifest_sha256 = digest;
  }
}

function workflowRunSteps(source) {
  const lines = source.split(/\r?\n/u);
  const steps = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const nameMatch = lines[index].match(/^ {6}- name: (.+)$/u);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (steps.has(name)) throw new Error(`duplicate workflow step: ${name}`);
    for (index += 1; index < lines.length && !/^ {6}- /u.test(lines[index]); index += 1) {
      const runMatch = lines[index].match(/^ {8}run: ?(.*)$/u);
      if (!runMatch) continue;
      if (!new Set(["|", "|-", ">", ">-"]).has(runMatch[1])) {
        steps.set(name, [runMatch[1]]);
        break;
      }
      const commands = [];
      for (index += 1; index < lines.length; index += 1) {
        const commandMatch = lines[index].match(/^ {10}(.*)$/u);
        if (!commandMatch) {
          index -= 1;
          break;
        }
        if (commandMatch[1]) commands.push(commandMatch[1]);
      }
      steps.set(name, commands);
      break;
    }
  }
  return steps;
}

function exactCanaryWorkflowCommands(source) {
  const steps = workflowRunSteps(source);
  assert.deepEqual(steps.get("Release gate unit tests"), [
    "node --test scripts/test/outlook-release-*.test.mjs",
  ]);
  assert.deepEqual(steps.get("One-user M365 canary manifest tests"), [
    "node --test scripts/test/outlook-m365-canary-manifests.test.mjs",
  ]);
  assert.deepEqual(steps.get("Validate staged one-user canary manifests"), [
    "node scripts/validate-outlook-m365-canary-manifests.mjs",
  ]);
  assert.deepEqual(steps.get("Validate all local and production manifests"), [
    "npx --yes office-addin-manifest@2.1.6 validate apps/addin/manifest.xml",
    "npx --yes office-addin-manifest@2.1.6 validate apps/addin/manifest.canary.taskpane.production.xml",
    "npx --yes office-addin-manifest@2.1.6 validate apps/addin/manifest.production.xml",
    "npx --yes office-addin-manifest@2.1.6 validate apps/addin/manifest.canary.rollback.production.xml",
    "npx --yes office-addin-manifest@2.1.6 validate apps/addin/manifest.inquiry.xml",
    "npx --yes office-addin-manifest@2.1.6 validate apps/addin/manifest.inquiry.production.xml",
  ]);
  return steps;
}

test("one-user canary manifest set is exact, staged, least-privilege, and non-executing", async () => {
  const result = await validateOutlookM365CanaryManifestSet({ repoRoot });
  assert.deepEqual(result, {
    schema_version: "amic-os.outlook-m365-canary-manifest-set-validation.v1",
    verdict: "PASS",
    product_id: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
    artifact_version: "1.3.0.3",
    prior_known_manifest_version: "1.3.0.1",
    manifest_set_sha256: "b093cd5a9a4f49b1512e6b14fd39a781c594d285473acf6af7184d3d9140e171",
    stages: [
      {
        id: "taskpane_only",
        manifest_path: "apps/addin/manifest.canary.taskpane.production.xml",
        manifest_sha256: "99f4801153d607d7b2dbafa24b9068c6c74afe781560cd9b9ec789a43aa3aabb",
        manifest_version: "1.3.0.2",
        launch_events: [],
      },
      {
        id: "candidate_taskpane",
        manifest_path: "apps/addin/manifest.production.xml",
        manifest_sha256: "7a252e90e7ab04902da680f7affe463d426d496f08242ed9aaa2d2ed086075d7",
        manifest_version: "1.3.0.3",
        launch_events: [],
      },
    ],
    rollback_manifest: {
      manifest_path: "apps/addin/manifest.canary.rollback.production.xml",
      manifest_sha256: "d43445dc16fab1e01e7d404468b3157792db2a22614e1124220ead9a976893f2",
      manifest_version: "1.3.0.4",
      launch_events: [],
    },
    canary_user_count: 1,
    rollback_before_removal: true,
    provider_mutation_performed: false,
  });
});

test("candidate stage rejects a hidden automatic-send launch event", async () => {
  const retiredEventfulManifest = await readFile(
    path.join(repoRoot, "apps/addin/manifest.canary.smart-alerts.production.xml"),
    "utf8",
  );
  const mutated = changedContract((value) => {
    bindFile(value, "apps/addin/manifest.production.xml", retiredEventfulManifest);
  });
  await assert.rejects(
    validateOutlookM365CanaryManifestSet({
      repoRoot,
      contractOverride: mutated,
      fileOverrides: { "apps/addin/manifest.production.xml": retiredEventfulManifest },
    }),
    /forward manifest permission|candidate taskpane-only extension points/u,
  );
});

test("Matter manifests fail closed unless the exact Classic Outlook ProgID wins on Windows", async (t) => {
  const manifestPath = "apps/addin/manifest.production.xml";
  const source = await readFile(path.join(repoRoot, manifestPath), "utf8");
  for (const [name, changed, expected] of [
    [
      "missing equivalent add-in",
      source.replace(/\n      <EquivalentAddins>[\s\S]*?<\/EquivalentAddins>/u, ""),
      /forward manifest equivalent_addins|candidate taskpane-only equivalent add-in/u,
    ],
    [
      "wrong ProgID",
      source.replace("AMIC.OS.Vault.Outlook", "AMIC.OS.Wrong.Outlook"),
      /forward manifest equivalent_addins|candidate taskpane-only equivalent add-in/u,
    ],
    [
      "unsupported Outlook effect",
      source.replace("      </EquivalentAddins>", "        <Effect>DisableWithNotification</Effect>\n      </EquivalentAddins>"),
      /forward manifest equivalent_addin_effects|candidate taskpane-only equivalent add-in effects/u,
    ],
  ]) {
    await t.test(name, async () => {
      assert.notEqual(changed, source);
      const mutated = changedContract((value) => bindFile(value, manifestPath, changed));
      await assert.rejects(
        validateOutlookM365CanaryManifestSet({
          repoRoot,
          contractOverride: mutated,
          fileOverrides: { [manifestPath]: changed },
        }),
        expected,
      );
    });
  }
});

test("only candidate full-product V1.1 read and compose taskpanes support pinning", async () => {
  const expected = [
    "VersionOverridesV1_1:MessageComposeCommandSurface:ShowTaskpane:true",
    "VersionOverridesV1_1:MessageReadCommandSurface:ShowTaskpane:true",
  ];
  for (const manifestPath of [
    "apps/addin/manifest.xml",
    "apps/addin/manifest.production.xml",
    "apps/addin/manifest.canary.taskpane.production.xml",
  ]) {
    const manifest = parseOutlookManifest(await readFile(path.join(repoRoot, manifestPath), "utf8"));
    assert.deepEqual(manifest.supports_pinning, expected, manifestPath);
  }
  for (const manifestPath of [
    "apps/addin/manifest.canary.rollback.production.xml",
    "apps/addin/manifest.inquiry.xml",
    "apps/addin/manifest.inquiry.production.xml",
  ]) {
    const manifest = parseOutlookManifest(await readFile(path.join(repoRoot, manifestPath), "utf8"));
    assert.deepEqual(manifest.supports_pinning, [], manifestPath);
  }
});

test("pinning and monotonic-version mutations fail closed after contract reseal", async (t) => {
  const cases = [
    {
      name: "pin inquiry V1.0",
      manifestPath: "apps/addin/manifest.inquiry.production.xml",
      mutate: (source) => source.replace(
        "                    <SourceLocation resid=\"Taskpane.Url\" />",
        "                    <SourceLocation resid=\"Taskpane.Url\" />\n                    <SupportsPinning>true</SupportsPinning>",
      ),
      expected: /inquiry-only production pinned taskpanes/u,
    },
    {
      name: "duplicate candidate pin",
      manifestPath: "apps/addin/manifest.canary.taskpane.production.xml",
      mutate: (source) => source.replace(
        "                      <SupportsPinning>true</SupportsPinning>",
        "                      <SupportsPinning>true</SupportsPinning>\n                      <SupportsPinning>true</SupportsPinning>",
      ),
      expected: /pinned taskpanes|semantic capabilities/u,
    },
    {
      name: "reuse 1.2 version",
      manifestPath: "apps/addin/manifest.canary.taskpane.production.xml",
      mutate: (source) => source.replace("<Version>1.3.0.2</Version>", "<Version>1.2.0.0</Version>"),
      expected: /manifest (?:identity|product_id)/u,
    },
    {
      name: "alter ProductId",
      manifestPath: "apps/addin/manifest.canary.taskpane.production.xml",
      mutate: (source) => source.replace(
        "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
        "00000000-0000-0000-0000-000000000000",
      ),
      expected: /manifest (?:identity|product_id)/u,
    },
  ];
  for (const { name, manifestPath, mutate, expected } of cases) {
    await t.test(name, async () => {
      const source = await readFile(path.join(repoRoot, manifestPath), "utf8");
      const changed = mutate(source);
      assert.notEqual(changed, source);
      const mutated = changedContract((value) => bindFile(value, manifestPath, changed));
      await assert.rejects(
        validateOutlookM365CanaryManifestSet({
          repoRoot,
          contractOverride: mutated,
          fileOverrides: { [manifestPath]: changed },
        }),
        expected,
      );
    });
  }
});

test("candidate taskpane cannot skip OAuth, assignment, or automatic-send-zero proofs", async () => {
  const mutated = changedContract((value) => {
    value.stages[1].requires.splice(1, 1);
  });
  await assert.rejects(
    validateOutlookM365CanaryManifestSet({ repoRoot, contractOverride: mutated }),
    /stage 2 drifted/u,
  );
});

test("taskpane deployment requires provider absence or a strictly older provider version", async () => {
  const mutated = changedContract((value) => {
    value.stages[0].requires.pop();
  });
  await assert.rejects(
    validateOutlookM365CanaryManifestSet({ repoRoot, contractOverride: mutated }),
    /stage 1 drifted/u,
  );
});

test("single-canary assignment rejects broad, tenant-wide, nested, and assign-to-everyone drift", async (t) => {
  const cases = [
    ["eligible_user_count", 10],
    ["tenant_wide_assignment_allowed", true],
    ["nested_groups_allowed", true],
    ["assign_to_everyone", true],
  ];
  for (const [field, value] of cases) {
    await t.test(field, async () => {
      const mutated = changedContract((candidate) => { candidate.canary_assignment[field] = value; });
      await assert.rejects(
        validateOutlookM365CanaryManifestSet({ repoRoot, contractOverride: mutated }),
        /single-canary assignment contract drifted/u,
      );
    });
  }
});

test("production AppDomain, callback, NAA redirect, and authority host are exact", async (t) => {
  const cases = [
    ["callback", (value) => { value.production_urls.oauth_callbacks[0] = `${value.production_urls.origin}/oauth-callback.html`; }],
    ["AppDomain", (value) => { value.production_urls.app_domains.push("https://example.invalid"); }],
    ["NAA redirect", (value) => { value.production_urls.naa_redirects[0] = `${value.production_urls.origin}/`; }],
    ["authority", (value) => { value.production_urls.entra_authority_host = "login.example.invalid"; }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const mutated = changedContract(mutate);
      await assert.rejects(
        validateOutlookM365CanaryManifestSet({ repoRoot, contractOverride: mutated }),
        /production URL contract drifted/u,
      );
    });
  }
});

test("callback and OAuth source checks reject resealed executable-target drift", async (t) => {
  await t.test("callback HTML loader", async () => {
    const sourcePath = "apps/addin/public/oauth-callback.html";
    const source = await readFile(path.join(repoRoot, sourcePath), "utf8");
    const spoofed = source
      .replace("script-src 'self' https://appsforoffice.microsoft.com", "script-src 'self' 'unsafe-inline' https://appsforoffice.microsoft.com")
      .replace("    <script src=", "    <script>window.location.replace(\"https://attacker.invalid\")</script>\n    <script src=");
    assert.notEqual(spoofed, source);
    const mutated = changedContract((value) => bindFile(value, sourcePath, spoofed));
    await assert.rejects(
      validateOutlookM365CanaryManifestSet({
        repoRoot,
        contractOverride: mutated,
        fileOverrides: { [sourcePath]: spoofed },
      }),
      /trusted source artifact digest drifted: apps\/addin\/public\/oauth-callback\.html/u,
    );
  });

  await t.test("OAuth start HTML loader", async () => {
    const sourcePath = "apps/addin/public/oauth-start.html";
    const source = await readFile(path.join(repoRoot, sourcePath), "utf8");
    const spoofed = source
      .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';")
      .replace("    <script type=", "    <script>window.location.replace(\"https://attacker.invalid\")</script>\n    <script type=");
    assert.notEqual(spoofed, source);
    const mutated = changedContract((value) => bindFile(value, sourcePath, spoofed));
    await assert.rejects(
      validateOutlookM365CanaryManifestSet({
        repoRoot,
        contractOverride: mutated,
        fileOverrides: { [sourcePath]: spoofed },
      }),
      /trusted source artifact digest drifted: apps\/addin\/public\/oauth-start\.html/u,
    );
  });

  await t.test("callback targetOrigin", async () => {
    const sourcePath = "apps/addin/public/oauth-callback.js";
    const source = await readFile(path.join(repoRoot, sourcePath), "utf8");
    const spoofed = source.replace(
      "      targetOrigin: window.location.origin,",
      "      // targetOrigin: window.location.origin\n      targetOrigin: \"https://attacker.invalid\",",
    );
    assert.notEqual(spoofed, source);
    const mutated = changedContract((value) => bindFile(value, sourcePath, spoofed));
    await assert.rejects(
      validateOutlookM365CanaryManifestSet({
        repoRoot,
        contractOverride: mutated,
        fileOverrides: { [sourcePath]: spoofed },
      }),
      /trusted source artifact digest drifted: apps\/addin\/public\/oauth-callback\.js/u,
    );
  });

  await t.test("OAuth authority host", async () => {
    const sourcePath = "apps/addin/public/oauth-start.js";
    const source = await readFile(path.join(repoRoot, sourcePath), "utf8");
    const spoofed = source.replace(
      '    || target.hostname !== "login.microsoftonline.com"',
      '    || /* target.hostname !== "login.microsoftonline.com" */ target.hostname !== "attacker.invalid"',
    );
    assert.notEqual(spoofed, source);
    const mutated = changedContract((value) => bindFile(value, sourcePath, spoofed));
    await assert.rejects(
      validateOutlookM365CanaryManifestSet({
        repoRoot,
        contractOverride: mutated,
        fileOverrides: { [sourcePath]: spoofed },
      }),
      /trusted source artifact digest drifted: apps\/addin\/public\/oauth-start\.js/u,
    );
  });
});

test("rollback must preserve zero automatic Send interception before exact-canary unassignment", async (t) => {
  for (const [name, mutate] of [
    ["skip rollback", (value) => { value.rollback_removal.remove_canary.operations.shift(); }],
    ["delete ProductId", (value) => { value.rollback_removal.remove_canary.delete_product_id_allowed = true; }],
    ["restore everyone", (value) => { value.rollback_removal.remove_canary.restore_assign_to_everyone = true; }],
    ["reuse old manifest", (value) => { value.rollback_removal.remove_canary.reenable_requires_new_manifest_version = false; }],
  ]) {
    await t.test(name, async () => {
      const mutated = changedContract(mutate);
      await assert.rejects(
        validateOutlookM365CanaryManifestSet({ repoRoot, contractOverride: mutated }),
        /canary removal drifted/u,
      );
    });
  }
});

test("source artifact byte drift and unknown contract fields fail closed", async (t) => {
  await t.test("artifact byte drift", async () => {
    const callback = await readFile(path.join(repoRoot, "apps/addin/public/oauth-callback.js"), "utf8");
    await assert.rejects(
      validateOutlookM365CanaryManifestSet({
        repoRoot,
        fileOverrides: { "apps/addin/public/oauth-callback.js": `${callback}\n` },
      }),
      /source artifact bytes drifted/u,
    );
  });
  await t.test("unknown field", async () => {
    const mutated = changedContract((value) => { value.deployment_authorized = true; });
    await assert.rejects(
      validateOutlookM365CanaryManifestSet({ repoRoot, contractOverride: mutated }),
      /contract keys drifted/u,
    );
  });
});

test("CI runs the staged validator and official validation for every staged manifest", async () => {
  const workflow = await readFile(path.join(repoRoot, ".github/workflows/outlook-addin-validation.yml"), "utf8");
  const steps = exactCanaryWorkflowCommands(workflow);
  const validatorCommand = steps.get("Validate staged one-user canary manifests")[0].split(" ");
  assert.deepEqual(validatorCommand, ["node", "scripts/validate-outlook-m365-canary-manifests.mjs"]);
  const executed = spawnSync(process.execPath, validatorCommand.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(executed.status, 0, executed.stderr);
  assert.equal(JSON.parse(executed.stdout).verdict, "PASS");
  assert.equal((workflow.match(/contracts\/outlook-m365-canary-manifest-set\.json/gu) ?? []).length, 2);
});

test("CI command proof rejects echo and comment lookalikes", async (t) => {
  const workflow = await readFile(path.join(repoRoot, ".github/workflows/outlook-addin-validation.yml"), "utf8");
  await t.test("echoed validator", () => {
    const echoed = workflow.replace(
      "        run: node scripts/validate-outlook-m365-canary-manifests.mjs",
      "        run: echo 'node scripts/validate-outlook-m365-canary-manifests.mjs'",
    );
    assert.throws(() => exactCanaryWorkflowCommands(echoed));
  });
  await t.test("commented official commands", () => {
    const commented = workflow.replace(
      "          npx --yes office-addin-manifest@2.1.6 validate apps/addin/manifest.canary.taskpane.production.xml",
      "          # npx --yes office-addin-manifest@2.1.6 validate apps/addin/manifest.canary.taskpane.production.xml",
    );
    assert.throws(() => exactCanaryWorkflowCommands(commented));
  });
});
