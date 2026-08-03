import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  ProfileMediaEvidenceError,
  assertNoPrivateMaterial,
  evidenceFail,
  exactObject,
  sha256Bytes,
  validateRepoFileDescriptor,
} from "./profile-media-evidence-shared.mjs";

export const PROFILE_MEDIA_ADMIN_GOAL_SCHEMA_VERSION = "law-firm-os.profile-media-admin-goal.v2";
export const PROFILE_MEDIA_ADMIN_GOAL_OWNER = "profile_media_product_owner";
export const PROFILE_MEDIA_ADMIN_TUWS = Object.freeze([
  Object.freeze({ id: "PMA-TUW-001", capability: "object_storage", owner_role: "profile_platform_owner", test_path: "scripts/test/profile-media-admin-object-storage.test.mjs" }),
  Object.freeze({ id: "PMA-TUW-002", capability: "photo_object_key_content_hash", owner_role: "profile_platform_owner", test_path: "scripts/test/profile-media-admin-content-hash.test.mjs" }),
  Object.freeze({ id: "PMA-TUW-003", capability: "admin_upload", owner_role: "profile_api_owner", test_path: "scripts/test/profile-media-admin-upload.test.mjs" }),
  Object.freeze({ id: "PMA-TUW-004", capability: "admin_read", owner_role: "profile_api_owner", test_path: "scripts/test/profile-media-admin-read.test.mjs" }),
  Object.freeze({ id: "PMA-TUW-005", capability: "admin_delete", owner_role: "profile_api_owner", test_path: "scripts/test/profile-media-admin-delete.test.mjs" }),
  Object.freeze({ id: "PMA-TUW-006", capability: "audit", owner_role: "profile_security_owner", test_path: "scripts/test/profile-media-admin-audit.test.mjs" }),
  Object.freeze({ id: "PMA-TUW-007", capability: "initials_fallback", owner_role: "profile_api_owner", test_path: "scripts/test/profile-media-admin-initials-fallback.test.mjs" }),
  Object.freeze({ id: "PMA-TUW-008", capability: "rollback", owner_role: "profile_rollback_owner", test_path: "scripts/test/profile-media-admin-rollback.test.mjs" }),
]);

const GOAL_PATH = /^workbook\/matter-profile-media-admin-goal-[a-z0-9-]+\.md$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MAX_GOAL_BYTES = 2 * 1024 * 1024;

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.uid === right.uid;
}

function sameFileSnapshot(left, right) {
  return sameIdentity(left, right)
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function readPinnedGoal(repoRoot, descriptor) {
  exactObject(descriptor, ["path", "sha256", "bytes"], "admin Goal reference");
  if (typeof repoRoot !== "string"
    || !isAbsolute(repoRoot)
    || resolve(repoRoot) !== repoRoot
    || typeof descriptor.path !== "string"
    || !GOAL_PATH.test(descriptor.path)
    || !SHA256.test(descriptor.sha256)
    || !Number.isSafeInteger(descriptor.bytes)
    || descriptor.bytes < 1
    || descriptor.bytes > MAX_GOAL_BYTES
    || !constants.O_NOFOLLOW) {
    evidenceFail("ADMIN_GOAL_REFERENCE", "admin Goal reference is invalid");
  }

  let bytes;
  let descriptorFd;
  try {
    const root = realpathSync(repoRoot);
    if (root !== repoRoot) throw new Error("repository root is not canonical");
    const absolute = resolve(root, descriptor.path);
    const rel = relative(root, absolute);
    const parent = dirname(absolute);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)
      || realpathSync(parent) !== parent
      || realpathSync(absolute) !== absolute) {
      throw new Error("admin Goal path escaped or resolved through a symlink");
    }

    const rootBefore = lstatSync(root, { bigint: true });
    const parentBefore = lstatSync(parent, { bigint: true });
    const fileBefore = lstatSync(absolute, { bigint: true });
    if (!rootBefore.isDirectory()
      || !parentBefore.isDirectory()
      || !fileBefore.isFile()
      || fileBefore.nlink !== 1n
      || fileBefore.size !== BigInt(descriptor.bytes)) {
      throw new Error("admin Goal is not a bounded canonical file");
    }

    descriptorFd = openSync(
      absolute,
      constants.O_RDONLY | (constants.O_CLOEXEC ?? 0) | constants.O_NOFOLLOW,
    );
    const opened = fstatSync(descriptorFd, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameFileSnapshot(fileBefore, opened)) {
      throw new Error("admin Goal changed before open");
    }

    bytes = Buffer.alloc(descriptor.bytes);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptorFd, bytes, offset, bytes.length - offset, offset);
      if (!Number.isSafeInteger(count) || count <= 0) throw new Error("short admin Goal read");
      offset += count;
    }
    if (readSync(descriptorFd, Buffer.alloc(1), 0, 1, bytes.length) !== 0) {
      throw new Error("admin Goal grew during read");
    }

    const openedAfter = fstatSync(descriptorFd, { bigint: true });
    const fileAfter = lstatSync(absolute, { bigint: true });
    const parentAfter = lstatSync(parent, { bigint: true });
    const rootAfter = lstatSync(root, { bigint: true });
    if (!sameFileSnapshot(opened, openedAfter)
      || !sameFileSnapshot(openedAfter, fileAfter)
      || !sameIdentity(parentBefore, parentAfter)
      || !sameIdentity(rootBefore, rootAfter)
      || realpathSync(root) !== root
      || realpathSync(parent) !== parent
      || realpathSync(absolute) !== absolute) {
      throw new Error("admin Goal path or container changed during read");
    }
  } catch {
    evidenceFail("ADMIN_GOAL_FILE_INVALID", "admin Goal must be a stable descriptor-pinned repository file");
  } finally {
    if (descriptorFd !== undefined) {
      try { closeSync(descriptorFd); } catch {}
    }
  }
  if (sha256Bytes(bytes) !== descriptor.sha256) {
    evidenceFail("ADMIN_GOAL_BINDING_MISMATCH", "admin Goal bytes do not match the signed reference");
  }
  return bytes;
}

