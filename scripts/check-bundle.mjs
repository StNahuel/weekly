import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 250 * 1024;
// Dynamic imports the first screen always waits for: DbProvider's hydrate + seeds, then the Hoy route.
const FIRST_ROUTE_DYNAMIC = /^(hydrate|seed|HoyPage)-[\w-]+\.js$/;
const STATIC_IMPORT = /(?:\bfrom|\bimport)\s*["']\.\/([\w.-]+\.js)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["'`]\.\/([\w.-]+\.js)["'`]\s*\)/g;
const HTML_ENTRY = /<(?:script[^>]*\bsrc|link[^>]*\brel="modulepreload"[^>]*\bhref)="\.\/assets\/([\w.-]+\.js)"/g;

const dist = join(import.meta.dirname, '..', 'dist');
const assets = join(dist, 'assets');

let html;
try {
  html = readFileSync(join(dist, 'index.html'), 'utf8');
} catch {
  console.error(`No build output at ${dist}; run pnpm build first.`);
  process.exit(1);
}

const queue = [...html.matchAll(HTML_ENTRY)].flatMap((match) => match[1] ?? []);
if (queue.length === 0) {
  console.error('No script or modulepreload tags in dist/index.html.');
  process.exit(1);
}

/** @type {Map<string, number>} */
const sizes = new Map();
while (queue.length > 0) {
  const name = queue.shift();
  if (name === undefined || sizes.has(name)) continue;
  const code = readFileSync(join(assets, name));
  sizes.set(name, gzipSync(code).length);
  const text = code.toString('utf8');
  queue.push(...[...text.matchAll(STATIC_IMPORT)].flatMap((match) => match[1] ?? []));
  const dynamic = [...text.matchAll(DYNAMIC_IMPORT)].flatMap((match) => match[1] ?? []);
  queue.push(...dynamic.filter((dep) => FIRST_ROUTE_DYNAMIC.test(dep)));
}

/** @param {number} bytes */
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
let total = 0;
for (const [name, size] of [...sizes].sort(([a], [b]) => a.localeCompare(b))) {
  total += size;
  console.log(`${name.padEnd(44)} ${kb(size).padStart(10)} gzip`);
}
console.log(`${'first-route total'.padEnd(44)} ${kb(total).padStart(10)} gzip (budget ${kb(BUDGET_BYTES)})`);
if (total > BUDGET_BYTES) {
  console.error('FAIL: the first-route chunks exceed the gzip budget.');
  process.exit(1);
}
console.log('OK');
