import { IacErrorOverrides, IacCustomError } from './iac-custom-error';

export class InternalIacErrorExample extends IacCustomError {
  constructor(overrides?: IacErrorOverrides) {
    super({
      message: 'OVERRIDE MESSAGE',
      ...overrides,
    });
  }
}