function extractContract(markdown) {
  if ([...markdown.matchAll(/```json\b/gu)].length !== 1) evidenceFail("ADMIN_GOAL_JSON_BLOCKS", "admin Goal must contain exactly one JSON fence");
  const matches = [...markdown.matchAll(/```json profile-media-admin-goal-contract\n([\s\S]*?)\n```/gu)];
  if (matches.length !== 1) evidenceFail("ADMIN_GOAL_CONTRACT_MISSING", "admin Goal contract block is missing or duplicated");
  try { return { contract: JSON.parse(matches[0][1]), fencedBlock: matches[0][0] }; } catch { evidenceFail("ADMIN_GOAL_CONTRACT_JSON", "admin Goal contract JSON is invalid"); }
}

export function readAndValidateProfileMediaAdminGoal(repoRoot, reference) {
  let markdown;
  try {
    markdown = new TextDecoder("utf-8", { fatal: true }).decode(readPinnedGoal(repoRoot, reference));
  } catch (error) {
    if (error instanceof ProfileMediaEvidenceError) throw error;
    evidenceFail("ADMIN_GOAL_ENCODING", "admin Goal must contain valid UTF-8 markdown");
  }
  const { contract, fencedBlock } = extractContract(markdown);
  assertNoPrivateMaterial(markdown.replace(fencedBlock, ""));
  assertNoPrivateMaterial(contract);
  exactObject(contract, ["schema_version", "goal_id", "owner_role", "tuws"], "admin Goal contract");
  if (contract.schema_version !== PROFILE_MEDIA_ADMIN_GOAL_SCHEMA_VERSION
    || !/^PROFILE-MEDIA-ADMIN-GOAL-[A-Z0-9-]+$/u.test(contract.goal_id)
    || contract.owner_role !== PROFILE_MEDIA_ADMIN_GOAL_OWNER
    || !Array.isArray(contract.tuws) || contract.tuws.length !== PROFILE_MEDIA_ADMIN_TUWS.length) {
    evidenceFail("ADMIN_GOAL_CONTRACT", "admin Goal schema, id, owner, or TUW count is invalid");
  }
  PROFILE_MEDIA_ADMIN_TUWS.forEach((required, index) => {
    const tuw = contract.tuws[index];
    exactObject(tuw, ["id", "capability", "owner_role", "test"], "admin Goal TUW");
    if (tuw.id !== required.id || tuw.capability !== required.capability || tuw.owner_role !== required.owner_role) {
      evidenceFail("ADMIN_GOAL_TUW_EXACTNESS", "admin Goal TUW id, capability, owner, or order is invalid");
    }
    validateRepoFileDescriptor(repoRoot, tuw.test, required.test_path, `${required.id} test`);
  });
  return Object.freeze({ goal_id: contract.goal_id, owner_role: contract.owner_role, tuw_count: contract.tuws.length });
}
