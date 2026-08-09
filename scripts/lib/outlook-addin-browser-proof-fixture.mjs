function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify({
      safe_error_codes: [],
      production_ready_claim: false,
      ...body,
    }),
  });
}

/** Install the deterministic Office/API boundary used by the client proof. */
export async function setupOutlookInquiryProofPage({
  page,
  web,
  writes,
  inquiryResults,
}) {
  await page.addInitScript(() => {
    window.Office = {
      actions: {
        associate() {},
      },
      MailboxEnums: {
        RestVersion: { v2_0: "v2.0" },
        ItemNotificationMessageType: {
          InformationalMessage: "informationalMessage",
        },
      },
      context: {
        mailbox: {
          item: {
            itemId: "ews-id-must-not-enter-request",
            subject: "해외 거래처 계약 검토 문의",
            normalizedSubject: "해외 거래처 계약 검토 문의",
            internetMessageId: "<outm36-proof@example.invalid>",
            conversationId: "conversation-outm36-proof",
            from: { displayName: "보낸 사람", emailAddress: "sender@example.invalid" },
            to: [{ displayName: "AMIC", emailAddress: "lawyer@example.invalid" }],
            attachments: [],
            body: {
              getAsync(_coercionType, callback) {
                callback({ status: "succeeded", value: "확인 부탁드립니다." });
              },
            },
            getAllInternetHeadersAsync(callback) {
              callback({
                status: "succeeded",
                value: "Date: Fri, 08 Aug 2026 00:00:00 +0900",
              });
            },
          },
          convertToRestId(itemId, version) {
            if (
              itemId !== "ews-id-must-not-enter-request"
              || version !== "v2.0"
            ) {
              throw new Error("unexpected Office.js conversion");
            }
            return "rest-message-t05";
          },
          userProfile: {
            emailAddress: "lawyer@example.invalid",
          },
        },
      },
    };
  });
  await page.addInitScript(() => {
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.outm36proof");
  });
  await page.route("https://appsforoffice.microsoft.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });
  await page.route("**/api/auth/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/auth/office-sso/config") {
      await json(route, {
        item: {
          configured: true,
          client_id: "client-outm36-proof",
          tenant_id: "organizations",
          api_scope: "api://client-outm36-proof/access_as_user",
          scopes: ["api://client-outm36-proof/access_as_user"],
          callback_uri: web.origin + "/oauth-callback.html",
          authority: "https://login.microsoftonline.com/organizations",
        },
      });
      return;
    }
    if (pathname === "/api/auth/session") {
      await json(route, {
        authenticated: true,
        principal: { user_id: "user-outm36-proof", tenant_id: "tenant-t05" },
      });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });
  await page.route("**/api/outlook/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (request.method() === "GET") {
      if (pathname === "/api/outlook/bootstrap") {
        await json(route, {
          item: {
            auth_shell: { signed_session_supported: true },
            external_receipt_boundary: {
              entra_admin_consent_receipt_present: true,
            },
          },
        });
        return;
      }
      if (pathname === "/api/outlook/connection") {
        await json(route, {
          item: {
            status: "connected",
            active: true,
            state_version: 1,
            mailbox_address: "lawyer@example.invalid",
          },
        });
        return;
      }
      if (pathname === "/api/outlook/matters") {
        await json(route, {
          items: [{
            matter_id: "matter-t05",
            lookup_label: "A-2026-014 계약 검토",
            client_display_name: "가나다 주식회사",
            status: "open",
          }],
        });
        return;
      }
      if (pathname === "/api/outlook/inquiries") {
        await json(route, {
          items: [{
            lead_id: "lead-existing-t05",
            party_id: "party-existing-t05",
            display_name: "가나다 주식회사 계약 문의",
            status: "active",
          }],
        });
        return;
      }
      if (pathname.endsWith("/timeline")) {
        const matterId = decodeURIComponent(pathname.split("/").at(-2));
        await json(route, {
          request_id: "request-outm36-timeline",
          outcome: "passed",
          item: {
            matter_id: matterId,
            visible_entries: [],
            page_info: { limit: 8, has_more: false, next_cursor: null },
          },
        });
        return;
      }
      if (pathname.endsWith("/documents")) {
        await json(route, { items: [] });
        return;
      }
    }

    const body = request.postDataJSON();
    writes.push({ pathname, body });
    if (pathname === "/api/outlook/messages/identity") {
      await json(route, {
        outcome: "resolved",
        item: {
          canonical_graph_message_id: "canonical-rest-message-t05",
          rest_message_id: body.rest_message_id,
          internet_message_id: body.internet_message_id,
          conversation_id: body.conversation_id,
        },
      });
      return;
    }
    if (pathname === "/api/outlook/inquiries") {
      const resultKey = body.idempotency_key;
      const prior = inquiryResults.get(resultKey);
      const item = prior ?? {
        action: body.action,
        lead_id: body.action === "new"
          ? "lead-new-t05"
          : body.existing_lead_id,
        party_id: body.action === "new"
          ? "party-new-t05"
          : "party-existing-t05",
        inquiry_email_evidence_id:
          `evidence-${body.action}`,
        idempotent_replay: false,
      };
      inquiryResults.set(resultKey, item);
      await json(route, {
        outcome: "registered",
        item: {
          ...item,
          idempotent_replay: Boolean(prior),
        },
      }, prior ? 200 : 201);
      return;
    }
    if (pathname === "/api/outlook/email/file") {
      const source = body.email;
      const sourceIdentity = {
        canonical_graph_message_id: source.canonical_graph_message_id,
        rest_message_id: source.rest_message_id,
        internet_message_id: source.internet_message_id,
        conversation_id: source.conversation_id,
        item_key: source.item_key,
      };
      const emailThread = {
        email_thread_id: "thread-t05",
        matter_id: body.matter_id,
        ...sourceIdentity,
        status: "active",
        filing_user: "user-outm36-proof",
        filing_time: "2026-08-09T00:00:00.000Z",
        filed_document_ids: ["document-outm36-proof"],
      };
      await json(route, {
        request_id: "request-outm36-proof",
        outcome: "created",
        filing_operation: "manual",
        idempotent_replay: false,
        external_send_state: "not_applicable",
        source_identity: sourceIdentity,
        email_thread: emailThread,
        timeline_event: {
          event_id: "timeline-outm36-proof",
          type: "outlook.email.filed",
          matter_id: body.matter_id,
          source_ref: emailThread.email_thread_id,
        },
        attachment_state: {
          receipts: [],
          retry_attachment_ids: [],
        },
      }, 201);
      return;
    }
    await json(route, { outcome: "created", item: {} }, 201);
  });
}
