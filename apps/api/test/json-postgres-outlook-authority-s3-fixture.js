import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

export function memoryS3() {
  const objects = new Map();
  const operations = [];
  let replayMetadata = (metadata) => metadata;
  return {
    objects,
    operations,
    setReplayMetadata(transform) {
      replayMetadata = transform;
    },
    async send(command) {
      operations.push(command);
      const { input } = command;
      if (command instanceof PutObjectCommand) {
        if (objects.has(input.Key)) {
          throw Object.assign(new Error("exists"), {
            name: "PreconditionFailed",
            $metadata: { httpStatusCode: 412 },
          });
        }
        objects.set(input.Key, { input, body: Buffer.from(input.Body) });
        return { VersionId: "version-1" };
      }
      if (!(command instanceof GetObjectCommand)) {
        throw new Error("unexpected S3 operation");
      }
      const stored = objects.get(input.Key);
      if (!stored) {
        throw Object.assign(new Error("missing"), {
          name: "NoSuchKey",
          $metadata: { httpStatusCode: 404 },
        });
      }
      const metadata = replayMetadata({
        VersionId: "version-1",
        ContentLength: stored.body.byteLength,
        ContentType: stored.input.ContentType,
        ServerSideEncryption: stored.input.ServerSideEncryption,
        SSEKMSKeyId: stored.input.SSEKMSKeyId,
        ObjectLockMode: stored.input.ObjectLockMode,
        ObjectLockRetainUntilDate: stored.input.ObjectLockRetainUntilDate,
      });
      return { ...metadata, Body: stored.body };
    },
  };
}

export function firstStoredClaim(client) {
  const [stored] = [...client.objects.values()];
  return stored;
}

export function mutateStoredClaim(client, mutate) {
  const stored = firstStoredClaim(client);
  const claim = JSON.parse(stored.body);
  mutate(claim);
  stored.body = Buffer.from(`${canonicalizeJson(claim)}\n`);
}
