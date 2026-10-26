// Bündelt die Oberfläche (CodeMirror + alle Sprachen) in eine Datei: src/renderer/dist/app.js
import { build } from 'esbuild';

await build({
  entryPoints: ['src/renderer/js/app.js'],
  bundle: true,
  format: 'iife',
  target: 'chrome130',
  minify: !process.argv.includes('--dev'),
  sourcemap: process.argv.includes('--dev') ? 'inline' : false,
  outfile: 'src/renderer/dist/app.js',
  legalComments: 'none',
  logLevel: 'warning',
});
