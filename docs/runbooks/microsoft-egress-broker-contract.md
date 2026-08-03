# Microsoft egress broker contract

Production function: `lawos-microsoft-egress-prod`

Contract version: `lawos.microsoft-egress.v1`

The API invokes the Lambda synchronously through the private Lambda interface
endpoint. A request cannot contain a target URL or arbitrary HTTP headers. The
broker constructs every Microsoft host, path, method, and header. Every upstream
call uses `redirect: "error"`, and the handler does not log request or response
payloads.

## Envelope

Request:

```json
{
  "contract_version": "lawos.microsoft-egress.v1",
  "operation": "oauth.jwks.get",
  "request": {}
}
```

Success:

```json
{
  "contract_version": "lawos.microsoft-egress.v1",
  "operation": "oauth.jwks.get",
  "ok": true,
  "status": 200,
  "result": {}
}
```

Failure:

```json
{
  "contract_version": "lawos.microsoft-egress.v1",
  "operation": "oauth.jwks.get",
  "ok": false,
  "status": 400,
  "error": { "code": "INVALID_REQUEST" }
}
```

The broker never returns a Microsoft error body. `error` can additionally
contain only `retry_after_seconds` and `provider_request_id`.

## Fixed operations

### `oauth.jwks.get`

Request:

```json
{ "tenant_id": "uuid" }
```

Result:

```json
{
  "keys": [
    { "kty": "RSA", "kid": "...", "n": "...", "e": "AQAB" }
  ],
  "provider_request_id": "..."
}
```

### `oauth.token.exchange`

Request:

```json
{
  "tenant_id": "uuid",
  "client_id": "uuid",
  "client_secret": "optional confidential-client secret",
  "authorization_code": "...",
  "code_verifier": "43-128 PKCE characters",
  "redirect_profile": "people",
  "scopes": [
    "openid",
    "profile",
    "email",
    "offline_access",
    "Calendars.ReadBasic"
  ]
}
```

`redirect_profile` is exactly `people` or `client`. The broker maps `people`
to `matter://auth/callback` and `client` to
`https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback`.
The caller cannot submit a callback URL.

Result:

```json
{
  "token_type": "Bearer",
  "scope": "...",
  "expires_in": 3600,
  "ext_expires_in": 3600,
  "access_token": "...",
  "refresh_token": "...",
  "id_token": "...",
  "provider_request_id": "..."
}
```

`ext_expires_in`, `refresh_token`, and `id_token` are optional.

### `oauth.token.refresh`

Request:

```json
{
  "tenant_id": "uuid",
  "client_id": "uuid",
  "client_secret": "optional confidential-client secret",
  "refresh_token": "...",
  "scopes": ["offline_access", "Calendars.ReadBasic"]
}
```

Result uses the same schema as `oauth.token.exchange`.

The complete scope allowlist is `openid`, `profile`, `email`,
`offline_access`, `Calendars.ReadBasic`, `Calendars.ReadWrite`, and
`Mail.Read`.

### `graph.calendarView.list`

Request:

```json
{
  "access_token": "...",
  "start_date_time": "2026-08-03T00:00:00+09:00",
  "end_date_time": "2026-08-04T00:00:00+09:00",
  "timezone": "Asia/Seoul"
}
```

The window is at most two days. The broker follows at most ten Graph pagination
links after validating the exact Graph origin and calendar path. HTTP redirects
remain disabled.

Result:

```json
{
  "events": [
    {
      "id": "...",
      "subject": "...",
      "start": { "dateTime": "...", "timeZone": "..." },
      "end": { "dateTime": "...", "timeZone": "..." },
      "isAllDay": false,
      "isCancelled": false,
      "sensitivity": "normal",
      "showAs": "busy",
      "isOrganizer": true,
      "responseStatus": {},
      "attendees": [],
      "iCalUId": "...",
      "seriesMasterId": null,
      "type": "singleInstance",
      "lastModifiedDateTime": "..."
    }
  ],
  "page_count": 1,
  "provider_request_ids": ["..."]
}
```

### `graph.calendarEvent.create`

Request:

```json
{
  "access_token": "...",
  "subject": "상담",
  "start_at": "2026-08-03T01:00:00Z",
  "end_at": "2026-08-03T02:00:00Z",
  "transaction_id": "idempotency-key"
}
```

The broker fixes `sensitivity=private`, `showAs=busy`, `timeZone=UTC`, and
the delegated `/me/events` path.

Result:

```json
{
  "event_id": "...",
  "web_link": "https://outlook.office.com/...",
  "provider_request_id": "..."
}
```

`web_link` is optional and is returned only after validation against an
Outlook/Office HTTPS host. It is never used as a broker request target.

### `graph.mailMessage.export`

Request:

```json
{ "access_token": "...", "rest_message_id": "..." }
```

The broker fixes delegated `/me` scope, translates the REST ID to an immutable
ID, reads selected metadata, and downloads the MIME `$value`. Because the
contract uses synchronous Lambda invocation and the broker has no S3 access,
raw MIME is capped at 3 MiB so the base64 response stays below the Lambda
response limit.

Result:

```json
{
  "immutable_message_id": "...",
  "internet_message_id": "...",
  "message_metadata": {},
  "mime_base64": "...",
  "mime_bytes": 1234,
  "provider_request_ids": {
    "translation": "...",
    "metadata": "...",
    "mime": "..."
  }
}
```

## Security and rollback boundary

The broker role has only CloudWatch log-stream write access to its exact log
group. It has no VPC attachment, function URL, resource policy, DB, S3,
Secrets Manager, or KMS permissions. Rollback removes the two API invoke
policies, restores the prior Secrets Manager endpoint policy, removes the API
security-group egress rule, then deletes the Lambda endpoint, its security
group, the broker function/log group, and the broker role.
