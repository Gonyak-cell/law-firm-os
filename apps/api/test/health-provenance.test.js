import assert from "node:assert/strict";
import test from "node:test";

import { createApiServer, deploymentSourceRevision } from "../src/server.js";

const SOURCE_SHA = "a".repeat(40);

test("RFD-TUW-015 health exposes only a validated deployment source revision", async () => {
  const previous = process.env.LAWOS_DEPLOYMENT_COMMIT;
  const server = createApiServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    process.env.LAWOS_DEPLOYMENT_COMMIT = SOURCE_SHA;
    const valid = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
    assert.equal(valid.source_revision, SOURCE_SHA);

    delete process.env.LAWOS_DEPLOYMENT_COMMIT;
    const missing = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
    assert.equal(Object.hasOwn(missing, "source_revision"), false);

    const malformedValue = `not-a-revision-${"secret".repeat(12)}`;
    process.env.LAWOS_DEPLOYMENT_COMMIT = malformedValue;
    const malformedResponse = await fetch(`${baseUrl}/api/health`);
    const malformedText = await malformedResponse.text();
    const malformed = JSON.parse(malformedText);
    assert.equal(malformedResponse.status, 200);
    assert.equal(malformed.status, "ok");
    assert.equal(Object.hasOwn(malformed, "source_revision"), false);
    assert.equal(malformedText.includes(malformedValue), false);

    assert.equal(deploymentSourceRevision({ LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA }), SOURCE_SHA);
    for (const value of [undefined, "", ` ${SOURCE_SHA}`, SOURCE_SHA.toUpperCase(), `${SOURCE_SHA}0`]) {
      assert.equal(deploymentSourceRevision({ LAWOS_DEPLOYMENT_COMMIT: value }), undefined);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.LAWOS_DEPLOYMENT_COMMIT;
    else process.env.LAWOS_DEPLOYMENT_COMMIT = previous;
  }
});
