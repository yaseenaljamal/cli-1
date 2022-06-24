import {
  IacCustomError,
  IacErrorOverrides,
} from '../internal-errors/iac-custom-error';

export interface IacUserErrorOverrides {
  userMessage?: string;
  errOverrides?: IacErrorOverrides;
}

export abstract class IacUserError extends IacCustomError {
  protected constructor(userMessage: string, errOverrides?: IacErrorOverrides) {
    super(errOverrides);

    const errClassName = this.constructor.name;
    this.code =
      IacUserErrorCodes[errClassName] || IacUserErrorCodes.InvalidIacError;
    this.strCode = IacUserError.mapCodeToStrCode(this.code!);
    this.userMessage =
      (errOverrides?.innerError as IacCustomError | undefined)?.userMessage ||
      userMessage;
  }

  private static mapCodeToStrCode(errCode: number): string {
    let strCode = IacUserErrorCodes[errCode].replace(/([A-Z])/g, '_$1');

    if (strCode.charAt(0) === '_') {
      strCode = strCode.substring(1);
    }

    return strCode.toUpperCase();
  }
}

// Error codes used for Analytics & Debugging
// Error names get converted to error string codes
// Within a single module, increments are in 1.
// Between modules, increments are in 10, according to the order of execution.
enum IacUserErrorCodes {
  InvalidIacError = 666,

  // local-cache errors
  FailedToInitLocalCacheError = 1000,
  FailedToCleanLocalCacheError = 1001,
  FailedToDownloadRulesError = 1002,
  FailedToExtractCustomRulesError = 1003,
  InvalidCustomRules = 1004,
  InvalidCustomRulesPath = 1005,
  InvalidVarFilePath = 1006,

  // file-loader errors
  NoFilesToScanError = 1010,
  FailedToLoadFileError = 1011,
  CurrentWorkingDirectoryTraversalError = 1012,

  // file-parser errors
  UnsupportedFileTypeError = 1020,
  InvalidJsonFileError = 1021,
  InvalidYamlFileError = 1022,
  FailedToDetectJsonConfigError = 1023,
  FailedToDetectYamlConfigError = 1024,

  // kubernetes-parser errors
  MissingRequiredFieldsInKubernetesYamlError = 1031,
  FailedToParseHelmError = 1032,

  // terraform-file-parser errors
  FailedToParseTerraformFileError = 1040,

  // terraform-plan-parser errors
  FailedToExtractResourcesInTerraformPlanError = 1052,

  // file-scanner errors
  FailedToBuildPolicyEngine = 1060,
  FailedToExecutePolicyEngine = 1061,

  // results-formatter errors
  FailedToFormatResults = 1070,
  FailedToExtractLineNumberError = 1071,

  // get-iac-org-settings errors
  FailedToGetIacOrgSettingsError = 1080,

  // assert-iac-options-flag
  FlagError = 1090,
  FlagValueError = 1091,
  UnsupportedEntitlementFlagError = 1092,
  FeatureFlagError = 1093,

  // oci-pull errors
  FailedToExecuteCustomRulesError = 1100,
  FailedToPullCustomBundleError = 1101,
  FailedToBuildOCIArtifactError = 1102,
  InvalidRemoteRegistryURLError = 1103,
  InvalidManifestSchemaVersionError = 1104,
  UnsupportedFeatureFlagPullError = 1105,
  UnsupportedEntitlementPullError = 1106,

  // drift errors
  InvalidServiceError = 1110,

  // Rules bundle errors.
  InvalidUserRulesBundleError = 1130,
  BundleNotFoundError = 1131,

  // Unified Policy Engine executable errors.
  InvalidUserPolicyEnginePathError = 1140,

  // Scan errors
  PolicyEngineScanError = 1150,
}
