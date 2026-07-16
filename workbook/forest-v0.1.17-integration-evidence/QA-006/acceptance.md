# QA-006 Windows formal package acceptance

- Status: `BLOCKED`
- Blocking condition: `AUTHENTICODE_NOT_SIGNED`
- Native runtime result: `PASS`
- GitHub Actions run: `29466863451`
- Run URL: `https://github.com/Gonyak-cell/law-firm-os/actions/runs/29466863451`
- Artifact source SHA: `39ed9571b0e841e1a6480e6875fe7b6658f83465`
- Artifact source tree: `42bb94f745b329053cc14325ef1251fc7d8475cd`
- Artifact source dirty: `false`
- Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
- Renderer files: `28`
- QA receipt: `formal-windows-package-qa.json`

## Native Windows verification

The exact SHA was checked out with deterministic line endings on `windows-latest`, built as a formal x64 package and NSIS installer, installed silently, launched as the installed executable, connected only to an isolated exact-source loopback API, restarted, and removed with the generated uninstaller.

- NSIS install: PASS
- Forest login rendered: PASS
- `jwsuh@amic.kr -> 서지원` signed session: PASS
- Leave rendered: PASS
- Payroll rendered: PASS
- Restart restored the signed-in payroll session: PASS
- NSIS uninstall removed the executable: PASS
- Page errors: `0`
- Unexpected console errors: `0`
- Screenshots visually inspected: `4/4`

## Package and renderer evidence

- CI installer SHA-256: `53e2b694e28ba29a068feaa313d862edbeca976912be7204d0e7968b69ab44b3`
- CI blockmap SHA-256: `03f05e5093edc1278c8600c1ba01d5e8e84f3391b524750fcf1d30b8aa08739e`
- CI unpacked executable SHA-256: `9772e31fcaa6c7e4005392238aa096b55522f6572d01b2f27753c186fbf4a3f8`
- Local same-source installer SHA-256: `cab98371cd6acbec6adce59b27aadc231eaeb88ea736b6c7f9cc01aab3972e61`
- Local same-source blockmap SHA-256: `4b5092232b35c435208f5f458af725803dd72f6bb1ff82d44743fc206e0f1a5e`
- Local same-source unsigned package ZIP SHA-256: `3d7564934fcb0d91e89b41a34cea671f8d57fbcf11c41ac881086a264cb5baab`
- Package renderer and installed renderer: byte-identical
- Mac local, Windows local, and Windows CI renderer: `28/28` files, mismatch `0`

NSIS and archive bytes are host/build-time dependent, so the macOS-hosted local Windows binary hash is not asserted equal to the Windows-runner installer hash. Both manifests bind to the same source SHA/tree, app ID, channel, version, and renderer digest.

## Authenticode boundary

- Installer signature status: `NotSigned`
- Unpacked executable signature status: `NotSigned`
- Signer subject: absent
- Thumbprint: absent
- Authenticode claim: `false`
- Blocker: no approved Authenticode certificate or provider is configured

Native behavior is complete and PASS, but QA-006 and the Windows distribution/formal release gate remain `BLOCKED_AUTHENTICODE`. The owner-approved source-merge gate is tracked separately and may use this native PASS without claiming a signed Windows release. A self-signed certificate is not accepted as release evidence.

## Runtime and data boundaries

- Runtime topology: installed formal app with isolated exact-source loopback API
- Synthetic fixture only: `true`
- Operator token used: `false`
- Bundled local API present: `false`
- Real employee write: `false`
- AWS write: `false`
- Production runtime used: `false`
- Public release and production go-live claims: `false`
