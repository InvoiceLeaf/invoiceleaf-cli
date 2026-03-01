import chalk from 'chalk';
import Table from 'cli-table3';
import type { ColumnDef } from '../types';
import type { OutputFormatter } from './formatter';

export class HumanFormatter implements OutputFormatter {
  readonly mode = 'human' as const;

  constructor(private readonly useColors = true) {}

  private color(text: string, colorFn: (text: string) => string): string {
    return this.useColors ? colorFn(text) : text;
  }

  format<T>(data: T): string {
    if (data === null || data === undefined) {
      return this.color('-', chalk.dim);
    }

    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  }

  formatTable<T extends object>(rows: T[], columns: ColumnDef<T>[]): string {
    if (rows.length === 0) {
      return this.color('No items found.', chalk.dim);
    }

    const table = new Table({
      head: columns.map((col) =>
        this.useColors ? chalk.bold.cyan(col.header) : col.header
      ),
      style: {
        head: [],
        border: this.useColors ? ['dim'] : [],
      },
      colWidths: columns.map((col) => col.width ?? null),
      colAligns: columns.map((col) => col.align || 'left'),
    });

    for (const row of rows) {
      const values = columns.map((col) => {
        const value = row[col.key as keyof T];
        if (col.format) {
          return col.format(value, row);
        }
        return this.formatValue(value);
      });
      table.push(values);
    }

    return table.toString();
  }

  formatKeyValue(data: Record<string, unknown>): string {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return this.color('-', chalk.dim);
    }

    const maxKeyLength = Math.max(...keys.map((key) => key.length));
    return keys
      .map((key) => {
        const paddedKey = key.padEnd(maxKeyLength);
        const formattedKey = this.useColors ? chalk.bold(paddedKey) : paddedKey;
        return `  ${formattedKey}  ${this.formatValue(data[key])}`;
      })
      .join('\n');
  }

  formatSuccess(message: string): string {
    const icon = this.color('✓', chalk.green);
    return `${icon} ${message}`;
  }

  formatError(message: string): string {
    const icon = this.color('✗', chalk.red);
    const text = this.color(message, chalk.red);
    return `${icon} ${text}`;
  }

  formatWarning(message: string): string {
    const icon = this.color('⚠', chalk.yellow);
    const text = this.color(message, chalk.yellow);
    return `${icon} ${text}`;
  }

  formatInfo(message: string): string {
    const icon = this.color('ℹ', chalk.blue);
    return `${icon} ${message}`;
  }

  formatHeader(title: string): string {
    return this.useColors ? chalk.bold.underline(title) : title;
  }

  formatHint(message: string): string {
    return this.color(message, chalk.dim);
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return this.color('-', chalk.dim);
    }

    if (Array.isArray(value)) {
      return value.length === 0 ? this.color('-', chalk.dim) : value.join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
