import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createBoundedS3Client } from "../../../packages/dms/src/storage/s3-bounded-client.js";
import { createOpaqueStorageKey, sha256Hex } from "../../../packages/dms/src/storage/storage-adapter.js";
import { createHrxMemberPhotoMetadata, createHrxMemberPhotoStorage } from "../../../packages/hrx/src/member-photo-storage.js";
import { createPostgresMemberPhotoStorageFromEnv } from "../src/server.js";

const PHOTO_ENV = Object.freeze({
  LAWOS_DMS_S3_BUCKET: "private-photos-test",
  LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER: "123456789012",
  LAWOS_DMS_S3_REGION: "ap-northeast-2",
  LAWOS_MEMBER_PHOTO_S3_PREFIX: "approved-test/member-photos",
  LAWOS_DMS_S3_KMS_KEY_ID: "arn:aws:kms:ap-northeast-2:123456789012:key/test-key",
  LAWOS_DMS_S3_CREDENTIAL_REF: "aws-role:test-photo-reader",
});
const DMS_STORAGE = Object.freeze({
  provider: "s3",
  bucket_ref: "s3://private-photos-test/lawos-dms",
});
const preflightError = (error) => error?.code === "LAWOS_RUNTIME_PREFLIGHT_FAILED";

test("member photo S3 configuration fails closed instead of using common DMS storage", () => {
  assert.throws(() => createPostgresMemberPhotoStorageFromEnv({}, { dmsStorage: DMS_STORAGE }), preflightError);
  for (const key of Object.keys(PHOTO_ENV)) {
    const env = { ...PHOTO_ENV };
    delete env[key];
    assert.throws(() => createPostgresMemberPhotoStorageFromEnv(env, { dmsStorage: DMS_STORAGE }), preflightError);
  }
  for (const field of ["BUCKET", "EXPECTED_BUCKET_OWNER", "REGION", "KMS_KEY_ID", "CREDENTIAL_REF"]) {
    assert.throws(() => createPostgresMemberPhotoStorageFromEnv({
      ...PHOTO_ENV, [`LAWOS_MEMBER_PHOTO_S3_${field}`]: PHOTO_ENV[`LAWOS_DMS_S3_${field}`],
    }, { dmsStorage: DMS_STORAGE }), preflightError);
  }
  const syntheticStorage = createLocalStorageAdapter();
  assert.equal(createPostgresMemberPhotoStorageFromEnv({
    LAWOS_DATA_SCOPE: "synthetic-only",
  }, { dmsStorage: syntheticStorage }), syntheticStorage);
  assert.throws(() => createPostgresMemberPhotoStorageFromEnv({
    LAWOS_DATA_SCOPE: "synthetic-only", LAWOS_MEMBER_PHOTO_S3_PREFIX: "partial/config",
  }, { dmsStorage: syntheticStorage }), preflightError);
  assert.throws(() => createPostgresMemberPhotoStorageFromEnv({
    LAWOS_DATA_SCOPE: "approved-real-migration",
  }, { dmsStorage: syntheticStorage }), preflightError);
  assert.throws(() => createPostgresMemberPhotoStorageFromEnv({
    LAWOS_DATA_SCOPE: "synthetic-only",
  }, { dmsStorage: DMS_STORAGE }), preflightError);
});

test("member photo configuration rejects ambiguous prefixes and mismatched KMS ownership", () => {
  for (const prefix of ["/", "/photos", "photos/", "photos//people", "photos/../people", "photos/./people", "photos\\people", "photos/ people", "lawos-dms", "lawos-dms/photos"] ) {
    assert.throws(() => createPostgresMemberPhotoStorageFromEnv({
      ...PHOTO_ENV, LAWOS_MEMBER_PHOTO_S3_PREFIX: prefix,
    }, { dmsStorage: DMS_STORAGE }), preflightError);
  }
  assert.throws(() => createPostgresMemberPhotoStorageFromEnv({
    ...PHOTO_ENV, LAWOS_MEMBER_PHOTO_S3_PREFIX: "shared",
  }, { dmsStorage: { ...DMS_STORAGE, bucket_ref: "s3://private-photos-test/shared/vault" } }), preflightError);
  for (const override of [
    { LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER: "invalid-owner" },
    { LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER: "000000000000" },
    { LAWOS_DMS_S3_REGION: "us-east-1" },
    { LAWOS_DMS_S3_KMS_KEY_ID: "alias/photos" },
    { LAWOS_DMS_S3_KMS_KEY_ID: "arn:aws:kms:ap-northeast-2:123456789012:key/" },
  ]) {
    assert.throws(() => createPostgresMemberPhotoStorageFromEnv({
      ...PHOTO_ENV, ...override,
    }, { dmsStorage: DMS_STORAGE }), preflightError);
  }
});

