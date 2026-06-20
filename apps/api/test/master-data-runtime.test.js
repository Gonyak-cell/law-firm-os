import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMasterDataRepository } from "../../../packages/master-data/src/repository.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_rp04_synthetic";
const BASE_QUERY = `tenant_id=${TENANT}&actor_user_id=user_rp04_owner&permission_ref=perm_ref_rp04_read&audit_hint_ref=audit_hint_rp04_read`;

function allowContext() {
  return JSON.stringify({
    principal: { user_id: "user_rp04_owner", tenant_id: TENANT, role_ids: ["master_data_reader"] },
    rules: [{ id: "rule_allow_read", effect: "allow", action: "*" }],
    object_acl: [],
  });
}

async function withServer(masterDataStorePath, callback) {
  const started = await startApiServer({ port: 0, masterDataStorePath });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

async function getJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { [PERMISSION_CONTEXT_HEADER]: allowContext() },
  });
  return { status: response.status, body: await response.json() };
}

test("Master Data API reads repository state after durable runtime restart", async () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "master-data-api-runtime-")), "store.json");

  await withServer(storePath, async (baseUrl) => {
    const first = await getJson(baseUrl, `/master-data/records?${BASE_QUERY}&model_type=Entity`);
    assert.equal(first.status, 200);
    assert.ok(first.body.items.some((item) => item.entity_id === "entity_rp04_org_amic"));
  });

  const repository = createMasterDataRepository({ filePath: storePath });
  repository.update(
    { tenant_id: TENANT, model_type: "Entity", id: "entity_rp04_org_amic" },
    { display_name: "AMIC Runtime Client" },
  );
  repository.close();

  await withServer(storePath, async (baseUrl) => {
    const reopened = await getJson(baseUrl, `/master-data/records?${BASE_QUERY}&model_type=Entity`);
    assert.equal(reopened.status, 200);
    const entity = reopened.body.items.find((item) => item.entity_id === "entity_rp04_org_amic");
    assert.equal(entity.display_name, "AMIC Runtime Client");
  });
});
