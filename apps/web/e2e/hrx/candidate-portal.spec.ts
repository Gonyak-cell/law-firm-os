import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Candidate portal fetches candidate-scoped application and document metadata", async () => {
  const component = await readWebFile("src/candidate/CandidatePortal.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");
  const home = await readWebFile("src/people/PeopleHome.tsx");

  assert.match(home, /CandidatePortal/);
  assert.match(component, /fetchCandidatePortal/);
  assert.match(api, /\/api\/hrx\/candidate\/portal/);
  assert.match(component, /Body/);
  assert.match(component, /Omitted/);
  assert.doesNotMatch(component, /resume_body|interview_feedback|mockData/);
});
