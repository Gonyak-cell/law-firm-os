#!/bin/zsh -f
set -eu

block() {
  /usr/bin/printf '%s\n' '{"verdict":"BLOCKED","code":"LAUNCHER_REQUIRED"}' >&2
  exit 2
}

(( $# == 0 )) || block
(( ! ${+NODE_OPTIONS} && ! ${+NODE_PATH} )) || block
(( ! ${+MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH} && ! ${+MATTER_FORMAL_QA_LAUNCH_TOKEN} )) || block
unset NODE_OPTIONS NODE_PATH

launcher_path=${0:A}
runner_path=${launcher_path:h}/run-formal-macos-package-qa.mjs
node_path=/opt/homebrew/opt/node@22/bin/node
[[ -x "$node_path" ]] || node_path=${commands[node]:-}
[[ -n "$node_path" ]] || block
node_path=${node_path:A}
[[ -f "$runner_path" && -x "$node_path" ]] || block
[[ "$("$node_path" --version)" == v22.* ]] || block

umask 077
attestation_dir=$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/matter-formal-launch.XXXXXX")
attestation_path=$attestation_dir/attestation.json
token=$(/usr/bin/uuidgen | /usr/bin/tr '[:upper:]' '[:lower:]')
created_at=$(/bin/date -u '+%Y-%m-%dT%H:%M:%S.000Z')
cleanup() {
  unset MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH MATTER_FORMAL_QA_LAUNCH_TOKEN
  /bin/rm -f "$attestation_path"
  /bin/rmdir "$attestation_dir" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM
/usr/bin/printf '{"schema_version":"law-firm-os.formal-package-os-launcher.v1","created_at":"%s","token":"%s","launcher_pid":%d,"launcher_path":"%s","runner_path":"%s","node_path":"%s","platform":"macos"}\n' \
  "$created_at" "$token" $$ "$launcher_path" "$runner_path" "$node_path" > "$attestation_path"
/bin/chmod 600 "$attestation_path"
export MATTER_FORMAL_QA_LAUNCH_ATTESTATION_PATH=$attestation_path
export MATTER_FORMAL_QA_LAUNCH_TOKEN=$token

set +e
"$node_path" "$runner_path"
runner_exit_code=$?
set -e
exit $runner_exit_code
