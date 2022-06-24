import { IacUserError, IacUserErrorOverrides } from './iac-user-error';

export class UserErrorExample extends IacUserError {
  constructor(userErrOverrides?: IacUserErrorOverrides) {
    super(userErrOverrides?.userMessage || 'CUSTOM USER MESSAGE', {
      message: 'CUSTOM MESSAGE',
      isOperational: true,
      ...userErrOverrides?.errOverrides,
    });
  }
}
