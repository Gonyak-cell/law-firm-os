#!/usr/bin/env node

if (!process.argv.includes("--phase")) process.argv.push("--phase", "preflight");
await import("./run-private-staging-exact-head-execution.mjs");
