import type { ColumnDef } from '../types';
import type { OutputFormatter } from './formatter';

export class PipeFormatter implements OutputFormatter {
  readonly mode = 'pipe' as const;

  format<T>(data: T): string {
    if (data === null || data === undefined) {
      return '';
    }

    if (typeof data === 'object') {
      return JSON.stringify(data);
    }

    return String(data);
  }

  formatTable<T extends object>(rows: T[], columns: ColumnDef<T>[]): string {
    if (rows.length === 0) {
      return '';
    }

    return rows
      .map((row) =>
        columns
          .map((col) => {
            const value = row[col.key as keyof T];
            return col.format ? col.format(value, row) : this.formatValue(value);
          })
          .join('\t')
      )
      .join('\n');
  }

  formatKeyValue(data: Record<string, unknown>): string {
    return Object.entries(data)
      .map(([key, value]) => `${key}\t${this.formatValue(value)}`)
      .join('\n');
  }

  formatSuccess(message: string): string {
    return `OK\t${message}`;
  }

  formatError(message: string): string {
    return `ERROR\t${message}`;
  }

  formatWarning(message: string): string {
    return `WARN\t${message}`;
  }

  formatInfo(message: string): string {
    return `INFO\t${message}`;
  }

  formatHeader(_title: string): string {
    return '';
  }

  formatHint(_message: string): string {
    return '';
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.join(',');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
  }
}
