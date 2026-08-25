import assert from "node:assert/strict";
import test from "node:test";

import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
import {
  MATTER_OUTLOOK_PRODUCT_ID,
  deriveOutlookReadiness,
} from "../src/outlook-readiness.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import { outlookDesktopPrincipalRef } from "../src/session-auth.js";

const TENANT_ID = "tenant-readiness-a";
const USER_ID = "user-readiness-01";
const SUBJECT_ID = "subject-readiness-01";
const INSTALLATION_ID = "odi_readiness_000000000001";
const FORGED_INSTALLATION_ID = "odi_forged_readiness_000001";
const SNAPSHOT_AT = "2026-08-11T03:00:00.000Z";
const AUTHORITY_SNAPSHOT_AT = "2026-08-11T03:00:01.000Z";

function principal(overrides = {}) {
  return Object.freeze({
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    entra_subject_id: SUBJECT_ID,
    scopes: Object.freeze([OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE]),
    ...overrides,
  });
}

function roster() {
  return parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "synthetic-readiness-v1",
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: TENANT_ID,
      user_id: `user-readiness-${String(index + 1).padStart(2, "0")}`,
      entra_subject_id:
        `subject-readiness-${String(index + 1).padStart(2, "0")}`,
      enabled: true,
    })),
  });
}

function externalEvidence(overrides = {}) {
  return Object.freeze({
    enterprise_app_assignment: Object.freeze({
      state: "assigned",
      source: "tenant_admin_readback_receipt",
      observed_at: "2026-08-11T02:55:00.000Z",
    }),
    central_deployment: Object.freeze({
      state: "targeted",
      product_id: MATTER_OUTLOOK_PRODUCT_ID,
      manifest_version: "1.0.1.0",
      source: "integrated_apps_assignment_readback",
      observed_at: "2026-08-11T02:56:00.000Z",
    }),
    client_propagation: Object.freeze({
      state: "observed",
      source: "outlook_message_read_command_receipt",
      observed_at: "2026-08-11T02:57:00.000Z",
    }),
    ...overrides,
  });
}

function installation(status = "active", overrides = {}) {
  return Object.freeze({
    installation_id: INSTALLATION_ID,
    status,
    state_version: 4,
    lease_expires_at: status === "expired"
      ? "2026-08-10T03:00:00.000Z"
      : "2026-08-18T03:00:00.000Z",
    retired_at: status === "retired"
      ? "2026-08-11T02:00:00.000Z"
      : null,
    ...overrides,
  });
}

function trustedCurrent(overrides = {}) {
  return Object.freeze({
    ...installation(),
    release_trusted: true,
    authority_snapshot_at: AUTHORITY_SNAPSHOT_AT,
    ...overrides,
  });
}

function connection(status = "connected", overrides = {}) {
  return Object.freeze({
    status,
    state_version: status === "not_connected" ? null : 7,
    expires_at: status === "not_connected"
      ? null
      : "2026-09-11T03:00:00.000Z",
    credential_cleanup_pending: false,
    token_refresh_pending: false,
    ...overrides,
  });
}

function readiness(overrides = {}) {
  return deriveOutlookReadiness({
    principal: principal(),
    roster: roster(),
    installation: installation(),
    installation_binding: "verified",
    delegated_connection: connection(),
    external_evidence: externalEvidence(),
    snapshot_at: SNAPSHOT_AT,
    ...overrides,
  });
}

test("all authoritative independent axes yield next_action none without a ready boolean", () => {
  const result = readiness();
  assert.deepEqual({
    entitlement: result.entitlement.state,
    identity: result.identity_binding.state,
    assignment: result.enterprise_app_assignment.state,
    deployment: result.central_deployment.state,
    propagation: result.client_propagation.state,
    installation: result.installation.state,
    connection: result.delegated_connection.state,
    next_action: result.next_action,
    browser_required: result.browser_required,
  }, {
    entitlement: "approved",
    identity: "verified",
    assignment: "assigned",
    deployment: "targeted",
    propagation: "observed",
    installation: "active",
    connection: "connected",
    next_action: "none",
    browser_required: false,
  });
  assert.equal(Object.hasOwn(result, "ready"), false);
  assert.equal(result.central_deployment.product_id, MATTER_OUTLOOK_PRODUCT_ID);
  assert.equal(result.central_deployment.manifest_version, "1.0.1.0");
  assert.deepEqual(result.safe_error_codes, []);
});

