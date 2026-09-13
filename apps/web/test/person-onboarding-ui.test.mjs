import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildPersonInvitationPayload } from "../src/data/apiClient.js";

test("onboarding UI exposes internal/external selector and builds role-specific request payloads", () => {
  const source = readFileSync(new URL("../src/people/admin/PermissionAdminPanel.jsx", import.meta.url), "utf8");
  assert.match(source, /value="internal"/);
  assert.match(source, /value="external"/);
  assert.match(source, /client_group_id/);
  assert.match(source, /className="person-onboarding-form\b/);
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.person-onboarding-form,\s*\.person-profile-admin-editor\s*\{/s);
  assert.match(styles, /\.person-onboarding-form label,\s*\.person-profile-admin-editor > label\s*\{/s);
  const authSource = readFileSync(new URL("../src/components/AuthSurface.jsx", import.meta.url), "utf8");
  assert.match(authSource, /invitation_token/);
  assert.match(authSource, /confirmLawosInvitation/);
  const shared = { email: "new@example.test", display_name: "Synthetic Person", legal_name: "Synthetic Legal", mobile_phone: "010-0000-0000",
    contact_email: "contact@example.test", professional_profile: { bio: "Synthetic profile" } };
  assert.deepEqual(buildPersonInvitationPayload({ ...shared, type: "internal", title: "Associate", employment_type: "full_time", effective_from: "2026-09-13", client_group_id: "ignored" }),
    { ...shared, type: "internal", title: "Associate", employment_type: "full_time", effective_from: "2026-09-13" });
  assert.deepEqual(buildPersonInvitationPayload({ ...shared, type: "external", client_group_id: "client_group_synthetic", title: "ignored" }),
    { ...shared, type: "external", client_group_id: "client_group_synthetic" });
});
