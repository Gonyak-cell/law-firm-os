import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function withWebModule(path, callback) {
  const server = await createServer({
    root: webRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
  });
  try {
    const module = await server.ssrLoadModule(path);
    return await callback(module);
  } finally {
    await server.close();
  }
}

test("HRX member roster fails closed when runtime read fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network disabled for member roster fallback test");
  };
  try {
    await withWebModule("/src/people/hrxApiClient.ts", async ({ fetchHrxEmployees, fetchHrxOrgChart, fetchHrxLifecycleBoard }) => {
      const employees = await fetchHrxEmployees();
      assert.equal(employees.kind, "error");

      const orgChart = await fetchHrxOrgChart();
      assert.equal(orgChart.kind, "error");

      const lifecycle = await fetchHrxLifecycleBoard();
      assert.equal(lifecycle.kind, "data");
      assert.deepEqual(lifecycle.onboarding, []);
      assert.deepEqual(lifecycle.offboarding, []);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("guarded API UI states reserve permission denial for an explicit 403 contract", async () => {
  await withWebModule("/src/data/apiClient.js", async ({ guardedApiUiState }) => {
    const profileDenial = {
      outcome: "denied",
      ui_state: "denied",
      safe_error_codes: ["PROFILE_PERMISSION_DENIED"]
    };
    assert.equal(guardedApiUiState({ status: 403 }, profileDenial), "denied");
    assert.equal(guardedApiUiState({ status: 503 }, profileDenial), "error");
    assert.equal(guardedApiUiState({ status: 403 }, { ...profileDenial, safe_error_codes: [] }), "error");
    assert.equal(guardedApiUiState({ status: 401 }, {
      outcome: "blocked",
      ui_state: "denied",
      safe_error_codes: ["AUTH_SESSION_REQUIRED"]
    }), "error");
    assert.equal(guardedApiUiState({ status: 200 }, {
      outcome: "review_required",
      ui_state: "review",
      safe_error_codes: ["PROFILE_REVIEW_REQUIRED"]
    }), "review");
    assert.equal(guardedApiUiState({ status: 403 }, {
      outcome: "blocked",
      ui_state: "denied",
      safe_error_codes: ["HOME_UNAUTHORIZED_OMISSION"]
    }), "denied");
  });
});

test("home greeting uses authenticated profile fields without a bundled roster", async () => {
  await withWebModule("/src/components/HomeSurface.jsx", async ({ sessionGreeting }) => {
    assert.equal(sessionGreeting({ display_name: "합성 사용자", title: "변호사" }, null), "Welcome, 합성 사용자 변호사님");
    assert.equal(sessionGreeting({ user_id: "synthetic-user" }, null), "Welcome, 사용자님");
  });
});

test("desktop web login uses the main-process session bridge without storing renderer token material", async () => {
  await withWebModule("/src/data/apiClient.js", async ({
    LAWOS_API_SESSION_STORAGE_KEY,
    loginLawosApiSession,
    readLawosApiSession,
    readLawosSessionEnvelope
  }) => {
    const storage = new Map();
    const source = {
      location: { protocol: "file:", search: "?desktop=1" },
      sessionStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key)
      },
      matterSession: {
        async login({ email, password }) {
          assert.equal(email, "jwsuh@amic.kr");
          assert.equal(password, "typed-password");
          return {
            ok: true,
            status: 200,
            token_material_returned: false,
            session: {
              state: "signed_in",
              session_id: "sess_user_amic_jwsuh",
              user_id: "user_amic_jwsuh",
              email: "jwsuh@amic.kr",
              display_name: "서지원",
              tenant_id: "tenant_amic_matter_vault",
              role_ids: ["lawos_admin"],
              scopes: ["tenant.admin", ...Array.from({ length: 30 }, (_, index) => `scope.${index}`)],
              hrx_scopes: ["hrx.leave.accrual.execute"],
              token_material_returned: false
            }
          };
        }
      }
    };

    const result = await loginLawosApiSession({ email: "jwsuh@amic.kr", password: "typed-password" }, { source });

    assert.equal(result.ok, true);
    assert.equal(result.body.session.display_name, "서지원");
    assert.equal(readLawosApiSession(source), null);
    assert.equal(storage.has(LAWOS_API_SESSION_STORAGE_KEY), false);
    const envelope = readLawosSessionEnvelope(source);
    assert.equal(envelope.actor_ref, "user_amic_jwsuh");
    assert.equal(envelope.tenant_refs.default, "tenant_amic_matter_vault");
    assert.deepEqual(new Set(Object.values(envelope.tenant_refs)), new Set(["tenant_amic_matter_vault"]));
    assert.ok(envelope.scopes.includes("tenant.admin"));
    assert.ok(envelope.scopes.includes("hrx.leave.accrual.execute"));
  });
});

test("desktop session restore rehydrates the safe tenant and permission envelope", async () => {
  await withWebModule("/src/data/apiClient.js", async ({
    LAWOS_API_SESSION_STORAGE_KEY,
    readDesktopMatterSessionStatus,
    readLawosSessionEnvelope
  }) => {
    const storage = new Map();
    const source = {
      sessionStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key)
      },
      matterSession: {
        async status() {
          return {
            state: "signed_in",
            session_id: "sess_user_amic_jwsuh",
            user_id: "user_amic_jwsuh",
            tenant_id: "tenant_amic_matter_vault",
            role_ids: ["system_super_admin"],
            scopes: ["finance.bank.read"],
            hrx_scopes: ["hrx.payroll.preview"],
            expires_at: "2099-07-29T12:00:00.000Z",
            token_material_returned: false
          };
        }
      }
    };

    const status = await readDesktopMatterSessionStatus(source);
    const envelope = readLawosSessionEnvelope(source);

    assert.equal(status.state, "signed_in");
    assert.equal(envelope.tenant_refs.default, "tenant_amic_matter_vault");
    assert.ok(envelope.role_ids.includes("system_super_admin"));
    assert.ok(envelope.scopes.includes("finance.bank.read"));
    assert.ok(envelope.scopes.includes("hrx.payroll.preview"));
    assert.equal(storage.has(LAWOS_API_SESSION_STORAGE_KEY), false);
  });
});

