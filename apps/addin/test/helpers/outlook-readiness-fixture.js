export function readyOutlookReadinessResponse() {
  return {
    outcome: "passed",
    item: {
      schema_version: "lawos.outlook-readiness.v1",
      entitlement: {
        state: "approved",
        source: "lawos_outlook_desktop_entitlement_roster",
        roster_version: "browser-fixture-v1",
      },
      identity_binding: {
        state: "verified",
        source: "lawos_signed_session",
      },
      enterprise_app_assignment: {
        state: "assigned",
        authoritative: true,
        source: "browser_fixture",
        observed_at: "2026-08-11T02:55:00.000Z",
      },
      central_deployment: {
        state: "targeted",
        authoritative: true,
        product_id: "8f3cc90d-56dd-4c1c-b9c2-0a1100500101",
        manifest_version: "1.1.0.0",
        source: "browser_fixture",
        observed_at: "2026-08-11T02:56:00.000Z",
      },
      client_propagation: {
        state: "observed",
        authoritative: true,
        source: "browser_fixture",
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
          roster_version: "browser-fixture-v1",
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
    },
  };
}
