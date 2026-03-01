import { getConfig } from '../config';
import { CLIError } from './error';
import { ExitCode } from '../types';

export function resolveSpaceId(explicitSpaceId?: string): string {
  const spaceId = explicitSpaceId || getConfig('defaultSpaceId');

  if (!spaceId) {
    throw new CLIError(
      'Missing space ID. Pass --space <id> or set config defaultSpaceId.',
      ExitCode.USAGE_ERROR
    );
  }

  return spaceId;
}
