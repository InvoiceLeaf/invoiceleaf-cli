import type { GlobalOptions } from '../types';
import {
  detectOutputMode,
  shouldUseColors,
  type OutputFormatter,
} from './formatter';
import { HumanFormatter } from './human';
import { JsonFormatter } from './json';
import { PipeFormatter } from './pipe';

export { type OutputFormatter } from './formatter';

export function createFormatter(options: GlobalOptions): OutputFormatter {
  const mode = detectOutputMode(options);

  if (mode === 'json') {
    return new JsonFormatter();
  }

  if (mode === 'pipe') {
    return new PipeFormatter();
  }

  return new HumanFormatter(shouldUseColors(options));
}

export function output(formatter: OutputFormatter, data: unknown): void {
  const formatted = typeof data === 'string' ? data : formatter.format(data);
  if (formatted) {
    console.log(formatted);
  }
}

export function newline(): void {
  console.log();
}
