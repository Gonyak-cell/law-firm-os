import { GIT_OID, ROLLBACK_ASSIGNMENT_RESTORE_POLICY } from "./constants.mjs";
import {
  assertEqual, assertExactKeys, assertSafeRelativePath, assertSha256, profileMap, requiredText,
} from "./primitives.mjs";

const TOP_KEYS = [
  "assignment_restore_policy", "authoritative_baseline_receipt", "candidate_version",
  "permission_event_diff", "profiles", "raw_assignment_pii_included",
  "raw_manifest_xml_included", "rollback_version", "schema_version", "secret_material_included",
];
const PROFILE_KEYS = [
  "entry_bundle", "event_runtime", "launch_events", "permission", "product_id",
  "profile", "protected_manifest_ref", "rollback_manifest_sha256", "rollback_manifest_url",
  "rollback_version", "source_locations", "source_sha",
  "static_inventory", "taskpane_html",
];
const EXPECTED_EVENTS = {
  "matter-full": ["OnMessageSend:onMessageSendHandler:PromptUser"],
  "inquiry-only": [],
};

function protectedRef(value, name) {
  const ref = assertSafeRelativePath(value, name);
  if (!ref.startsWith(".omo/evidence/")) throw new Error(`${name} must be below protected evidence`);
  return ref;
}

function artifact(value, name) {
  assertExactKeys(value, ["path", "protected_artifact_ref", "sha256"], name);
  const file = assertSafeRelativePath(value.path, `${name}.path`);
  const ref = protectedRef(value.protected_artifact_ref, `${name}.protected_artifact_ref`);
  assertSha256(value.sha256, `${name}.sha256`);
  if (!ref.endsWith(`/${file}`)) throw new Error(`${name} protected ref is not path-bound`);
  return { file, ref, sha256: value.sha256 };
}

function inventory(value, name) {
  assertExactKeys(value, [
    "artifact_count", "inventory_sha256", "protected_inventory_ref", "protected_inventory_sha256",
  ], name);
  if (!Number.isSafeInteger(value.artifact_count) || value.artifact_count < 2) {
    throw new Error(`${name} must describe a complete non-empty bundle`);
  }
  assertSha256(value.inventory_sha256, `${name}.inventory_sha256`);
  assertSha256(value.protected_inventory_sha256, `${name}.protected_inventory_sha256`);
  const ref = protectedRef(value.protected_inventory_ref, `${name}.protected_inventory_ref`);
  if (!ref.endsWith("/static-inventory.json")) throw new Error(`${name} protected ref is not inventory-bound`);
  return { ref };
}

function sourceLocations(value, expected) {
  if (!Array.isArray(value) || !value.length || new Set(value).size !== value.length) {
    throw new Error(`${expected.profile} rollback SourceLocations are incomplete`);
  }
  const expectedPath = expected.profile === "matter-full" ? `/addin/${expected.taskpane_html}` : `/${expected.taskpane_html}`;
  for (const location of value) {
    const url = new URL(requiredText(location, `${expected.profile} rollback SourceLocation`));
    if (url.protocol !== "https:" || url.hash || url.pathname !== expectedPath) {
      throw new Error(`${expected.profile} rollback SourceLocation is not profile-bound`);
    }
  }
  return value;
}

