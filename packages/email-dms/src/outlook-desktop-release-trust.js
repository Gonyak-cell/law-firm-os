import { verifyProductionTrustedRegistry } from "../../runtime-auth/src/external-release-trust.js";
import {
  inspectOutlookDesktopReleaseArtifactSnapshot,
} from "./outlook-desktop-release-artifact-snapshot.js";
import { assertApprovedOutlookDesktopReleaseArtifact } from "./outlook-desktop-release-artifact-authority.js";
import {
  OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
  parseOutlookDesktopReleaseTicket,
  snapshotOutlookDesktopBytes,
  verifyOutlookDesktopReleaseTicket,
} from "./outlook-desktop-release-ticket-verifier.js";

export {
  OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
  OUTLOOK_DESKTOP_RELEASE_TICKET_SCHEMA,
} from "./outlook-desktop-release-ticket-verifier.js";

const INPUT_KEYS = Object.freeze([
  "app_id", "arch", "artifact_snapshot", "build_manifest_sha256", "channel",
  "entra_tenant_id", "platform", "signature_bytes", "source_sha", "source_tree",
  "tenant_id", "ticket_bytes", "version",
]);
const REQUIRED_INPUT_KEYS = Object.freeze(INPUT_KEYS.filter((key) => key !== "artifact_snapshot"));
const TICKET_BINDINGS = Object.freeze([
  ["tenant_id", "lawos_tenant_id"], ["entra_tenant_id", "entra_tenant_id"],
  ["platform", "platform"], ["channel", "channel"], ["version", "version"],
  ["app_id", "app_id"], ["arch", "arch"], ["source_sha", "source_sha"],
  ["source_tree", "source_tree"], ["build_manifest_sha256", "build_manifest_sha256"],
]);

export class OutlookDesktopReleaseTrustError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OutlookDesktopReleaseTrustError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new OutlookDesktopReleaseTrustError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactInput(input) {
  if (!isRecord(input)) fail("RELEASE_TICKET_INPUT_INVALID", "release trust input must be an object");
  const actual = Object.keys(input);
  const extras = actual.filter((key) => !INPUT_KEYS.includes(key));
  if (extras.length) fail("RELEASE_TRUST_CLIENT_ASSERTION_FORBIDDEN", "caller-supplied trust paths, keys, and digests are forbidden", { extras });
  const missing = REQUIRED_INPUT_KEYS.filter((key) => !actual.includes(key));
  if (missing.length) fail("RELEASE_TICKET_INPUT_INVALID", "release trust input is incomplete", { missing });
  const ticketBytes = snapshotOutlookDesktopBytes(input.ticket_bytes, {
    code: "RELEASE_TICKET_TOO_LARGE",
    fail,
    maxBytes: OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
    message: `release ticket must contain 1-${OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES} bytes`,
  });
  const signatureBytes = snapshotOutlookDesktopBytes(input.signature_bytes, {
    code: "RELEASE_TICKET_SIGNATURE_FORMAT",
    fail,
    maxBytes: 64,
    message: "release ticket signature must contain exactly 64 raw Ed25519 bytes",
    minBytes: 64,
  });
  return { signatureBytes, ticketBytes };
}

