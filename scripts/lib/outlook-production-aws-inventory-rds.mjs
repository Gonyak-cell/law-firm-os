import { projectRds } from "./outlook-production-aws-inventory-projection.mjs";

function firstFailure(current, code) {
  return current ?? code ?? null;
}

export async function collectRdsInventory({ identifiers, run, note }) {
  const instances = [];
  const clusters = [];
  let rdsError = null;
  for (const identifier of identifiers) {
    const instanceResult = await run({ service: "rds", operation: "describe-db-instances", args: ["--db-instance-identifier", identifier], target: identifier });
    const clusterResult = await run({ service: "rds", operation: "describe-db-clusters", args: ["--db-cluster-identifier", identifier], target: identifier });
    if (instanceResult.ok) {
      const projection = projectRds(instanceResult.value, "instances");
      if (projection.status !== "PASS") rdsError = firstFailure(rdsError, projection.error_code);
      instances.push(...projection.rows);
      if (instanceResult.value?.Marker || instanceResult.value?.NextToken) rdsError = firstFailure(rdsError, "AWS_RDS_TRUNCATED");
    } else if (instanceResult.error_code !== "AWS_RESOURCE_NOT_FOUND") rdsError = firstFailure(rdsError, instanceResult.error_code);
    if (clusterResult.ok) {
      const projection = projectRds(clusterResult.value, "clusters");
      if (projection.status !== "PASS") rdsError = firstFailure(rdsError, projection.error_code);
      clusters.push(...projection.rows);
      if (clusterResult.value?.Marker || clusterResult.value?.NextToken) rdsError = firstFailure(rdsError, "AWS_RDS_TRUNCATED");
    } else if (clusterResult.error_code !== "AWS_RESOURCE_NOT_FOUND") rdsError = firstFailure(rdsError, clusterResult.error_code);
    if ((instanceResult.ok && !instanceResult.value?.DBInstances?.length && clusterResult.error_code === "AWS_RESOURCE_NOT_FOUND")
      || (clusterResult.ok && !clusterResult.value?.DBClusters?.length && instanceResult.error_code === "AWS_RESOURCE_NOT_FOUND")) {
      rdsError = firstFailure(rdsError, "AWS_RDS_RESOURCE_NOT_FOUND");
    }
    if (instanceResult.ok && clusterResult.ok && !projectRds(instanceResult.value, "instances").rows.length && !projectRds(clusterResult.value, "clusters").rows.length) rdsError = firstFailure(rdsError, "AWS_RDS_RESOURCE_NOT_FOUND");
    if (!instanceResult.ok && !clusterResult.ok && instanceResult.error_code === "AWS_RESOURCE_NOT_FOUND" && clusterResult.error_code === "AWS_RESOURCE_NOT_FOUND") rdsError = firstFailure(rdsError, "AWS_RDS_RESOURCE_NOT_FOUND");
  }
  const expected = new Set(identifiers);
  const observed = [...instances, ...clusters].map((row) => row.identifier);
  const invalidObserved = observed.some((identifier) => typeof identifier !== "string" || !identifier || !expected.has(identifier)) || new Set(observed).size !== observed.length;
  const missingExpected = identifiers.some((identifier) => !observed.includes(identifier));
  if (invalidObserved || missingExpected) rdsError = firstFailure(rdsError, "AWS_RDS_IDENTIFIER_SET_MISMATCH");
  if (rdsError && (invalidObserved || missingExpected)) {
    instances.length = 0;
    clusters.length = 0;
  }
  const result = { status: rdsError ? "ERROR" : "PASS", error_code: rdsError, complete: !rdsError, identifiers, instances, clusters };
  if (rdsError) note(rdsError);
  return result;
}
