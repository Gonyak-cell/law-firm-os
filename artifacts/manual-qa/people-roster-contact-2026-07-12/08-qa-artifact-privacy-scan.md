# Fresh QA artifact privacy scan

Exact invocation:

`rg -n -P '010[- .]?\\d{4}[- .]?\\d{4}|\\b\\d{3}[- .]?\\d{3,4}[- .]?\\d{4}\\b' artifacts/manual-qa/people-roster-contact-2026-07-12`

Result: no phone-like values found in the fresh QA artifacts.

The artifacts intentionally report counts and booleans only. Raw phone numbers, emails, and names are omitted from the review evidence.
