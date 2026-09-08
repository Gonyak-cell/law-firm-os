# Private runtime inputs and synthetic regression tests

API regression tests must not depend on the current company registration JSON,
HRX roster, or employee photo files. Run the normal API suite with:

```sh
npm --workspace apps/api test
```

For an individual test or validator, use the same explicit test entry point:

```sh
node scripts/test/with-synthetic-runtime.mjs node --test apps/api/test/profile-api.test.js
node scripts/test/with-synthetic-runtime.mjs node scripts/validate-public-renderer-no-hrx-roster-pii.mjs
```

The entry point creates a private temporary directory outside the checkout. It
passes registration, roster, and photo paths to the child before module imports,
then removes those temporary files after success or failure. It does not read
company source files, Git history, credentials, or a production service. It
creates twelve account cohorts, ten employees, eight professional profiles, and
a generated test image body. All contact and profile values are invented. The
existing role-policy identifiers remain in use so tests exercise the actual
local role matrix, including the separate QA tenant and restricted accounts.

Production launch and artifact commands do not import this test entry point.
An absent unconfigured account source stays empty. An explicitly configured
account or roster file that is missing or contains invalid JSON fails instead
of selecting another source.
The production database remains authoritative.

Real company validation runs separately with approved private inputs:

- `LAWOS_IDENTITY_REGISTRATION_SOURCE_PATH`: registration JSON.
- `LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH`: roster JSON.
- `LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH`: photo directory.
- `LAWOS_HRX_MEMBER_ROSTER_SOURCE_SHA256`: exact roster digest for a production
  artifact build using an external roster.

The production artifact builder requires the external roster to be outside the
checkout, bounded in size, readable only by its owner, and hash matched. It emits
only the existing allowlisted public professional profile fields with opaque
employee references. Registration rows, the private roster, and employee photo
files are excluded from that archive. Internal unsigned desktop distribution
also excludes the local API runtime.

CI's synthetic privacy check verifies the packaging boundary against the test
inputs. It does not establish that an installer is free of actual company data.
Before release, scan the built renderer and unpacked package against the real
private inputs, including exact photo bodies. Both privacy scanners include
three-character names and report counts and paths without printing matched
values. Preserve each result separately from server and Windows readback.

This change prepares current-source retirement; it does not delete the original
seven files or claim native Windows document usage has passed. Complete native
corporate preview/download and photo display using the verified successor
candidate before the exact current-source removal. Preserve the original
installer, attachment directory, private backup, other worktrees, and Git history.

When that removal is complete, record the exact seven paths and hashes in
`docs/desktop/amic-os-current-private-source-retirement-2026-09-08.json`, together
with backup and verification receipt hashes. Historical HRX ledgers retain their
original paths. Their validators accept only this complete recorded retirement;
unrelated missing proof, a partial record, or a reintroduced source still fails.
