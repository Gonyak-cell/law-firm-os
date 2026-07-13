# Focused scoped test run

Invocation:

```text
node --test apps/web/test/home-dashboard-r1.test.mjs apps/web/test/ui-regression.test.mjs
```

Result: PASS. 15/15 subtests passed, including the Home action-widget runtime, grouped sidebar accordion, Home approval counts/routes, and the To Do route contract.

Observed passing subtests:

- R1 WP-2 legacy request route context
- R1 WP-2 dedicated Home utility screens
- WP-FIN-1 finance/Matter route handling and sidebar state
- grouped sidebars render children in collapsible sidebar accordions
- mixed Korean and English record text
- WP-FIN-3 finance views and filters
- WP-FIN-4 Matter finance workflow
- WP-FIN-5 scoped finance navigation
- R1 WP-4 company-status gating
- R1 WP-3 message threads and unread counts
- R1 WP-5 widget rules and delayed undo
- Matter work management and external schedules
- dashboard bodies for Home, Matter, and Client work areas
- Client prospect-card source handling