export function validateRollbackContract(rollback, baseline, contract) {
  assertExactKeys(rollback, TOP_KEYS, "rollback contract");
  if (rollback.schema_version !== 3 || rollback.candidate_version !== contract.release_version
    || rollback.rollback_version !== contract.rollback_version
    || rollback.authoritative_baseline_receipt !== contract.baseline_receipt
    || rollback.permission_event_diff !== "none"
    || rollback.assignment_restore_policy !== ROLLBACK_ASSIGNMENT_RESTORE_POLICY) {
    throw new Error("rollback version, permission/event, or assignment restore policy drifted");
  }
  if (rollback.raw_assignment_pii_included !== false || rollback.secret_material_included !== false
    || rollback.raw_manifest_xml_included !== false) {
    throw new Error("rollback contract contains protected material");
  }
  const baselineById = profileMap(baseline?.profiles, "deployment baseline");
  const rollbackById = profileMap(rollback?.profiles, "rollback contract");
  const refs = new Set();
  const criticalHashes = {
    entry: new Set(), inventory: new Set(), inventoryProof: new Set(), taskpane: new Set(),
  };
  const unique = (ref, name) => {
    if (refs.has(ref)) throw new Error(`${name} is shared across rollback profiles`);
    refs.add(ref);
  };
  const profiles = [];
  for (const expected of contract.profiles) {
    const profile = rollbackById.get(expected.product_id);
    const deployed = baselineById.get(expected.product_id);
    assertExactKeys(profile, PROFILE_KEYS, `${expected.profile} rollback profile`);
    if (profile.profile !== expected.profile || profile.rollback_version !== contract.rollback_version
      || profile.source_sha !== baseline.source_sha || !GIT_OID.test(profile.source_sha ?? "")
      || profile.rollback_manifest_sha256 !== deployed.manifest_sha256
      || profile.permission !== expected.permission
      || JSON.stringify(profile.launch_events) !== JSON.stringify(EXPECTED_EVENTS[expected.profile])) {
      throw new Error(`${expected.profile} rollback identity/baseline drifted`);
    }
    const locations = sourceLocations(profile.source_locations, expected);
    const manifestRef = protectedRef(profile.protected_manifest_ref, `${expected.profile} protected_manifest_ref`);
    const taskpane = artifact(profile.taskpane_html, `${expected.profile} taskpane_html`);
    const entry = artifact(profile.entry_bundle, `${expected.profile} entry_bundle`);
    const staticInventory = inventory(profile.static_inventory, `${expected.profile} static_inventory`);
    const expectedPrefix = expected.profile === "inquiry-only" ? "outlook-addin/" : "";
    if (taskpane.file !== expected.taskpane_html || !entry.file.endsWith(".js")
      || (expectedPrefix ? !entry.file.startsWith(expectedPrefix) : entry.file.startsWith("outlook-addin/"))) {
      throw new Error(`${expected.profile} rollback task-pane/entry path drifted`);
    }
    const event = profile.event_runtime == null ? null : artifact(profile.event_runtime, `${expected.profile} event_runtime`);
    if ((expected.profile === "matter-full" && event?.file !== "event-runtime.js")
      || (expected.profile === "inquiry-only" && event !== null)) {
      throw new Error(`${expected.profile} rollback event runtime drifted`);
    }
    for (const [kind, digest] of [
      ["taskpane", taskpane.sha256], ["entry", entry.sha256],
      ["inventory", profile.static_inventory.inventory_sha256],
      ["inventoryProof", profile.static_inventory.protected_inventory_sha256],
    ]) {
      if (criticalHashes[kind].has(digest)) throw new Error(`${expected.profile} rollback ${kind} bytes are shared`);
      criticalHashes[kind].add(digest);
    }
    for (const ref of [manifestRef, taskpane.ref, entry.ref, staticInventory.ref, event?.ref].filter(Boolean)) {
      unique(ref, `${expected.profile} protected rollback artifact`);
    }
    const url = new URL(requiredText(profile.rollback_manifest_url, `${expected.profile} rollback_manifest_url`));
    if (url.protocol !== "https:" || url.search || url.hash
      || !url.pathname.includes(`/${expected.product_id}/${contract.rollback_version}/`)
      || !url.pathname.includes(profile.rollback_manifest_sha256)) {
      throw new Error(`${expected.profile} rollback URL is not immutable and identity-bound`);
    }
    profiles.push({
      product_id: expected.product_id, profile: expected.profile, version: profile.rollback_version,
      source_sha: profile.source_sha, manifest_sha256: profile.rollback_manifest_sha256,
      source_locations: locations, permission: profile.permission, launch_events: profile.launch_events,
      taskpane_html_sha256: taskpane.sha256, entry_bundle_sha256: entry.sha256,
      static_inventory_sha256: profile.static_inventory.inventory_sha256,
      event_runtime_sha256: event?.sha256 ?? null,
    });
  }
  assertEqual(profiles.map(({ product_id }) => product_id).sort(), contract.profiles.map(({ product_id }) => product_id).sort(), "rollback ProductIds");
  return {
    rollback_profile_count: 2,
    permission_event_diff: "none",
    assignment_restore_policy: rollback.assignment_restore_policy,
    profiles,
  };
}
