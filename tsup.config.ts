import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  dts: true,
  clean: true,
  target: 'node18',
  splitting: false,
  minify: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
