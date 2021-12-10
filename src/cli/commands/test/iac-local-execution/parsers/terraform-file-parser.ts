import hclToJson from './hcl-to-json';
import {
  EngineType,
  IaCErrorCodes,
  IacFileData,
  IacFileParsed,
} from '../types';
import { CustomError } from '../../../../../lib/errors';
import { getErrorStringCode } from '../error-utils';
import { IacProjectType } from '../../../../../lib/iac/constants';

const { newHCL2JSONParser } = require('./hcl2json');

export async function tryParsingTerraformFile(
  fileData: IacFileData,
): Promise<Array<IacFileParsed>> {
  try {
    const hcl2JSONParser = newHCL2JSONParser(fileData.fileContent, "");
    const jsonContent = await hcl2JSONParser.parse()
    console.log('jsonContent', jsonContent)
    return [
      {
        ...fileData,
        jsonContent: JSON.parse(jsonContent),
        content: fileData.fileContent,
        projectType: IacProjectType.TERRAFORM,
        engineType: EngineType.Terraform,
      },
    ];
  } catch (err) {
    throw new FailedToParseTerraformFileError(fileData.filePath);
  }
}

export class FailedToParseTerraformFileError extends CustomError {
  constructor(filename: string) {
    super('Failed to parse Terraform file');
    this.code = IaCErrorCodes.FailedToParseTerraformFileError;
    this.strCode = getErrorStringCode(this.code);
    this.userMessage = `We were unable to parse the Terraform file "${filename}", please ensure it is valid HCL2. This can be done by running it through the 'terraform validate' command.`;
  }
}
