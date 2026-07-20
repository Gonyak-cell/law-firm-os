#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { validatePrivateStagingArtifactEntries } from "./lib/private-staging-artifact.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function outsideRegularFile(candidate, name) {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must be an existing non-symlink file`);
  const path = realpathSync(input);
  if (!statSync(path).isFile() || !relative(realpathSync(process.cwd()), path).startsWith("..")) throw new Error(`${name} must remain outside the repository`);
  return path;
}

const artifactPath = outsideRegularFile(option("--artifact"), "artifact archive");
const manifestPath = outsideRegularFile(option("--manifest"), "artifact manifest");
const expectedSourceSha = option("--source-sha");
const expectedSourceTree = option("--source-tree");
const expectedArtifactSha256 = option("--artifact-sha256");
const manifest = JSON.parse(readFileSync(manifestPath));
const archiveBytes = readFileSync(artifactPath);
if (manifest.source_sha !== expectedSourceSha || manifest.source_tree !== expectedSourceTree || manifest.artifact_sha256 !== expectedArtifactSha256 || sha256(archiveBytes) !== expectedArtifactSha256) throw new Error("artifact exact-head digest binding failed");
const entries = execFileSync("unzip", ["-Z1", artifactPath], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
  .trim().split("\n").filter((entry) => entry && !entry.endsWith("/")).sort();
const validated = validatePrivateStagingArtifactEntries(entries);
if (sha256(Buffer.from(`${entries.join("\n")}\n`)) !== manifest.artifact_entries_sha256) throw new Error("artifact entry manifest digest drifted");
const deployment = JSON.parse(execFileSync("unzip", ["-p", artifactPath, "deployment-manifest.json"], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }));
if (deployment.source_sha !== expectedSourceSha || deployment.source_tree !== expectedSourceTree || deployment.dependency_lock_sha256 !== sha256(readFileSync("package-lock.json"))) throw new Error("embedded deployment manifest source or dependency binding drifted");
if (deployment.rds_ca_bundle?.sha256 !== sha256(execFileSync("unzip", ["-p", artifactPath, "certs/global-bundle.pem"], { encoding: null, maxBuffer: 4 * 1024 * 1024 }))) throw new Error("embedded RDS CA bundle digest drifted");
process.stdout.write(`${JSON.stringify({ verdict: "PASS", source_sha: expectedSourceSha, source_tree: expectedSourceTree, artifact_sha256: expectedArtifactSha256, artifact_entry_count: validated.entry_count, external_contact: "not_performed" })}\n`);
