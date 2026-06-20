import assert from "node:assert/strict";
import test from "node:test";
import { createApplication, transitionApplicationStage } from "../src/recruiting/application.js";

const application = Object.freeze({
  tenant_id: "tenant-a",
  application_id: "app-001",
  candidate_id: "cand-001",
  job_opening_id: "job-001",
});

test("application pipeline validates ordered stage transitions", () => {
  const submitted = createApplication(application);
  const screening = transitionApplicationStage(submitted, { stage: "screening" });
  const interview = transitionApplicationStage(screening, { stage: "interview" });
  const offer = transitionApplicationStage(interview, { stage: "offer" });
  const hired = transitionApplicationStage(offer, { stage: "hired" });
  assert.equal(hired.stage, "hired");
});

test("application pipeline blocks skipped or terminal transitions", () => {
  const submitted = createApplication(application);
  assert.throws(() => transitionApplicationStage(submitted, { stage: "offer" }), /cannot transition/);
  const rejected = transitionApplicationStage(submitted, { stage: "rejected" });
  assert.throws(() => transitionApplicationStage(rejected, { stage: "screening" }), /cannot transition/);
});
