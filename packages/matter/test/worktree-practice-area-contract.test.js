import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("../../../contracts/matter-worktree-practice-area-contract.json", import.meta.url);
const fixtureUrl = new URL("../fixtures/matter-worktree-practice-area-contract.fixture.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en-US").replaceAll(/[_-]+/g, " ").replaceAll(/\s+/g, " ");
}

function classify(contract, value) {
  const normalized = normalize(value);
  if (!normalized) return contract.unclassified.id;
  return contract.practice_areas.find((area) => area.aliases.some((alias) => normalize(alias) === normalized))?.id ?? contract.unclassified.id;
}

test("WT-00-02 fixes the four canonical practice-area identities", async () => {
  // Given
  const contract = await readJson(contractUrl);

  // When
  const identities = contract.practice_areas.map(({ id, code, label }) => ({ id, code, label }));

  // Then
  assert.deepEqual(identities, [
    { id: "litigation", code: "LIT", label: "송무" },
    { id: "corporate-advisory", code: "ADV", label: "기업 자문" },
    { id: "dispute", code: "Dispute", label: "분쟁" },
    { id: "transaction", code: "DEAL", label: "트랜잭션" },
  ]);
});

test("WT-00-02 maps every declared alias to its canonical practice area", async () => {
  // Given
  const [contract, fixture] = await Promise.all([readJson(contractUrl), readJson(fixtureUrl)]);

  // When
  const actual = fixture.alias_cases.map(({ input }) => classify(contract, input));

  // Then
  assert.deepEqual(actual, fixture.alias_cases.map(({ expected }) => expected));
});

test("WT-00-02 returns unclassified for blank and unknown input", async () => {
  // Given
  const [contract, fixture] = await Promise.all([readJson(contractUrl), readJson(fixtureUrl)]);

  // When
  const actual = fixture.unclassified_cases.map((input) => classify(contract, input));

  // Then
  assert.deepEqual(actual, fixture.unclassified_cases.map(() => "unclassified"));
  assert.equal(contract.unclassified.persisted, false);
});

test("WT-00-02 has no alias collision across practice areas", async () => {
  // Given
  const contract = await readJson(contractUrl);

  // When
  const normalizedAliases = contract.practice_areas.flatMap((area) => area.aliases.map((alias) => normalize(alias)));

  // Then
  assert.equal(new Set(normalizedAliases).size, normalizedAliases.length);
});

test("WT-00-02 preserves the existing Matter board field precedence", async () => {
  // Given
  const contract = await readJson(contractUrl);

  // When
  const fields = contract.source_fields;

  // Then
  assert.deepEqual(fields, ["matter_type_english", "matter_axis", "matter_profile_kind", "profile_kind"]);
});
