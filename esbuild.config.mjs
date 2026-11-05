// Bundles src/main.ts into main.js (CommonJS, unminified); `production` builds once, otherwise watches.
import { builtinModules } from 'node:module';
import esbuild from 'esbuild';

const production = process.argv[2] === 'production';
const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*', ...builtinModules],
  format: 'cjs',
  target: 'es2020',
  logLevel: 'info',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
});
if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
