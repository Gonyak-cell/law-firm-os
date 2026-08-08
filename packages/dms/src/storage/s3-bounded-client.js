import { S3Client } from "@aws-sdk/client-s3";
import { BoundedS3NodeHttpHandler } from "./s3-bounded-http-handler.js";

const boundedClients = new WeakMap();

function lockBoundedTransport(client, handler) {
  const config = client.config;
  const handle = handler.handle;
  const send = client.send.bind(client);
  Object.freeze(handler);
  Object.defineProperty(config, "requestHandler", {
    configurable: false,
    enumerable: true,
    value: handler,
    writable: false,
  });
  Object.defineProperty(client, "config", {
    configurable: false,
    enumerable: true,
    value: config,
    writable: false,
  });
  Object.defineProperty(client, "send", {
    configurable: false,
    value: send,
    writable: false,
  });
  boundedClients.set(client, Object.freeze({ config, handle, handler, send }));
}

export function createBoundedS3Client(options = {}, requestHandlerOptions) {
  if (options.requestHandler !== undefined) {
    throw new TypeError("bounded S3 client owns its HTTP request handler");
  }
  const handler = new BoundedS3NodeHttpHandler(requestHandlerOptions);
  const client = new S3Client({ ...options, requestHandler: handler });
  lockBoundedTransport(client, handler);
  return client;
}

export function assertBoundedS3Client(client) {
  const capability = boundedClients.get(client);
  if (!capability
      || client?.config !== capability.config
      || capability.config.requestHandler !== capability.handler
      || capability.handler.handle !== capability.handle
      || client.send !== capability.send) {
    throw new TypeError("S3Client must be created by createBoundedS3Client");
  }
  return client;
}
