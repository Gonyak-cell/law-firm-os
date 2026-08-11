import {
  evaluateOutlookDesktopEntitlement,
} from "./outlook-desktop-entitlement.js";

export const MATTER_OUTLOOK_PRODUCT_ID =
  "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
export const OUTLOOK_READINESS_SCHEMA_VERSION =
  "lawos.outlook-readiness.v1";

const ASSIGNMENT_STATES = new Set([
  "assigned",
  "not_assigned",
  "unknown",
  "stale",
]);
const DEPLOYMENT_STATES = new Set([
  "targeted",
  "not_targeted",
  "unknown",
  "stale",
]);
const PROPAGATION_STATES = new Set([
  "observed",
  "not_observed",
  "unknown",
]);
const INSTALLATION_STATES = new Set(["active", "expired", "retired"]);
const CONNECTION_STATES = new Set([
  "connected",
  "not_connected",
  "expired",
  "scope_insufficient",
  "reauthorization_required",
  "revoked",
]);
const SOURCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/u;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function instant(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

function safeSource(value) {
  return typeof value === "string" && SOURCE_PATTERN.test(value)
    ? value
    : null;
}

function freeze(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freeze));
  }
  if (isObject(value)) {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, freeze(item)]),
    ));
  }
  return value;
}

function externalAxis(value, states) {
  if (!isObject(value) || !states.has(value.state)) {
    return freeze({
      state: "unknown",
      source: null,
      observed_at: null,
      authoritative: false,
    });
  }
  if (value.state === "unknown") {
    return freeze({
      state: "unknown",
      source: null,
      observed_at: null,
      authoritative: false,
    });
  }
  const source = safeSource(value.source);
  const observedAt = instant(value.observed_at);
  if (!source || !observedAt) {
    return freeze({
      state: "unknown",
      source: null,
      observed_at: null,
      authoritative: false,
    });
  }
  return freeze({
    state: value.state,
    source,
    observed_at: observedAt,
    authoritative: true,
  });
}

function centralDeployment(value) {
  const axis = externalAxis(value, DEPLOYMENT_STATES);
  const manifestVersion = typeof value?.manifest_version === "string"
    && VERSION_PATTERN.test(value.manifest_version)
    ? value.manifest_version
    : null;
  const productMatches = value?.product_id === MATTER_OUTLOOK_PRODUCT_ID;
  const evidenceRequired = axis.state !== "unknown";
  if (
    evidenceRequired
    && (
      !productMatches
      || (
        ["targeted", "stale"].includes(axis.state)
        && !manifestVersion
      )
    )
  ) {
    return freeze({
      state: "unknown",
      product_id: MATTER_OUTLOOK_PRODUCT_ID,
      manifest_version: null,
      source: null,
      observed_at: null,
      authoritative: false,
    });
  }
  return freeze({
    ...axis,
    product_id: MATTER_OUTLOOK_PRODUCT_ID,
    manifest_version: productMatches ? manifestVersion : null,
  });
}

function identityBinding(principal, installationBinding) {
  const complete = [
    principal?.tenant_id,
    principal?.user_id,
    principal?.entra_subject_id,
  ].every((value) => typeof value === "string" && value.trim().length > 0);
  return freeze({
    state: complete
      ? installationBinding === "mismatch" ? "mismatch" : "verified"
      : "missing",
    source: "lawos_signed_session",
  });
}

