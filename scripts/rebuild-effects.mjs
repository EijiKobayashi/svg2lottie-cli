import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLottieFromStoryboard } from '../src/lottie-builder.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const manifestPath = path.join(rootDir, 'docs/dist/effects/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log(`Rebuilding ${manifest.length} effects...`);

const svgResolver = (relPath) => {
  const fullPath = path.resolve(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`SVG not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
};

for (const item of manifest) {
  console.log(`- Building ${item.name} (${item.title})...`);
  const storyboardConfig = {
    name: item.name,
    width: item.width || 240,
    height: item.height || 240,
    fps: item.fps || 60,
    durationFrames: item.durationFrames || 120,
    loop: true,
    layers: [
      {
        id: 'main-shape',
        svg: item.svg,
        effects: item.effects,
      },
    ],
  };

  const lottie = buildLottieFromStoryboard(storyboardConfig, svgResolver);
  const outPath = path.join(rootDir, `docs/dist/effects/${item.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(lottie, null, 2), 'utf8');
  console.log(`  ✓ Written to ${outPath} (${lottie.layers.length} layers, ${lottie.op} frames)`);
}

console.log('All effects rebuilt successfully!');
