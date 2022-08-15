import { isSupported } from '../../../../src/plugins/is-supported';
import { generateEntityToFix } from '../../../helpers/generate-entity-to-fix';

describe('isSupported', () => {
  it('with missing remediation is not supported', async () => {
    const entity = generateEntityToFix(
      'maven',
      'pom.xml',
      JSON.stringify({}),
    );
    // @ts-ignore: for test purpose only
    delete entity.testResult.remediation;
    const res = await isSupported(entity);
    expect(res.supported).toBeFalsy();
  });

  it('with empty Upgrades is not supported', async () => {
    const entity = generateEntityToFix(
      'maven',
      'pom.xml',
      JSON.stringify({}),
    );
    // @ts-ignore: for test purpose only
    delete entity.testResult.remediation;
    // @ts-ignore: for test purpose only
    entity.testResult.remediation = {
      unresolved: [],
      upgrade: {},
      patch: {},
      ignore: {},
      pin: {},
    };
    const res = await isSupported(entity);
    expect(res.supported).toBeFalsy();
  });
});
