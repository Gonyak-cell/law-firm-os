#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { validatePrivateStagingEntraContract } from "./lib/private-staging-entra-contract.mjs";

const path = new URL("../infra/lawos-private-staging/entra-pilot-contract.json", import.meta.url);
const contract = JSON.parse(readFileSync(path, "utf8"));
process.stdout.write(`${JSON.stringify({
  ...validatePrivateStagingEntraContract(contract),
  entra_mutation_executed: false,
  token_material_recorded: false,
}, null, 2)}\n`);
