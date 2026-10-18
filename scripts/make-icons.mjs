import { Resvg } from '@resvg/resvg-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public', 'logo.svg');
const outDir = join(root, 'public', 'icons');

if (!existsSync(source)) {
  console.error(`Missing ${source}; it is the only icon input.`);
  process.exit(1);
}

const svg = readFileSync(source);
const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-512-maskable.png', size: 512 },
  { file: 'apple-touch-icon-180.png', size: 180 },
];

mkdirSync(outDir, { recursive: true });
for (const { file, size } of targets) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: true, defaultFontFamily: 'Helvetica Neue' },
  })
    .render()
    .asPng();
  writeFileSync(join(outDir, file), png);
  console.log(`${file} ${size}x${size}`);
}
