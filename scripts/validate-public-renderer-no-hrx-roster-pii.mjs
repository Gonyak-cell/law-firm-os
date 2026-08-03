#!/usr/bin/env node
import path from "node:path";
import { parseArgs } from "node:util";
import {
  DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES,
  DesktopPrivateDataBoundaryError,
  buildDesktopPrivateDataCorpus,
} from "./lib/matter-desktop-private-data-corpus.mjs";
import {
  desktopPrivateDataBoundaryErrorResult,
  scanDesktopPrivateDataBoundary,
} from "./lib/matter-desktop-private-data-boundary.mjs";

const ROOT = process.cwd();
const EXPECTED_RENDERER_ROOTS = Object.freeze([
  path.join(ROOT, "apps/web/dist"),
  path.join(ROOT, "apps/desktop/src/renderer/web"),
]);
let protectedCorpus = null;

function configuredPath(value, environmentValue, fallback = null) {
  const configured = String(value ?? environmentValue ?? fallback ?? "").trim();
  return configured ? path.resolve(ROOT, configured) : null;
}

function configuredFlag(environmentValue) {
  const configured = String(environmentValue ?? "").trim().toLowerCase();
  if (!configured || configured === "0" || configured === "false") return false;
  if (configured === "1" || configured === "true") return true;
  throw new DesktopPrivateDataBoundaryError("invalid_contact_source_not_applicable_flag", ".");
}

function publicRendererResult(result) {
  const contactAuthorityMissing = protectedCorpus?.contact_corpus_status === "not_applicable";
  const findings = contactAuthorityMissing
    ? [...result.findings, { kind: "contact_source_not_applicable", path: ".", count: 1 }]
    : result.findings;
  const omittedDirectories = result.findings
    .filter(({ kind }) => ["empty_scan_root", "missing_scan_root"].includes(kind))
    .reduce((count, finding) => count + finding.count, 0);
  return {
    verdict: result.verdict === "PASS" && !contactAuthorityMissing ? "PASS" : "FAIL",
    renderer_root_count: result.root_count,
    expected_renderer_root_count: EXPECTED_RENDERER_ROOTS.length,
    scanned_files: result.scanned_file_count,
    finding_count: result.finding_count + (contactAuthorityMissing ? 1 : 0),
    scanner_finding_count: result.finding_count,
    omitted_directories: omittedDirectories,
    protected_value_count: protectedCorpus?.protected_value_count ?? 0,
    protected_photo_count: protectedCorpus?.protected_photo_count ?? 0,
    contact_corpus_status: protectedCorpus?.contact_corpus_status ?? "unavailable",
    contact_protected_value_count: protectedCorpus?.contact_protected_value_count ?? 0,
    contact_authority_reason_recorded: contactAuthorityMissing,
    release_claim_eligible: result.verdict === "PASS" && !contactAuthorityMissing,
    scanner_corpus_shared: protectedCorpus !== null,
    protected_values_printed: false,
    findings,
  };
}

async function main(argv) {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      "roster-source": { type: "string" },
      "contact-source": { type: "string" },
      "contact-source-not-applicable": { type: "boolean" },
      "contact-source-not-applicable-reason": { type: "string" },
      "registration-seed-source": { type: "string" },
      "photo-source": { type: "string" },
    },
  });
  const contactSourcePath = configuredPath(
    values["contact-source"],
    process.env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH,
  );
  const contactSourceNotApplicable = values["contact-source-not-applicable"] === true
    || configuredFlag(process.env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_NOT_APPLICABLE);
  const contactAuthorityReason = String(
    values["contact-source-not-applicable-reason"]
      ?? process.env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_NOT_APPLICABLE_REASON
      ?? "",
  ).trim();
  if (contactSourceNotApplicable && !contactAuthorityReason) {
    throw new DesktopPrivateDataBoundaryError("missing_contact_source_not_applicable_reason", ".");
  }
  if (!contactSourceNotApplicable && contactAuthorityReason) {
    throw new DesktopPrivateDataBoundaryError("unexpected_contact_source_not_applicable_reason", ".");
  }
  protectedCorpus = await buildDesktopPrivateDataCorpus({
    rosterSourcePath: configuredPath(
      values["roster-source"],
      process.env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH,
      DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster,
    ),
    contactSourcePath,
    contactSourceNotApplicable,
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
  const result = await scanDesktopPrivateDataBoundary({
    roots: EXPECTED_RENDERER_ROOTS,
    corpus: protectedCorpus,
    displayBase: ROOT,
  });
  const publicResult = publicRendererResult(result);
  console.log(JSON.stringify(publicResult, null, 2));
  if (publicResult.verdict !== "PASS") process.exitCode = 1;
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  const result = desktopPrivateDataBoundaryErrorResult(error, {
    displayBase: ROOT,
    corpus: protectedCorpus,
  });
  console.error(JSON.stringify(publicRendererResult(result), null, 2));
  process.exitCode = 2;
}
