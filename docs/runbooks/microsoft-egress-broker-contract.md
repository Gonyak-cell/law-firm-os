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

`redirect_profile` is exactly `people` or `client`. Both profiles use the
fixed HTTPS callback
`https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback`, while
the pilot may use one shared Entra application (`client_id` and confidential
credential) for both profiles. The profiles still remain separate at the
application boundary: People requests allow only
`openid profile email offline_access Calendars.ReadBasic`, while Client
requests allow only `openid profile email offline_access Calendars.ReadWrite
Mail.Read`. OAuth state envelopes, refresh-profile validation, and credential
vault records are partitioned by profile; a request cannot select the other
profile or mix scopes before Microsoft is called.
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
  "refresh_profile": "people",
  "refresh_profile_proof": "...",
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
  "client_secret": "confidential-client secret",
  "refresh_token": "...",
  "refresh_profile_proof": "...",
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

Result uses the same schema as `oauth.token.exchange` and always includes the
validated `refresh_profile` (`people` or `client`) and a newly issued
`refresh_profile_proof` bound to the returned refresh token. For the Client
profile, set `redirect_profile` to `client` and send exactly
`openid profile email offline_access Calendars.ReadWrite Mail.Read` in
`scopes`; the broker rejects mixed or profile-inconsistent scopes.

The complete scope allowlist is `openid`, `profile`, `email`,
`offline_access`, `Calendars.ReadBasic`, `Calendars.ReadWrite`, and
`Mail.Read`.

### Refresh-profile proof keyring

The broker owns the proof keyring used to bind a refresh token to its profile.
Production configuration must provide:

- `LAWOS_MICROSOFT_EGRESS_REFRESH_PROFILE_PROOF_CURRENT_KEY_B64URL` (required)
- `LAWOS_MICROSOFT_EGRESS_REFRESH_PROFILE_PROOF_PREVIOUS_KEY_B64URL` (optional
  during rotation)

Each value is an unpadded base64url encoding of exactly 32 random bytes. The
current and previous values must be distinct. The API never derives or
chooses these values, and neither value may be logged, returned in an error,
or pasted into chat. The broker accepts proofs made with either configured
key; a successful refresh reissues the current-key proof.

For a code/config rollout, add a newly generated current key to the existing
broker environment first (the previous broker ignores this extra variable),
then deploy the broker code and verify its health before changing API callers.
For rotation, set the old current value as `...PREVIOUS...` and a new random
32-byte value as `...CURRENT...`, deploy the broker, and leave the previous
key in place until all active credentials have refreshed or the approved
rotation window has elapsed. Remove the previous key only after that window;
never remove the only current key.

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
