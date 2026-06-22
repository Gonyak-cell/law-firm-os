import assert from "node:assert/strict";
import test from "node:test";
import { resolveDesktopDeepLink } from "../src/main/deep-link.js";

test("matter deep link rechecks permission before screen entry", async () => {
  const checked = [];
  const result = await resolveDesktopDeepLink({
    url: "matter://matter/MAT-248",
    permissionClient: {
      async canReadMatter(matterId) {
        checked.push(matterId);
        return true;
      }
    }
  });

  assert.deepEqual(checked, ["MAT-248"]);
  assert.deepEqual(result, { view: "matters", matterId: "MAT-248" });
});

test("matter deep link enters denied view when permission fails", async () => {
  const checked = [];
  const result = await resolveDesktopDeepLink({
    url: "matter://matter/MAT-999",
    permissionClient: {
      async canReadMatter(matterId) {
        checked.push(matterId);
        return false;
      }
    }
  });

  assert.deepEqual(checked, ["MAT-999"]);
  assert.deepEqual(result, { view: "denied", reason: "matter_permission_denied" });
});
