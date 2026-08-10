import { uploadDocument } from "../../dms/src/document-service.js";
import {
  engagementApprovalError,
  intakeMetadataGuard,
  prepareEngagementApproval,
} from "./engagement-approval-command.js";
import {
  engagementApprovalReplay,
  persistEngagementApproval,
} from "./engagement-approval-persistence.js";

const repositoryFlights = new WeakMap();
const DEFAULT_FOLLOWER_WAIT_MILLIS = 2_000;
const FOLLOWER_CODES = new Set([
  "DMS_UPLOAD_STAGE_LEASE_ACTIVE",
  "DMS_UPLOAD_FINALIZE_LEASE_ACTIVE",
]);

function flightsFor(repository) {
  let flights = repositoryFlights.get(repository);
  if (!flights) {
    flights = new Map();
    repositoryFlights.set(repository, flights);
  }
  return flights;
}

async function boundedLocalFollower(flight, waitMillis) {
  let timer;
  try {
    const result = await Promise.race([
      flight.promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(engagementApprovalError(
          "INTAKE_ENGAGEMENT_APPROVAL_PENDING",
          "engagement approval remains in progress",
          { retryable: true },
        )), waitMillis);
        timer.unref?.();
      }),
    ]);
    return Object.freeze({ ...result, idempotent_replay: true });
  } finally {
    clearTimeout(timer);
  }
}

function assertDmsUpload(prepared, result) {
  if (result?.document?.document_id !== prepared.dms.document.document_id
      || result?.version?.version_id !== prepared.dms.version_id
      || typeof result?.file_object?.file_object_id !== "string"
      || result.version?.file_object_id !== result.file_object.file_object_id
      || result?.storage_receipt?.sha256 !== prepared.dms.expected_sha256
      || Number(result?.storage_receipt?.byte_size) !== prepared.dms.expected_byte_size) {
    throw engagementApprovalError(
      "INTAKE_ENGAGEMENT_DMS_AUTHORITY_MISMATCH",
      "DMS upload receipt does not match the engagement approval",
    );
  }
  return result;
}

async function executeApproval({
  repository,
  prepared,
  dms_repository,
  dms_storage,
  dms_upload_runtime,
  engagement_approval_checkpoint: checkpoint,
  clock,
} = {}) {
  const occurredAt = () => new Date(typeof clock === "function" ? clock() : Date.now()).toISOString();
  if (!prepared.bytes) {
    return checkpoint
      ? checkpoint.finalize_without_dms({ prepared })
      : persistEngagementApproval({ repository, prepared, occurred_at: occurredAt() });
  }
  if (!dms_upload_runtime && (!dms_repository || !dms_storage)) {
    throw new Error("signed document bytes require a DMS upload authority");
  }
  let checkpointResponse = null;
  const beforePersist = checkpoint
    ? async (input) => {
        if (input.phase !== "before_metadata") return;
        checkpointResponse = await checkpoint.before_metadata({ ...input, prepared });
      }
    : undefined;
  const input = {
    document: prepared.dms.document,
    bytes: prepared.bytes,
    actor_id: prepared.actor_id,
    idempotency_key: prepared.dms.idempotency_key,
    session_id: prepared.dms.session_id,
    object_id: prepared.dms.object_id,
    completion_authority: checkpoint ? intakeMetadataGuard(prepared) : undefined,
    beforePersist,
  };
  try {
    const dmsUpload = dms_upload_runtime
      ? await dms_upload_runtime.uploadDocument(input)
      : uploadDocument({ repository: dms_repository, storage: dms_storage, ...input });
    if (!checkpoint) {
      return persistEngagementApproval({
        repository,
        prepared,
        dms_upload: assertDmsUpload(prepared, dmsUpload),
        occurred_at: occurredAt(),
      });
    }
    if (checkpointResponse) return checkpointResponse;
    const replay = await checkpoint.read({ prepared });
    if (replay) return replay;
    throw engagementApprovalError(
      "INTAKE_ENGAGEMENT_REPAIR_REQUIRED",
      "DMS metadata exists without the canonical Intake approval receipt",
    );
  } catch (error) {
    const code = error?.safe_error_code ?? error?.code?.replace(/^LAWOS_/u, "");
    if (checkpoint && FOLLOWER_CODES.has(code)) return checkpoint.wait({ prepared });
    if (["DMS_IDEMPOTENCY_CONFLICT", "DMS_UPLOAD_SESSION_IDENTITY_CONFLICT"].includes(code)) {
      throw engagementApprovalError(
        "IDEMPOTENCY_KEY_REUSED",
        "engagement approval idempotency key was reused",
      );
    }
    throw error;
  }
}

export async function approveEngagement({
  repository,
  engagement,
  actor_id,
  idempotency_key,
  dms_repository,
  dms_storage,
  dms_upload_runtime,
  engagement_approval_checkpoint,
  clock,
  follower_wait_millis = DEFAULT_FOLLOWER_WAIT_MILLIS,
} = {}) {
  const prepared = prepareEngagementApproval({ engagement, actor_id, idempotency_key });
  const localReplay = engagementApprovalReplay(repository, prepared);
  if (localReplay) return localReplay;
  if (engagement_approval_checkpoint) {
    const durableReplay = await engagement_approval_checkpoint.read({ prepared });
    if (durableReplay) return durableReplay;
    return executeApproval({
      repository, prepared, dms_repository, dms_storage, dms_upload_runtime,
      engagement_approval_checkpoint, clock,
    });
  }
  const flights = flightsFor(repository);
  const flightKey = `${prepared.tenant_id}\x1f${prepared.idempotency_key}`;
  const flight = flights.get(flightKey);
  if (flight) {
    if (flight.request_fingerprint !== prepared.request_fingerprint) {
      throw engagementApprovalError("IDEMPOTENCY_KEY_REUSED", "engagement approval idempotency key was reused");
    }
    return boundedLocalFollower(flight, follower_wait_millis);
  }
  const promise = executeApproval({
    repository, prepared, dms_repository, dms_storage, dms_upload_runtime, clock,
  });
  flights.set(flightKey, Object.freeze({
    request_fingerprint: prepared.request_fingerprint,
    promise,
  }));
  try {
    return await promise;
  } finally {
    if (flights.get(flightKey)?.promise === promise) {
      flights.delete(flightKey);
    }
  }
}
