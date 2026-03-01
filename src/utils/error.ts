import { ApiError, ApiErrorCode } from '@invoiceleaf/typescript-sdk';
import { ExitCode, type ExitCodeValue } from '../types';

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCodeValue = ExitCode.GENERAL_ERROR,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export function mapSdkError(error: unknown): CLIError {
  if (error instanceof CLIError) {
    return error;
  }

  if (error instanceof ApiError) {
    if (
      error.code === ApiErrorCode.UNAUTHORIZED ||
      error.code === ApiErrorCode.TOKEN_EXPIRED ||
      error.code === ApiErrorCode.TOKEN_INVALID
    ) {
      return new CLIError(
        'Authentication failed. Set credentials with "invoiceleaf auth apikey --set ..." or "invoiceleaf auth token --set ...".',
        ExitCode.AUTH_ERROR,
        error
      );
    }

    if (error.isNetworkError()) {
      return new CLIError(
        'Network error. Please check your connection.',
        ExitCode.NETWORK_ERROR,
        error
      );
    }

    return new CLIError(error.getUserMessage(), ExitCode.API_ERROR, error);
  }

  if (error instanceof Error) {
    return new CLIError(error.message, ExitCode.GENERAL_ERROR, error);
  }

  return new CLIError('Unexpected error', ExitCode.GENERAL_ERROR);
}

export function handleError(error: unknown, quiet = false): never {
  const cliError = mapSdkError(error);

  if (!quiet) {
    console.error(`Error: ${cliError.message}`);
  }

  process.exit(cliError.exitCode);
}
