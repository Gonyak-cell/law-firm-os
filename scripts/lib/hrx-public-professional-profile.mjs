import { createHash } from "node:crypto";
import { realpathSync, statSync } from "node:fs";
import { relative, sep } from "node:path";
import { readPrivateProgramBytes } from "./json-postgres-program-files.mjs";

export const HRX_PUBLIC_PROFILE_ROSTER_SOURCE_PATH =
  "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json";

export function readPinnedHrxRosterBytes(path, expectedSha256, {
  worktree = process.cwd(),
} = {}) {
  if (!/^[a-f0-9]{64}$/u.test(expectedSha256 ?? "")) {
    throw new Error("external HRX roster requires its exact SHA-256");
  }
  const rel = relative(realpathSync(worktree), realpathSync(path));
  if (rel !== ".." && !rel.startsWith(`..${sep}`)) {
    throw new Error("external HRX roster must remain outside the worktree");
  }
  const size = statSync(path).size;
  if (size < 1 || size > 512 * 1024) {
    throw new Error("external HRX roster exceeds the bounded input size");
  }
  const bytes = readPrivateProgramBytes(path, "external HRX roster", { worktree });
  if (bytes.length !== size
    || createHash("sha256").update(bytes).digest("hex") !== expectedSha256) {
    throw new Error("external HRX roster digest drifted");
  }
  return bytes;
}

const PUBLIC_PROFILE_KEYS = Object.freeze([
  "schema_version",
  "profile_kind",
  "public_role_labels",
  "practice_areas",
  "experience",
  "education",
  "qualifications",
]);

function opaqueEmployeeRef(employeeId) {
  return createHash("sha256").update(employeeId).digest("hex");
}

export function publicProfessionalProfileCatalog(
  privateRoster,
  { opaqueEmployeeRefs = false } = {},
) {
  if (!privateRoster || !Array.isArray(privateRoster.members)) {
    throw new TypeError("HRX private roster must contain a members array");
  }
  const profiles = privateRoster.members
    .filter((member) => member?.employee_id && member?.professional_profile)
    .map((member) => ({
      ...(opaqueEmployeeRefs
        ? { employee_ref: opaqueEmployeeRef(member.employee_id) }
        : { employee_id: member.employee_id }),
      professional_profile: Object.fromEntries(
        PUBLIC_PROFILE_KEYS.flatMap((key) =>
          member.professional_profile[key] === undefined
            ? []
            : [[key, member.professional_profile[key]]]),
      ),
    }));
  if (profiles.length === 0) {
    throw new Error("HRX public professional profile catalog cannot be empty");
  }
  return {
    schema_version: "law-firm-os.hrx-public-professional-profile-catalog.v0.1",
    source_ref: "hrx-public-professional-profile-catalog",
    profiles,
  };
}
