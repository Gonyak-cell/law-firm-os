import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_READINESS_ACTIONS,
  presentOutlookReadiness,
} from "../src/outlook-readiness-status.js";

function response(overrides = {}) {
  return {
    outcome: "passed",
    item: {
      schema_version: "lawos.outlook-readiness.v1",
      entitlement: {
        state: "approved",
        source: "lawos_outlook_desktop_entitlement_roster",
        roster_version: "synthetic-readiness-v1",
      },
      identity_binding: {
        state: "verified",
        source: "lawos_signed_session",
      },
      enterprise_app_assignment: {
        state: "assigned",
        authoritative: true,
        source: "tenant_admin_readback_receipt",
        observed_at: "2026-08-11T02:55:00.000Z",
      },
      central_deployment: {
        state: "targeted",
        authoritative: true,
        product_id: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
        manifest_version: "1.0.1.0",
        source: "integrated_apps_assignment_readback",
        observed_at: "2026-08-11T02:56:00.000Z",
      },
      client_propagation: {
        state: "observed",
        authoritative: true,
        source: "outlook_message_read_command_receipt",
        observed_at: "2026-08-11T02:57:00.000Z",
      },
      installation: {
        state: "active",
        state_version: 4,
        lease_expires_at: "2026-08-18T03:00:00.000Z",
        retired_at: null,
        source: "lawos_outlook_desktop_installations",
      },
      delegated_connection: {
        state: "connected",
        state_version: 7,
        expires_at: "2026-09-11T03:00:00.000Z",
        source: "lawos_m365_connection_state",
        observed_at: "2026-08-11T03:00:00.000Z",
      },
      snapshot: {
        observed_at: "2026-08-11T03:00:00.000Z",
        consistency: "component_versioned",
        version_vector: {
          roster_version: "synthetic-readiness-v1",
          installation_state_version: 4,
          delegated_connection_state_version: 7,
        },
      },
      next_action: "none",
      browser_required: false,
      safe_error_codes: [],
      user_connection_revoke_requested: false,
      provider_runtime_executed: false,
      admin_runtime_executed: false,
      ...overrides,
    },
  };
}

test("authoritative ready response becomes the exact compact success copy", () => {
  assert.deepEqual(presentOutlookReadiness(response()), {
    status: "complete",
    visibleMessage: "Outlook 연결 준비됨",
    fullMessage: "Outlook 연결과 추가 기능 전파가 확인되었습니다.",
    action: OUTLOOK_READINESS_ACTIONS.none,
    actionLabel: null,
  });
});

test("interaction-required response becomes the exact Microsoft confirmation action", () => {
  const result = presentOutlookReadiness(response({
    delegated_connection: { state: "reauthorization_required" },
    next_action: "confirm_microsoft",
    browser_required: true,
    safe_error_codes: ["M365_INTERACTION_REQUIRED"],
  }));
  assert.equal(result.visibleMessage, "Microsoft 확인 필요");
  assert.equal(result.action, OUTLOOK_READINESS_ACTIONS.confirmMicrosoft);
  assert.equal(result.actionLabel, "계정 확인");
});

test("unobserved propagation becomes the exact Outlook relaunch action", () => {
  const result = presentOutlookReadiness(response({
    client_propagation: {
      ...response().item.client_propagation,
      state: "not_observed",
    },
    next_action: "relaunch_outlook",
    safe_error_codes: ["OUTLOOK_READINESS_PROPAGATION_NOT_OBSERVED"],
  }));
  assert.equal(result.visibleMessage, "Outlook 추가 기능 전파 확인 필요");
  assert.equal(result.action, OUTLOOK_READINESS_ACTIONS.refresh);
  assert.equal(result.actionLabel, "Outlook 다시 열기");
});

test("unknown, admin, sign-in, and heartbeat results fail closed to read-only retry", () => {
  for (const input of [
    null,
    {},
    response({ next_action: "contact_admin" }),
    response({ next_action: "sign_in" }),
    response({ next_action: "heartbeat" }),
    response({ next_action: "invented" }),
  ]) {
    const result = presentOutlookReadiness(input);
    assert.equal(result.visibleMessage, "연결 상태를 확인할 수 없음");
    assert.equal(result.action, OUTLOOK_READINESS_ACTIONS.refresh);
    assert.equal(result.actionLabel, "다시 확인");
  }
});

