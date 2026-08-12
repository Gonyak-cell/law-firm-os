#!/bin/sh
set -eu

fail() {
  printf '%s\n' "trusted external-pilot launcher failed: $1" >&2
  exit 1
}

[ "$#" -gt 0 ] || fail "mode must be prepare or verify"
mode=$1
shift
case "$mode" in
  prepare|verify) ;;
  *) fail "mode must be prepare or verify" ;;
esac

take_expected() {
  [ "$#" -ge 2 ] || fail "$1 requires an exact SHA-256"
  case "$2" in
    *[!0-9a-f]*|'') fail "$1 must be a lowercase SHA-256" ;;
  esac
  [ "${#2}" -eq 64 ] || fail "$1 must be a lowercase SHA-256"
  printf '%s' "$2"
}

expected_launcher=
expected_prepare_cli=
expected_generator=
expected_verifier=
expected_resolver=
expected_helper=
expected_updates=
expected_release_paths=
expected_provenance=
node_executable=
expected_node=
while [ "$#" -gt 0 ]; do
  [ "$1" != "--" ] || { shift; break; }
  case "$1" in
    --expected-launcher-sha256) expected_launcher=$(take_expected "$1" "${2-}"); shift 2 ;;
    --expected-prepare-cli-sha256) expected_prepare_cli=$(take_expected "$1" "${2-}"); shift 2 ;;
    --expected-generator-sha256) expected_generator=$(take_expected "$1" "${2-}"); shift 2 ;;
    --expected-verifier-sha256) expected_verifier=$(take_expected "$1" "${2-}"); shift 2 ;;
    --expected-trust-resolver-sha256) expected_resolver=$(take_expected "$1" "${2-}"); shift 2 ;;
    --expected-trust-helper-sha256) expected_helper=$(take_expected "$1" "${2-}"); shift 2 ;;
    --expected-updates-sha256) expected_updates=$(take_expected "$1" "${2-}"); shift 2 ;;
    --expected-release-paths-sha256) expected_release_paths=$(take_expected "$1" "${2-}"); shift 2 ;;
    --expected-provenance-sha256) expected_provenance=$(take_expected "$1" "${2-}"); shift 2 ;;
    --node-executable) node_executable=${2-}; [ -n "$node_executable" ] || fail "$1 requires an absolute canonical path"; shift 2 ;;
    --expected-node-sha256) expected_node=$(take_expected "$1" "${2-}"); shift 2 ;;
    *) fail "unknown launcher argument: $1" ;;
  esac
done

for expected in "$expected_launcher" "$expected_prepare_cli" "$expected_generator" "$expected_verifier" "$expected_resolver" "$expected_helper" "$expected_updates" "$expected_release_paths" "$expected_provenance" "$expected_node"; do
  [ -n "$expected" ] || fail "all verification-closure SHA-256 values are required"
done

case "$0" in
  /*) launcher=$0 ;;
  *) fail "launcher must be invoked by its absolute canonical path" ;;
esac
[ ! -L "$launcher" ] || fail "launcher cannot be a symbolic link"
[ "$(/bin/realpath "$launcher")" = "$launcher" ] || fail "launcher path must be canonical"
script_dir=$(CDPATH= cd -P -- "$(/usr/bin/dirname -- "$launcher")" && pwd)
root_dir=$(CDPATH= cd -P -- "$script_dir/.." && pwd)

check_hash() {
  file=$1
  expected=$2
  [ -f "$file" ] && [ ! -L "$file" ] || fail "verification-closure file must be a regular non-symlink: $file"
  actual=$(/usr/bin/shasum -a 256 "$file" | /usr/bin/awk '{print $1}')
  [ "$actual" = "$expected" ] || fail "verification-closure SHA-256 mismatch: $file"
}

prepare_cli=$root_dir/scripts/prepare-matter-desktop-external-pilot.mjs
generator=$root_dir/scripts/lib/matter-desktop-external-pilot.mjs
verifier=$root_dir/scripts/verify-matter-desktop-external-pilot-bundle.mjs
resolver=$root_dir/scripts/lib/matter-desktop-external-pilot-trust.mjs
helper=$root_dir/scripts/lib/external-release-trust.mjs
updates=$root_dir/apps/desktop/src/main/updates.js
release_paths=$root_dir/scripts/lib/matter-desktop-release-paths.mjs
provenance=$root_dir/scripts/lib/matter-desktop-provenance.mjs

check_hash "$launcher" "$expected_launcher"
check_hash "$prepare_cli" "$expected_prepare_cli"
check_hash "$generator" "$expected_generator"
check_hash "$verifier" "$expected_verifier"
check_hash "$resolver" "$expected_resolver"
check_hash "$helper" "$expected_helper"
check_hash "$updates" "$expected_updates"
check_hash "$release_paths" "$expected_release_paths"
check_hash "$provenance" "$expected_provenance"

case "$node_executable" in
  /*) ;;
  *) fail "node executable must be an absolute canonical path" ;;
esac
[ -f "$node_executable" ] && [ ! -L "$node_executable" ] && [ -x "$node_executable" ] || fail "node executable must be a regular executable non-symlink"
[ "$(/bin/realpath "$node_executable")" = "$node_executable" ] || fail "node executable path must be canonical"
check_hash "$node_executable" "$expected_node"

entry=$verifier
runner=runExternalPilotVerification
if [ "$mode" = prepare ]; then
  entry=$prepare_cli
  runner=runExternalPilotPreparation
fi
bootstrap='import { pathToFileURL } from "node:url"; try { const target = await import(pathToFileURL(process.argv[2]).href); const result = await target[process.argv[3]](process.argv.slice(4)); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); } catch (error) { process.stderr.write(`external-pilot trusted execution failed [${error.code ?? "ERROR"}]: ${error.message}\n`); process.exitCode = 1; }'
exec /usr/bin/env -i PATH=/usr/bin:/bin NODE_ENV=production "$node_executable" \
  --input-type=module -e "$bootstrap" trusted-external-pilot-bootstrap "$entry" "$runner" \
  --node-executable "$node_executable" \
  --expected-node-sha256 "$expected_node" \
  --expected-launcher-sha256 "$expected_launcher" \
  --expected-prepare-cli-sha256 "$expected_prepare_cli" \
  --expected-generator-sha256 "$expected_generator" \
  --expected-verifier-sha256 "$expected_verifier" \
  --expected-trust-resolver-sha256 "$expected_resolver" \
  --expected-trust-helper-sha256 "$expected_helper" \
  --expected-updates-sha256 "$expected_updates" \
  --expected-release-paths-sha256 "$expected_release_paths" \
  --expected-provenance-sha256 "$expected_provenance" \
  "$@"
