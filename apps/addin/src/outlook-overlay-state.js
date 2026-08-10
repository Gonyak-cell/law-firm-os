import { OUTLOOK_OPERATION_STATES } from "./outlook-operation-state.js";

/**
 * A small, serialisable state machine for the one add-in-local Outlook overlay.
 *
 * The state deliberately keeps operation receipts outside the visual open/close
 * flag. Closing a panel is a presentation action; it must never cancel a
 * request or discard a receipt that can be shown when the panel is reopened.
 */

export const OUTLOOK_OVERLAY_STATUS = Object.freeze({
  closed: "closed",
  open: "open",
});

export const OUTLOOK_OVERLAY_EVENT = Object.freeze({
  open: "OPEN",
  close: "CLOSE",
  escape: "ESCAPE",
  outside: "OUTSIDE",
  navigate: "NAVIGATE",
  operationStarted: "OPERATION_STARTED",
  operationState: "OPERATION_STATE",
  itemChanged: "ITEM_CHANGED",
  reset: "RESET",
});

const ACTIVE_OPERATION_STATES = new Set([OUTLOOK_OPERATION_STATES.working]);
const VALID_OPERATION_STATES = new Set(Object.values(OUTLOOK_OPERATION_STATES));
const TERMINAL_OPERATION_STATES = new Set([
  OUTLOOK_OPERATION_STATES.created,
  OUTLOOK_OPERATION_STATES.complete,
  OUTLOOK_OPERATION_STATES.duplicate,
  OUTLOOK_OPERATION_STATES.partial,
  OUTLOOK_OPERATION_STATES.permissionChanged,
  OUTLOOK_OPERATION_STATES.staleItem,
  OUTLOOK_OPERATION_STATES.offline,
  OUTLOOK_OPERATION_STATES.reconnectRequired,
  OUTLOOK_OPERATION_STATES.providerBlocked,
  OUTLOOK_OPERATION_STATES.failed,
]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value) {
  const next = text(value);
  return next || null;
}

function freezeOperation(operation) {
  if (!operation || typeof operation !== "object") return null;
  const status = text(operation.status);
  return Object.freeze({
    key: optionalText(operation.key),
    featureId: optionalText(operation.featureId),
    itemContextKey: optionalText(operation.itemContextKey),
    generation: Number.isInteger(operation.generation) && operation.generation >= 0
      ? operation.generation
      : null,
    status: VALID_OPERATION_STATES.has(status) ? status : OUTLOOK_OPERATION_STATES.working,
    visibleMessage: optionalText(operation.visibleMessage),
    fullMessage: optionalText(operation.fullMessage),
  });
}

function freezeState(state) {
  const operation = freezeOperation(state.operation);
  return Object.freeze({
    open: Boolean(state.open),
    status: state.open ? OUTLOOK_OVERLAY_STATUS.open : OUTLOOK_OVERLAY_STATUS.closed,
    view: text(state.view) || "catalog",
    featureId: optionalText(state.featureId),
    openerId: optionalText(state.openerId),
    restoreFocusTo: optionalText(state.restoreFocusTo === undefined
      ? state.openerId
      : state.restoreFocusTo),
    itemContextKey: optionalText(state.itemContextKey),
    invalidated: Boolean(state.invalidated),
    closeReason: optionalText(state.closeReason),
    generation: Number.isInteger(state.generation) && state.generation >= 0
      ? state.generation
      : 0,
    operation,
  });
}

export function createOutlookOverlayState(input = {}) {
  const initial = input && typeof input === "object" ? input : {};
  return freezeState({
    open: Boolean(initial.open),
    view: initial.view,
    featureId: initial.featureId,
    openerId: initial.openerId,
    restoreFocusTo: initial.restoreFocusTo,
    itemContextKey: initial.itemContextKey,
    invalidated: initial.invalidated,
    closeReason: initial.closeReason,
    generation: initial.generation,
    operation: initial.operation,
  });
}

export const CLOSED_OUTLOOK_OVERLAY_STATE = createOutlookOverlayState();

export function isOutlookOverlayOpen(state) {
  return Boolean(state && state.open === true);
}

export function isOutlookOverlayMutationActive(state) {
  return ACTIVE_OPERATION_STATES.has(text(state?.operation?.status));
}

export function isOutlookOverlayOperationTerminal(state) {
  return TERMINAL_OPERATION_STATES.has(text(state?.operation?.status));
}

export function outlookOverlayFocusTarget(state) {
  return optionalText(state?.restoreFocusTo ?? state?.openerId);
}

function openState(state, input = {}) {
  const featureId = optionalText(input.featureId ?? state.featureId);
  const openerId = optionalText(input.openerId ?? state.openerId);
  const itemContextKey = optionalText(input.itemContextKey ?? state.itemContextKey);
  const view = text(input.view) || (featureId ? "feature" : state.view);
  return freezeState({
    ...state,
    open: true,
    view,
    featureId,
    openerId,
    restoreFocusTo: null,
    itemContextKey,
    invalidated: false,
    closeReason: null,
    generation: state.generation + 1,
    operation: state.operation,
  });
}

function closeState(state, reason = "user") {
  return freezeState({
    ...state,
    open: false,
    restoreFocusTo: state.openerId,
    closeReason: text(reason) || "user",
  });
}

