# RS-SA terminal acceptance

- Terminal: `RS-SA-008`
- Gate: `G1-SA`
- Source SHA: `6429851bc161007984c78d36bc7ea04b1aeaf03d`
- Verdict: `PASS`
- Allowed claim: `TRUST_BOUNDARY_A_SOURCE_VERIFIED`

## Accepted source behavior

1. Electron single-instance lock is acquired before userData, local API, secure-store, or window initialization.
2. A secondary instance exits without opening runtime stores or another local API and asks the primary window to restore, show, and focus.
3. macOS `open-url`, initial argv, and `second-instance` deep links use one queue; snapshots and evidence redact reset tokens.
4. Local development may use the named local step-up defaults. Operational runtime rejects missing, blank, short, and known-default signing or TOTP secrets with `LAWOS_RUNTIME_PREFLIGHT_FAILED` and exit code `78` before listen.
5. Existing Desktop origin, IPC, packaging, HRX step-up, Lambda, session-auth, and store-path protections remain green in the recorded regression runs.

## Boundary retained

This acceptance is source-local only. It does not provision operational secrets, approve or execute a release, create a tag, mutate AWS, use staging or real client data, run a production migration or cutover, sign Windows artifacts, or assert go-live. The next dependency-ordered source workstream is `RS-SB`.
