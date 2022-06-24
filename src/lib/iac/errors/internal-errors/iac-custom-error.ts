import { CustomError } from '../../../errors';

export class IacCustomError extends CustomError {
  public isOperational?: boolean;

  constructor(errOverrides?: IacErrorOverrides) {
    super(
      errOverrides?.message ||
        errOverrides?.innerError?.message ||
        'Unexpected error',
    );

    Object.assign(this, errOverrides?.innerError, errOverrides);
  }
}

export interface IacErrorOverrides {
  message?: string;
  isOperational?: boolean;
  innerError?: Error;
}
