import { readDurableJsonFile, writeDurableJsonFile } from "../../src/durable-file.js";

const [filePath, writer] = process.argv.slice(2);

try {
  const receipt = writeDurableJsonFile({
    filePath,
    value: { writer, records: [{ id: `${writer}-record` }] },
    expectedGeneration: 0,
    createBackup: false,
    env: {},
    lockWaitTimeoutMs: 5_000,
  });
  const observed = readDurableJsonFile({ filePath });
  process.stdout.write(`${JSON.stringify({ status: "written", writer, generation: receipt.generation, observed_generation: observed.generation })}\n`);
} catch (error) {
  if (error?.code === "LAWOS_STORE_CONFLICT") {
    process.stdout.write(`${JSON.stringify({
      status: "conflict",
      writer,
      expected_generation: error.expected_generation,
      current_generation: error.current_generation,
    })}\n`);
  } else {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
