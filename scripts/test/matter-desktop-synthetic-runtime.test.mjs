import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { inflateSync } from "node:zlib";
import test from "node:test";
import {
  createMatterDesktopSyntheticRuntimeFixture,
  materializeMatterDesktopSyntheticRuntimeFixture,
} from "../lib/matter-desktop-synthetic-runtime.mjs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const REAL_IDENTITY_MARKER = /@amic\.(?:kr|law)|\b(?:user|emp)_amic_[a-z0-9_]+\b/iu;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertValidPng(bytes) {
  assert.deepEqual(bytes.subarray(0, PNG_SIGNATURE.length), PNG_SIGNATURE);
  let offset = PNG_SIGNATURE.length;
  const chunkTypes = [];
  let compressed = Buffer.alloc(0);
  while (offset < bytes.length) {
    const size = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, offset + 8 + size);
    chunkTypes.push(type);
    if (type === "IDAT") compressed = Buffer.concat([compressed, payload]);
    offset += 12 + size;
  }
  assert.equal(offset, bytes.length);
  assert.deepEqual(chunkTypes, ["IHDR", "IDAT", "IEND"]);
  assert.ok(inflateSync(compressed).byteLength > 0);
}

function containsBuffer(value) {
  if (Buffer.isBuffer(value)) return true;
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some((child) => containsBuffer(child));
}

test("RFD-TUW-004 factory produces a mapped 10-person synthetic account, roster, and contact fixture", () => {
  const fixture = createMatterDesktopSyntheticRuntimeFixture();
  assert.equal(containsBuffer(fixture), false);
  assert.equal(fixture.safe_counts.account_count, 10);
  assert.equal(fixture.safe_counts.user_count, 10);
  assert.equal(fixture.safe_counts.employee_count, 10);
  assert.equal(fixture.safe_counts.contact_count, 10);
  assert.equal(fixture.safe_counts.photo_count, 10);
  assert.equal(fixture.safe_counts.active_account_count, 9);
  assert.equal(fixture.safe_counts.disabled_account_count, 1);
  assert.equal(fixture.safe_counts.real_identity_count, 0);

  const accountsByUserId = new Map(fixture.account_seed.users.map((user) => [user.user_id, user]));
  const employeesById = new Map(fixture.roster.members.map((member) => [member.employee_id, member]));
  const contactsByEmail = new Map(fixture.contact.contacts.map((contact) => [contact.work_email, contact]));
  assert.equal(accountsByUserId.size, 10);
  assert.equal(employeesById.size, 10);
  assert.equal(contactsByEmail.size, 10);
  for (const [index, member] of fixture.roster.members.entries()) {
    const account = accountsByUserId.get(member.user_id);
    assert.ok(account, `missing account mapping for roster row ${index}`);
    assert.equal(account.employee_id, member.employee_id);
    assert.equal(account.email, member.work_email);
    assert.equal(member.display_name, account.display_name);
    assert.equal(member.manager_employee_id, index === 0 ? null : fixture.roster.members[0].employee_id);
    if (member.manager_employee_id) assert.ok(employeesById.has(member.manager_employee_id));
    const contact = contactsByEmail.get(member.work_email);
    assert.ok(contact, `missing contact mapping for ${member.work_email}`);
    assert.equal(contact.employee_id, member.employee_id);
    assert.match(contact.mobile_phone, /^\+1-202-555-01\d{2}$/u);
    assert.equal(account.local_dev.synthetic_only, true);
    if (account.status === "active") {
      assert.equal(account.local_dev.synthetic_token, `local-dev-only:${account.email}`);
    } else {
      assert.equal(account.local_dev.synthetic_token, null);
      assert.equal(account.credential_status, "disabled");
      assert.equal(account.password_setup_required, false);
    }
  }

  const serialized = JSON.stringify(fixture);
  assert.doesNotMatch(serialized, REAL_IDENTITY_MARKER);
  assert.equal(fixture.photos.every((photo) => photo.file_name === `${photo.employee_id_sha256}.png`), true);
  const realPhotoRoot = join(REPO_ROOT, "apps", "api", "src", "hrx-member-photos");
  const realPhotoDigests = new Set(readdirSync(realPhotoRoot).map((fileName) => sha256(readFileSync(join(realPhotoRoot, fileName)))));
  const realPhotoNames = new Set(readdirSync(realPhotoRoot));
  assert.equal(fixture.photos.some((photo) => realPhotoDigests.has(photo.sha256)), false);
  assert.equal(fixture.photos.some((photo) => realPhotoNames.has(photo.file_name)), false);
});

