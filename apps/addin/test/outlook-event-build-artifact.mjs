// Backward-compatible focused entrypoint. The build script wires both
// single-purpose suites directly; this import keeps the historical command
// `node --test test/outlook-event-build-artifact.mjs` valid as well.
import "./outlook-event-runtime-artifact.mjs";
import "./outlook-profile-build-artifact.mjs";