test("confirmation cannot be spoofed without the browser flag and interaction code", () => {
  for (const input of [
    response({
      next_action: "confirm_microsoft",
      browser_required: false,
      safe_error_codes: ["M365_INTERACTION_REQUIRED"],
    }),
    response({
      next_action: "confirm_microsoft",
      browser_required: true,
      safe_error_codes: [],
    }),
  ]) {
    assert.equal(
      presentOutlookReadiness(input).action,
      OUTLOOK_READINESS_ACTIONS.refresh,
    );
  }
});

test("ready copy requires every authoritative axis and never projects identifiers", () => {
  for (const input of [
    response({ enterprise_app_assignment: { state: "assigned", authoritative: false } }),
    response({ central_deployment: { state: "targeted", authoritative: false } }),
    response({ client_propagation: { state: "observed", authoritative: false } }),
    response({ installation: { state: "expired" } }),
    response({ user_connection_revoke_requested: true }),
  ]) {
    assert.equal(
      presentOutlookReadiness(input).visibleMessage,
      "연결 상태를 확인할 수 없음",
    );
  }

  const projected = presentOutlookReadiness(response({
    installation: {
      state: "active",
      installation_id: "odi_secret",
      lease_expires_at: "2026-08-18T00:00:00.000Z",
    },
    tenant_id: "tenant-secret",
    evidence_ref: "evidence-secret",
    access_token: "token-secret",
  }));
  const serialized = JSON.stringify(projected);
  for (const forbidden of ["odi_secret", "tenant-secret", "evidence-secret", "token-secret"] ) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("ready copy fails closed when versioned authority is incomplete", () => {
  const missingAuthority = [
    ["entitlement source", { entitlement: { ...response().item.entitlement, source: null } }],
    ["roster version", { entitlement: { ...response().item.entitlement, roster_version: null } }],
    ["identity source", { identity_binding: { state: "verified", source: null } }],
    ["assignment source", {
      enterprise_app_assignment: {
        ...response().item.enterprise_app_assignment,
        source: null,
      },
    }],
    ["assignment timestamp", {
      enterprise_app_assignment: {
        ...response().item.enterprise_app_assignment,
        observed_at: null,
      },
    }],
    ["deployment manifest version", {
      central_deployment: {
        ...response().item.central_deployment,
        manifest_version: null,
      },
    }],
    ["propagation timestamp", {
      client_propagation: {
        ...response().item.client_propagation,
        observed_at: null,
      },
    }],
    ["installation source", {
      installation: { ...response().item.installation, source: null },
    }],
    ["installation version", {
      installation: { ...response().item.installation, state_version: null },
    }],
    ["installation lease", {
      installation: { ...response().item.installation, lease_expires_at: null },
    }],
    ["connection source", {
      delegated_connection: {
        ...response().item.delegated_connection,
        source: null,
      },
    }],
    ["connection version", {
      delegated_connection: {
        ...response().item.delegated_connection,
        state_version: null,
      },
    }],
    ["connection expiry", {
      delegated_connection: {
        ...response().item.delegated_connection,
        expires_at: null,
      },
    }],
    ["connection timestamp", {
      delegated_connection: {
        ...response().item.delegated_connection,
        observed_at: null,
      },
    }],
    ["snapshot consistency", {
      snapshot: { ...response().item.snapshot, consistency: "contradictory" },
    }],
    ["snapshot timestamp", {
      snapshot: { ...response().item.snapshot, observed_at: null },
    }],
    ["snapshot installation version", {
      snapshot: {
        ...response().item.snapshot,
        version_vector: {
          ...response().item.snapshot.version_vector,
          installation_state_version: null,
        },
      },
    }],
    ["snapshot connection version", {
      snapshot: {
        ...response().item.snapshot,
        version_vector: {
          ...response().item.snapshot.version_vector,
          delegated_connection_state_version: null,
        },
      },
    }],
  ];
  for (const [label, overrides] of missingAuthority) {
    assert.equal(
      presentOutlookReadiness(response(overrides)).visibleMessage,
      "연결 상태를 확인할 수 없음",
      label,
    );
  }
});
