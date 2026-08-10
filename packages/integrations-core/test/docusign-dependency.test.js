import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

test("OUTM-33 pins the official MIT DocuSign SDK to integrations-core only", () => {
  const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, "packages/integrations-core/package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"));
  assert.equal(packageJson.dependencies?.["docusign-esign"], "10.0.0");
  assert.equal(lock.packages?.["packages/integrations-core"]?.dependencies?.["docusign-esign"], "10.0.0");
  assert.deepEqual(
    [lock.packages?.["node_modules/docusign-esign"]?.version, lock.packages?.["node_modules/docusign-esign"]?.license],
    ["10.0.0", "MIT"],
  );
  assert.equal(lock.packages?.["apps/addin"]?.dependencies?.["docusign-esign"], undefined);
});
