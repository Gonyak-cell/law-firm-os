import { createHmac } from "node:crypto";

export const INTERNAL_UPDATE_KEY_ID = "mater-internal-update-key-v1";

export function signUpdateMetadata(metadata, key = "mater-internal-update-key") {
  return createHmac("sha256", key).update(JSON.stringify(metadata)).digest("hex");
}

export function verifyUpdateMetadata({ metadata, signature, key = "mater-internal-update-key" }) {
  return signUpdateMetadata(metadata, key) === signature;
}

export function createUpdateController({ currentVersion, key = "mater-internal-update-key" } = {}) {
  let activeVersion = currentVersion;
  let previousVersion = null;
  const verifiedVersions = new Set([currentVersion]);

  return {
    activeVersion() {
      return activeVersion;
    },
    async applyUpdate({ metadata, signature }) {
      if (metadata.channel === "public") {
        return { state: "denied", reason: "public_channel_disabled" };
      }
      if (!verifyUpdateMetadata({ metadata, signature, key })) {
        return { state: "denied", reason: "signature_check_failed" };
      }
      previousVersion = activeVersion;
      activeVersion = metadata.version;
      verifiedVersions.add(metadata.version);
      return {
        state: "updated",
        version: activeVersion,
        previousVersion,
        keyId: metadata.keyId
      };
    },
    async rollback({ metadata, signature }) {
      if (!previousVersion) return { state: "denied", reason: "no_previous_version" };
      if (metadata.version !== previousVersion) return { state: "denied", reason: "rollback_target_mismatch" };
      if (!verifiedVersions.has(metadata.version)) return { state: "denied", reason: "rollback_target_unverified" };
      if (!verifyUpdateMetadata({ metadata, signature, key })) {
        return { state: "denied", reason: "signature_check_failed" };
      }
      activeVersion = previousVersion;
      previousVersion = null;
      return {
        state: "rolled_back",
        version: activeVersion,
        keyId: metadata.keyId
      };
    }
  };
}
