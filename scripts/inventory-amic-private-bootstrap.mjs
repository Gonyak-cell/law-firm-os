#!/usr/bin/env node
import {
  createAmicPrivateBootstrapLegalEntityMappingTemplate,
  inventoryAmicPrivateBootstrap,
  validateAmicPrivateBootstrapLegalEntityMapping,
} from "./lib/amic-private-bootstrap-inventory.mjs";

const SAFE_CODE = /^[A-Za-z0-9_.:-]{1,96}$/u;

function optional(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function safeFailureCode(error) {
  const explicit = error?.safe_error_code ?? error?.code;
  if (typeof explicit === "string" && SAFE_CODE.test(explicit)) return explicit;
  if (error?.message === "legal entity mapping approval_ref is required") {
    return "AMIC_PRIVATE_BOOTSTRAP_MAPPING_APPROVAL_REQUIRED";
  }
  if (String(error?.message ?? "").includes(
    "disposition must be assign or quarantine",
  )) {
    return "AMIC_PRIVATE_BOOTSTRAP_MAPPING_DISPOSITION_REQUIRED";
  }
  return "AMIC_PRIVATE_BOOTSTRAP_INPUT_INVALID";
}

try {
  const options = {
    root: optional("--root") ?? process.cwd(),
    registrationPath: optional("--registration-source") ?? undefined,
    rosterPath: optional("--roster-source") ?? undefined,
    contactPath: optional("--contact-source"),
    photoDirectory: optional("--photo-directory") ?? undefined,
  };
  const templateRequested = process.argv.includes("--mapping-template");
  const mappingPath = optional("--validate-mapping");
  if (templateRequested && mappingPath) {
    throw new TypeError(
      "--mapping-template and --validate-mapping are mutually exclusive",
    );
  }
  const receipt = templateRequested
    ? await createAmicPrivateBootstrapLegalEntityMappingTemplate(options)
    : mappingPath
      ? await validateAmicPrivateBootstrapLegalEntityMapping({
          ...options,
          mappingPath,
        })
      : await inventoryAmicPrivateBootstrap(options);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    verdict: "BLOCKED",
    operation: process.argv.includes("--validate-mapping")
      ? "mapping-validation"
      : process.argv.includes("--mapping-template")
        ? "mapping-template"
        : "inventory",
    failure_code: safeFailureCode(error),
    raw_identity_returned: false,
    raw_photo_returned: false,
    stack_returned: false,
    import_authorized: false,
    production_ready_claim: false,
  }, null, 2)}\n`);
  process.exitCode = 1;
}
