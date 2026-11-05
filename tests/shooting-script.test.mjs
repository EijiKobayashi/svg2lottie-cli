import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseShootingScript,
  createDefaultShootingScript,
  formatRevisionInstruction,
} from '../src/shooting-script.mjs';

test('parseShootingScript: 文字コンテの初期入力欄（縦横サイズ・fps・総フレーム・色）とシーン演出を解析する', () => {
  const md = createDefaultShootingScript('sample-anim', { width: 640, height: 360 });
  assert.ok(md.includes('横幅 (width)'));
  assert.ok(md.includes('縦幅 (height)'));

  const parsed = parseShootingScript(md);

  assert.ok(parsed.title.includes('sample-anim'));
  assert.equal(parsed.width, 640);
  assert.equal(parsed.height, 360);
  assert.equal(parsed.fps, 60);
  assert.ok(parsed.durationFrames > 0);
  assert.equal(parsed.color, '#264f74');
  assert.ok(parsed.keywords.length >= 2);
  assert.ok(parsed.guards.some((g) => g.includes('0%')));
  assert.ok(parsed.scenes.length >= 1);
  assert.equal(parsed.scenes[0].id, 'scene0');
});

test('formatRevisionInstruction: AIエージェント＆GitHub Issue向けの構造化修正指示Markdownを生成する', () => {
  const output = formatRevisionInstruction({
    fileName: 'hero-animation.json',
    scene: 'scene2',
    frame: 148,
    totalFrames: 560,
    layerId: 'glass-card',
    instruction: 'フェードイン開始を10フレーム遅らせる',
    guards: ['0f待機時は透過0%を維持すること'],
  });

  assert.ok(output.includes('hero-animation.json'));
  assert.ok(output.includes('scene2'));
  assert.ok(output.includes('148f'));
  assert.ok(output.includes('glass-card'));
  assert.ok(output.includes('フェードイン開始を10フレーム遅らせる'));
  assert.ok(output.includes('0f待機時は透過0%を維持すること'));
});
