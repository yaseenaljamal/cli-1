import { getPropertyVersionName } from '../../../../../src/plugins/maven/update-dependencies';

describe('getPropertyVersionName', () => {
  it('Extracts property version name', () => {
    expect(getPropertyVersionName('${spring.core.version}')).toEqual(
      'spring.core.version',
    );
  });
});
