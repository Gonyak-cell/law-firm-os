# @law-firm-os/admin

Descriptor-only Admin Console contract package for RP21.

CP00-645 opens the Admin Console program with a synthetic, no-write descriptor for taxonomy, template, workflow, policy, usage, and billing-plan administration. It does not execute admin mutations, write product state, persist audit events, expose hidden policy internals, or load real tenant, matter, document, billing, or client data.

Validation entry points:

- `npm run rp21:admin-console:validate`
- `node --test packages/admin/test/model.test.js`
