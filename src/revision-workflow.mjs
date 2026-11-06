const STATUSES = Object.freeze(['draft', 'review', 'approved', 'recheck', 'done']);
const PRIORITIES = Object.freeze(['required', 'optional', 'hold']);
const TRANSITIONS = Object.freeze({
  draft: ['review'],
  review: ['draft', 'approved'],
  approved: ['review', 'recheck'],
  recheck: ['approved', 'done'],
  done: ['recheck'],
});

const REQUIRED_FIELDS = Object.freeze([
  ['fileName', '対象ファイル'],
  ['scene', '対象シーン'],
  ['layerId', '対象レイヤー'],
  ['observation', '現状'],
  ['expectedResult', '期待結果'],
  ['allowedChanges', '変更対象'],
  ['forbiddenChanges', '変更禁止範囲'],
  ['acceptanceCriteria', '完了条件'],
]);

/** @param {unknown} value */
function text(value) {
  return String(value ?? '').trim();
}

/**
 * @param {Record<string, unknown>} input
 * @param {string} [now]
 */
export function createRevisionContract(input = {}, now = new Date().toISOString()) {
  const timestamp = text(now) || new Date().toISOString();
  return {
    id: text(input.id) || `revision-${Date.now()}`,
    fileName: text(input.fileName) || 'animation.json',
    scene: text(input.scene) || 'scene0',
    frame: Number.isFinite(Number(input.frame)) ? Number(input.frame) : 0,
    totalFrames: Number.isFinite(Number(input.totalFrames)) ? Number(input.totalFrames) : 0,
    layerId: text(input.layerId) || '全体',
    observation: text(input.observation),
    expectedResult: text(input.expectedResult),
    allowedChanges: text(input.allowedChanges),
    forbiddenChanges: text(input.forbiddenChanges),
    acceptanceCriteria: text(input.acceptanceCriteria),
    openQuestions: text(input.openQuestions),
    priority: PRIORITIES.includes(input.priority) ? input.priority : 'hold',
    status: STATUSES.includes(input.status) ? input.status : 'draft',
    createdAt: text(input.createdAt) || timestamp,
    updatedAt: timestamp,
  };
}

/** @param {Record<string, unknown>} contract */
export function validateRevisionContract(contract = {}) {
  const errors = REQUIRED_FIELDS
    .filter(([field]) => !text(contract[field]))
    .map(([, label]) => `${label}を入力してください`);
  if (text(contract.openQuestions)) errors.push('不明点が残っているため承認できません');
  if (!PRIORITIES.includes(contract.priority)) errors.push('優先度を選択してください');
  if (contract.priority === 'hold') errors.push('優先度が保留のため承認できません');
  return { valid: errors.length === 0, errors };
}

/**
 * @param {Record<string, unknown>} contract
 * @param {string} nextStatus
 * @param {string} [now]
 */
export function transitionRevisionContract(contract, nextStatus, now = new Date().toISOString()) {
  const current = STATUSES.includes(contract?.status) ? contract.status : 'draft';
  if (!STATUSES.includes(nextStatus) || !TRANSITIONS[current].includes(nextStatus)) {
    throw new Error(`許可されていない状態遷移です: ${current} -> ${nextStatus}`);
  }
  if (nextStatus === 'approved') {
    const validation = validateRevisionContract(contract);
    if (!validation.valid) throw new Error(validation.errors.join(' / '));
  }
  return { ...contract, status: nextStatus, updatedAt: text(now) || new Date().toISOString() };
}

/** @param {Array<Record<string, unknown>>} contracts */
export function formatApprovedRevisionContracts(contracts = []) {
  const approved = contracts.filter((contract) => contract?.status === 'approved');
  if (approved.length === 0) throw new Error('承認済みの変更契約がありません');

  const items = approved.map((contract, index) => `## 変更契約 ${index + 1}: ${text(contract.id)}

- **優先度**: ${contract.priority === 'required' ? '必須' : '任意'}
- **対象ファイル**: \`${text(contract.fileName)}\`
- **対象シーン・フレーム**: \`${text(contract.scene)}\` / \`${Number(contract.frame) || 0}f\`
- **対象レイヤーID**: \`${text(contract.layerId)}\`
- **現状**: ${text(contract.observation)}
- **期待結果**: ${text(contract.expectedResult)}
- **変更対象**: ${text(contract.allowedChanges)}
- **変更禁止範囲**: ${text(contract.forbiddenChanges)}
- **完了条件**: ${text(contract.acceptanceCriteria)}`);

  return `# 承認済みアニメーション変更契約

## 実装時の絶対ルール

- 記載されていない意図を推測して変更しない。
- 変更対象に記載された範囲以外を変更しない。
- 変更禁止範囲には触れない。
- 対象外のリファクタリングを行わない。
- 不明点や矛盾を発見した場合は実装を停止して確認する。

${items.join('\n\n')}
`;
}