function operationContextMatches(operation, input) {
  for (const field of ["featureId", "itemContextKey"]) {
    if (Object.hasOwn(input, field) && optionalText(input[field]) !== operation[field]) return false;
  }
  return !Object.hasOwn(input, "generation")
    || input.generation === operation.generation;
}

function startOperationState(state, operation = {}) {
  const key = optionalText(operation.key);
  const featureId = optionalText(state.featureId);
  const itemContextKey = optionalText(state.itemContextKey);
  if (!key || !featureId || !itemContextKey || state.invalidated) return state;
  if (isOutlookOverlayMutationActive(state)) return state;
  if (state.operation?.key === key) return state;
  if (!operationContextMatches({
    featureId,
    itemContextKey,
    generation: state.generation,
  }, operation)) return state;
  return freezeState({
    ...state,
    operation: {
      key,
      featureId,
      itemContextKey,
      generation: state.generation,
      status: OUTLOOK_OPERATION_STATES.working,
      visibleMessage: null,
      fullMessage: null,
    },
  });
}

function updateOperationState(state, operation = {}) {
  const existing = state.operation;
  const key = optionalText(operation.key);
  if (!existing || !key || key !== existing.key) return state;
  if (!["featureId", "itemContextKey", "generation"].every((field) => Object.hasOwn(operation, field))) return state;
  if (!operationContextMatches(existing, operation)) return state;
  const nextStatus = operation.status === undefined ? existing.status : text(operation.status);
  if (operation.status !== undefined && !VALID_OPERATION_STATES.has(nextStatus)) return state;
  if (isOutlookOverlayOperationTerminal(state) && ACTIVE_OPERATION_STATES.has(nextStatus)) return state;
  return freezeState({
    ...state,
    operation: {
      ...existing,
      status: nextStatus || existing.status,
      visibleMessage: operation.visibleMessage === undefined
        ? existing.visibleMessage
        : optionalText(operation.visibleMessage),
      fullMessage: operation.fullMessage === undefined
        ? existing.fullMessage
        : optionalText(operation.fullMessage),
    },
  });
}

function invalidateForItemChange(state, currentItemContextKey) {
  const nextKey = optionalText(currentItemContextKey);
  if (!state.itemContextKey || state.itemContextKey === nextKey) return state;
  const operation = state.operation
    ? {
      ...state.operation,
      status: isOutlookOverlayMutationActive(state)
        ? OUTLOOK_OPERATION_STATES.staleItem
        : state.operation.status,
    }
    : null;
  return freezeState({
    ...state,
    open: false,
    featureId: null,
    view: "catalog",
    itemContextKey: nextKey,
    invalidated: true,
    closeReason: "item-changed",
    restoreFocusTo: state.openerId,
    operation,
  });
}

export function reduceOutlookOverlayState(state, event = {}) {
  const current = state && typeof state === "object" && Object.isFrozen(state)
    ? state
    : state && typeof state === "object"
      ? freezeState(state)
    : CLOSED_OUTLOOK_OVERLAY_STATE;
  const type = text(event.type).toUpperCase();
  switch (type) {
    case OUTLOOK_OVERLAY_EVENT.open:
      return openState(current, event);
    case OUTLOOK_OVERLAY_EVENT.close:
      return closeState(current, event.reason);
    case OUTLOOK_OVERLAY_EVENT.escape:
      return closeState(current, "escape");
    case OUTLOOK_OVERLAY_EVENT.outside:
      return closeState(current, "outside");
    case OUTLOOK_OVERLAY_EVENT.navigate:
      return current.invalidated
        ? current
        : freezeState({
          ...current,
          open: true,
          view: text(event.view) || current.view,
          featureId: optionalText(event.featureId ?? current.featureId),
        });
    case OUTLOOK_OVERLAY_EVENT.operationStarted:
      return startOperationState(current, event);
    case OUTLOOK_OVERLAY_EVENT.operationState:
      return updateOperationState(current, event);
    case OUTLOOK_OVERLAY_EVENT.itemChanged:
      return invalidateForItemChange(current, event.itemContextKey);
    case OUTLOOK_OVERLAY_EVENT.reset:
      return CLOSED_OUTLOOK_OVERLAY_STATE;
    default:
      return current;
  }
}

export function openOutlookOverlay(state, input) {
  return reduceOutlookOverlayState(state, {
    type: OUTLOOK_OVERLAY_EVENT.open,
    ...(input ?? {}),
  });
}

export function closeOutlookOverlay(state, reason = "user") {
  return reduceOutlookOverlayState(state, {
    type: OUTLOOK_OVERLAY_EVENT.close,
    reason,
  });
}

export function startOutlookOverlayOperation(state, input) {
  return reduceOutlookOverlayState(state, {
    type: OUTLOOK_OVERLAY_EVENT.operationStarted,
    ...(input ?? {}),
  });
}

export function updateOutlookOverlayOperation(state, input) {
  return reduceOutlookOverlayState(state, {
    type: OUTLOOK_OVERLAY_EVENT.operationState,
    ...(input ?? {}),
  });
}

export function invalidateOutlookOverlayForItemChange(state, itemContextKey) {
  return reduceOutlookOverlayState(state, {
    type: OUTLOOK_OVERLAY_EVENT.itemChanged,
    itemContextKey,
  });
}
