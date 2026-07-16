# HTTP integration-suite blocker

Exact invocation:

`node --test apps/api/test/hrx-runtime-api.test.js`

Observed result: FAIL at the test `before` hook because the managed sandbox rejects opening `127.0.0.1` with `listen EPERM`. The suite reported 27 tests, 0 executed successfully, and the cleanup hook then also failed because no server was created.

Blocker: loopback listener permission is unavailable in this environment. The direct no-listener handler evidence is recorded separately; it does not upgrade this HTTP scenario to PASS.

No raw contact values are included.