function installationProjection(value, snapshotAt) {
  if (value === undefined) {
    return { projection: freeze({
      state: null,
      state_version: null,
      lease_expires_at: null,
      retired_at: null,
      source: null,
    }), conflict: false };
  }
  if (value === null) {
    return { projection: freeze({
      state: "missing",
      state_version: null,
      lease_expires_at: null,
      retired_at: null,
      source: "lawos_outlook_desktop_installations",
    }), conflict: false };
  }
  const leaseExpiresAt = instant(value.lease_expires_at);
  const retiredAt = value.retired_at === null ? null : instant(value.retired_at);
  const stateVersion = Number.isSafeInteger(value.state_version)
    && value.state_version > 0
    ? value.state_version
    : null;
  const status = INSTALLATION_STATES.has(value.status) ? value.status : null;
  const snapshotMs = Date.parse(snapshotAt);
  const leaseMs = leaseExpiresAt ? Date.parse(leaseExpiresAt) : Number.NaN;
  const contradictory = !status
    || !stateVersion
    || !leaseExpiresAt
    || (status === "active" && leaseMs <= snapshotMs)
    || (status === "expired" && leaseMs > snapshotMs)
    || (status === "retired" && !retiredAt)
    || (status !== "retired" && retiredAt !== null);
  return contradictory
    ? { projection: freeze({
        state: null,
        state_version: null,
        lease_expires_at: null,
        retired_at: null,
        source: null,
      }), conflict: true }
    : { projection: freeze({
        state: status,
        state_version: stateVersion,
        lease_expires_at: leaseExpiresAt,
        retired_at: retiredAt,
        source: "lawos_outlook_desktop_installations",
      }), conflict: false };
}

function connectionProjection(value, snapshotAt) {
  if (value === undefined) {
    return freeze({
      state: null,
      state_version: null,
      expires_at: null,
      credential_cleanup_pending: false,
      token_refresh_pending: false,
      source: null,
      observed_at: null,
    });
  }
  const status = CONNECTION_STATES.has(value?.status) ? value.status : null;
  if (!status) {
    return freeze({
      state: null,
      state_version: null,
      expires_at: null,
      credential_cleanup_pending: false,
      token_refresh_pending: false,
      source: null,
      observed_at: null,
    });
  }
  const stateVersion = Number.isSafeInteger(value.state_version)
    && value.state_version > 0
    ? value.state_version
    : null;
  const expiresAt = value.expires_at === null
    ? null
    : instant(value.expires_at);
  // A connected delegated grant is authoritative only when its durable
  // version and expiry timestamp are present. The connection service may
  // intentionally project an expired credential as connected while a token
  // refresh is pending, so timestamp freshness remains its responsibility.
  // A missing connection remains an authoritative absence, represented by
  // the existing null version/null expiry shape from the connection service.
  const incomplete = status !== "not_connected"
    && (
      !stateVersion
      || !expiresAt
    );
  if (incomplete) {
    return freeze({
      state: null,
      state_version: null,
      expires_at: null,
      credential_cleanup_pending: false,
      token_refresh_pending: false,
      source: null,
      observed_at: null,
    });
  }
  return freeze({
    state: status,
    state_version: stateVersion,
    expires_at: expiresAt,
    credential_cleanup_pending: value.credential_cleanup_pending === true,
    token_refresh_pending: value.token_refresh_pending === true,
    source: "lawos_m365_connection_state",
    observed_at: snapshotAt,
  });
}

function evidenceConflict({ assignment, deployment, propagation }) {
  return (
    propagation.state === "observed"
    && deployment.state === "not_targeted"
  ) || (
    deployment.state === "targeted"
    && assignment.state === "not_assigned"
  );
}

function errorCodes({
  entitlement,
  identity,
  assignment,
  deployment,
  propagation,
  installation,
  connection,
  conflict,
}) {
  const codes = [];
  if (entitlement.safe_error_code) codes.push(entitlement.safe_error_code);
  if (identity.state === "missing") {
    codes.push("OUTLOOK_READINESS_IDENTITY_MISSING");
  } else if (identity.state === "mismatch") {
    codes.push("OUTLOOK_READINESS_IDENTITY_MISMATCH");
  }
  const axisCode = (prefix, state, readyState) => {
    if (state !== readyState) {
      codes.push(`OUTLOOK_READINESS_${prefix}_${String(state ?? "UNKNOWN").toUpperCase()}`);
    }
  };
  axisCode("ASSIGNMENT", assignment.state, "assigned");
  axisCode("DEPLOYMENT", deployment.state, "targeted");
  axisCode("PROPAGATION", propagation.state, "observed");
  axisCode("INSTALLATION", installation.state, "active");
  axisCode("CONNECTION", connection.state, "connected");
  if (connection.state !== null && connection.state !== "connected") {
    codes.push("M365_INTERACTION_REQUIRED");
  }
  if (conflict) codes.push("OUTLOOK_READINESS_EVIDENCE_CONFLICT");
  return Object.freeze([...new Set(codes)]);
}