test("RFD-TUW-004 materializer writes valid PNGs and is byte/digest stable across repeated generation", async () => {
  const firstFixture = createMatterDesktopSyntheticRuntimeFixture();
  const secondFixture = createMatterDesktopSyntheticRuntimeFixture();
  assert.equal(JSON.stringify(firstFixture), JSON.stringify(secondFixture));
  const firstRoot = mkdtempSync(join(tmpdir(), "matter-desktop-synthetic-runtime-a-"));
  const secondRoot = mkdtempSync(join(tmpdir(), "matter-desktop-synthetic-runtime-b-"));
  try {
    const first = await materializeMatterDesktopSyntheticRuntimeFixture({ targetRoot: firstRoot });
    const second = await materializeMatterDesktopSyntheticRuntimeFixture({ targetRoot: secondRoot });
    assert.equal(first.files.length, 13);
    assert.equal(second.files.length, 13);
    assert.equal(first.rosterPath, join(firstRoot, "apps", "api", "src", "hrx-member-roster-source-of-truth.json"));
    assert.equal(first.contactPath, join(firstRoot, "apps", "api", "src", "hrx-member-contact-source-of-truth.json"));
    assert.equal(first.registrationSeedPath, join(firstRoot, "apps", "api", "src", "matter-vault-user-registration-seed.json"));
    assert.equal(statSync(first.photosPath).isDirectory(), true);
    assert.equal(readdirSync(first.photosPath).length, 10);
    const firstByRelativePath = new Map(first.files.map((entry) => [entry.path.slice(firstRoot.length), entry]));
    const secondByRelativePath = new Map(second.files.map((entry) => [entry.path.slice(secondRoot.length), entry]));
    assert.deepEqual([...firstByRelativePath.keys()], [...secondByRelativePath.keys()]);
    for (const [relativePath, firstEntry] of firstByRelativePath) {
      const secondEntry = secondByRelativePath.get(relativePath);
      assert.equal(firstEntry.sha256, secondEntry.sha256, relativePath);
      assert.equal(firstEntry.bytes, secondEntry.bytes, relativePath);
      const firstBytes = readFileSync(firstEntry.path);
      const secondBytes = readFileSync(secondEntry.path);
      assert.equal(firstEntry.sha256, sha256(firstBytes), `${relativePath}: first digest drift`);
      assert.equal(secondEntry.sha256, sha256(secondBytes), `${relativePath}: second digest drift`);
      assert.deepEqual(firstBytes, secondBytes, relativePath);
      if (firstEntry.content_type === "image/png") {
        assertValidPng(firstBytes);
      }
    }
  } finally {
    rmSync(firstRoot, { recursive: true, force: true });
    rmSync(secondRoot, { recursive: true, force: true });
  }
});

test("RFD-TUW-004 materializer rejects external or traversal fixture input before filesystem mutation", async () => {
  const root = mkdtempSync(join(tmpdir(), "matter-desktop-synthetic-runtime-boundary-"));
  const sentinelPath = join(root, "sentinel.txt");
  const outsidePath = join(root, "..", "matter-desktop-synthetic-runtime-outside.txt");
  writeFileSync(sentinelPath, "preserve");
  rmSync(outsidePath, { force: true });
  try {
    await assert.rejects(
      materializeMatterDesktopSyntheticRuntimeFixture({
        targetRoot: root,
        fixture: {
          schema_version: "law-firm-os.matter-desktop-synthetic-runtime.v1",
          photos: [{ file_name: "../matter-desktop-synthetic-runtime-outside.txt" }],
        },
      }),
      /external fixture data is not accepted/u,
    );
    assert.equal(existsSync(join(root, "apps")), false);
    assert.equal(existsSync(outsidePath), false);
    assert.equal(readFileSync(sentinelPath, "utf8"), "preserve");

    await assert.rejects(
      materializeMatterDesktopSyntheticRuntimeFixture({ targetRoot: root, fixture: undefined }),
      /external fixture data is not accepted/u,
    );
    await assert.rejects(
      materializeMatterDesktopSyntheticRuntimeFixture({ targetRoot: root, unexpected: true }),
      /external fixture data is not accepted/u,
    );
    assert.equal(existsSync(join(root, "apps")), false);
    assert.equal(readFileSync(sentinelPath, "utf8"), "preserve");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outsidePath, { force: true });
  }
});
