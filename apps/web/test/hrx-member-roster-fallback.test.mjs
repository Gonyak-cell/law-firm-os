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

test("HRX member roster uses app roster when runtime read fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network disabled for member roster fallback test");
  };
  try {
    await withWebModule("/src/people/hrxApiClient.ts", async ({ fetchHrxEmployees, fetchHrxOrgChart, fetchHrxLifecycleBoard }) => {
      const employees = await fetchHrxEmployees();
      assert.equal(employees.kind, "data");
      assert.ok(employees.employees.length >= 10);
      const seoJiwon = employees.employees.find((employee) => employee.work_email === "jwsuh@amic.kr");
      assert.equal(seoJiwon?.display_name, "서지원");
      assert.equal(seoJiwon?.title, "대표변호사");
      assert.equal(seoJiwon?.professional_profile?.profile_kind, "attorney");
      const hanJehee = employees.employees.find((employee) => employee.work_email === "jh731@amic.kr");
      assert.equal(hanJehee?.display_name, "한제희");
      assert.equal(hanJehee?.title, "고문변호사");
      assert.equal(hanJehee?.professional_profile?.profile_kind, "attorney");

      const orgChart = await fetchHrxOrgChart();
      assert.equal(orgChart.kind, "data");
      assert.ok(orgChart.employees.some((employee) => employee.work_email === "jwsuh@amic.kr"));
      assert.ok(orgChart.org_units.length >= 2);

      const lifecycle = await fetchHrxLifecycleBoard();
      assert.equal(lifecycle.kind, "data");
      assert.deepEqual(lifecycle.onboarding, []);
      assert.deepEqual(lifecycle.offboarding, []);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
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
              scopes: ["tenant.admin"],
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