test("finance analytics preserves an HTTP 500 as an error instead of an empty dataset", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    outcome: "blocked",
    error: "internal_error",
    safe_error_codes: ["API_INTERNAL_ERROR"],
    production_ready_claim: false
  }), {
    status: 500,
    headers: { "content-type": "application/json" }
  });
  try {
    await withWebModule("/src/data/apiClient.js", async ({ fetchAnalyticsFinanceMonthly }) => {
      const result = await fetchAnalyticsFinanceMonthly();
      assert.equal(result.kind, "error");
      assert.equal(result.status, 500);
      assert.deepEqual(result.safeErrorCodes, ["API_INTERNAL_ERROR"]);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("desktop URL handoff keeps every product tenant reference canonical", async () => {
  await withWebModule("/src/data/apiClient.js", async ({ readLawosSessionEnvelope }) => {
    const envelope = readLawosSessionEnvelope({
      location: {
        search: "?desktop=1&desktop_actor_ref=user_amic_jwsuh&desktop_tenant_ref=tenant_amic_matter_vault"
      },
      sessionStorage: { getItem: () => null }
    });

    assert.equal(envelope.actor_ref, "user_amic_jwsuh");
    assert.deepEqual(new Set(Object.values(envelope.tenant_refs)), new Set(["tenant_amic_matter_vault"]));
  });
});

test("signed-session API requests replace fixture tenant ids at the shared transport boundary", async () => {
  await withWebModule("/src/data/apiClient.js", async ({
    LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
    LAWOS_SESSION_ENVELOPE_STORAGE_KEY,
    bindApiRequestToSignedSession
  }) => {
    const tenantId = "tenant_lawos_staging_cut007_a";
    const storage = new Map([[
      LAWOS_SESSION_ENVELOPE_STORAGE_KEY,
      JSON.stringify({
        schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
        state: "signed_in",
        session_ref: "sess_synthetic_admin",
        source: "api_signed_session",
        actor_ref: "synthetic-lawos-staging-admin",
        tenant_refs: { default: tenantId },
        role_ids: ["lawos_admin"],
        scopes: ["tenant.admin"],
        review_state: "allow"
      })
    ]]);
    const source = {
      sessionStorage: {
        getItem: (key) => storage.get(key) ?? null
      }
    };
    const bound = bindApiRequestToSignedSession(
      "/api/portal/dashboard?tenant_id=tenant_cmp_g10_synthetic&permission_ref=ui",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: "tenant_cmp_g10_synthetic",
          dashboard_projection: {
            tenant_id: "tenant_cmp_g10_synthetic",
            dashboard_projection_id: "dashboard-synthetic"
          }
        })
      },
      source
    );

    assert.equal(new URL(bound.input, "http://local").searchParams.get("tenant_id"), tenantId);
    const body = JSON.parse(bound.init.body);
    assert.equal(body.tenant_id, tenantId);
    assert.equal(body.dashboard_projection.tenant_id, tenantId);
  });
});

test("home read probes recover error reads before system status", async () => {
  await withWebModule("/src/components/HomeSurface.jsx", async ({ combinePillarResults, normalizeStatus, statusBadgeLabel }) => {
    const recovered = combinePillarResults([{ kind: "error" }, { kind: "error" }]);
    assert.equal(recovered.kind, "data");
    assert.equal(recovered.readProbeRecovered, true);
    assert.equal(normalizeStatus(recovered), "live");
    assert.equal(statusBadgeLabel(normalizeStatus(recovered), {}), "정상");
    assert.equal(statusBadgeLabel("unavailable", {}), "확인 필요");
  });
});