test("composed member photo reader uses its own S3 prefix, owner and bounded body with scope and version guards", async (t) => {
  const scope = { tenant_id: "tenant-photo-test", legal_entity_id: "entity-photo-test", employee_id: "employee-photo-test" };
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const photo = createHrxMemberPhotoMetadata({
    ...scope, photo_sha256: sha256Hex(bytes), photo_byte_size: bytes.length, photo_version_id: "photo-version-1",
  });
  const objectKey = createOpaqueStorageKey({ tenant_id: scope.tenant_id, object_id: photo.photo_object_id });
  const expectedPath = `/${PHOTO_ENV.LAWOS_DMS_S3_BUCKET}/${PHOTO_ENV.LAWOS_MEMBER_PHOTO_S3_PREFIX}/objects/${objectKey}`;
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({ method: req.method, path: req.url, owner: req.headers["x-amz-expected-bucket-owner"], range: req.headers.range });
    if (req.headers["x-amz-expected-bucket-owner"] !== PHOTO_ENV.LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER) {
      res.writeHead(403, { "content-length": "0" }); res.end(); return;
    }
    if (new URL(req.url, "http://localhost").pathname !== expectedPath) {
      res.writeHead(404, { "content-length": "0" }); res.end(); return;
    }
    const headers = {
      "content-type": "image/png", "content-length": String(bytes.length),
      "x-amz-version-id": photo.photo_version_id,
      "x-amz-meta-lawos-tenant-ref": sha256Hex(Buffer.from(scope.tenant_id)),
      "x-amz-meta-lawos-object-ref": sha256Hex(Buffer.from(photo.photo_object_id)),
      "x-amz-meta-lawos-sha256": photo.photo_sha256,
      "x-amz-meta-lawos-byte-size": String(bytes.length),
    };
    res.writeHead(req.method === "GET" ? 206 : 200, {
      ...headers,
      ...(req.method === "GET" ? { "content-range": `bytes 0-${bytes.length - 1}/${bytes.length}` } : {}),
    });
    res.end(req.method === "GET" ? bytes : undefined);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const client = createBoundedS3Client({
    endpoint: `http://127.0.0.1:${server.address().port}`,
    region: PHOTO_ENV.LAWOS_DMS_S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: "synthetic-test", secretAccessKey: "synthetic-test" },
  });
  t.after(async () => {
    client.destroy(); server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const storage = createPostgresMemberPhotoStorageFromEnv(PHOTO_ENV, { dmsStorage: DMS_STORAGE, client });
  assert.equal(storage.bucket_ref, "s3://private-photos-test/approved-test/member-photos");
  assert.equal(storage.kms_key_ref, PHOTO_ENV.LAWOS_DMS_S3_KMS_KEY_ID);
  assert.equal(DMS_STORAGE.bucket_ref, "s3://private-photos-test/lawos-dms");
  const reader = createHrxMemberPhotoStorage({ storage });
  assert.deepEqual((await reader.readPhoto({ ...scope, photo })).bytes, bytes);
  assert.equal(requests.length, 3);
  assert.equal(requests.every((request) => new URL(request.path, "http://localhost").pathname === expectedPath), true);
  assert.equal(requests.every((request) => request.owner === PHOTO_ENV.LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER), true);
  assert.equal(requests.at(-1).range, "bytes=0-5242880");
  for (const field of Object.keys(scope)) {
    await assert.rejects(reader.readPhoto({ ...scope, [field]: "other-scope", photo }),
      (error) => error?.safe_error_code === "HRX_MEMBER_PHOTO_SCOPE_MISMATCH");
  }
  assert.equal(requests.length, 3);
  await assert.rejects(reader.readPhoto({ ...scope, photo: { ...photo, photo_version_id: "other-version" } }),
    (error) => error?.safe_error_code === "HRX_MEMBER_PHOTO_VERSION_MISMATCH");
  assert.equal(requests.at(-1).method, "HEAD");
  const wrongPrefix = createHrxMemberPhotoStorage({ storage: createPostgresMemberPhotoStorageFromEnv({
    ...PHOTO_ENV, LAWOS_MEMBER_PHOTO_S3_PREFIX: "other/member-photos",
  }, { dmsStorage: DMS_STORAGE, client }) });
  await assert.rejects(wrongPrefix.readPhoto({ ...scope, photo }),
    (error) => error?.safe_error_code === "HRX_MEMBER_PHOTO_NOT_FOUND");
  const wrongOwner = createHrxMemberPhotoStorage({ storage: createPostgresMemberPhotoStorageFromEnv({
    ...PHOTO_ENV,
    LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER: "000000000000",
    LAWOS_DMS_S3_KMS_KEY_ID: "arn:aws:kms:ap-northeast-2:000000000000:key/test-key",
  }, { dmsStorage: DMS_STORAGE, client }) });
  await assert.rejects(wrongOwner.readPhoto({ ...scope, photo }),
    (error) => error?.$metadata?.httpStatusCode === 403);
  assert.equal(requests.filter((request) => request.method === "GET").length, 1);
});
