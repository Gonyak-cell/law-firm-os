import { spawnSync as defaultSpawnSync } from "node:child_process";

export function isAwsSsoExpiredOutput(output = "") {
  return /Token has expired|retrieving token from sso|SSO.*expired|SSO session.*expired|Error loading SSO Token/i.test(output);
}

export function classifyLambdaEnvironmentReadFailure({
  output = "",
  awsProfile,
  ssoLoginProfile,
  lambdaFunctionName,
  autoLoginEnabled
}) {
  if (isAwsSsoExpiredOutput(output)) {
    return {
      code: "AWS_SSO_SESSION_EXPIRED",
      reason: autoLoginEnabled
        ? `AWS SSO session expired for profile ${awsProfile}; automatic aws sso login --profile ${ssoLoginProfile} did not complete`
        : `AWS SSO session expired for profile ${awsProfile}; run aws sso login --profile ${ssoLoginProfile}`,
      missingRequiredEnv: ["AWS_SSO_SESSION"]
    };
  }
  if (/could not be found|ResourceNotFoundException/i.test(output)) {
    return {
      code: "LAWOS_API_LAMBDA_NOT_FOUND",
      reason: `Could not read ${lambdaFunctionName} to resolve LAWOS_VAULT_BRIDGE_TOKEN`,
      missingRequiredEnv: ["LAWOS_API_LAMBDA_FUNCTION_NAME"]
    };
  }
  return {
    code: "LAWOS_VAULT_BRIDGE_TOKEN_UNRESOLVED",
    reason: "LAWOS_VAULT_BRIDGE_TOKEN is not in the local environment and could not be resolved from the production Lambda environment",
    missingRequiredEnv: ["LAWOS_VAULT_BRIDGE_TOKEN"]
  };
}

export function readLambdaEnvironmentWithSsoAutoLogin({
  awsProfile,
  awsRegion,
  lambdaFunctionName,
  ssoLoginProfile,
  env = process.env,
  spawnSync = defaultSpawnSync,
  autoLogin = env.LAWOS_AWS_SSO_AUTO_LOGIN !== "0",
  loginStdio = env.LAWOS_AWS_SSO_LOGIN_STDIO ?? "inherit"
}) {
  const ssoLogin = {
    attempted: false,
    profile: ssoLoginProfile,
    status: null,
    auto_login_enabled: Boolean(autoLogin)
  };

  const readLambdaEnvironment = () => spawnSync("aws", [
    "lambda",
    "get-function-configuration",
    "--function-name",
    lambdaFunctionName,
    "--query",
    "Environment.Variables",
    "--output",
    "json"
  ], {
    encoding: "utf8",
    env: { ...env, AWS_PROFILE: awsProfile, AWS_REGION: awsRegion },
    maxBuffer: 1024 * 1024
  });

  const parseValues = (result) => {
    try {
      return JSON.parse(result.stdout || "{}");
    } catch {
      return null;
    }
  };

  let result = readLambdaEnvironment();
  if (result.error) {
    return {
      error: `AWS CLI unavailable: ${result.error.message}`,
      code: "AWS_CLI_UNAVAILABLE",
      missingRequiredEnv: ["LAWOS_VAULT_BRIDGE_TOKEN"],
      values: {},
      ssoLogin
    };
  }

  if (result.status === 0) {
    const values = parseValues(result);
    if (values) return { error: "", values, ssoLogin };
    return {
      error: "Could not parse Lambda environment response",
      code: "LAWOS_API_LAMBDA_ENV_PARSE_FAILED",
      missingRequiredEnv: ["LAWOS_VAULT_BRIDGE_TOKEN"],
      values: {},
      ssoLogin
    };
  }

  const firstOutput = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  if (autoLogin && isAwsSsoExpiredOutput(firstOutput)) {
    ssoLogin.attempted = true;
    const loginResult = spawnSync("aws", ["sso", "login", "--profile", ssoLoginProfile], {
      encoding: "utf8",
      env,
      maxBuffer: 1024 * 1024,
      stdio: loginStdio
    });
    ssoLogin.status = loginResult.status ?? null;

    if (!loginResult.error && loginResult.status === 0) {
      result = readLambdaEnvironment();
      if (result.status === 0) {
        const values = parseValues(result);
        if (values) return { error: "", values, ssoLogin };
        return {
          error: "Could not parse Lambda environment response after AWS SSO login",
          code: "LAWOS_API_LAMBDA_ENV_PARSE_FAILED",
          missingRequiredEnv: ["LAWOS_VAULT_BRIDGE_TOKEN"],
          values: {},
          ssoLogin
        };
      }
    }

    if (loginResult.error) {
      return {
        error: `AWS SSO login command failed for profile ${ssoLoginProfile}: ${loginResult.error.message}`,
        code: "AWS_SSO_LOGIN_FAILED",
        missingRequiredEnv: ["AWS_SSO_SESSION"],
        values: {},
        ssoLogin
      };
    }
  }

  const output = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  const failure = classifyLambdaEnvironmentReadFailure({
    output,
    awsProfile,
    ssoLoginProfile,
    lambdaFunctionName,
    autoLoginEnabled: autoLogin
  });
  return {
    error: failure.reason,
    code: failure.code,
    missingRequiredEnv: failure.missingRequiredEnv,
    values: {},
    ssoLogin
  };
}
