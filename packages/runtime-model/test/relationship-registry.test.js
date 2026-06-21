import assert from "node:assert/strict";
import test from "node:test";
import { CANONICAL_RELATIONSHIP_REGISTRY, relationshipTargetsFor, validateCanonicalRelationshipRegistry } from "../src/index.js";

test("Object relationship registry is internally consistent", () => {
  const validation = validateCanonicalRelationshipRegistry();
  assert.deepEqual(validation, { ok: true, errors: [], count: CANONICAL_RELATIONSHIP_REGISTRY.length });
  assert.ok(relationshipTargetsFor("Matter").some((relationship) => relationship.target === "Document"));
  assert.ok(relationshipTargetsFor("Document").some((relationship) => relationship.target === "DocumentVersion"));
});
