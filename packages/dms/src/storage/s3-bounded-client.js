import { S3Client } from "@aws-sdk/client-s3";
import { BoundedS3NodeHttpHandler } from "./s3-bounded-http-handler.js";

const boundedClients = new WeakSet();

export function createBoundedS3Client(options = {}) {
  if (options.requestHandler !== undefined) {
    throw new TypeError("bounded S3 client owns its HTTP request handler");
  }
  const client = new S3Client({ ...options, requestHandler: new BoundedS3NodeHttpHandler() });
  boundedClients.add(client);
  return client;
}

export function assertBoundedS3Client(client) {
  if (client instanceof S3Client && !boundedClients.has(client)) {
    throw new TypeError("S3Client must be created by createBoundedS3Client");
  }
  return client;
}
