import { createS3StorageAdapterForTest } from "../src/storage/s3-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";

function notFound() {
  const error = new Error("not found");
  error.name = "NotFound";
  error.$metadata = { httpStatusCode: 404 };
  return error;
}

function objectGovernanceUnset() {
  const error = new Error("The specified object does not have an Object Lock configuration");
  error.name = "NoSuchObjectLockConfiguration";
  error.$metadata = { httpStatusCode: 404 };
  return error;
}

export function fakeS3Client({
  defaultRetentionUntil = null,
  failDeleteOnce = false,
  failRetentionOnce = false,
  now = () => Date.now(),
} = {}) {
  const objects = new Map();
  let version = 0;
  let deleteFailurePending = failDeleteOnce;
  let retentionFailurePending = failRetentionOnce;
  const etag = (body) => `"${sha256Hex(body).slice(0, 32)}"`;
  return Object.freeze({
    objects,
    async send(command) {
      const { input } = command;
      const name = command.constructor.name;
      if (name === "PutObjectCommand") {
        if (input.IfNoneMatch === "*" && objects.has(input.Key)) {
          const error = new Error("precondition failed");
          error.name = "PreconditionFailed";
          error.$metadata = { httpStatusCode: 412 };
          throw error;
        }
        const body = Buffer.from(input.Body);
        const object = {
          body,
          contentType: input.ContentType,
          metadata: { ...input.Metadata },
          etag: etag(body),
          versionId: `v${++version}`,
          legalHold: "OFF",
          retention: defaultRetentionUntil
            ? { Mode: "GOVERNANCE", RetainUntilDate: new Date(defaultRetentionUntil) }
            : null,
        };
        objects.set(input.Key, object);
        return { ETag: object.etag, VersionId: object.versionId };
      }
      if (name === "HeadObjectCommand") {
        const object = objects.get(input.Key);
        if (!object) throw notFound();
        return {
          ContentLength: object.body.byteLength,
          ContentType: object.contentType,
          Metadata: { ...object.metadata },
          ETag: object.etag,
          VersionId: object.versionId,
        };
      }
      if (name === "GetObjectCommand") {
        const object = objects.get(input.Key);
        if (!object) throw notFound();
        return {
          Body: { transformToByteArray: async () => Uint8Array.from(object.body) },
          ContentLength: object.body.byteLength,
          ContentType: object.contentType,
          Metadata: { ...object.metadata },
          ETag: object.etag,
          VersionId: object.versionId,
        };
      }
      if (name === "CopyObjectCommand") {
        const sourceKey = decodeURIComponent(input.CopySource.slice(input.CopySource.indexOf("/") + 1));
        const source = objects.get(sourceKey);
        if (!source) throw notFound();
        if (input.CopySourceIfMatch && input.CopySourceIfMatch !== source.etag) throw new Error("copy condition failed");
        const copied = { ...source, body: Buffer.from(source.body), metadata: { ...source.metadata }, versionId: `v${++version}` };
        objects.set(input.Key, copied);
        return { CopyObjectResult: { ETag: copied.etag }, VersionId: copied.versionId };
      }
      if (name === "DeleteObjectCommand") {
        const object = objects.get(input.Key);
        if (deleteFailurePending) {
          deleteFailurePending = false;
          const error = new Error("synthetic delete denial");
          error.name = "AccessDenied";
          error.$metadata = { httpStatusCode: 403 };
          throw error;
        }
        if (object?.retention?.RetainUntilDate
          && new Date(object.retention.RetainUntilDate).getTime() > new Date(now()).getTime()
          && input.BypassGovernanceRetention !== true) {
          const error = new Error("governance retention blocks delete");
          error.name = "AccessDenied";
          error.$metadata = { httpStatusCode: 403 };
          throw error;
        }
        if (object && input.IfMatch && input.IfMatch !== object.etag) throw new Error("delete condition failed");
        objects.delete(input.Key);
        return {};
      }
      if (name === "PutObjectLegalHoldCommand") {
        const object = objects.get(input.Key);
        if (!object) throw notFound();
        object.legalHold = input.LegalHold.Status;
        return {};
      }
      if (name === "GetObjectLegalHoldCommand") {
        const object = objects.get(input.Key);
        if (!object) throw notFound();
        if (object.legalHold === "OFF") throw objectGovernanceUnset();
        return { LegalHold: { Status: object.legalHold } };
      }
      if (name === "PutObjectRetentionCommand") {
        if (retentionFailurePending) {
          retentionFailurePending = false;
          throw new Error("synthetic retention failure");
        }
        const object = objects.get(input.Key);
        if (!object) throw notFound();
        if (object.retention
          && new Date(input.Retention.RetainUntilDate).getTime() < new Date(object.retention.RetainUntilDate).getTime()
          && input.BypassGovernanceRetention !== true) {
          const error = new Error("governance retention cannot be shortened without bypass authority");
          error.name = "AccessDenied";
          error.$metadata = { httpStatusCode: 403 };
          throw error;
        }
        object.retention = { ...input.Retention };
        return {};
      }
      if (name === "GetObjectRetentionCommand") {
        const object = objects.get(input.Key);
        if (!object) throw notFound();
        if (!object.retention) throw objectGovernanceUnset();
        return { Retention: object.retention };
      }
      throw new Error(`unsupported fake S3 command: ${name}`);
    },
  });
}

export function adapter(overrides = {}) {
  return createS3StorageAdapterForTest({
    adapter_id: "s3-test",
    bucket: "lawos-dms-test",
    prefix: "synthetic/provider-test",
    expected_bucket_owner: "770880870480",
    credential_ref: "aws-role:test",
    object_lock_enabled: true,
    client: fakeS3Client(),
    ...overrides,
  });
}
