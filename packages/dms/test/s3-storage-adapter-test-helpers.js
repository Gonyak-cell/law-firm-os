import { createBoundedS3Client } from "../src/storage/s3-bounded-client.js";
import { createS3StorageAdapter } from "../src/storage/s3-storage-adapter.js";
import {
  closeProvider,
  endpoint,
  registerScenario,
} from "./s3-local-provider-test-server.js";

const clients = new Set();
let sequence = 0;

export function adapter(overrides = {}) {
  const { provider = {}, ...config } = overrides;
  const prefix = `synthetic/provider-test/${++sequence}`;
  registerScenario(prefix, provider);
  const client = createBoundedS3Client({
    endpoint,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
  });
  clients.add(client);
  return createS3StorageAdapter({
    adapter_id: "s3-test",
    bucket: "lawos-dms-test",
    prefix,
    expected_bucket_owner: "770880870480",
    credential_ref: "aws-role:test",
    object_lock_enabled: true,
    client,
    ...config,
  });
}

export async function closeAdapters() {
  for (const client of clients) client.destroy();
  clients.clear();
  await closeProvider();
}
