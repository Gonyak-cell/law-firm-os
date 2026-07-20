#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canonicalSha256,
  validateArtifactStoreTemplate,
  validatePrivateStagingCost,
  validatePrivateStagingTemplate,
} from "./lib/private-staging-contract.mjs";

const root = process.cwd();
const templatePath = resolve(root, "infra/lawos-private-staging/template.json");
const artifactTemplatePath = resolve(root, "infra/lawos-private-staging/artifact-store-template.json");
const costPath = resolve(root, "infra/lawos-private-staging/cost-estimate.json");
const template = JSON.parse(readFileSync(templatePath, "utf8"));
const artifactTemplate = JSON.parse(readFileSync(artifactTemplatePath, "utf8"));
const cost = JSON.parse(readFileSync(costPath, "utf8"));

const infrastructure = validatePrivateStagingTemplate(template);
const artifactStore = validateArtifactStoreTemplate(artifactTemplate);
const costGate = validatePrivateStagingCost(cost);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS_WITH_OWNER_DELTA_REQUIRED",
  infrastructure,
  artifact_store: artifactStore,
  cost_gate: costGate,
  template_sha256: canonicalSha256(template),
  artifact_template_sha256: canonicalSha256(artifactTemplate),
  cost_model_sha256: canonicalSha256(cost),
  aws_resource_creation_authorized_by_this_validation: false,
}, null, 2)}\n`);
