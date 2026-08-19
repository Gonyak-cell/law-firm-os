import path from "node:path";
import { ALLOWED_FUNCTIONS, EXPECTED_CLOUDFORMATION_STACKS, requiredString } from "./outlook-production-aws-inventory-contract.mjs";

const SPECS = new Map([
  ["--profile", "value"], ["--region", "value"], ["--evidence", "value"], ["--rollback-dir", "value"],
  ["--api-functions", "list"], ["--admin-functions", "list"], ["--functions", "list"], ["--cloudformation-stacks", "list"],
  ["--http-api-id", "value"], ["--cloudfront-distribution-id", "value"], ["--eventbridge-rule-name", "value"], ["--rds-identifiers", "list"],
  ["--lookback-minutes", "value"], ["--max-log-events", "value"], ["--read-only", "flag"],
]);

export function parseCliArguments(argv = process.argv.slice(2)) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const arity = SPECS.get(flag);
    if (!arity) throw new Error(`unsupported option or positional argument ${flag}`);
    if (Object.prototype.hasOwnProperty.call(parsed, flag)) throw new Error(`duplicate option ${flag}`);
    if (arity === "flag") { parsed[flag] = true; continue; }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    parsed[flag] = arity === "list" ? parseList(value, flag) : requiredString(value, flag);
    if (arity === "list" && new Set(parsed[flag]).size !== parsed[flag].length) throw new Error(`${flag} list may not contain duplicates`);
    index += 1;
  }
  for (const flag of ["--profile", "--region", "--rollback-dir", "--http-api-id", "--cloudfront-distribution-id", "--eventbridge-rule-name", "--evidence"]) if (!parsed[flag]) throw new Error(`${flag} is required`);
  if (!parsed["--read-only"]) throw new Error("--read-only is required");
  if (parsed["--cloudformation-stacks"] && (parsed["--cloudformation-stacks"].length !== EXPECTED_CLOUDFORMATION_STACKS.length || parsed["--cloudformation-stacks"].join("\n") !== [...EXPECTED_CLOUDFORMATION_STACKS].join("\n"))) throw new Error("--cloudformation-stacks must be exactly lawos-production");
  if (!path.isAbsolute(parsed["--rollback-dir"])) throw new Error("--rollback-dir must be absolute");
  if (parsed["--evidence"] && !path.isAbsolute(parsed["--evidence"])) throw new Error("--evidence must be absolute");
  if (path.basename(parsed["--evidence"]) !== "inventory.json") throw new Error("--evidence basename must be inventory.json");
  if (parsed["--functions"] && (parsed["--api-functions"] || parsed["--admin-functions"])) throw new Error("--functions may not be mixed with --api-functions or --admin-functions");
  const functionFlags = [parsed["--functions"], parsed["--api-functions"], parsed["--admin-functions"]].filter(Boolean);
  const functions = functionFlags.length ? functionFlags.flat() : [...ALLOWED_FUNCTIONS];
  if (new Set(functions).size !== functions.length || functions.some((name) => !ALLOWED_FUNCTIONS.includes(name))) throw new Error("functions must contain only the exact approved allowlist without duplicates");
  return {
    profile: parsed["--profile"],
    region: parsed["--region"],
    evidence: parsed["--evidence"] ?? null,
    rollbackDir: parsed["--rollback-dir"],
    functions,
    cloudformationStacks: parsed["--cloudformation-stacks"] ?? ["lawos-production"],
    httpApiId: parsed["--http-api-id"],
    cloudfrontDistributionId: parsed["--cloudfront-distribution-id"],
    eventbridgeRuleName: parsed["--eventbridge-rule-name"],
    rdsIdentifiers: parsed["--rds-identifiers"] ?? [],
    lookbackMinutes: Number(parsed["--lookback-minutes"] ?? 60),
    maxLogEvents: Number(parsed["--max-log-events"] ?? 50),
    readOnly: true,
  };
}

function parseList(value, flag) {
  const parts = value.split(",").map((part) => part.trim());
  if (!parts.length || parts.some((part) => !part || part.startsWith("--"))) throw new Error(`${flag} list may not be empty`);
  return parts;
}
