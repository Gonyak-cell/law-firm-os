const INITIAL_COUNTS = Object.freeze({
  update_function_code: 0,
  invoke_function: 0,
  get_function_state: 0,
  diagnostic_recovery_reads: 0,
  rollback_recovery_reads: 0,
  wait_for_function_active: 0,
  update_function_configuration: 0,
  iam_writes: 0,
  secret_writes: 0,
  vpc_writes: 0,
  concurrency_writes: 0,
  database_writes: 0,
});

export function createCatalogReadbackAwsTracker(aws) {
  const counts = { ...INITIAL_COUNTS };
  return {
    counts,
    aws: {
      ...aws,
      getFunctionState: (...args) => {
        counts.get_function_state += 1;
        return aws.getFunctionState(...args);
      },
      readDiagnosticRecoveryState: (...args) => {
        counts.get_function_state += 1;
        counts.diagnostic_recovery_reads += 1;
        return aws.getFunctionState(...args);
      },
      readRollbackRecoveryState: (...args) => {
        counts.get_function_state += 1;
        counts.rollback_recovery_reads += 1;
        return aws.getFunctionState(...args);
      },
      waitForFunctionActive: (...args) => {
        counts.wait_for_function_active += 1;
        return aws.waitForFunctionActive(...args);
      },
    },
  };
}
