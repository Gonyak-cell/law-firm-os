import assert from "node:assert/strict";
import test from "node:test";

import {
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
  JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
  JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
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

test("W15 production review rejects Outlook resources while their parameters are disabled", () => {
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
      { ParameterKey: "EnableOutlookConversationWorker", ParameterValue: "false" },
      {
        ParameterKey: "ClientOutlookM365ConfigSecretName",
        ParameterValue: JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
      },
      {
        ParameterKey: "ClientOutlookCredentialSecretPrefix",
        ParameterValue: JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
      },
    ],
    Changes: [
      ...OUTLOOK_ADDITIONS.map(([logicalId, type]) =>
        change("Add", logicalId, type)),
      ...modified.map(([logicalId, type]) =>
        change("Modify", logicalId, type)),
    ],
  };
  assert.throws(() => validateJsonPostgresW15ProductionChangeSet(changeSet, {
    template,
    parametersSha256: "a".repeat(64),
    templateSha256: "b".repeat(64),
  }), /disabled provider resource change/u);
});
