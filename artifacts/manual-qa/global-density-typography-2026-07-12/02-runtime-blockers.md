# Global density typography QA — runtime blockers

Date: 2026-07-12 (Asia/Seoul)

## Rebuilt web renderer invocation

```text
node --input-type=module - <<'EOF'
import { chromium } from 'playwright';
chromium.launch({headless:true});
page.goto(file:///Users/jws/Documents/Codex/Law%20Firm%20OS/apps/web/dist/index.html?skin=forest&locale=ko&view=people);
set viewport 1280x900, then 375x720;
EOF
```

Verdict: BLOCKED before `page` creation. Chromium exited with:

```text
FATAL:base/apple/mach_port_rendezvous_mac.cc:159
Check failed: kr == KERN_SUCCESS.
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.11686:
Permission denied (1100)
Error: browserType.launch: Target page, context or browser has been closed
```

No DOM, computed style, input interaction, overflow measurement, route-change check, or screenshot was produced.

## Packaged matter.app invocation

```text
electron.launch(
  executablePath=/Users/jws/Documents/Codex/Law Firm OS/apps/desktop/dist/mac/matter.app/Contents/MacOS/matter,
  args=[--user-data-dir=/private/tmp/global-density-qa]
)
app.firstWindow();
set viewport 1280x900, then 375x720;
```

Verdict: BLOCKED before first window. Playwright returned `Error: Process failed to launch!`.

A direct macOS launch was also attempted:

```text
/usr/bin/open -n apps/desktop/dist/mac/matter.app
```

It returned exit code 1:

```text
NSOSStatusErrorDomain Code=-10827
kLSNoExecutableErr: The executable is missing
```

The bundle contains `Contents/MacOS/matter` and it is an arm64 Mach-O executable, but LaunchServices still refused to open it. No rendered UI or screenshot was obtained.
