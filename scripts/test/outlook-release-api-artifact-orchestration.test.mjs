import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  buildApiArtifactProvenance,
} from "../verify-outlook-api-release-artifact.mjs";

test("API provenance orchestration runs the exact builder twice and ignores builder-claimed paths", async () => {
  const sourceSha = "a".repeat(40);
  const sourceTree = "b".repeat(40);
  const verifierRoot = "/private/tmp/amic-os-outlook-api-provenance-fixture";
  const caCopyPath = path.join(verifierRoot, "rds-ca-bundle.pem");
  const calls = [];
  const reads = [];
  const runCommand = (command, args) => {
    calls.push({ command, args });
    return JSON.stringify({ artifact_path: "/attacker/artifact.zip", manifest_path: "/attacker/manifest.json" });
  };
  const readOutput = async (file) => {
    reads.push(file);
    return file.endsWith(".zip") ? Buffer.from("producer bytes") : Buffer.from("{}");
  };

  const builds = await buildApiArtifactProvenance({
    sourceSha, sourceTree, verifierRoot, caCopyPath, runCommand, readOutput,
  });

  assert.equal(builds.length, 2);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ command }) => command === process.execPath));
  assert.ok(calls.every(({ args }) => args[0].endsWith("/scripts/build-json-postgres-production-artifact.mjs")));
  assert.deepEqual(calls.map(({ args }) => args.slice(1)), [1, 2].map((number) => [
    "--source-sha", sourceSha,
    "--source-tree", sourceTree,
    "--output-dir", path.join(verifierRoot, `producer-${number}`),
    "--rds-ca-bundle", caCopyPath,
  ]));
  assert.deepEqual(reads, [1, 2].flatMap((number) => {
    const prefix = path.join(verifierRoot, `producer-${number}`, `lawos-production-${sourceSha}`);
    return [`${prefix}.zip`, `${prefix}.manifest.json`];
  }));
  assert.ok(reads.every((file) => !file.startsWith("/attacker/")));
});
