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

test("app roster source encodes the current reporting lines", async () => {
  await withWebModule("/src/people/hrxLocalRoster.ts", async ({ localHrxRosterEmployees, localHrxRosterOrgChart }) => {
    const employees = localHrxRosterEmployees();
    const byName = new Map(employees.map((employee) => [employee.display_name, employee]));
    assert.equal(byName.get("조우상")?.manager_display_name, "김양태");
    assert.equal(byName.get("박서영")?.manager_display_name, "김양태");
    assert.equal(byName.get("이예진")?.manager_display_name, "윤태리");

    const orgChart = localHrxRosterOrgChart();
    const orgByName = new Map(orgChart.employees.map((employee) => [employee.display_name, employee]));
    assert.equal(orgByName.get("조우상")?.direct_report_count, 0);
    assert.equal(orgByName.get("박서영")?.manager_display_name, "김양태");
    assert.equal(orgByName.get("윤태리")?.direct_report_count, 1);
    assert.equal(orgByName.get("이예진")?.manager_display_name, "윤태리");
  });
});

test("home greeting keeps lawyer honorific from app roster", async () => {
  await withWebModule("/src/components/HomeSurface.jsx", async ({ sessionGreeting }) => {
    assert.equal(sessionGreeting({ email: "jwsuh@amic.kr", display_name: "서지원" }, null), "Welcome, 서지원 변호사님");
    assert.equal(sessionGreeting({ user_id: "user_amic_jwsuh" }, null), "Welcome, 서지원 변호사님");
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
    assert.ok(envelope.scopes.includes("tenant.admin"));
    assert.ok(envelope.scopes.includes("hrx.leave.accrual.execute"));
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