test("missing or mismatched identity selects sign_in and does not invent unread state", () => {
  for (const [input, state] of [
    [{ principal: principal({ entra_subject_id: null }) }, "missing"],
    [{ installation_binding: "mismatch" }, "mismatch"],
  ]) {
    const result = readiness({
      ...input,
      installation: undefined,
      delegated_connection: undefined,
    });
    assert.equal(result.identity_binding.state, state);
    assert.equal(result.installation.state, null);
    assert.equal(result.delegated_connection.state, null);
    assert.equal(result.next_action, "sign_in");
    assert.equal(result.browser_required, false);
  }
});

test("disabled or unknown entitlement fails closed to contact_admin", () => {
  const disabled = readiness({
    principal: principal({ scopes: [] }),
    installation: undefined,
    delegated_connection: undefined,
  });
  const unknown = readiness({
    roster: null,
    installation: undefined,
    delegated_connection: undefined,
  });
  assert.equal(disabled.entitlement.state, "disabled");
  assert.equal(unknown.entitlement.state, "unknown");
  assert.equal(disabled.next_action, "contact_admin");
  assert.equal(unknown.next_action, "contact_admin");
});

test("missing expired or retired installation selects heartbeat without revoking a connected user grant", () => {
  for (const snapshot of [null, installation("expired"), installation("retired")]) {
    const result = readiness({ installation: snapshot });
    assert.equal(
      result.installation.state,
      snapshot === null ? "missing" : snapshot.status,
    );
    assert.equal(result.delegated_connection.state, "connected");
    assert.equal(result.next_action, "heartbeat");
    assert.equal(result.user_connection_revoke_requested, false);
  }
});

test("every non-connected delegated state selects Microsoft confirmation and preserves cleanup state", () => {
  for (const state of [
    "not_connected",
    "expired",
    "scope_insufficient",
    "reauthorization_required",
    "revoked",
  ]) {
    const result = readiness({
      delegated_connection: connection(state, {
        credential_cleanup_pending: state === "revoked",
      }),
    });
    assert.equal(result.delegated_connection.state, state);
    assert.equal(
      result.delegated_connection.credential_cleanup_pending,
      state === "revoked",
    );
    assert.equal(result.next_action, "confirm_microsoft");
    assert.equal(result.browser_required, true);
    assert.ok(result.safe_error_codes.includes("M365_INTERACTION_REQUIRED"));
  }
});

test("admin evidence remains independent and unknown stale or absent states never become green", () => {
  const cases = [
    ["enterprise_app_assignment", "not_assigned"],
    ["enterprise_app_assignment", "unknown"],
    ["enterprise_app_assignment", "stale"],
    ["central_deployment", "not_targeted"],
    ["central_deployment", "unknown"],
    ["central_deployment", "stale"],
  ];
  for (const [axis, state] of cases) {
    const base = externalEvidence();
    const result = readiness({
      external_evidence: externalEvidence({
        [axis]: state === "unknown"
          ? undefined
          : Object.freeze({
              ...base[axis],
              state,
            }),
      }),
    });
    assert.equal(result[axis].state, state);
    assert.equal(result.next_action, "contact_admin");
  }
});

test("client propagation unknown or not observed selects relaunch only after admin targeting is proven", () => {
  for (const clientPropagation of [
    undefined,
    Object.freeze({
      state: "not_observed",
      source: "outlook_message_read_command_receipt",
      observed_at: "2026-08-11T02:57:00.000Z",
    }),
  ]) {
    const result = readiness({
      external_evidence: externalEvidence({
        client_propagation: clientPropagation,
      }),
    });
    assert.equal(
      result.client_propagation.state,
      clientPropagation ? "not_observed" : "unknown",
    );
    assert.equal(result.next_action, "relaunch_outlook");
  }
});

