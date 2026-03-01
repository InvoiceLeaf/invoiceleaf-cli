import ora, { type Ora } from 'ora';

export class Spinner {
  private spinner: Ora;

  constructor(enabled = true) {
    this.spinner = ora({ isEnabled: enabled });
  }

  start(text: string): void {
    this.spinner.start(text);
  }

  succeed(text?: string): void {
    this.spinner.succeed(text);
  }

  fail(text?: string): void {
    this.spinner.fail(text);
  }

  stop(): void {
    this.spinner.stop();
  }
}

export function createSpinner(enabled = true): Spinner {
  return new Spinner(enabled);
}
