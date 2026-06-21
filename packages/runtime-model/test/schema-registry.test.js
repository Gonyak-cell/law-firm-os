import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_MODEL_TUW_OBJECT_MAP,
  getCanonicalObjectDefinition,
  listCanonicalObjectDefinitions,
  requiredCanonicalObjectTypes
} from "../src/index.js";

test("Canonical glossary covers RS-4 objects and TUWs", () => {
  const definitions = listCanonicalObjectDefinitions();
  assert.equal(definitions.length, 25);
  assert.deepEqual([...requiredCanonicalObjectTypes()].sort(), definitions.map((definition) => definition.object_type).sort());
  for (let index = 1; index <= 20; index += 1) {
    const tuwId = `RS-4-T${String(index).padStart(2, "0")}`;
    assert.ok(CANONICAL_MODEL_TUW_OBJECT_MAP[tuwId]?.length > 0, `${tuwId} must have object coverage`);
  }
  assert.equal(getCanonicalObjectDefinition("Matter").owner_module, "matter");
  assert.equal(getCanonicalObjectDefinition("Employee").owner_module, "hrx");
  assert.equal(getCanonicalObjectDefinition("Document").owner_module, "dms");
});
