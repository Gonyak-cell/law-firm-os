import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createDesktopBuildManifest,
  directoryDigest,
  serializeDesktopBuildManifest,
  validateDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";

const SOURCE_SHA = "6a57157a799e50092963faac0b0860522a218914";
const SOURCE_TREE = "45401ab2cf0871d61897ef4217918790f4f0bace";
const RENDERER_SHA = "f0a043dedfe1be18d711748e3b78d7313cdc1e92c90444a598b998b212485445";

function validInput(overrides = {}) {
  return {
    version: "0.1.17",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    renderer: {
      sha256: RENDERER_SHA,
      file_count: 28,
      algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
    },
    channel: "internal",
    platform: "darwin",
    arch: "arm64",
    appId: "com.amic.matter.desktop.internal",
    requestedRuntimeMode: "synthetic",
    effectiveRuntimeMode: "synthetic",
    runtimeIncluded: true,
    runtimeDataClass: "synthetic_only",
    nonDistributable: true,
    distributable: false,
    builtAt: "2026-07-16T02:30:00.000Z",
    ...overrides,
  };
}

test("PV-002 build manifest records version, full SHA, renderer hash, channel, and time", () => {
  const manifest = createDesktopBuildManifest(validInput());

  assert.equal(manifest.schema_version, "law-firm-os.matter-desktop-build-provenance.v2");
  assert.equal(manifest.product_name, "matter");
  assert.equal(manifest.package_name, "@law-firm-os/desktop");
  assert.equal(manifest.version, "0.1.17");
  assert.equal(manifest.source_sha, SOURCE_SHA);
  assert.equal(manifest.source_tree, SOURCE_TREE);
  assert.equal(manifest.source_dirty, false);
  assert.deepEqual(manifest.renderer, validInput().renderer);
  assert.equal(manifest.channel, "internal");
  assert.equal(manifest.platform, "darwin");
  assert.equal(manifest.arch, "arm64");
  assert.equal(manifest.app_id, "com.amic.matter.desktop.internal");
  assert.equal(manifest.built_at, "2026-07-16T02:30:00.000Z");
  assert.equal(manifest.policy_version, "law-firm-os.matter-desktop-release-policy.v1");
  assert.deepEqual(manifest.policy.allowed_data_modes, ["synthetic", "private-local"]);
  assert.deepEqual(manifest.policy.allowed_data_classes, {
    synthetic: "synthetic_only",
    "private-local": "private_local",
  });
  assert.equal(manifest.requested_runtime_mode, "synthetic");
  assert.equal(manifest.effective_runtime_mode, "synthetic");
  assert.equal(manifest.runtime_included, true);
  assert.equal(manifest.runtime_data_class, "synthetic_only");
  assert.equal(manifest.non_distributable, true);
  assert.equal(manifest.distributable, false);
  assert.equal(manifest.public_release_claim, false);
  assert.equal(manifest.production_go_live_claim, false);
  assert.equal(validateDesktopBuildManifest(manifest), manifest);
  assert.equal(serializeDesktopBuildManifest(manifest), `${JSON.stringify(manifest, null, 2)}\n`);
});

test("PV-002 build manifest rejects incomplete or forged provenance", () => {
  const mutations = [
    { sourceSha: "6a57157a" },
    { sourceTree: "45401ab2" },
    { sourceDirty: "false" },
    { renderer: { ...validInput().renderer, sha256: "f0a043de" } },
    { renderer: { ...validInput().renderer, file_count: 0 } },
    { channel: "latest" },
    { platform: "linux" },
    { builtAt: "not-a-time" },
    { requestedRuntimeMode: "private-local" },
    { effectiveRuntimeMode: "none" },
    { runtimeIncluded: false },
    { runtimeDataClass: "private_local" },
    { nonDistributable: false },
    { distributable: true },
  ];

  for (const mutation of mutations) {
    assert.throws(() => createDesktopBuildManifest(validInput(mutation)));
  }
});

test("PV-002 binds the runtime claim to the canonical channel policy", () => {
  const manifest = createDesktopBuildManifest(validInput());
  const forgedPolicy = {
    ...manifest,
    policy: {
      ...manifest.policy,
      data_mode: "none",
    },
  };
  assert.throws(
    () => validateDesktopBuildManifest(forgedPolicy),
    /manifest policy must match its release channel/,
  );

  const forgedRuntime = {
    ...manifest,
    requested_runtime_mode: "none",
    effective_runtime_mode: "none",
    runtime_included: false,
    runtime_data_class: "none",
  };
  assert.throws(
    () => validateDesktopBuildManifest(forgedRuntime),
    /requested runtime mode is not allowed|effective runtime mode must equal requested runtime mode|runtime data class must match the policy mode/,
  );
});

test("PV-002 renderer digest is stable across filesystem creation order", () => {
  const root = mkdtempSync(path.join(tmpdir(), "matter-pv002-digest-"));
  const left = path.join(root, "left");
  const right = path.join(root, "right");
  try {
    mkdirSync(path.join(left, "assets"), { recursive: true });
    writeFileSync(path.join(left, "index.html"), "<main>matter</main>\n");
    writeFileSync(path.join(left, "assets", "app.js"), "export const app = 'matter';\n");

    mkdirSync(path.join(right, "assets"), { recursive: true });
    writeFileSync(path.join(right, "assets", "app.js"), "export const app = 'matter';\n");
    writeFileSync(path.join(right, "index.html"), "<main>matter</main>\n");

    const digest = directoryDigest(left);
    const sha256 = (value) => createHash("sha256").update(value).digest("hex");
    const portableManifest = [
      `${sha256("export const app = 'matter';\n")}  ./assets/app.js\n`,
      `${sha256("<main>matter</main>\n")}  ./index.html\n`,
    ].join("");

    assert.deepEqual(digest, directoryDigest(right));
    assert.deepEqual(digest.file_count, 2);
    assert.equal(digest.sha256, sha256(portableManifest));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
