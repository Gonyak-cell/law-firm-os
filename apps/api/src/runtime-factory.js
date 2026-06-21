import { createDefaultMatterRuntime } from './matter-runtime-context.js';
import { createVaultDmsRuntimeContext } from './vault-dms-runtime-context.js';

export function createMatterVaultRuntimeFactory({ dmsRuntime = createVaultDmsRuntimeContext() } = {}) {
  return Object.freeze({
    dmsRuntime,
    createMatterRuntime(options = {}) {
      return createDefaultMatterRuntime({ ...options, dmsRuntime });
    },
    repo_native_runtime_factory: true,
  });
}
