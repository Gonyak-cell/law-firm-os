#!/usr/bin/env node
// Explicit test entry point. Production commands never import this module.
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createSyntheticPrivateRuntimeSources, SYNTHETIC_PROFILE_PNG_BASE64 } from "./helpers/synthetic-private-runtime-sources.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("A test command is required");
const directory = mkdtempSync(join(tmpdir(), "lawos-synthetic-runtime-"));
try {
  const { registration, roster } = createSyntheticPrivateRuntimeSources();
  const registrationPath = join(directory, "registration.json");
  const rosterPath = join(directory, "roster.json");
  const photoPath = join(directory, "photos");
  writeFileSync(registrationPath, JSON.stringify(registration), { mode: 0o600 });
  const rosterBytes = Buffer.from(JSON.stringify(roster));
  writeFileSync(rosterPath, rosterBytes, { mode: 0o600 });
  mkdirSync(photoPath, { mode: 0o700 });
  const png = Buffer.from(SYNTHETIC_PROFILE_PNG_BASE64, "base64");
  for (const member of roster.members) {
    const ref = createHash("sha256").update(member.employee_id).digest("hex");
    writeFileSync(join(photoPath, `${ref}.png`), png, { mode: 0o600 });
  }
  const result = spawnSync(command === "node" ? process.execPath : command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH: registrationPath,
      LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH: rosterPath,
      LAWOS_HRX_MEMBER_ROSTER_SOURCE_SHA256: createHash("sha256").update(rosterBytes).digest("hex"),
      LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH: photoPath,
      LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH: "",
    },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
