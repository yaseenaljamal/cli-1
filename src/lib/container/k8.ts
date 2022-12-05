import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { Pod, Container } from 'kubernetes-types/core/v1';
import { Deployment, ReplicaSet } from 'kubernetes-types/apps/v1';

export function parseK8ContainersDeclaration(paths: string[]): string[] {
  const images: string[] = [];

  // for PoC purposes I assume each path points to a specific file
  for (const file of paths) {
    const content = readFileSync(file, 'utf8');
    const parsedFile = parse(content);
    let containers: Container[] | undefined;

    switch (parsedFile.kind) {
      case 'ReplicaSet':
        containers = (parsedFile as ReplicaSet).spec?.template?.spec
          ?.containers;
        break;
      case 'Deployment':
        containers = (parsedFile as Deployment).spec?.template.spec?.containers;
        break;
      case 'Pod':
        containers = (parsedFile as Pod).spec?.containers;
        break;
      default:
        continue;
    }

    if (!containers) {
      continue;
    }

    containers.forEach((container) => {
      if (container.image) {
        // I'm not sure why a container image is optional
        images.push(container.image);
      }
    });
  }

  return images;
}
