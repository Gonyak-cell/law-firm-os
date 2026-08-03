import {
  closeSync,
  fsyncSync,
  linkSync,
  openSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

export function writePrivateJsonExclusive(path, value, { io = {} } = {}) {
  const operations = {
    close: io.close ?? closeSync,
    fsync: io.fsync ?? fsyncSync,
    link: io.link ?? linkSync,
    open: io.open ?? openSync,
    unlink: io.unlink ?? unlinkSync,
    write: io.write ?? writeFileSync,
  };
  const temporary = `${path}.tmp-${process.pid}`;
  let descriptor;
  try {
    descriptor = operations.open(temporary, "wx", 0o600);
    operations.write(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    operations.fsync(descriptor);
    operations.close(descriptor);
    descriptor = undefined;
    operations.link(temporary, path);
    operations.unlink(temporary);
  } catch (error) {
    try {
      if (descriptor !== undefined) operations.close(descriptor);
    } catch {}
    try {
      operations.unlink(temporary);
    } catch {}
    throw error;
  }
}
