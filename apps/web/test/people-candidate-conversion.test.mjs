import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-045");

test("candidate entry is blank and fail-closed while existing accepted conversion remains authoritative", async (t) => {
  const harness = await startPeopleManagementHarness();
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-recruiting",
      prepareState(current) {
        current.employees.push(
          {
            employee_id: "emp-no-label",
            display_name: "",
            status: "active",
          },
          {
            employee_id: "emp-uuid-label",
            display_name: "9d49a2cb-d0ff-4a83-876e-e5527bdb67e1",
            status: "active",
          },
          {
            employee_id: "emp-embedded-42",
            display_name: "김유출 (emp-embedded-42)",
            status: "active",
          },
          {
            employee_id: "emp-generic-uuid",
            display_name: "550e8400-e29b-01d4-0716-446655440000",
            status: "active",
          },
          {
            employee_id: "emp-email-label",
            display_name: "lawyer@example.com",
            status: "active",
          },
          {
            employee_id: "emp-hex-label",
            display_name: "0123456789abcdef0123456789abcdef",
            status: "active",
          },
          {
            employee_id: "lee",
            display_name: "Leena Kim",
            status: "active",
          },
        );
        current.recruitingCandidateAdversaries.push(
          {
            candidate_id: "candidate-generic-uuid",
            legal_name: "550e8400-e29b-01d4-0716-446655440000",
            privacy_state: "active",
          },
          {
            candidate_id: "candidate-email-name",
            legal_name: "lawyer@example.com",
            privacy_state: "active",
          },
          {
            candidate_id: "candidate-hex-name",
            legal_name: "0123456789abcdef0123456789abcdef",
            privacy_state: "active",
          },
          {
            candidate_id: "Leena Kim",
            legal_name: "Leena Kim",
            privacy_state: "active",
          },
          {
            candidate_id: "kIM mIN",
            legal_name: "Kim Min",
            privacy_state: "active",
          },
          {
            candidate_id: "candidate-user-name",
            user_id: "Mina Park",
            legal_name: "Mina Park",
            privacy_state: "active",
          },
          {
            candidate_id: "candidate-employee-name",
            employee_id: "PARK JIYOON",
            legal_name: "Park Jiyoon",
            privacy_state: "active",
          },
          {
            candidate_id: "candidate-leena-kim",
            legal_name: "Leena Kim",
            privacy_state: "active",
          },
          {
            candidate_id: "candidate-kim-min",
            legal_name: "Kim Min",
            privacy_state: "active",
          },
        );
        current.recruitingApplicationAdversaries.push({
          application_id: "application-email-name",
          candidate_id: "candidate-email-name",
          job_opening_id: "job-existing",
          stage: "submitted",
        });
      },
    });
    await page.getByRole("button", { name: "채용 절차", exact: true }).click();
    const candidate = page.locator('[data-people-registration-mode="candidate"]');
    const requiredTextFields = [
      "공고명",
      "담당 부서",
      "모집 인원",
      "지원자명",
      "이메일",
      "면접일",
      "면접시간",
      "동의 만료일",
      "보관 종료일",
    ];
    for (const label of requiredTextFields) {
      assert.equal(await candidate.getByLabel(label, { exact: true }).inputValue(), "");
    }
    assert.equal(await candidate.getByLabel("구성원 등록 적용일", { exact: true }).inputValue(), "");
    assert.deepEqual(
      await candidate.locator('select[name="hiring_manager_employee_id"] option').allTextContents(),
      ["구성원 선택", "김아민", "이서윤", "Leena Kim"],
    );
    assert.deepEqual(
      await candidate.locator('select[name="interviewer_employee_id"] option').allTextContents(),
      ["구성원 선택", "김아민", "이서윤", "Leena Kim"],
    );
    const startButton = candidate.getByRole("button", { name: "채용 절차 시작", exact: true });
    assert.equal(await startButton.isDisabled(), true);
    await candidate.getByText(
      "채용 자료 연계 필요: 승인·동의·문서·보상·일정 연계를 설정한 뒤 시작할 수 있습니다.",
      { exact: true },
    ).waitFor();
    const writesBefore = state.requestLog.filter(
      (item) => item.pathname === "/api/hrx/recruiting/pipeline" && item.method === "POST",
    ).length;
    await startButton.evaluate((button) => button.click());
    await page.waitForTimeout(50);
    assert.equal(
      state.requestLog.filter(
        (item) => item.pathname === "/api/hrx/recruiting/pipeline" && item.method === "POST",
      ).length,
      writesBefore,
    );
    assert.equal(state.recruitingPipelineRequests.length, 0);
    const candidateText = await candidate.textContent();
    const privacyRows = candidate.locator('[data-recruiting-privacy-state="true"] > div');
    assert.equal(
      await candidate.getByText("지원자 이름 확인 필요", { exact: true }).count(),
      8,
    );
    assert.deepEqual(
      await privacyRows.locator("strong").allTextContents(),
      [
        "기존 지원자",
        "지원자 이름 확인 필요",
        "지원자 이름 확인 필요",
        "지원자 이름 확인 필요",
        "지원자 이름 확인 필요",
        "지원자 이름 확인 필요",
        "지원자 이름 확인 필요",
        "지원자 이름 확인 필요",
        "Leena Kim",
        "Kim Min",
      ],
    );
    const accessibleLabels = await candidate.evaluate((element) => (
      [...element.querySelectorAll("[aria-label], [title]")]
        .flatMap((node) => [node.getAttribute("aria-label"), node.getAttribute("title")])
        .filter(Boolean)
        .join(" ")
    ));
    assert.doesNotMatch(accessibleLabels, /Leena Kim|kIM mIN|Mina Park|PARK JIYOON/);
    assert.doesNotMatch(
      candidateText,
      /emp-no-label|emp-uuid-label|emp-embedded-42|emp-generic-uuid|emp-email-label|emp-hex-label|candidate-generic-uuid|candidate-email-name|candidate-hex-name|candidate-user-name|candidate-employee-name|candidate-leena-kim|candidate-kim-min|application-email-name|9d49a2cb-d0ff-4a83-876e-e5527bdb67e1|550e8400-e29b-01d4-0716-446655440000|lawyer@example\.com|0123456789abcdef0123456789abcdef|Mina Park|PARK JIYOON|Vault:|CompPackage:/,
    );
    assert.equal(await candidate.locator('[name="offer_document_ref"]').count(), 0);
    assert.equal(await candidate.locator('[name="compensation_ref"]').count(), 0);
    assert.equal(await candidate.locator('[name="consent_evidence_ref"]').count(), 0);
    await page.screenshot({
      path: join(evidenceDir, "candidate-source-authority-required.png"),
      fullPage: true,
    });

    await candidate.getByLabel("구성원 등록 적용일", { exact: true }).fill("2026-08-01");
    const row = candidate.locator('[data-recruiting-application-state="hired"]');
    const convertButton = row.getByRole("button", { name: "구성원 등록", exact: true });
    assert.equal(await convertButton.isEnabled(), true);
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().endsWith("/api/hrx/recruiting/applications/app-existing/convert-to-employee")
        && response.request().method() === "POST"
      )),
      convertButton.click(),
    ]);

    const receipt = page.locator('[data-recruiting-conversion-receipt="completed"]');
    await receipt.getByText("구성원 전환 결과", { exact: true }).waitFor();
    await page.waitForFunction(() => (
      document.querySelectorAll('[data-recruiting-conversion-receipt="completed"] dd').length === 3
    ));
    assert.deepEqual(
      await page.locator('[data-recruiting-conversion-receipt="completed"] dd').allTextContents(),
      ["등록 완료", "등록 완료", "연결 안 함"],
    );
    assert.deepEqual(state.conversionRequests[0], {
      idempotency_key: "candidate-conversion:app-existing",
      effective_from: "2026-08-01",
    });
    assert.equal(
      Object.hasOwn(state.conversionRequests[0], "employee_id")
      || Object.hasOwn(state.conversionRequests[0], "profile_id")
      || Object.hasOwn(state.conversionRequests[0], "manager_employee_id"),
      false,
    );
    const conversionReceipt = state.conversionReceipts.get("candidate-conversion:app-existing");
    assert.match(conversionReceipt.results.employee.value.employee_id, /^emp_candidate_[a-f0-9]{24}$/);
    assert.match(conversionReceipt.results.employment_profile.value.profile_id, /^profile_candidate_[a-f0-9]{24}$/);
    assert.equal(conversionReceipt.results.employment_profile.value.manager_employee_id, "emp-1");
    assert.equal(conversionReceipt.results.employment_profile.value.title, "기존 채용 건");

    await Promise.all([
      page.waitForResponse((response) => (
        response.url().endsWith("/api/hrx/recruiting/applications/app-existing/convert-to-employee")
        && response.request().method() === "POST"
      )),
      row.getByRole("button", { name: "구성원 등록", exact: true }).click(),
    ]);
    assert.equal(state.conversionRequests.length, 2);
    assert.deepEqual(state.conversionRequests[1], state.conversionRequests[0]);
    assert.equal(state.conversionReceipts.size, 1);
    await page.screenshot({
      path: join(evidenceDir, "accepted-candidate-server-derived-replay.png"),
      fullPage: true,
    });
    t.diagnostic(JSON.stringify({
      recruiting_roster_options: ["구성원 선택", "김아민", "이서윤", "Leena Kim"],
      sanitized_candidate_fallback_count: 8,
      exact_and_case_variant_candidate_ids_hidden: true,
      user_and_employee_reference_labels_hidden: true,
      legitimate_candidate_names_preserved: ["Leena Kim", "Kim Min"],
      raw_employee_and_candidate_adversaries_absent: true,
      conversion_request_replayed: true,
      conversion_receipt_count: state.conversionReceipts.size,
      screenshots: [
        "artifacts/people-v2/PEO-TUW-045/candidate-source-authority-required.png",
        "artifacts/people-v2/PEO-TUW-045/accepted-candidate-server-derived-replay.png",
      ],
    }));
    await page.close();
  } finally {
    await harness.close();
  }
});

