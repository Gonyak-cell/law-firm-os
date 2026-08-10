import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectLegalHoldCommand,
  GetObjectRetentionCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectLegalHoldCommand,
  PutObjectRetentionCommand,
} from "@aws-sdk/client-s3";

const commandAuthority = new WeakMap();
const apply = Reflect.apply;
const weakDelete = WeakMap.prototype.delete;
const weakGet = WeakMap.prototype.get;
const weakSet = WeakMap.prototype.set;

function commandDefinition(Command) {
  return Object.freeze({
    Command,
    resolveMiddleware: Command.prototype.resolveMiddleware,
    resolveMiddlewareWithContext: Command.prototype.resolveMiddlewareWithContext,
  });
}

const DELETE_OBJECT = commandDefinition(DeleteObjectCommand);
const GET_OBJECT = commandDefinition(GetObjectCommand);
const GET_OBJECT_LEGAL_HOLD = commandDefinition(GetObjectLegalHoldCommand);
const GET_OBJECT_RETENTION = commandDefinition(GetObjectRetentionCommand);
const HEAD_OBJECT = commandDefinition(HeadObjectCommand);
const PUT_OBJECT = commandDefinition(PutObjectCommand);
const PUT_OBJECT_LEGAL_HOLD = commandDefinition(PutObjectLegalHoldCommand);
const PUT_OBJECT_RETENTION = commandDefinition(PutObjectRetentionCommand);

function ownedCommand(definition, input) {
  const { Command, resolveMiddleware, resolveMiddlewareWithContext } = definition;
  const command = new Command(input);
  const middlewareStack = command.middlewareStack;
  const identify = middlewareStack.identify;
  const ownedResolveMiddleware = (...args) => apply(resolveMiddleware, command, args);
  const ownedResolveMiddlewareWithContext = (...args) => (
    apply(resolveMiddlewareWithContext, command, args)
  );
  Object.defineProperties(command, {
    resolveMiddleware: { value: ownedResolveMiddleware },
    resolveMiddlewareWithContext: { value: ownedResolveMiddlewareWithContext },
  });
  Object.freeze(middlewareStack);
  Object.freeze(command);
  apply(weakSet, commandAuthority, [command, Object.freeze({
    identify,
    middlewareStack,
    ownedResolveMiddleware,
    ownedResolveMiddlewareWithContext,
  })]);
  return command;
}

export function takeOwnedS3Command(command) {
  const authority = apply(weakGet, commandAuthority, [command]);
  apply(weakDelete, commandAuthority, [command]);
  if (!authority
      || command.resolveMiddleware !== authority.ownedResolveMiddleware
      || command.resolveMiddlewareWithContext !== authority.ownedResolveMiddlewareWithContext
      || command.middlewareStack !== authority.middlewareStack
      || authority.middlewareStack.identify !== authority.identify
      || apply(authority.identify, authority.middlewareStack, []).length !== 0) {
    throw new TypeError("bounded S3 client requires a fresh owned command");
  }
  return command;
}

export const createOwnedDeleteObjectCommand = (input) => ownedCommand(DELETE_OBJECT, input);
export const createOwnedGetObjectCommand = (input) => ownedCommand(GET_OBJECT, input);
export const createOwnedGetObjectLegalHoldCommand = (input) => ownedCommand(GET_OBJECT_LEGAL_HOLD, input);
export const createOwnedGetObjectRetentionCommand = (input) => ownedCommand(GET_OBJECT_RETENTION, input);
export const createOwnedHeadObjectCommand = (input) => ownedCommand(HEAD_OBJECT, input);
export const createOwnedPutObjectCommand = (input) => ownedCommand(PUT_OBJECT, input);
export const createOwnedPutObjectLegalHoldCommand = (input) => ownedCommand(PUT_OBJECT_LEGAL_HOLD, input);
export const createOwnedPutObjectRetentionCommand = (input) => ownedCommand(PUT_OBJECT_RETENTION, input);