export function createOutlookDesktopReleaseTrustService(options = {}) {
  if (!isRecord(options) || Object.keys(options).some((key) => !["database", "testOnlyNow", "testOnlyVerifiedRegistry"].includes(key))) {
    fail("RELEASE_TRUST_CONFIGURATION_INVALID", "release trust service configuration is invalid");
  }
  if (!options.database || typeof options.database.query !== "function") fail("RELEASE_TRUST_CONFIGURATION_INVALID", "release trust service requires a database query boundary");
  const hasTestOverride = options.testOnlyVerifiedRegistry !== undefined || options.testOnlyNow !== undefined;
  if (hasTestOverride && process.env.NODE_ENV !== "test") fail("RELEASE_TRUST_TEST_ROOT_FORBIDDEN", "synthetic trust registry and clock are test-only");
  return Object.freeze({
    async resolveApprovedArtifact(input) {
      const now = options.testOnlyNow ?? Date.now();
      if (!Number.isFinite(now) || now < 0) fail("RELEASE_TRUST_CLOCK_INVALID", "release trust clock is invalid");
      const { signatureBytes, ticketBytes } = assertExactInput(input);
      const parsed = parseOutlookDesktopReleaseTicket({
        fail,
        now,
        ticketBytes,
      });
      for (const [inputField, ticketField] of TICKET_BINDINGS) {
        if (input[inputField] !== parsed.ticket[ticketField]) fail("RELEASE_TICKET_BINDING_MISMATCH", `release ticket ${ticketField} does not match the packaged identity`);
      }
      if (parsed.ticket.platform === "win32") fail("WINDOWS_AUTHENTICODE_REQUIRED", "Windows release trust remains blocked until server-approved Authenticode evidence is available");
      const measurement = inspectOutlookDesktopReleaseArtifactSnapshot(input.artifact_snapshot);
      if (measurement.sha256 !== parsed.ticket.inner_artifact_sha256
          || measurement.size !== parsed.ticket.inner_artifact_bytes) {
        fail("RELEASE_ARTIFACT_MEASUREMENT_MISMATCH", "measured artifact bytes do not match the signed release ticket");
      }
      const registryTrust = options.testOnlyVerifiedRegistry ?? verifyProductionTrustedRegistry();
      const verified = verifyOutlookDesktopReleaseTicket({
        fail,
        now,
        registryTrust,
        signatureBytes,
        ticketBytes,
      });
      const result = await options.database.query(
        `SELECT artifact.*,
                approval_audit.event_id AS approval_audit_event_id,
                approval_audit.event_type AS approval_audit_event_type,
                approval_audit.tenant_id AS approval_audit_tenant_id,
                approval_audit.release_artifact_id AS approval_audit_release_artifact_id,
                approval_audit.release_ticket_sha256 AS approval_audit_release_ticket_sha256,
                approval_audit.final_artifact_sha256 AS approval_audit_final_artifact_sha256,
                approval_audit.approval_sha256 AS approval_audit_approval_sha256,
                approval_audit.event_binding_sha256 AS approval_audit_event_binding_sha256,
                approval_audit.occurred_at AS approval_audit_occurred_at
           FROM lawos_email_dms.outlook_desktop_release_artifacts AS artifact
           LEFT JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS approval_audit
             ON approval_audit.tenant_id = artifact.tenant_id
            AND approval_audit.release_artifact_id = artifact.release_artifact_id
            AND approval_audit.event_type = 'approved'
          WHERE artifact.tenant_id = $1
            AND artifact.embedded_release_ticket_sha256 = $2
          LIMIT 2`,
        [verified.ticket.lawos_tenant_id, verified.ticketSha256],
      );
      if (result.rows.length === 0) fail("RELEASE_NOT_APPROVED", "signed release ticket has no server-approved artifact");
      if (result.rows.length !== 1) fail("RELEASE_ARTIFACT_AMBIGUOUS", "signed release ticket resolves more than one approved artifact");
      const row = result.rows[0];
      assertApprovedOutlookDesktopReleaseArtifact({ fail, now, registryTrust, row, verified });
      return Object.freeze({
        valid: true,
        tenant_id: row.tenant_id,
        release_artifact_id: row.release_artifact_id,
        release_ticket_id: row.release_ticket_id,
        release_ticket_sha256: verified.ticketSha256,
        release_ticket_signature_sha256: verified.signatureSha256,
        platform: row.platform,
        channel: row.channel,
        app_version: row.app_version,
        app_id: row.app_id,
        arch: row.arch,
        source_sha: row.source_sha,
        source_tree: row.source_tree,
        embedded_build_manifest_sha256: row.embedded_build_manifest_sha256,
        measured_inner_artifact_sha256: measurement.sha256,
        measured_inner_artifact_bytes: measurement.size,
        registered_final_artifact_sha256: row.final_artifact_sha256,
        registered_final_artifact_bytes: Number(row.final_artifact_bytes),
        approval_sha256: row.approval_sha256,
        approval_audit_event_id: row.approval_audit_event_id,
        approval_audit_event_binding_sha256: row.approval_audit_event_binding_sha256,
        macos_technical_evidence_sha256: row.macos_technical_evidence_sha256,
        trust_registry_sha256: row.trust_registry_sha256,
        trust_registry_serial: Number(row.trust_registry_serial),
        valid_until: new Date(row.valid_until).toISOString(),
      });
    },
  });
}
