import { assertSha256, concreteText, utcMillis } from "./primitives.mjs";
import { assertObservedAt } from "./proof-common.mjs";

export const MUTATION_AUTHORIZATION_FIELDS = [
  "authorization_evidence_sha256", "authorization_ref", "operator_ref", "owner_ref",
  "window_end_utc", "window_start_utc",
];

export function validateMutationAuthorization(proof, action, context, name) {
  const authorization = context.authorization;
  if (!authorization?.loaded || !authorization.proof) {
    throw new Error(`${name} requires protected mutation authorization`);
  }
  const expected = authorization.proof;
  assertSha256(proof.authorization_evidence_sha256, `${name} authorization evidence`);
  for (const field of ["authorization_ref", "operator_ref", "owner_ref"]) {
    concreteText(proof[field], `${name} ${field}`);
  }
  if (proof.authorization_evidence_sha256 !== authorization.loaded.evidence_sha256
    || proof.authorization_ref !== expected.authorization_ref
    || proof.operator_ref !== expected.operator_ref || proof.owner_ref !== expected.owner_ref
    || proof.window_start_utc !== expected.window_start_utc || proof.window_end_utc !== expected.window_end_utc) {
    throw new Error(`${name} mutation authorization binding drifted`);
  }
  if (!expected.authorized_actions.includes(action)) {
    throw new Error(`${name} mutation action is not authorized: ${action}`);
  }
  const observed = utcMillis(assertObservedAt(proof.observed_at_utc, `${name} observation`));
  const start = utcMillis(expected.window_start_utc, `${name} authorized window start`);
  const end = utcMillis(expected.window_end_utc, `${name} authorized window end`);
  if (observed < start || observed > end) throw new Error(`${name} mutation occurred outside its authorized window`);
  return { action, observed_at_utc: proof.observed_at_utc };
}
