export const DATA_ROOM_G6G_TUW_COVERAGE = Object.freeze(["LFOS-G6-W11-T008"]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

function noRuntimeBoundary(tuwId) {
  return {
    tuw_id: tuwId,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    dispatches_data_room_runtime: false,
    dispatches_vdr_runtime: false,
    reads_object_storage: false,
    writes_object_storage: false,
    g6_runtime_readiness_claim: "open",
    data_room_runtime_readiness_claim: "open",
  };
}

export function createDataRoomG6DataRoomAclDescriptor(request = {}) {
  const dataRoom = request.data_room ?? {};
  const grants = freezeArray(dataRoom.grants ?? request.grants);
  const runtimeDispatch = request.dispatched_runtime === true || dataRoom.dispatched_runtime === true;
  const roomLevelAcl = dataRoom.room_level_acl === true;
  const roomGrantMatched =
    grants.length > 0 && grants.every((grant) => grant?.room_id === dataRoom.room_id && grant?.shared_with_external === true);
  const unauthorizedAccess = request.unauthorized_access === true || dataRoom.unauthorized_access === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "data_room"], request).length > 0) {
    blockedClaims.push("data_room_required_context_missing");
  }
  if (!dataRoom.room_id) blockedClaims.push("data_room_id_required");
  if (!roomLevelAcl || !roomGrantMatched) blockedClaims.push("data_room_room_level_acl_required");
  if (unauthorizedAccess) blockedClaims.push("data_room_unauthorized_access_blocked");
  if (runtimeDispatch) blockedClaims.push("data_room_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W11-T008"),
    descriptor_type: "data_room_g6_data_room_acl_descriptor",
    tenant_id: request.tenant_id ?? dataRoom.tenant_id ?? null,
    matter_id: request.matter_id ?? dataRoom.matter_id ?? null,
    room_id: dataRoom.room_id ?? null,
    grant_count: grants.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    data_room_acl_receipt: freezeRecord({
      room_level_acl_tested: roomLevelAcl && roomGrantMatched,
      unauthorized_access_blocked: unauthorizedAccess,
      data_room_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}
