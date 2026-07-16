# RC-001 Acceptance

- status: DONE
- candidate_entry_sha: `88156fb54540c1c9362ce66bf343542bbc61ad13`
- evidence_commit_sha: `67b72f44ffb2e577b780ab6f5cad28e23496542e`
- source branch and HEAD: `codex/profile-contact-regression-fix` at `aa653bb12c7424fb5cda717817ba1ee1d2c454c3`
- tracked modified: 56
- untracked: 21
- status entries: 77
- working tree SHA-256: `7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3`
- tracked patch SHA-256: `cb4895ff8a1778ceaed845cf027781a1bbf335bf04677d80b50caa9618ba504e`
- untracked archive SHA-256: `38b02ec7d6f6c20f06ae608c58406898cd71c9e748203c5a93b524f5db2bc7b9`
- external recovery directory: `/private/tmp/lawos-root-recovery-20260715.fhqqjG`
- recovery permissions: directory 0700, files 0600
- detached restore dry-run: PASS
- source mutation count: 0
- matching process count observed: 1; full pre/post fingerprints remained identical
- manual QA: restored checkout reproduced every tracked and untracked path with identical mode, size, and SHA-256
- known limits: recovery content remains outside Git because it may contain user data; repository evidence stores paths, counts, and hashes only
- external blockers: none
