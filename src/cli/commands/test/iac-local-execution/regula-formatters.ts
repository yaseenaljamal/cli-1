import { RegulaOutput } from './regula-types';
import { IacFileScanResult } from './types';

export function formatRegulaResults(
  regulaResults: RegulaOutput,
): IacFileScanResult[] {
  let formattedResultsObject = {};

  regulaResults.rule_results.forEach((ruleResult) => {
    if (!formattedResultsObject[ruleResult.filepath]) {
      formattedResultsObject[ruleResult.filepath] = {
        filePath: ruleResult.filepath,
        fileType: ruleResult.input_type,
        projectType: 'terraformconfig', // missing in regula output
        violatedPolicies: [],
      };
    }

    formattedResultsObject[ruleResult.filepath].violatedPolicies.push({
      publicId: ruleResult.rule_id,
      subType: ruleResult.resource_type, // Should be double checked if this is the correct mapping
      title: ruleResult.rule_summary,
      documentation: ruleResult.rule_remediation_doc,
      description: ruleResult.rule_description,
      severity: ruleResult.rule_severity,
      msg: 'introduced.by.standin', // data is missing in regula output
      issue: ruleResult.rule_description,
      impact: "how this issue impacts the project's security", // data is missing
      resolve: ruleResult.rule_remediation_doc,
      references: ['missing reference to the resource provider'], // data is missing
    });
  });

  return Object.values(formattedResultsObject);
}