test("ready recruiting source provider enables one server orchestration request without browser refs", async (t) => {
  const harness = await startPeopleManagementHarness();
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-recruiting",
      prepareState(current) {
        current.recruitingSourceReady = true;
        current.recruitingPipelineFailuresRemaining = 1;
      },
    });
    await page.getByRole("button", { name: "채용 절차", exact: true }).click();
    const candidate = page.locator('[data-people-registration-mode="candidate"]');
    await candidate.getByLabel("공고명", { exact: true }).fill("송무팀 경력 변호사");
    await candidate.getByLabel("담당 부서", { exact: true }).fill("송무팀");
    await candidate.getByLabel("모집 인원", { exact: true }).fill("1");
    await candidate.locator('select[name="hiring_manager_employee_id"]').selectOption("emp-1");
    await candidate.getByLabel("지원자명", { exact: true }).fill("홍길동");
    await candidate.getByLabel("이메일", { exact: true }).fill("candidate.ready@example.test");
    await candidate.getByLabel("면접일", { exact: true }).fill("2026-08-10");
    await candidate.getByLabel("면접시간", { exact: true }).fill("10:30");
    await candidate.locator('select[name="interviewer_employee_id"]').selectOption("emp-2");
    await candidate.getByLabel("동의 만료일", { exact: true }).fill("2027-08-10");
    await candidate.getByLabel("보관 종료일", { exact: true }).fill("2028-08-10");
    const startButton = candidate.getByRole("button", { name: "채용 절차 시작", exact: true });
    assert.equal(await startButton.isEnabled(), true);
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().endsWith("/api/hrx/recruiting/pipeline")
        && response.request().method() === "POST"
      )),
      startButton.click(),
    ]);
    await candidate.getByText("채용 절차를 시작하지 못했습니다", { exact: true }).waitFor();
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().endsWith("/api/hrx/recruiting/pipeline")
        && response.request().method() === "POST"
      )),
      startButton.click(),
    ]);
    await candidate.getByText("채용 절차를 시작했습니다", { exact: true }).waitFor();
    assert.equal(state.recruitingPipelineRequests.length, 2);
    const firstAttempt = state.recruitingPipelineRequests[0];
    const successfulRetry = state.recruitingPipelineRequests[1];
    assert.match(firstAttempt.idempotency_key, /^recruiting-pipeline:[0-9a-f-]{36}$/);
    assert.equal(successfulRetry.idempotency_key, firstAttempt.idempotency_key);
    const { idempotency_key: _firstKey, ...firstPayload } = firstAttempt;
    const { idempotency_key: _retryKey, ...retryPayload } = successfulRetry;
    assert.deepEqual(retryPayload, firstPayload);
    assert.deepEqual(firstPayload, {
      job_title: "송무팀 경력 변호사",
      department_ref: "송무팀",
      position_count: 1,
      hiring_manager_employee_id: "emp-1",
      candidate_name: "홍길동",
      candidate_email: "candidate.ready@example.test",
      interviewer_employee_id: "emp-2",
      interview_date: "2026-08-10",
      interview_time: "10:30",
      consent_expires_at: "2027-08-10",
      retention_expires_at: "2028-08-10",
    });

    state.recruitingPipelineFailuresRemaining = 1;
    await startButton.waitFor({ state: "visible" });
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().endsWith("/api/hrx/recruiting/pipeline")
        && response.request().method() === "POST"
      )),
      startButton.click(),
    ]);
    const postSuccessAttempt = state.recruitingPipelineRequests[2];
    assert.notEqual(postSuccessAttempt.idempotency_key, firstAttempt.idempotency_key);
    await candidate.getByLabel("지원자명", { exact: true }).fill("김새지원");
    await Promise.all([
      page.waitForResponse((response) => (
        response.url().endsWith("/api/hrx/recruiting/pipeline")
        && response.request().method() === "POST"
      )),
      startButton.click(),
    ]);
    const changedFormAttempt = state.recruitingPipelineRequests[3];
    assert.notEqual(changedFormAttempt.idempotency_key, postSuccessAttempt.idempotency_key);
    assert.equal(changedFormAttempt.candidate_name, "김새지원");
    for (const requestBody of state.recruitingPipelineRequests) {
      assert.equal(
        [
          "source_ref",
          "resume_ref",
          "approval_ref",
          "evidence_ref",
          "schedule_source_ref",
          "compensation_ref",
          "document_ref",
          "candidate_id",
          "application_id",
          "offer_id",
          "job_opening_id",
        ].some((field) => Object.hasOwn(requestBody, field)),
        false,
      );
    }
    await page.screenshot({
      path: join(evidenceDir, "candidate-provider-ready-orchestration.png"),
      fullPage: true,
    });
    t.diagnostic(JSON.stringify({
      request_count: state.recruitingPipelineRequests.length,
      unchanged_retry_key_stable:
        successfulRetry.idempotency_key === firstAttempt.idempotency_key,
      post_success_key_rotated:
        postSuccessAttempt.idempotency_key !== firstAttempt.idempotency_key,
      form_change_key_rotated:
        changedFormAttempt.idempotency_key !== postSuccessAttempt.idempotency_key,
      provider_owned_or_server_owned_fields_absent: true,
      screenshot:
        "artifacts/people-v2/PEO-TUW-045/candidate-provider-ready-orchestration.png",
    }));
    await page.close();
  } finally {
    await harness.close();
  }
});
