import { acquireExclusiveFileLock } from "../../src/durable-file.js";

const [resourcePath] = process.argv.slice(2);
const lock = acquireExclusiveFileLock({ resourcePath, waitTimeoutMs: 1_000 });
process.stdout.write(`${JSON.stringify({ status: "locked", pid: process.pid, token: lock.token })}\n`);
setInterval(() => {}, 1_000);
