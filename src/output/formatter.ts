import type { ColumnDef, GlobalOptions, OutputMode } from '../types';
import { getConfig } from '../config';

export interface OutputFormatter {
  format<T>(data: T): string;
  formatTable<T extends object>(rows: T[], columns: ColumnDef<T>[]): string;
  formatKeyValue(data: Record<string, unknown>): string;
  formatSuccess(message: string): string;
  formatError(message: string): string;
  formatWarning(message: string): string;
  formatInfo(message: string): string;
  formatHeader(title: string): string;
  formatHint(message: string): string;
  mode: OutputMode;
}

export function detectOutputMode(options: GlobalOptions): OutputMode {
  if (options.json) {
    return 'json';
  }

  if (!process.stdout.isTTY) {
    return 'pipe';
  }

  return 'human';
}

export function shouldUseColors(options: GlobalOptions): boolean {
  if (options.color === false) {
    return false;
  }

  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  if (process.env.FORCE_COLOR !== undefined) {
    return true;
  }

  if (!getConfig('colors')) {
    return false;
  }

  return process.stdout.isTTY === true;
}
