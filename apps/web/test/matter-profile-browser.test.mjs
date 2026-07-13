import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { highestPrivilegeRegisteredAccount } from "../../api/src/matter-vault-account-registry.js";

const baseUrl = process.env.MATTER_PROFILE_UI_URL;
const evidenceDir = process.env.MATTER_PROFILE_EVIDENCE_DIR;

const fixtures = [
  {
    name: "civil",
    button: /^그래비티랩스\/LIT\/CIV\/특허권침해금지/,
    kind: "civil_litigation",
    sectionLabel: "사건 정보",
    labels: ["민사소송", "관할법원", "사건번호", "사건명", "재판부", "재판부 전화번호", "담당주무관"]
  },
  {
    name: "criminal",
    button: /^김현미\/LIT\/CRM\/정보통신망법위반\(명예훼손\)/,
    kind: "criminal_litigation",
    sectionLabel: "사건 정보",
    labels: ["형사소송", "형제번호", "경찰단계 사건번호", "경찰서", "담당 경찰", "검찰청", "담당검사", "형사소송 사건번호", "담당자 전화번호"]
  },
  {
    name: "administrative",
    button: /^강영권\/LIT\/ADM\/세무조사대응/,
    kind: "administrative_litigation",
    sectionLabel: "사건 정보",
    labels: ["행정소송", "관할법원", "사건번호", "사건명", "처분청", "처분명", "기관 담당자", "담당주무관"]
  },
  {
    name: "deal",
    button: /^KWM\/DEAL\/MOU/,
    kind: "deal",
    sectionLabel: "거래 정보",
    labels: ["Deal", "거래규모", "진행단계", "상대방", "상대방 자문펌", "매각자문", "인수자문", "회계법인", "주주 직접 연락"]
  },
  {
    name: "corporate-advisory",
    button: /^귀한사람들\/Advisory\/retainer/,
    kind: "corporate_advisory",
    sectionLabel: "자문 정보",
    labels: ["기업자문", "자문 주제", "요청 범위", "수임 형태", "진행단계", "의뢰 담당자", "납기일", "산출물 참조"]
  }
];

test("Matter profile renders the right contract for every Matter Code family", { skip: !baseUrl }, async (t) => {
  if (evidenceDir) mkdirSync(evidenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  t.after(() => browser.close());
  await page.emulateMedia({ reducedMotion: "reduce" });

  const account = highestPrivilegeRegisteredAccount();
  assert.ok(account?.email && account?.local_dev?.synthetic_token, "local Matter profile browser test needs the registered QA account");
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.local_dev.synthetic_token })
  });
  const loginBody = await loginResponse.json();
  assert.equal(loginResponse.ok, true, "local Matter profile browser test account must authenticate");
  await page.addInitScript((session) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify(session));
  }, {
    token_type: loginBody.token_type,
    session_token: loginBody.session_token,
    expires_at: loginBody.expires_at,
    session: loginBody.session
  });

  await page.goto(`${baseUrl}/?locale=ko&view=matters&ctx=allow#matters-list`, { waitUntil: "networkidle" });
  await page.locator("[data-cmp-g4-live-matters='true']").waitFor();
  for (const fixture of fixtures) {
    const matterButton = page.getByRole("button", { name: fixture.button });
    assert.equal(await matterButton.count(), 1, `${fixture.name} fixture must be unique`);
    await matterButton.click();

    const panel = page.locator("[data-matter-profile-panel='true']");
    await panel.waitFor();
    await page.waitForTimeout(750);
    assert.equal(await panel.getAttribute("data-matter-profile-kind"), fixture.kind);
    assert.equal(await panel.locator(".matter-profile-heading .eyebrow").innerText(), fixture.sectionLabel);
    const text = await panel.innerText();
    for (const label of fixture.labels) assert.match(text, new RegExp(label));
    assert.match(text, /연락처는 CRM 참조로만 연결합니다/);
    assert.match(text, /미입력 · 검토 필요/);
    assert.equal(await panel.locator(".matter-profile-evidence").count(), 1);
    assert.equal(await panel.locator(".matter-stakeholder-form").count(), 0);
    assert.equal(await panel.getByRole("button", { name: "관계자 추가" }).count(), 1);

    if (evidenceDir) await page.locator(".record-overlay-panel").screenshot({ path: join(evidenceDir, `matter-profile-${fixture.name}.png`) });

    if (fixture.name === "corporate-advisory") {
      await panel.getByRole("button", { name: "편집" }).click();
      const form = panel.locator(".matter-profile-form");
      await form.waitFor();
      await form.locator("input").first().fill("브라우저 QA 기업자문");
      const saveResponse = page.waitForResponse((response) => response.request().method() === "PATCH" && /\/api\/matters\/[^/]+\/profile$/.test(new URL(response.url()).pathname));
      await form.getByRole("button", { name: "저장" }).click();
      const response = await saveResponse;
      assert.equal(response.status(), 200, "profile edit must persist through the Matter API");
      assert.equal((await response.json()).outcome, "updated");
      await panel.getByRole("button", { name: "편집" }).waitFor();
      await panel.getByText("브라우저 QA 기업자문", { exact: true }).waitFor({ timeout: 15_000 });
    }

    const overlay = page.locator(".record-overlay-panel");
    const scrolls = await overlay.evaluate((element) => {
      if (element.scrollHeight <= element.clientHeight) return false;
      element.scrollTop = element.scrollHeight;
      return element.scrollTop > 0;
    });
    assert.equal(scrolls || await overlay.evaluate((element) => element.scrollHeight <= element.clientHeight), true, `${fixture.name} overlay must remain readable when content exceeds the viewport`);

    await page.locator("[data-record-overlay='matter'] .record-overlay-scrim").click();
    await panel.waitFor({ state: "hidden" });
  }
});