function nextAction({
  entitlement,
  identity,
  assignment,
  deployment,
  propagation,
  installation,
  connection,
  conflict,
}) {
  if (identity.state !== "verified") return "sign_in";
  if (conflict || entitlement.state !== "approved") return "contact_admin";
  if (assignment.state !== "assigned") return "contact_admin";
  if (deployment.state !== "targeted") return "contact_admin";
  if (installation.state === null) return "contact_admin";
  if (["missing", "expired", "retired"].includes(installation.state)) {
    return "heartbeat";
  }
  if (connection.state === null) return "contact_admin";
  if (connection.state !== "connected") return "confirm_microsoft";
  if (propagation.state !== "observed") return "relaunch_outlook";
  return "none";
}

export function deriveOutlookReadiness({
  principal,
  roster,
  installation,
  installation_binding: installationBinding = "verified",
  delegated_connection: delegatedConnection,
  external_evidence: externalEvidence = {},
  snapshot_at: snapshotAtInput,
} = {}) {
  const snapshotAt = instant(snapshotAtInput);
  if (!snapshotAt) throw new TypeError("snapshot_at must be a valid instant");
  const entitlementDecision = evaluateOutlookDesktopEntitlement({
    principal,
    roster,
  });
  const entitlement = freeze({
    state: entitlementDecision.status,
    source: entitlementDecision.roster_version
      ? "lawos_outlook_desktop_entitlement_roster"
      : null,
    roster_version: entitlementDecision.roster_version,
    safe_error_code: entitlementDecision.safe_error_code,
  });
  const identity = identityBinding(principal, installationBinding);
  const assignment = externalAxis(
    externalEvidence?.enterprise_app_assignment,
    ASSIGNMENT_STATES,
  );
  const deployment = centralDeployment(
    externalEvidence?.central_deployment,
  );
  const propagation = externalAxis(
    externalEvidence?.client_propagation,
    PROPAGATION_STATES,
  );
  const installationResult = installationProjection(installation, snapshotAt);
  const connection = connectionProjection(delegatedConnection, snapshotAt);
  const conflict = installationResult.conflict || evidenceConflict({
    assignment,
    deployment,
    propagation,
  });
  const components = {
    entitlement,
    identity,
    assignment,
    deployment,
    propagation,
    installation: installationResult.projection,
    connection,
    conflict,
  };
  const action = nextAction(components);
  return freeze({
    schema_version: OUTLOOK_READINESS_SCHEMA_VERSION,
    entitlement,
    identity_binding: identity,
    enterprise_app_assignment: assignment,
    central_deployment: deployment,
    client_propagation: propagation,
    installation: installationResult.projection,
    delegated_connection: connection,
    next_action: action,
    browser_required: action === "confirm_microsoft",
    safe_error_codes: errorCodes(components),
    snapshot: {
      observed_at: snapshotAt,
      consistency: conflict ? "contradictory" : "component_versioned",
      version_vector: {
        roster_version: entitlement.roster_version,
        installation_state_version:
          installationResult.projection.state_version,
        delegated_connection_state_version: connection.state_version,
      },
    },
    user_connection_revoke_requested: false,
    provider_runtime_executed: false,
    admin_runtime_executed: false,
    token_material_returned: false,
    production_ready_claim: false,
  });
}
