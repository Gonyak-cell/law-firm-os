#!/usr/bin/env node
import path from "node:path";
import { parseArgs } from "node:util";
import {
  DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES,
  DesktopPrivateDataBoundaryError,
  buildDesktopPrivateDataCorpus,
  desktopPrivateDataBoundaryErrorResult,
  scanDesktopPrivateDataBoundary,
} from "./lib/matter-desktop-private-data-boundary.mjs";

const ROOT = process.cwd();
let protectedCorpus = null;

function configuredPath(value, environmentValue, fallback = null) {
  const configured = String(value ?? environmentValue ?? fallback ?? "").trim();
  return configured ? path.resolve(ROOT, configured) : null;
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      root: { type: "string", multiple: true },
      "roster-source": { type: "string" },
      "contact-source": { type: "string" },
      "contact-source-not-applicable": { type: "boolean" },
      "registration-seed-source": { type: "string" },
      "photo-source": { type: "string" },
    },
  });
  const roots = [...(values.root ?? []), ...positionals].map((root) => path.resolve(ROOT, root));
  if (roots.length === 0) throw new DesktopPrivateDataBoundaryError("missing_scan_root_argument", ".");
  protectedCorpus = await buildDesktopPrivateDataCorpus({
    rosterSourcePath: configuredPath(
      values["roster-source"],
      process.env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH,
      DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster,
    ),
    contactSourcePath: configuredPath(
      values["contact-source"],
      process.env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH,
    ),
    contactSourceNotApplicable: values["contact-source-not-applicable"] === true,
    registrationSeedSourcePath: configuredPath(
      values["registration-seed-source"],
      process.env.LAWOS_MATTER_VAULT_USER_REGISTRATION_SEED_PATH,
      DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.registrationSeed,
    ),
    photoSourcePath: configuredPath(
      values["photo-source"],
      process.env.LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH,
      DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.photos,
    ),
  });
  const result = await scanDesktopPrivateDataBoundary({ roots, corpus: protectedCorpus, displayBase: ROOT });
  console.log(JSON.stringify(result, null, 2));
  if (result.verdict !== "PASS") process.exitCode = 1;
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(JSON.stringify(desktopPrivateDataBoundaryErrorResult(error, {
    displayBase: ROOT,
    corpus: protectedCorpus,
  }), null, 2));
  process.exitCode = 2;
}
