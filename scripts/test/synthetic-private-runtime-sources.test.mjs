import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createLocalDevAuthProvider, deriveServerPrincipal } from "../../packages/runtime-auth/src/index.js";
import { publicProfessionalProfileCatalog } from "../lib/hrx-public-professional-profile.mjs";
import { createSyntheticPrivateRuntimeSources, SYNTHETIC_RUNTIME_TENANT } from "./helpers/synthetic-private-runtime-sources.mjs";

test("synthetic account cohorts authenticate with isolated tenant memberships", () => {
  const { registration, roster } = createSyntheticPrivateRuntimeSources();
  const provider = createLocalDevAuthProvider({ subjects: registration.users.map((user) => ({
    synthetic_token: user.local_dev.synthetic_token, user_id: user.user_id,
    auth_subject: user.email, assurance_level: user.assurance_level,
    tenant_memberships: user.tenant_memberships,
  })) });
  for (const user of registration.users) {
    const request = { headers: { authorization: `Bearer ${user.local_dev.synthetic_token}` } };
    const principal = deriveServerPrincipal({ provider, trustedTenantId: user.tenant_memberships[0].tenant_id, request_id: "synthetic-registration", request });
    assert.equal(principal.ok, true);
    assert.deepEqual(principal.role_ids, user.role_ids);
    assert.equal(principal.user_id, user.user_id);
    assert.match(user.email, /^member\d{2}@runtime\.example\.test$/u);
    assert.equal(user.local_dev.synthetic_only, true);
  }
  const other = registration.users[11];
  const denied = deriveServerPrincipal({ provider, trustedTenantId: SYNTHETIC_RUNTIME_TENANT, request_id: "synthetic-cross-tenant", request: { headers: { authorization: `Bearer ${other.local_dev.synthetic_token}` } } });
  assert.equal(denied.ok, false);
  assert.equal(registration.users.filter((user) => user.highest_privilege).length, 1);
  assert.equal(roster.members.length, 10);
  assert.equal(new Set(roster.members.map((member) => member.employee_id)).size, 10);
  assert.equal(registration.users.length, 12);
});

test("synthetic roster produces the public profile catalog without identity fields", () => {
  const { roster } = createSyntheticPrivateRuntimeSources();
  const catalog = publicProfessionalProfileCatalog(roster, { opaqueEmployeeRefs: true });
  assert.equal(catalog.profiles.length, 8);
  for (const profile of catalog.profiles) {
    assert.deepEqual(Object.keys(profile).sort(), ["employee_ref", "professional_profile"]);
    assert.match(profile.employee_ref, /^[a-f0-9]{64}$/u);
  }
  const serialized = JSON.stringify(catalog);
  assert.equal(serialized.includes("@runtime.example.test"), false);
  assert.equal(serialized.includes("테스트 구성원"), false);
  assert.equal(serialized.includes("user_amic_"), false);
});

test("explicit test runner supplies isolated inputs before registry imports and cleans up on success and failure", () => {
  const root = resolve(import.meta.dirname, "../..");
  for (const exitCode of [0, 7]) {
    const child = spawnSync(process.execPath, [
      "scripts/test/with-synthetic-runtime.mjs", "node", "--input-type=module", "-e", `
        import assert from 'node:assert/strict';
        import { dirname } from 'node:path';
        import { highestPrivilegeRegisteredAccount } from './apps/api/src/matter-vault-account-registry.js';
        import { findHrxMemberRosterByUserId, memberPhotoDataUrlForEmployeeId } from './apps/api/src/hrx-member-roster-registry.js';
        import { resolveLawosUserRoleAssignment } from './apps/api/src/lawos-role-registry.js';
        const user = highestPrivilegeRegisteredAccount();
        assert.equal(user.email, 'member06@runtime.example.test');
        assert.equal(resolveLawosUserRoleAssignment(user).role_profile_id, 'lawos_system_admin_partner');
        const member = findHrxMemberRosterByUserId(user.user_id);
        assert.equal(member.display_name, '테스트 구성원 06');
        assert.match(memberPhotoDataUrlForEmployeeId(member.employee_id), /^data:image\\/png;base64,/);
        process.stdout.write(JSON.stringify({ directory: dirname(process.env.LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH) }));
        process.exitCode = ${exitCode};
      `,
    ], { cwd: root, encoding: "utf8", env: {
      ...process.env,
      LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: "/missing/private-registration.json",
      LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: "/missing/private-roster.json",
      LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH: "/missing/private-photos",
    } });
    assert.equal(child.status, exitCode, child.stderr);
    const { directory } = JSON.parse(child.stdout);
    assert.equal(directory.startsWith(`${root}/`), false);
    assert.equal(existsSync(directory), false, "temporary test inputs must be removed after child exit");
  }
});
