import assert from "node:assert/strict";
import test from "node:test";

import {
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
} from "../lib/json-postgres-production-infrastructure.mjs";
import {
  JSON_POSTGRES_PRODUCTION_STACK,
  validateJsonPostgresW15ProductionChangeSet,
} from "../lib/json-postgres-production-execution.mjs";

const OUTLOOK_ADDITIONS = Object.freeze([
  ["OutlookConversationWorkerDeadLetterAlarm", "AWS::CloudWatch::Alarm"],
  ["OutlookConversationWorkerDeadLetterQueue", "AWS::SQS::Queue"],
  ["OutlookConversationWorkerDeadLetterQueuePolicy", "AWS::SQS::QueuePolicy"],
  ["OutlookConversationWorkerDeliveryFailureAlarm", "AWS::CloudWatch::Alarm"],
  ["OutlookConversationWorkerErrorAlarm", "AWS::CloudWatch::Alarm"],
  ["OutlookConversationWorkerEventInvokeConfig", "AWS::Lambda::EventInvokeConfig"],
  ["OutlookConversationWorkerFunction", "AWS::Lambda::Function"],
  ["OutlookConversationWorkerLogGroup", "AWS::Logs::LogGroup"],
]);

function change(action, logicalId, resourceType, replacement = "False") {
  return {
    ResourceChange: {
      Action: action,
      LogicalResourceId: logicalId,
      ResourceType: resourceType,
      Replacement: replacement,
    },
  };
}

test("production review admits only the exact dedicated Outlook worker additions", () => {
  const modified = [
    ["ApiExecutionRole", "AWS::IAM::Role"],
    ["OutlookConversationWorkerInvokePermission", "AWS::Lambda::Permission"],
    ["OutlookConversationWorkerSchedule", "AWS::Events::Rule"],
  ];
  const template = {
    Resources: Object.fromEntries([...OUTLOOK_ADDITIONS, ...modified]
      .map(([logicalId]) => [logicalId, {}])),
  };
  const changeSet = {
    StackName: JSON_POSTGRES_PRODUCTION_STACK,
    ChangeSetType: "UPDATE",
    ChangeSetId: "outlook-dedicated-worker-change-set",
    Parameters: [
      { ParameterKey: "EnableExternalReadProviders", ParameterValue: "false" },
      {
        ParameterKey: "ExternalReadProviderPackSecretName",
        ParameterValue: JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
      },
      {
        ParameterKey: "ExternalReadProviderPackSha256",
        ParameterValue: JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
      },
    ],
    Changes: [
      ...OUTLOOK_ADDITIONS.map(([logicalId, type]) =>
        change("Add", logicalId, type)),
      ...modified.map(([logicalId, type]) =>
        change("Modify", logicalId, type)),
    ],
  };
  const reviewed = validateJsonPostgresW15ProductionChangeSet(changeSet, {
    template,
    parametersSha256: "a".repeat(64),
    templateSha256: "b".repeat(64),
  });
  assert.equal(reviewed.add_count, OUTLOOK_ADDITIONS.length);
  assert.equal(reviewed.modify_count, modified.length);

  const drift = structuredClone(changeSet);
  drift.Changes.push(change(
    "Add",
    "OutlookConversationWorkerWildcardPolicy",
    "AWS::IAM::Policy",
  ));
  assert.throws(() => validateJsonPostgresW15ProductionChangeSet(drift, {
    template,
    parametersSha256: "a".repeat(64),
    templateSha256: "b".repeat(64),
  }), /unapproved resource change/u);
});
