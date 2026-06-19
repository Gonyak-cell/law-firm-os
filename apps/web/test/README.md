# UI Regression Test Harness

Runner: Node.js built-in `node --test`.

This harness starts with source-level deterministic checks because the Wave 1
product screens are still under construction. It deliberately avoids browser
servers, network calls, external services, and screenshot-corpus reads so the
same command can run offline:

```sh
npm --workspace apps/web run test:ui
```

The first sample case protects the current routing and live-data guardrails.
Future W04 increments should add screen-state cases under `test/screens/` and
permission-state cases under `test/permissions/` once LT-L4-W01 and LT-L4-W02
provide the required product surfaces and shared live client.
