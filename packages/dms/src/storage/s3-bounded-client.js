import { S3Client } from "@aws-sdk/client-s3";
import { BoundedS3NodeHttpHandler } from "./s3-bounded-http-handler.js";

const boundedClients = new WeakMap();

function boundedFacade(client, handler) {
  const handle = handler.handle;
  const send = client.send.bind(client);
  const destroy = client.destroy.bind(client);
  Object.freeze(handler);
  const config = Object.freeze({ requestHandler: handler });
  const facade = Object.create(null);
  Object.defineProperties(facade, {
    config: { enumerable: true, value: config },
    destroy: { value: destroy },
    send: { value: send },
  });
  Object.freeze(facade);
  boundedClients.set(facade, Object.freeze({ config, destroy, handle, handler, send }));
  return facade;
}

export function createBoundedS3Client(options = {}, requestHandlerOptions) {
  if (options.requestHandler !== undefined) {
    throw new TypeError("bounded S3 client owns its HTTP request handler");
  }
  const handler = new BoundedS3NodeHttpHandler(requestHandlerOptions);
  const client = new S3Client({ ...options, requestHandler: handler });
  return boundedFacade(client, handler);
}

export function assertBoundedS3Client(client) {
  const capability = boundedClients.get(client);
  if (!capability
      || client?.config !== capability.config
      || capability.config.requestHandler !== capability.handler
      || capability.handler.handle !== capability.handle
      || client.destroy !== capability.destroy
      || client.send !== capability.send) {
    throw new TypeError("S3Client must be created by createBoundedS3Client");
  }
  return client;
}
