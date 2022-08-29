import * as depGraphLib from '@snyk/dep-graph';

import { MethodArgs } from '../../args';
import { processCommandArgs } from '../process-command-args';
import { detectPackageManager } from '../../../lib/detect';
import { getDepsFromPlugin } from '../../../lib/plugins/get-deps-from-plugin';
import { extractPackageManager } from '../../../lib/plugins/extract-package-manager';
import { Options } from '../../../lib/types';
import { ScannedProject } from '@snyk/cli-interface/legacy/common';
// import * as projectMetadata from '../../../lib/project-metadata';
import { makeRequest } from '../../../lib/request/promise';

interface UserOptions extends Options {
  format: typeof SbomFormatCycloneDxJson;
  // do we want projectName?
}

const SbomFormatCycloneDxJson = 'cyclonedx+json';

export default async function sbom(...args: MethodArgs): Promise<string> {
  const { options: userOptions, paths } = processCommandArgs(...args);
  const output: any[] = [];

  // 0. Validate options
  const options = validateOptions(userOptions);

  // 1. Scan local fs for manifests
  for (const path of paths) {
    // get manifest files
    // get depgraphs from manifests
    options.packageManager = detectPackageManager(path, options);
    const scanResult = await getDepsFromPlugin(path, options as any);
    const boms: any[] = [];

    for (const project of scanResult.scannedProjects) {
      const depGraph: depGraphLib.DepGraphData = await generateDepGraphDataForProject(
        project,
        scanResult,
        options,
      );

      const payload = {
        method: 'post',
        url: 'http://localhost:8080/rest/sbom?version=2022-03-31~experimental',
        body: { depGraph },
      };

      try {
        const res = await makeRequest(payload);
        boms.push(JSON.parse(res as any));
      } catch (e) {
        console.error(
          'error with the request',
          (e as any),
        );
      }

      // const target = await projectMetadata.getInfo(
      //   project,
      //   options,
      //   depGraph as any,
      // );
    }

    // push something to output
    output.push(JSON.stringify(boms));
  }

  return output.join('\n');
}

function validateOptions(options: UserOptions): UserOptions {
  const format = options.format ?? SbomFormatCycloneDxJson;

  if (![SbomFormatCycloneDxJson].includes(format)) {
    throw new Error(`Invalid format \`${format}\`.`);
  }

  return {
    ...options,
    format,
  };
}

async function generateDepGraphDataForProject(
  project: ScannedProject,
  scanResult: any,
  options: UserOptions,
): Promise<depGraphLib.DepGraphData> {
  const packageManager = extractPackageManager(
    project as any,
    scanResult,
    options,
  );
  // make requests per dep graph
  let depGraph = project.depGraph || project.depTree;

  if (!depGraph) {
    throw new Error('No bueno!');
  }

  if (!project.depGraph) {
    depGraph = await depGraphLib.legacy.depTreeToGraph(
      depGraph as any,
      packageManager as any,
    );
  }

  return (depGraph as depGraphLib.DepGraph).toJSON();
}
