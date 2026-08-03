import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

test("employment history separates current, scheduled, and past rows and rejects overlaps", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-040");
  const effectiveDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
  const effectiveFrom = effectiveDate.toISOString().slice(0, 10);
  const previousDate = new Date(effectiveDate.getTime() - (24 * 60 * 60 * 1000))
    .toISOString()
    .slice(0, 10);
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage(harness);
    await page.getByRole("button", { name: "김아민", exact: true }).click();
    await page.getByRole("tab", { name: "프로필" }).click();
    const history = page.locator("[data-people-employment-history]");
    await history.waitFor();
    assert.match(await history.locator("[data-people-employment-current]").innerText(), /파트너 변호사/);

    await history.getByLabel("적용일").fill(effectiveFrom);
    await history.getByLabel("직위").fill("시니어 파트너");
    await history.getByRole("button", { name: "변경 예약" }).click();
    await history.getByText(`${effectiveFrom} / 시니어 파트너 / 재직`, { exact: true }).waitFor();
    assert.match(await history.locator("[data-people-employment-current]").innerText(), /파트너 변호사/);
    assert.equal(state.profiles.get("emp-1")[0].effective_to, previousDate);
    assert.equal(currentTitle(state.profiles.get("emp-1"), previousDate), "파트너 변호사");
    assert.equal(currentTitle(state.profiles.get("emp-1"), effectiveFrom), "시니어 파트너");
    await page.screenshot({
      path: join(evidenceDir, "employment-current-and-scheduled.png"),
      fullPage: true,
    });

    await history.getByLabel("적용일").fill(effectiveFrom);
    await history.getByLabel("직위").fill("겹치는 변경");
    await history.getByRole("button", { name: "변경 예약" }).click();
    await history.getByText("같은 적용일에 이미 등록된 근로정보가 있습니다.", { exact: true }).waitFor();
    assert.equal(await history.getByLabel("직위").inputValue(), "겹치는 변경");
    await page.close();
  } finally {
    await harness.close();
  }
});

function currentTitle(profiles, asOf) {
  return [...profiles]
    .filter((profile) => profile.effective_from <= asOf)
    .filter((profile) => !profile.effective_to || profile.effective_to >= asOf)
    .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
    .at(-1)?.title;
}