test("contradictory or malformed snapshots are marked unknown instead of inferred true", () => {
  const evidenceConflict = readiness({
    external_evidence: externalEvidence({
      central_deployment: Object.freeze({
        ...externalEvidence().central_deployment,
        state: "not_targeted",
      }),
    }),
  });
  assert.equal(evidenceConflict.snapshot.consistency, "contradictory");
  assert.equal(evidenceConflict.next_action, "contact_admin");
  assert.ok(
    evidenceConflict.safe_error_codes.includes(
      "OUTLOOK_READINESS_EVIDENCE_CONFLICT",
    ),
  );

  const impossibleLease = readiness({
    installation: installation("active", {
      lease_expires_at: "2026-08-10T03:00:00.000Z",
    }),
  });
  assert.equal(impossibleLease.installation.state, null);
  assert.equal(impossibleLease.snapshot.consistency, "contradictory");
  assert.equal(impossibleLease.next_action, "contact_admin");

  const wrongProduct = readiness({
    external_evidence: externalEvidence({
      central_deployment: Object.freeze({
        ...externalEvidence().central_deployment,
        product_id: "952431be-51b8-42a2-9bf6-769a15934e85",
      }),
    }),
  });
  assert.equal(wrongProduct.central_deployment.state, "unknown");
  assert.equal(wrongProduct.central_deployment.manifest_version, null);
});

test("connected readiness fails closed when delegated authority is incomplete", () => {
  for (const [label, overrides] of [
    ["state version", { state_version: null }],
    ["expiry timestamp", { expires_at: null }],
    ["invalid expiry timestamp", { expires_at: "not-an-instant" }],
  ]) {
    const result = readiness({
      delegated_connection: connection("connected", overrides),
    });
    assert.equal(result.delegated_connection.state, null, label);
    assert.equal(result.delegated_connection.state_version, null, label);
    assert.equal(result.delegated_connection.source, null, label);
    assert.equal(result.delegated_connection.observed_at, null, label);
    assert.equal(result.next_action, "contact_admin", label);
  }
});

test("readiness projects only bounded metadata and never mutates its input", () => {
  const input = {
    principal: principal(),
    roster: roster(),
    installation: installation(),
    installation_binding: "verified",
    delegated_connection: connection("connected", {
      access_token: "must-never-return",
      mailbox_address: "pii@example.invalid",
    }),
    external_evidence: externalEvidence({
      tenant_id: "must-never-return",
    }),
    snapshot_at: SNAPSHOT_AT,
  };
  const before = structuredClone(input);
  const result = deriveOutlookReadiness(input);
  assert.deepEqual(input, before);
  assert.doesNotMatch(
    JSON.stringify(result),
    /must-never-return|pii@example|access_token|tenant_id|user_id|entra_subject/iu,
  );
  assert.equal(result.token_material_returned, false);
  assert.equal(result.provider_runtime_executed, false);
  assert.equal(result.admin_runtime_executed, false);
});

function permissionContext() {
  return Object.freeze({
    principal: principal(),
    rules: Object.freeze([Object.freeze({
      id: "outlook-readiness-read",
      effect: "allow",
      action_prefix: "outlook:connection:",
    })]),
    object_acl: Object.freeze([]),
  });
}

