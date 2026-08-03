import assert from "node:assert/strict";
import test from "node:test";
import {
  FIXTURE,
  apiRecordsSince,
  runPaymentReversalBrowserScenario
} from "./support/payment-reversal-browser-fixture.mjs";
import { expectedWireIds, publishPaymentReversalEvidence, publishPaymentReversalNegativeEvidence } from "./support/payment-reversal-browser-evidence.mjs";

export async function executePaymentReversalFlow({ page, overlay, reasonInput, reversalButton, result, arSummary, requests, captureScreenshot, signedRequestCountBeforeReason }) {
      assert.equal(await reversalButton.isDisabled(), true);
      assert.ok(signedRequestCountBeforeReason > 0);

      await reasonInput.fill("실패 검증");
      assert.equal(await reversalButton.isEnabled(), true);
      await reversalButton.click();
      await result.locator("small").filter({ hasText: "처리하지 못했습니다." }).waitFor();
      assert.equal(await result.getAttribute("data-matter-payment-reversal-result"), "error");
      assert.equal(await arSummary.getAttribute("data-matter-ar-balance"), "0");
      assert.equal(await arSummary.getAttribute("data-matter-ar-bucket"), "none");
      assert.equal(await reversalButton.count(), 1);
      assert.equal(await reasonInput.inputValue(), "실패 검증");
      const firstFailurePost = requests.findLast((record) => record.method === "POST" && record.path.endsWith("/reversal"));
      assert.ok(firstFailurePost);
      assert.equal(
        requests.filter((record) => record.sequence > firstFailurePost.sequence && record.method === "GET" && record.path.startsWith("/api/matter/ops/")).length,
        0,
        "ordinary failure must not refresh any Matter surface"
      );
      const failureScreenshot = await captureScreenshot("failure");

      await reasonInput.fill("중복 배정 정정");
      await reversalButton.click();
      const persistedReloadMessage = "입금 배정 취소는 저장됐지만 최신 입금·사건·미수금 상태를 모두 불러오지 못했습니다.";
      await result.locator("small").filter({ hasText: persistedReloadMessage }).waitFor();
      assert.equal(await result.getAttribute("data-matter-payment-reversal-result"), "error");
      assert.equal(await arSummary.getAttribute("data-matter-ar-balance"), "0");
      assert.equal(await arSummary.getAttribute("data-matter-ar-bucket"), "none");
      assert.equal(await reversalButton.count(), 1);
      const persistedPost = requests.findLast((record) => record.method === "POST" && record.path.endsWith("/reversal"));
      assert.ok(persistedPost);
      const persistedRefresh = apiRecordsSince(requests, persistedPost.sequence);
      const persistedRefreshMatterOps = persistedRefresh.filter((record) => record.method === "GET" && record.path.startsWith("/api/matter/ops/"));
      assert.equal(persistedRefreshMatterOps.length, 4, "persisted failure must observe all four controller refresh targets");
      assert.equal(persistedRefreshMatterOps.filter((record) => record.response_status === 200).length, 3);
      assert.equal(persistedRefreshMatterOps.filter((record) => record.response_status === 503).length, 1, "persisted refresh failure must remain 503");
      const persistedReloadFailureScreenshot = await captureScreenshot("persisted-reload-failure");

      await reversalButton.click();
      await result.locator("small").filter({ hasText: "입금 배정을 취소하고 미수금을 다시 계산했습니다." }).waitFor();
      await page.waitForFunction(() =>
        document.querySelector("[data-matter-ar-balance]")?.getAttribute("data-matter-ar-balance") === "100000"
      );
      assert.equal(await result.getAttribute("data-matter-payment-reversal-result"), "data");
      assert.equal(await arSummary.getAttribute("data-matter-ar-balance"), "100000");
      assert.equal(await arSummary.getAttribute("data-matter-ar-bucket"), "bucket_1_30");
      assert.equal(await reversalButton.count(), 0);
      const invoiceRow = overlay.getByText("청구서 1", { exact: true }).locator("xpath=ancestor::tr");
      const invoiceRowText = await invoiceRow.textContent();
      assert.match(invoiceRowText, /진행 중/u);
      assert.doesNotMatch(invoiceRowText, /수납 완료/u);
      const successPost = requests.findLast((record) => record.method === "POST" && record.path.endsWith("/reversal"));
      assert.ok(successPost);
      const successRefresh = apiRecordsSince(requests, successPost.sequence);
      const successRefreshMatterOps = successRefresh.filter((record) => record.method === "GET" && record.path.startsWith("/api/matter/ops/"));
      assert.equal(successRefreshMatterOps.length, 4, "successful reversal must observe all four controller refresh targets");
      assert.deepEqual(
        successRefreshMatterOps.map((record) => record.path).sort(),
        [
          "/api/matter/ops/payments",
          `/api/matter/ops/matters/${FIXTURE.matterId}`,
          `/api/matter/ops/matters/${FIXTURE.matterId}/closeout`,
          "/api/matter/ops/time-billing"
        ].sort()
      );
      const successScreenshot = await captureScreenshot("success");

      const reversalPosts = requests.filter((record) => record.method === "POST" && record.path.endsWith("/reversal"));
      const refreshGets = requests.filter((record) => record.method === "GET" && record.path.startsWith("/api/matter/ops/") && record.sequence > firstFailurePost.sequence);
      assert.equal(reversalPosts.length, 3);
      assert.deepEqual(reversalPosts.map((record) => record.response_status), [503, 200, 200]);
      assert.equal(refreshGets.length, 8);
      const wireIds = expectedWireIds();
      assert.equal(reversalPosts[0].body.idempotency_key, wireIds.idempotency_key);
      assert.equal(reversalPosts[1].body.idempotency_key, wireIds.idempotency_key);
      assert.equal(reversalPosts[2].body.idempotency_key, wireIds.idempotency_key);
      assert.equal(reversalPosts[0].body.reversal_payment_allocation_id, wireIds.reversal_payment_allocation_id);
      assert.equal(reversalPosts[1].body.reversal_payment_allocation_id, wireIds.reversal_payment_allocation_id);
      assert.equal(reversalPosts[2].body.reversal_payment_allocation_id, wireIds.reversal_payment_allocation_id);
      assert.equal(reversalPosts[0].body.reason, "실패 검증");
      assert.equal(reversalPosts[1].body.reason, "중복 배정 정정");
      assert.equal(reversalPosts[2].body.reason, "중복 배정 정정");
      assert.equal(reversalPosts[0].body.matter_id, FIXTURE.matterId);
      for (const post of reversalPosts) {
        for (const forbidden of ["actor_id", "tenant_id", "amount", "currency", "invoice_id"]) {
          assert.equal(forbidden in post.body, false);
        }
      }
      assert.equal(reversalPosts[2].query.tenant_id, FIXTURE.tenantMatter);
      assert.equal(reversalPosts[2].headers.authorization, "Bearer lawos_session_v1.payment_reversal_browser");

      return {
        observations: {
          requests_before_reason: signedRequestCountBeforeReason,
          failure: {
            response_status: reversalPosts[0].response_status,
            visible_result: "처리하지 못했습니다.", ar_balance: 0, ar_bucket: "none",
            active_reversal_button_count: 1, refresh_request_count: 0
          },
          persisted_reload_failure: {
            response_status: persistedRefreshMatterOps.find((record) => record.response_status === 503)?.response_status,
            visible_result: persistedReloadMessage, ar_balance: 0, ar_bucket: "none",
            active_reversal_button_count: 1, refresh_request_count: persistedRefreshMatterOps.length
          },
          success: {
            response_status: reversalPosts[2].response_status,
            visible_result: "입금 배정을 취소하고 미수금을 다시 계산했습니다.", ar_balance: 100_000,
            ar_bucket: "bucket_1_30", invoice_status: "sent", invoice_visible_status: "진행 중",
            active_reversal_button_count: 0
          },
          stable_wire_ids_match: reversalPosts.every((record) => record.body.idempotency_key === wireIds.idempotency_key && record.body.reversal_payment_allocation_id === wireIds.reversal_payment_allocation_id),
          total_refresh_count_after_first_mutation: refreshGets.length,
          screenshots: { failure: failureScreenshot, persisted_reload_failure: persistedReloadFailureScreenshot, success: successScreenshot }
        }
      };
}

test("rendered production MattersSurface/controller reversal preserves failure, persisted reload failure, and success", { timeout: 60_000 }, async () => {
  await runPaymentReversalBrowserScenario({ exercise: executePaymentReversalFlow, publishEvidence: publishPaymentReversalEvidence });
});

test("negative control: removing one production refresh target makes the exact rendered contract go red", { timeout: 60_000 }, async () => {
  await assert.rejects(
    runPaymentReversalBrowserScenario({
      mutation: { breakRefreshTarget: true },
      captureEvidence: false,
      exercise: executePaymentReversalFlow,
      onError: ({ error, requests }) => publishPaymentReversalNegativeEvidence({ error, requests })
    }),
    /persisted refresh failure must remain 503/
  );
});
