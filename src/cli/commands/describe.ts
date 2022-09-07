import { MethodArgs } from "../args";
import { processCommandArgs } from "./process-command-args";
import * as legacyError from "../../lib/errors/legacy-errors";
import { driftignoreFromPolicy, parseDriftAnalysisResults, processAnalysis } from "../../lib/iac/drift";
import { getIacOrgSettings } from "./test/iac/local-execution/org-settings/get-iac-org-settings";
import { UnsupportedEntitlementCommandError } from "./test/iac/local-execution/assert-iac-options-flag";
import config from "../../lib/config";
import { addIacDriftAnalytics } from "./test/iac/local-execution/analytics";
import * as analytics from "../../lib/analytics";
import { findAndLoadPolicy } from "../../lib/policy";
import { DescribeRequiredArgumentError } from "../../lib/errors/describe-required-argument-error";
import help from "./help";
import { DCTL_EXIT_CODES, runDriftCTL } from "../../lib/iac/drift/driftctl";
import { makeRequestRest } from "../../lib/request/promise";

export default async (...args: MethodArgs): Promise<any> => {
  const { options } = processCommandArgs(...args);

  // Ensure that this describe command can only be runned when using `snyk iac describe`
  // Avoid `snyk describe` direct usage
  if (options.iac != true) {
    return legacyError('describe');
  }

  // Ensure that we are allowed to run that command
  // by checking the entitlement
  const orgPublicId = options.org ?? config.org;
  const iacOrgSettings = await getIacOrgSettings(orgPublicId);
  if (!iacOrgSettings.entitlements?.iacDrift) {
    throw new UnsupportedEntitlementCommandError('drift', 'iacDrift');
  }

  const policy = await findAndLoadPolicy(process.cwd(), 'iac', options);
  const driftIgnore = driftignoreFromPolicy(policy);

  try {
    const describe = await runDriftCTL({
      options: { ...options, kind: 'describe' },
      driftIgnore: driftIgnore,
    });

    process.exitCode = describe.code;

    analytics.add('is-iac-drift', true);
    analytics.add('iac-drift-exit-code', describe.code);
    if (describe.code === DCTL_EXIT_CODES.EXIT_ERROR) {
      throw new Error();
    }

    // Parse analysis JSON and add to analytics
    const analysis = parseDriftAnalysisResults(describe.stdout);
    addIacDriftAnalytics(analysis, options);

    const prioritizedAnalysis = await priorizeAnalysis(analysis)

    const output = await processAnalysis(options, { code: describe.code, stdout: JSON.stringify(prioritizedAnalysis)});
    process.stdout.write(output);
  } catch (e) {
    if (e instanceof DescribeRequiredArgumentError) {
      // when missing a required arg we will display help to explain
      const helpMsg = await help('iac', 'describe');
      console.log(helpMsg);
    }
    return Promise.reject(e);
  }
};

const priorizeAnalysis = async (analysis) => {

  const environment_native_id = "929327065333"
  const orgId = 'a75ccacc-b85d-49c6-a1d5-f65ec4d80d44'
  const resourcesFromCloud = await makeRequestRest<any>({
    qs: {
      version: '2022-04-13~experimental',
      status: 'open',
      environment_native_id,
    },
    method: 'GET',
    url: `http://localhost:8080/rest/orgs/${orgId}/cloud/issues`
  });

  for (const issue of resourcesFromCloud.data) {
    const res = issue.relationships.resource.data
    if (!res.attributes.resource_terraform_id) {
      // TODO Add debug log, and maybe telemetry
      continue
    }

    for (const unmanaged of analysis.unmanaged) {
      if (res.attributes.resource_type === unmanaged.type &&
        res.attributes.resource_terraform_id === unmanaged.id ) {
        if (!unmanaged.issues) {
          unmanaged.issues = []
        }
        const driftIssue = {
          rule_id: issue.relationships.rule_result.data.attributes.rule_id,
          severity: issue.attributes.severity,
          message: issue.relationships.rule_result.data.attributes.message,
        }
        unmanaged.issues.push(driftIssue)
      }
    }
  }
  
  return analysis
}