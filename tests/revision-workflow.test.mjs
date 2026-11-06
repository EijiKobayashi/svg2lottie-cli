import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRevisionContract,
  validateRevisionContract,
  transitionRevisionContract,
  formatApprovedRevisionContracts,
} from '../src/revision-workflow.mjs';

const NOW = '2026-11-06T00:00:00.000Z';

function completeContract(overrides = {}) {
  return createRevisionContract({
    id: 'rev-1',
    fileName: 'logo.json',
    scene: 'scene2',
    frame: 148,
    totalFrames: 240,
    layerId: 'logo',
    observation: 'ロゴの出現が早く見える',
    expectedResult: '前の要素を読み終えてから自然に出現する',
    allowedChanges: 'scene2 / 144f〜164f / logo / opacity開始時刻のみ',
    forbiddenChanges: '総尺、位置、サイズ、色、他シーン、他レイヤー',
    acceptanceCriteria: '154fまでopacity 0%、154fから既存尺とイージングでフェードする',
    openQuestions: '',
    priority: 'required',
    ...overrides,
  }, NOW);
}

test('変更契約: 必須項目と不明点を検証する', () => {
  const incomplete = completeContract({ expectedResult: '', openQuestions: '開始時刻は154fでよいか' });
  const result = validateRevisionContract(incomplete);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('期待結果')));
  assert.ok(result.errors.some((error) => error.includes('不明点')));
});

test('変更契約: 承認は確認待ちかつ検証済みの場合だけ許可する', () => {
  const draft = completeContract();
  assert.throws(() => transitionRevisionContract(draft, 'approved', NOW), /状態遷移/);

  const review = transitionRevisionContract(draft, 'review', NOW);
  const approved = transitionRevisionContract(review, 'approved', NOW);
  assert.equal(approved.status, 'approved');

  const unclear = transitionRevisionContract(
    completeContract({ id: 'rev-2', openQuestions: '色も変えるべきか' }),
    'review',
    NOW
  );
  assert.throws(() => transitionRevisionContract(unclear, 'approved', NOW), /不明点/);
});

test('変更契約: Agent向け出力は承認済みだけを含み、対象外変更を禁止する', () => {
  const approved = transitionRevisionContract(
    transitionRevisionContract(completeContract(), 'review', NOW),
    'approved',
    NOW
  );
  const draft = completeContract({ id: 'rev-draft', observation: '未承認の指摘' });
  const output = formatApprovedRevisionContracts([draft, approved]);

  assert.match(output, /ロゴの出現が早く見える/);
  assert.doesNotMatch(output, /未承認の指摘/);
  assert.match(output, /変更対象/);
  assert.match(output, /変更禁止範囲/);
  assert.match(output, /完了条件/);
  assert.match(output, /推測して変更しない/);
  assert.match(output, /対象外のリファクタリングを行わない/);
  assert.throws(() => formatApprovedRevisionContracts([draft]), /承認済み/);
});
