// Lists every import that points to a file that does not exist (typical after copying a patch partially).
// Usage:  node scripts/check-imports.mjs        (from the project root)
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const SRC = resolve('src');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(n) ? [p] : []; });
const exts = ['', '.js', '.jsx', '.json', '/index.js', '/index.jsx'];
const IMPORT = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
let missing = 0;

for (const file of walk(SRC)) {
  const code = readFileSync(file, 'utf8');
  for (const [, spec] of code.matchAll(IMPORT)) {
    let base;
    if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
    else if (spec.startsWith('.')) base = resolve(dirname(file), spec);
    else continue;                                                    // npm package
    if (spec.includes('*')) continue;
    if (!exts.some((e) => existsSync(base + e) && statSync(base + e).isFile())) {
      missing++;
      console.log(`MISSING  ${spec}\n         imported by ${file.replace(resolve('.') + '/', '').replace(resolve('.') + '\\', '')}`);
    }
  }
}
console.log(missing ? `\n${missing} missing import(s). Copy the listed files from the patch/zip.` : 'All imports resolve.');
process.exit(missing ? 1 : 0);
