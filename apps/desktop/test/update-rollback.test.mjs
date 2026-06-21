import assert from "node:assert/strict";
import test from "node:test";
import { INTERNAL_UPDATE_KEY_ID, createUpdateController, signUpdateMetadata } from "../src/main/updates.js";

test("signed update applies only after signature check", async () => {
  const controller = createUpdateController({ currentVersion: "0.1.0" });
  const metadata = {
    version: "0.1.1",
    channel: "internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    artifactHash: "sha256-update-artifact"
  };
  const signature = signUpdateMetadata(metadata);

  assert.deepEqual(await controller.applyUpdate({ metadata, signature: "bad-signature" }), {
    state: "denied",
    reason: "signature_check_failed"
  });
  assert.equal(controller.activeVersion(), "0.1.0");

  const applied = await controller.applyUpdate({ metadata, signature });
  assert.equal(applied.state, "updated");
  assert.equal(applied.version, "0.1.1");
  assert.equal(applied.previousVersion, "0.1.0");
});

test("signed rollback returns to last verified internal version", async () => {
  const controller = createUpdateController({ currentVersion: "0.1.0" });
  const updateMetadata = {
    version: "0.1.1",
    channel: "internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    artifactHash: "sha256-update-artifact"
  };
  const rollbackMetadata = {
    version: "0.1.0",
    channel: "internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    artifactHash: "sha256-rollback-artifact"
  };

  await controller.applyUpdate({ metadata: updateMetadata, signature: signUpdateMetadata(updateMetadata) });
  const rolledBack = await controller.rollback({ metadata: rollbackMetadata, signature: signUpdateMetadata(rollbackMetadata) });

  assert.equal(rolledBack.state, "rolled_back");
  assert.equal(rolledBack.version, "0.1.0");
  assert.equal(controller.activeVersion(), "0.1.0");
});

test("public update channel is disabled", async () => {
  const controller = createUpdateController({ currentVersion: "0.1.0" });
  const metadata = {
    version: "1.0.0",
    channel: "public",
    keyId: INTERNAL_UPDATE_KEY_ID,
    artifactHash: "sha256-public-artifact"
  };

  assert.deepEqual(await controller.applyUpdate({ metadata, signature: signUpdateMetadata(metadata) }), {
    state: "denied",
    reason: "public_channel_disabled"
  });
});