test("GET readiness projects authoritative assignment state before installation read without provider calls", async () => {
  const repository = createEmailDmsRepository();
  repository.create({
    model_type: "M365Connection",
    m365_connection_id: m365ConnectionId({
      tenant_id: TENANT_ID,
      user_id: USER_ID,
    }),
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    entra_subject_id: SUBJECT_ID,
    mailbox_address_hash: "a".repeat(64),
    credential_ref: "aws-secrets-manager:synthetic/readiness/credential",
    pending_vault_cleanup_refs: [],
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    consented_at: "2026-08-01T03:00:00.000Z",
    expires_at: "2026-09-11T03:00:00.000Z",
    revoked_at: null,
    state_version: 7,
  });
  const before = repository.snapshot();
  const calls = {
    assignment_projection: 0,
    installation_read: 0,
    installation_read_trusted_current: 0,
    provider: 0,
    vault: 0,
    admin: 0,
  };
  const authorityOperations = [];
  let installationStatus = "active";
  const runtime = {
    emailDmsRuntime: { repository },
    m365GraphConfig: {
      feature_enabled: true,
      provider_runtime_enabled: true,
      clock: () => new Date(SNAPSHOT_AT),
      provider: new Proxy({}, {
        get() {
          calls.provider += 1;
          return undefined;
        },
      }),
      credential_vault: new Proxy({}, {
        get() {
          calls.vault += 1;
          return undefined;
        },
      }),
    },
    outlookDesktopRuntime: {
      entitlement_roster: roster(),
      readiness_evidence: externalEvidence(),
      snapshot_clock: () => new Date(SNAPSHOT_AT),
      installation_service: {
        async projectAssignmentState({ principal: value }) {
          calls.assignment_projection += 1;
          authorityOperations.push("projectAssignmentState");
          assert.deepEqual(value, {
            tenant_id: TENANT_ID,
            user_id: USER_ID,
            entra_subject_id: SUBJECT_ID,
          });
          return Object.freeze({
            tenant_id: TENANT_ID,
            user_id: USER_ID,
            entra_subject_id: SUBJECT_ID,
            desired_assigned: false,
          });
        },
        async read(...args) {
          assert.equal(args.length, 1);
          const [{ principal: value, installation_id }] = args;
          calls.installation_read += 1;
          authorityOperations.push("read");
          assert.deepEqual(value, {
            tenant_id: TENANT_ID,
            user_id: USER_ID,
            entra_subject_id: SUBJECT_ID,
          });
          assert.equal(installation_id, FORGED_INSTALLATION_ID);
          return installation(installationStatus, { installation_id });
        },
        async readTrustedCurrent(...args) {
          assert.equal(args.length, 1);
          const [{ principal: value }] = args;
          calls.installation_read_trusted_current += 1;
          authorityOperations.push("readTrustedCurrent");
          assert.deepEqual(value, {
            tenant_id: TENANT_ID,
            user_id: USER_ID,
            entra_subject_id: SUBJECT_ID,
          });
          return trustedCurrent();
        },
      },
    },
  };
  const request = (requestId) => handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: { installation_id: FORGED_INSTALLATION_ID },
    context: permissionContext(),
    requestId,
    runtime,
  });
  const result = await request("request-readiness-api");
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.outcome, "passed");
  assert.equal(result.body.item.installation.installation_id, null);
  assert.equal(result.body.item.installation.release_trusted, false);
  assert.equal(result.body.item.installation.state, "active");
  assert.equal(
    result.body.item.identity_binding.principal_ref,
    outlookDesktopPrincipalRef(principal()),
  );
  assert.equal(result.body.item.delegated_connection.state, "connected");
  assert.equal(
    result.body.item.enterprise_app_assignment.state,
    "assigned",
  );
  assert.equal(JSON.stringify(result.body).includes("desired_assigned"), false);
  assert.equal(result.body.item.next_action, "none");
  assert.equal(calls.installation_read_trusted_current, 0);

  const addinResult = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: {},
    context: permissionContext(),
    requestId: "request-readiness-addin-current-installation",
    runtime,
  });
  assert.equal(addinResult.status, 200, JSON.stringify(addinResult.body));
  assert.equal(addinResult.body.item.installation.state, "active");
  assert.equal(
    addinResult.body.item.identity_binding.principal_ref,
    outlookDesktopPrincipalRef(principal()),
  );
  assert.equal(addinResult.body.item.installation.installation_id, INSTALLATION_ID);
  assert.equal(addinResult.body.item.installation.release_trusted, true);
  assert.equal(
    addinResult.body.item.snapshot.observed_at,
    AUTHORITY_SNAPSHOT_AT,
  );
  assert.equal(addinResult.body.item.next_action, "none");
  assert.equal(
    JSON.stringify(addinResult.body).includes(INSTALLATION_ID),
    true,
  );
  assert.equal(calls.installation_read_trusted_current, 1);

  const releaseUntrustedRuntime = {
    ...runtime,
    outlookDesktopRuntime: {
      ...runtime.outlookDesktopRuntime,
      installation_service: {
        ...runtime.outlookDesktopRuntime.installation_service,
        async readTrustedCurrent() {
          calls.installation_read_trusted_current += 1;
          authorityOperations.push("readTrustedCurrent");
          throw Object.assign(
            new Error("outlook_desktop_installation_release_untrusted"),
            {
              safe_error_code: "OUTLOOK_DESKTOP_INSTALLATION_RELEASE_UNTRUSTED",
              status: 503,
            },
          );
        },
      },
    },
  };
  const untrustedRelease = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: {},
    context: permissionContext(),
    requestId: "request-readiness-untrusted-release",
    runtime: releaseUntrustedRuntime,
  });
  assert.equal(untrustedRelease.status, 503);
  assert.deepEqual(untrustedRelease.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_INSTALLATION_RELEASE_UNTRUSTED",
  ]);
  assert.equal(untrustedRelease.body.item, null);
  assert.equal(calls.installation_read_trusted_current, 2);

  installationStatus = "retired";
  const retired = await request("request-readiness-retired");
  assert.equal(retired.status, 200);
  assert.equal(retired.body.item.installation.installation_id, null);
  assert.equal(retired.body.item.installation.state, "retired");
  assert.equal(retired.body.item.delegated_connection.state, "connected");
  assert.equal(retired.body.item.next_action, "heartbeat");
  assert.equal(retired.body.item.user_connection_revoke_requested, false);
  assert.deepEqual(calls, {
    assignment_projection: 4,
    installation_read: 2,
    installation_read_trusted_current: 2,
    provider: 0,
    vault: 0,
    admin: 0,
  });
  assert.deepEqual(authorityOperations, [
    "projectAssignmentState",
    "read",
    "projectAssignmentState",
    "readTrustedCurrent",
    "projectAssignmentState",
    "readTrustedCurrent",
    "projectAssignmentState",
    "read",
  ]);
  assert.deepEqual(repository.snapshot(), before);

  let unboundReadCalls = 0;
  const unboundRuntime = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: { installation_id: INSTALLATION_ID },
    context: permissionContext(),
    requestId: "request-readiness-unbound-authority",
    runtime: {
      emailDmsRuntime: { repository },
      m365GraphConfig: runtime.m365GraphConfig,
      outlookDesktopRuntime: {
        entitlement_roster: roster(),
        installation_service: {
          async read() {
            unboundReadCalls += 1;
            return installation();
          },
        },
      },
    },
  });
  assert.equal(unboundRuntime.status, 503);
  assert.deepEqual(unboundRuntime.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
  ]);
  assert.equal(unboundReadCalls, 0);

  let querylessIncompleteAuthorityCalls = 0;
  const querylessIncompleteAuthority = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: {},
    context: permissionContext(),
    requestId: "request-readiness-queryless-incomplete-authority",
    runtime: {
      emailDmsRuntime: { repository },
      m365GraphConfig: runtime.m365GraphConfig,
      outlookDesktopRuntime: {
        entitlement_roster: roster(),
        installation_service: {
          async projectAssignmentState() {
            querylessIncompleteAuthorityCalls += 1;
          },
          async readCurrent() {
            querylessIncompleteAuthorityCalls += 1;
          },
          async assertReleaseTrusted() {
            querylessIncompleteAuthorityCalls += 1;
          },
        },
      },
    },
  });
  assert.equal(querylessIncompleteAuthority.status, 503);
  assert.deepEqual(querylessIncompleteAuthority.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
  ]);
  assert.equal(querylessIncompleteAuthorityCalls, 0);

  let accessorReads = 0;
  const accessorResult = { ...trustedCurrent() };
  Object.defineProperty(accessorResult, "release_trusted", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return true;
    },
  });
  const invalidTrustedCurrentResults = [
    ["extra field", { ...trustedCurrent(), access_token: "never-consume" }],
    ["untrusted", trustedCurrent({ release_trusted: false })],
    ["inactive", trustedCurrent({ status: "expired" })],
    ["retired", trustedCurrent({ retired_at: SNAPSHOT_AT })],
    ["invalid version", trustedCurrent({ state_version: 0 })],
    ["expired lease", trustedCurrent({ lease_expires_at: AUTHORITY_SNAPSHOT_AT })],
    ["invalid authority snapshot", trustedCurrent({ authority_snapshot_at: "invalid" })],
    ["accessor", accessorResult],
    ["proxy", new Proxy({ ...trustedCurrent() }, {})],
  ];
  for (const [label, authorityResult] of invalidTrustedCurrentResults) {
    let trustedCurrentCalls = 0;
    const invalidResult = await handleOutlookAddinApiRequest({
      pathname: "/api/outlook/readiness",
      method: "GET",
      query: {},
      context: permissionContext(),
      requestId: `request-readiness-invalid-trusted-current-${label}`,
      runtime: {
        ...runtime,
        outlookDesktopRuntime: {
          ...runtime.outlookDesktopRuntime,
          installation_service: {
            ...runtime.outlookDesktopRuntime.installation_service,
            async readTrustedCurrent() {
              trustedCurrentCalls += 1;
              return authorityResult;
            },
          },
        },
      },
    });
    assert.equal(invalidResult.status, 503, label);
    assert.deepEqual(invalidResult.body.safe_error_codes, [
      "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
    ], label);
    assert.equal(JSON.stringify(invalidResult.body).includes("never-consume"), false);
    assert.equal(trustedCurrentCalls, 1, label);
  }
  assert.equal(accessorReads, 0);

  let invalidProjectorReadCalls = 0;
  const invalidProjector = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: { installation_id: INSTALLATION_ID },
    context: permissionContext(),
    requestId: "request-readiness-invalid-projector",
    runtime: {
      emailDmsRuntime: { repository },
      m365GraphConfig: runtime.m365GraphConfig,
      outlookDesktopRuntime: {
        entitlement_roster: roster(),
        installation_service: {
          async projectAssignmentState() { return null; },
          async read() {
            invalidProjectorReadCalls += 1;
            return installation();
          },
        },
      },
    },
  });
  assert.equal(invalidProjector.status, 503);
  assert.deepEqual(invalidProjector.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
  ]);
  assert.equal(invalidProjectorReadCalls, 0);

  const unavailableRoster = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: { installation_id: INSTALLATION_ID },
    context: permissionContext(),
    requestId: "request-readiness-roster-unavailable",
    runtime: {
      emailDmsRuntime: { repository },
      m365GraphConfig: {
        feature_enabled: true,
        provider_runtime_enabled: true,
        clock: () => new Date(SNAPSHOT_AT),
      },
      outlookDesktopRuntime: {
        entitlement_roster: null,
        readiness_evidence: externalEvidence(),
        snapshot_clock: () => new Date(SNAPSHOT_AT),
        installation_service: {
          async read() {
            calls.installation_read += 1;
            throw new Error("must not read without entitlement authority");
          },
        },
      },
    },
  });
  assert.equal(unavailableRoster.status, 200);
  assert.equal(unavailableRoster.body.item.entitlement.state, "unknown");
  assert.equal(unavailableRoster.body.item.installation.state, null);
  assert.equal(unavailableRoster.body.item.delegated_connection.state, null);
  assert.equal(unavailableRoster.body.item.next_action, "contact_admin");
  assert.equal(calls.installation_read, 2);

  const forgedIdentity = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: {
      installation_id: INSTALLATION_ID,
      tenant_id: TENANT_ID,
    },
    context: permissionContext(),
    requestId: "request-readiness-forged-query",
    runtime: {},
  });
  assert.equal(forgedIdentity.status, 400);
  assert.deepEqual(forgedIdentity.body.safe_error_codes, [
    "OUTLOOK_READINESS_REQUEST_INVALID",
  ]);
  assert.deepEqual(repository.snapshot(), before);
});

