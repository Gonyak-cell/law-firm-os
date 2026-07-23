#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { validatePrivateStagingInternalAuthContract } from "./lib/private-staging-internal-auth-contract.mjs";

const path = new URL("../infra/lawos-private-staging/internal-auth-contract.json", import.meta.url);
const contract = JSON.parse(readFileSync(path, "utf8"));
process.stdout.write(`${JSON.stringify({
  ...validatePrivateStagingInternalAuthContract(contract),
  external_mutation_executed: false,
  email_delivery_executed: false,
}, null, 2)}\n`);
