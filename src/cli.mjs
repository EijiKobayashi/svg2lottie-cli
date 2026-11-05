#!/usr/bin/env node
/**
 * svg2lottie-cli エントリポイント（npm / npx / pnpm / yarn 完全対応）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDefaultShootingScript,
  parseShootingScript,
} from './shooting-script.mjs';
import {
  buildLottieFromStoryboard,
  appendPowderEnding,
} from './lottie-builder.mjs';
import { createPreviewServer } from './preview-server.mjs';

function parseArgs(argv) {
  const args = [...argv];
  const command = args[0] && !args[0].startsWith('-') ? args.shift() : 'help';
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dir' || a === '-d') flags.dir = args[++i];
    else if (a === '--config' || a === '-c') flags.config = args[++i];
    else if (a === '--out' || a === '-o') flags.out = args[++i];
    else if (a === '--port' || a === '-p') flags.port = Number(args[++i]);
    else if (a === '--help' || a === '-h') flags.help = true;
  }
  return { command, flags };
}

function assertSafeSubPath(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(baseDir, targetPath);
  const rel = path.relative(resolvedBase, resolvedTarget);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path traversal detected: ${targetPath}`);
  }
  return resolvedTarget;
}

function createSampleSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 140">
  <g id="main-icon">
    <path id="clip-border" fill="#264f74" d="M 50 20 L 470 20 L 470 120 L 50 120 Z" />
    <path id="star-mark" fill="#264f74" d="M 260 35 L 285 85 L 235 85 Z" />
  </g>
</svg>
`;
}

function createDefaultStoryboardJson(dims = {}) {
  const width = dims.width || 520;
  const height = dims.height || 140;
  return {
    name: 'sample-animation',
    width,
    height,
    fps: dims.fps || 60,
    durationFrames: dims.durationFrames || 180,
    loop: false,
    color: dims.color || '#264f74',
    shootingScript: 'shooting-script.md',
    markers: [{ cm: 'scene0', tm: 0, dr: 90 }],
    layers: [
      {
        id: 'main-icon',
        svg: 'svg/scene0.svg',
        targetId: 'main-icon',
        clipMask: true,
        fadeIn: { start: 20, end: 70, blur: 24, scaleFrom: 0 },
        effects: [
          { type: 'pop-in', start: 20, end: 65, overshootScale: 108 },
          { type: 'liquid-glass', variant: 'liquid', blur: 16, tintOpacity: 20 },
        ],
      },
      {
        id: 'frame-line',
        type: 'stroke',
        trimStroke: {
          vertices: [
            [470, 20],
            [50, 20],
            [50, 120],
            [470, 120],
          ],
          closed: true,
          strokeWidth: 4,
          start: 0,
          end: 60,
        },
      },
    ],
    powderEnding: {
      enabled: true,
      targetLayerIds: ['main-icon', 'frame-line'],
      appearFrame: 118,
      fadeStartFrame: 120,
      fadeEndFrame: 165,
      totalFrames: 180,
      particleCount: 180,
      loop: true,
    },
  };
}

/**
 * CLIコマンドを実行する
 * @param {string[]} argv
 * @param {{ log?: (msg: string) => void }} [io]
 */
export async function runCli(argv = [], io = {}) {
  const log = io.log || (() => {});
  const { command, flags } = parseArgs(argv);

  if (command === 'help' || flags.help) {
    log(
      '[OK] Usage: svg2lottie-cli <init|build|preview> [--dir <dir>] [--config <path>] [--out <dir>] [--port <port>]'
    );
    return { exitCode: 0 };
  }

  if (command === 'init') {
    const targetDir = path.resolve(flags.dir || process.cwd());
    const svgDir = path.join(targetDir, 'svg');
    fs.mkdirSync(svgDir, { recursive: true });

    const scriptPath = path.join(targetDir, 'shooting-script.md');
    const scriptText = createDefaultShootingScript('sample-animation', {
      width: 520,
      height: 140,
      fps: 60,
      durationFrames: 180,
      color: '#264f74',
    });
    fs.writeFileSync(scriptPath, scriptText, 'utf8');

    const parsedScript = parseShootingScript(scriptText);
    const storyboardPath = path.join(targetDir, 'storyboard.json');
    fs.writeFileSync(
      storyboardPath,
      JSON.stringify(createDefaultStoryboardJson(parsedScript), null, 2) + '\n',
      'utf8'
    );

    const sampleSvgPath = path.join(svgDir, 'scene0.svg');
    fs.writeFileSync(sampleSvgPath, createSampleSvg(), 'utf8');

    log(`[OK] Initialized shooting-script.md, storyboard.json, and svg/scene0.svg in ${targetDir}`);
    return { exitCode: 0, targetDir };
  }

  if (command === 'build') {
    const configPath = path.resolve(flags.config || 'storyboard.json');
    const baseDir = path.dirname(configPath);
    const outDir = path.resolve(flags.out || path.join(baseDir, 'dist'));

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // 文字コンテ（shooting-script.md）が存在すれば縦横サイズ等の初期設定を補完
    if (config.shootingScript) {
      const scriptFull = assertSafeSubPath(baseDir, config.shootingScript);
      if (fs.existsSync(scriptFull)) {
        const parsed = parseShootingScript(fs.readFileSync(scriptFull, 'utf8'));
        if (!config.width && parsed.width) config.width = parsed.width;
        if (!config.height && parsed.height) config.height = parsed.height;
      }
    }

    const svgResolver = (relSvgPath) => {
      const fullSvgPath = assertSafeSubPath(baseDir, relSvgPath);
      return fs.readFileSync(fullSvgPath, 'utf8');
    };

    const baseLottie = buildLottieFromStoryboard(config, svgResolver);
    fs.mkdirSync(outDir, { recursive: true });

    const baseOutPath = path.join(outDir, `${config.name || 'animation'}.json`);
    fs.writeFileSync(baseOutPath, JSON.stringify(baseLottie), 'utf8');

    const outputs = [baseOutPath];
    if (config.powderEnding && config.powderEnding.enabled) {
      const powderLottie = appendPowderEnding(baseLottie, config);
      const powderOutPath = path.join(
        outDir,
        `${config.name || 'animation'}-powder.json`
      );
      fs.writeFileSync(powderOutPath, JSON.stringify(powderLottie), 'utf8');
      outputs.push(powderOutPath);
    }

    log(`[OK] Built ${outputs.length} Lottie JSON file(s) in ${outDir}`);
    return { exitCode: 0, outputs };
  }

  if (command === 'preview') {
    const rootDir = path.resolve(flags.dir || process.cwd());
    const port = Number.isFinite(flags.port) ? flags.port : 4322;
    const server = createPreviewServer({ rootDir });
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    const addr = server.address();
    const url = `http://127.0.0.1:${addr.port}`;
    log(`[OK] Preview & AI Revision Studio running at ${url}`);
    return { exitCode: 0, server, url };
  }

  throw new Error(`[ERROR] Unknown command: ${command}`);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  runCli(process.argv.slice(2), { log: (m) => console.log(m) }).catch((err) => {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  });
}
