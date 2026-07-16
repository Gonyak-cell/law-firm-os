# QA-007 renderer parity acceptance

- Status: `DONE`
- Verdict: `PASS`
- Final exact SHA: `39ed9571b0e841e1a6480e6875fe7b6658f83465`
- Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
- Renderer files: `28`
- Approved variants: `0`
- Unexpected mismatches: `0`

The QA-004 browser candidate and final exact SHA have the same `apps/web` tree `9d16072e1aa20dc23750543483c74f64b6a79c76`. The formal macOS renderer, local formal Windows renderer, and Windows-native CI renderer were then compared recursively. All three exact-SHA directories contain 28 files, use the same portable relative-path manifest, and have zero byte mismatches.

This closes the earlier OS path-separator ambiguity: Windows and macOS now hash the same `/`-normalized manifest rather than platform-specific relative paths.
