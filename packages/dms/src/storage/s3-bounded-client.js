import { S3Client } from "@aws-sdk/client-s3";
import { takeOwnedS3Command } from "./s3-bounded-commands.js";
import { BoundedS3NodeHttpHandler } from "./s3-bounded-http-handler.js";

const apply = Reflect.apply;
const boundedClients = new WeakMap();
const dispatch = S3Client.prototype.send;

function boundedFacade(client, handler, region, endpointMode) {
  const handle = handler.handle;
  const send = (command, ...args) => apply(dispatch, client, [takeOwnedS3Command(command), ...args]);
  const destroy = client.destroy.bind(client);
  Object.freeze(handler);
  const config = Object.freeze({ requestHandler: handler, region, endpoint_mode: endpointMode });
  const facade = Object.create(null);
  Object.defineProperties(facade, {
    config: { enumerable: true, value: config },
    destroy: { value: destroy },
    send: { value: send },
  });
  Object.freeze(facade);
  boundedClients.set(facade, Object.freeze({ config, destroy, dispatch, handle, handler, send }));
  return facade;
}

export function createBoundedS3Client(options = {}, requestHandlerOptions) {
  if (options.requestHandler !== undefined) {
    throw new TypeError("bounded S3 client owns its HTTP request handler");
  }
  const handler = new BoundedS3NodeHttpHandler(requestHandlerOptions);
  const supplied = { ...options };
  const nativeOptions = new Set(["region", "credentials", "maxAttempts", "retryMode"]);
  const customEndpoint = requestHandlerOptions !== undefined
    || Object.keys(supplied).some((field) => !nativeOptions.has(field));
  const configured = { ...supplied, requestHandler: handler, responseChecksumValidation: "WHEN_REQUIRED" };
  const client = new S3Client(configured);
  if (!customEndpoint) {
    const resolveEndpoint = client.config.endpointProvider;
    Object.defineProperty(client.config, "endpointProvider", { enumerable: true, configurable: false, writable: false,
      value(parameters, context) {
        if (parameters.Endpoint != null) {
          throw Object.assign(new Error("configured S3 endpoint overrides are not allowed"), { code: "DMS_S3_ENDPOINT_OVERRIDE" });
        }
        return resolveEndpoint(parameters, context);
      } });
  }
  return boundedFacade(client, handler, typeof configured.region === "string" ? configured.region : null,
    customEndpoint ? "custom" : "aws-default-guarded");
}

export function assertBoundedS3Client(client) {
  const capability = boundedClients.get(client);
  if (!capability
      || capability.dispatch !== dispatch
      || client?.config !== capability.config
      || capability.config.requestHandler !== capability.handler
      || capability.handler.handle !== capability.handle
      || client.destroy !== capability.destroy
      || client.send !== capability.send) {
    throw new TypeError("S3Client must be created by createBoundedS3Client");
  }
  return client;
}
