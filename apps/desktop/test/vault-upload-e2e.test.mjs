import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";

import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createVaultDmsRuntimeContext } from "../../api/src/vault-dms-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../../api/src/matter-vault-account-registry.js";
import { startApiServer } from "../../api/src/server.js";
import { createTestAmicVaultUploadProvider } from "../../api/test/helpers/amic-vault-upload-provider.js";
import { MainProcessAuthCoordinator, memorySecureStore } from "../src/main/auth.js";
import { createMatterVaultAwsRuntimeClient } from "../src/main/aws-runtime.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const MATTER_ID = "matter_rp05_amic_current_003";
const WORKSPACE_ID = "workspace_desktop_e2e";

function capabilityResolver() {
  return async () => ({
    authoritative: true,
    provider_state: "ready",
    tenant_binding_state: "bound",
    user_binding_state: "bound",
    authority_ref: "vault-capability-readback:desktop-e2e",
    capabilities: {
      read: true,
      upload: true,
      download: true,
      attach: true,
      work: true,
      governance: false,
      audit: true,
    },
  });
}

test("AMIC OS main process streams a selected file through the real Vault API to exact readback", async () => {
  const repository = createDmsRepository({
    seedRecords: [{
      model_type: "DmsWorkspace",
      workspace_id: WORKSPACE_ID,
      tenant_id: TENANT,
      matter_id: MATTER_ID,
      name: "Desktop E2E workspace",
      status: "active",
      permission_envelope_id: "perm_desktop_e2e",
      audit_trace_id: "audit_desktop_e2e",
      owner_user_id: "user_amic_jwsuh",
    }],
  });
  const storage = createLocalStorageAdapter({ adapter_id: "desktop-e2e" });
  const dmsRuntime = createVaultDmsRuntimeContext({ repository, storage });
  const vaultUploadProvider = createTestAmicVaultUploadProvider({
    repository,
    storage,
    tenantId: TENANT,
  });
  const started = await startApiServer({
    port: 0,
    dmsRuntime,
    vaultCapabilityResolver: capabilityResolver(),
    vaultUploadProvider,
  });
  try {
    const baseUrl = `http://${started.host}:${started.port}`;
    const runtimeClient = createMatterVaultAwsRuntimeClient({
      baseUrl,
      fetchImpl: async (url, init) => {
        const target = new URL(url);
        if (target.hostname === "vault-upload.example.test") {
          const chunks = [];
          for await (const chunk of init.body) chunks.push(Buffer.from(chunk));
          await vaultUploadProvider.acceptStagedUpload({
            transferRef: decodeURIComponent(target.pathname.slice(1)),
            bytes: Buffer.concat(chunks),
          });
          return new Response(null, { status: 200 });
        }
        return fetch(url, init);
      },
    });
    const secureStore = memorySecureStore();
    const coordinator = new MainProcessAuthCoordinator({ runtimeClient, secureStore });
    const login = await coordinator.login({ email: "jwsuh@amic.kr" });
    assert.equal(login.ok, true);
    assert.equal(login.session.state, "signed_in");
    assert.equal(JSON.stringify(login).includes("lawos_session_v1"), false);
    assert.match(secureStore.snapshot().session_token, /^lawos_session_v1\./u);

    const preflight = await coordinator.precheckVaultUpload({
      matterId: MATTER_ID,
      workspaceId: WORKSPACE_ID,
      folderId: null,
    });
    assert.equal(preflight.http_status, 200);
    assert.equal(preflight.outcome, "preflight_passed");
    assert.match(preflight.operation_id, /^vaultop_[a-f0-9]{32}$/u);
    assert.equal(JSON.stringify(preflight).includes("session_token"), false);

    const bytes = Buffer.from("AMIC OS one-install Vault E2E\n");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const result = await coordinator.uploadVaultFile({
      openStream: () => Readable.from([bytes.subarray(0, 7), bytes.subarray(7)]),
      file: { name: "amic-vault-e2e.txt", mimeType: "text/plain", size: bytes.byteLength },
      operationId: preflight.operation_id,
    });
    assert.equal(result.http_status, 201);
    assert.equal(result.outcome, "readback_verified");
    assert.equal(result.item.sha256, sha256);
    assert.equal(result.item.byte_size, bytes.byteLength);
    assert.equal(result.item.exact_readback_verified, true);
    assert.equal(result.local_stream_sha256, sha256);
    assert.equal(JSON.stringify(result).includes("lawos_session_v1"), false);
    assert.equal(JSON.stringify(result).includes("content_base64"), false);
    assert.deepEqual(
      vaultUploadProvider.calls.map((call) => call.method),
      ["preflightUpload", "prepareStagedUpload", "completeStagedUpload", "readbackUpload"],
    );

    const document = repository.list({ tenant_id: TENANT, model_type: "DmsDocument" })[0];
    const version = repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" })[0];
    const fileObject = repository.list({ tenant_id: TENANT, model_type: "DmsFileObject" })[0];
    assert.equal(document.document_id, result.item.document_id);
    assert.equal(document.current_version_id, result.item.version_id);
    assert.equal(version.file_object_id, result.item.file_object_id);
    assert.equal(version.sha256, sha256);
    assert.equal(fileObject.sha256, sha256);
    assert.deepEqual(storage.digestObject({ tenant_id: TENANT, object_id: fileObject.vault_object_id }), {
      sha256,
      byte_size: bytes.byteLength,
    });
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
});