test("GET readiness rejects an installation projection for a different ODI", async () => {
  const mismatchedInstallationId = "odi_readiness_000000000099";
  let readCalls = 0;
  const result = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/readiness",
    method: "GET",
    query: { installation_id: INSTALLATION_ID },
    context: permissionContext(),
    requestId: "request-readiness-mismatched-installation",
    runtime: {
      emailDmsRuntime: { repository: createEmailDmsRepository() },
      m365GraphConfig: {
        feature_enabled: true,
        provider_runtime_enabled: false,
        clock: () => new Date(SNAPSHOT_AT),
      },
      outlookDesktopRuntime: {
        entitlement_roster: roster(),
        readiness_evidence: externalEvidence(),
        snapshot_clock: () => new Date(SNAPSHOT_AT),
        installation_service: {
          async projectAssignmentState() {
            return Object.freeze({
              tenant_id: TENANT_ID,
              user_id: USER_ID,
              entra_subject_id: SUBJECT_ID,
              desired_assigned: false,
            });
          },
          async read() {
            readCalls += 1;
            return installation("active", {
              installation_id: mismatchedInstallationId,
            });
          },
        },
      },
    },
  });

  assert.equal(result.status, 503);
  assert.deepEqual(result.body.safe_error_codes, [
    "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
  ]);
  assert.equal(result.body.item, null);
  assert.equal(readCalls, 1);
});
