/**
 * logic.js
 * うちの子アニマル診断 - 診断ロジック（四柱推命版）
 *
 * 3つの判定関数：
 *   calcHonshitsu(year, month, day)   … 四柱推命・十二運星 → 12タイプID
 *   calcLP(year, month, day)          … 数秘術 → ライフパスナンバー
 *   calcBehaviorType(answers)         … 質問スコア → 行動タイプID
 *
 * 動作確認用：
 *   runTests()  … ファイル末尾のテスト関数をコンソールで呼び出して結果を表示
 */

'use strict';

// ============================================================
// 【軸1】四柱推命・十二運星 → 本質タイプ判定
//
// 実装方針：
//   1. 基準日(1900/1/1 = 甲戌)からの経過日数を計算
//   2. 経過日数を 60 で割った余りで干支番号（0〜59）を取得
//   3. 干支番号から「日干（天干10種）」と「日支（地支12種）」を分解
//   4. 早見表（五行同根説：戊≡丙, 己≡丁）で十二運星を判定
//   5. 十二運星から12動物タイプID（1〜12）にマッピング
//
// 注意：節入りを厳密に計算しない簡易方式。月初め前後数日でズレる可能性あり。
// ============================================================

/** 天干（10種） */
const TENKAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 地支（12種） */
const CHISHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 基準日(1900/1/1)からの経過日数を計算する
 * 1900/1/1 = 甲戌 = 60干支の11番目（0始まりインデックス10）
 */
const BASE_DATE = new Date(1900, 0, 1);
const BASE_GANSHI_INDEX = 10;

function daysSinceBase(year, month, day) {
  const target = new Date(year, month - 1, day);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((target - BASE_DATE) / msPerDay);
}

/**
 * 生年月日から日柱（日干＋日支＋干支番号）を返す
 * @returns {{ ganshiIndex:number, dayKanIdx:number, dayShiIdx:number, kanji:string }}
 */
function calcDayPillar(year, month, day) {
  const days = daysSinceBase(year, month, day);
  // 過去日付（マイナス）対策で +60 してから再度 %60
  const ganshiIndex = ((BASE_GANSHI_INDEX + days) % 60 + 60) % 60;
  const dayKanIdx = ganshiIndex % 10;
  const dayShiIdx = ganshiIndex % 12;
  return {
    ganshiIndex,
    dayKanIdx,
    dayShiIdx,
    kanji: TENKAN[dayKanIdx] + CHISHI[dayShiIdx],
  };
}

/**
 * 十二運星早見表（五行同根説：戊≡丙, 己≡丁）
 * UNSEI_TABLE[日干インデックス][地支インデックス] = 運星名
 *
 * 行：甲(0)乙(1)丙(2)丁(3)戊(4)己(5)庚(6)辛(7)壬(8)癸(9)
 * 列：子(0)丑(1)寅(2)卯(3)辰(4)巳(5)午(6)未(7)申(8)酉(9)戌(10)亥(11)
 */
const UNSEI_TABLE = [
  // 子,    丑,    寅,    卯,    辰,    巳,    午,    未,    申,    酉,    戌,    亥
  ['沐浴', '冠帯', '建禄', '帝旺', '衰',   '病',   '死',   '墓',   '絶',   '胎',   '養',   '長生'], // 甲
  ['病',   '衰',   '帝旺', '建禄', '冠帯', '沐浴', '長生', '養',   '胎',   '絶',   '墓',   '死'],   // 乙
  ['胎',   '養',   '長生', '沐浴', '冠帯', '建禄', '帝旺', '衰',   '病',   '死',   '墓',   '絶'],   // 丙
  ['絶',   '墓',   '死',   '病',   '衰',   '帝旺', '建禄', '冠帯', '沐浴', '長生', '養',   '胎'],   // 丁
  ['胎',   '養',   '長生', '沐浴', '冠帯', '建禄', '帝旺', '衰',   '病',   '死',   '墓',   '絶'],   // 戊（丙と同じ：五行同根説）
  ['絶',   '墓',   '死',   '病',   '衰',   '帝旺', '建禄', '冠帯', '沐浴', '長生', '養',   '胎'],   // 己（丁と同じ：五行同根説）
  ['死',   '墓',   '絶',   '胎',   '養',   '長生', '沐浴', '冠帯', '建禄', '帝旺', '衰',   '病'],   // 庚
  ['長生', '養',   '胎',   '絶',   '墓',   '死',   '病',   '衰',   '帝旺', '建禄', '冠帯', '沐浴'], // 辛
  ['帝旺', '衰',   '病',   '死',   '墓',   '絶',   '胎',   '養',   '長生', '沐浴', '冠帯', '建禄'], // 壬
  ['建禄', '冠帯', '沐浴', '長生', '養',   '胎',   '絶',   '墓',   '死',   '病',   '衰',   '帝旺'], // 癸
];

/**
 * 十二運星 → 12タイプID（data.js の ANIMAL_TYPES のキーに対応）
 * ※既存ID体系を温存。id:1 をクマ→フクロウ、id:9 をキリン→サル に内部差し替え
 */
const UNSEI_TO_TYPE_ID = {
  '帝旺': 12, // どうどうライオン
  '長生': 3,  // げんきなイヌ
  '建禄': 6,  // なかよしペンギン
  '冠帯': 5,  // しっかりキツネ
  '沐浴': 4,  // マイペースなネコ
  '病':   2,  // やさしいウサギ
  '養':   11, // ふんわりパンダ
  '死':   1,  // かしこいフクロウ
  '衰':   8,  // のんびりラッコ
  '胎':   9,  // わくわくサル
  '絶':   10, // ひらめきリス
  '墓':   7,  // じっくりハリネズミ
};

/**
 * 生年月日から本質タイプID（1〜12）を返す
 * @param {number} year  - 西暦年
 * @param {number} month - 月（1〜12）
 * @param {number} day   - 日（1〜31）
 * @returns {number} タイプID（1〜12）
 */
function calcHonshitsu(year, month, day) {
  const pillar = calcDayPillar(year, month, day);
  const unsei = UNSEI_TABLE[pillar.dayKanIdx][pillar.dayShiIdx];
  return UNSEI_TO_TYPE_ID[unsei];
}


// ============================================================
// 【軸2】数秘術・ライフパスナンバー判定
//
// 計算ルール：
//   生年月日の全桁を1桁になるまで足す
//   11・22・33が出たらその時点でストップ（マスターナンバー）
//
// 例：2020年5月3日生まれ
//   2+0+2+0+5+3 = 12 → 1+2 = 3 → LP3
//
// 例：2020年11月9日生まれ
//   2+0+2+0+1+1+9 = 15 → 1+5 = 6 → LP6
// ============================================================

function sumDigits(n) {
  return String(n)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
}

function calcLP(year, month, day) {
  const allDigits = String(year) + String(month) + String(day);
  let total = allDigits
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);

  while (total > 9 && total !== 11 && total !== 22 && total !== 33) {
    total = sumDigits(total);
  }

  return total;
}


// ============================================================
// 【軸3】質問スコア集計 → 行動タイプ判定
//
// ルール：
//   Q1〜Q6：選択した選択肢のタイプに +2点
//   Q7（決め手）：選択した選択肢のタイプに +3点
//   同点の場合：Q7の答え（deciderType）を優先
// ============================================================

function calcBehaviorType(answers) {
  const scores = { omoi: 0, jikkuri: 0, waku: 0, shikkari: 0 };
  let deciderType = null;

  const questions = window.UCHINOKO.QUESTIONS;

  answers.forEach(function(answer) {
    const question = questions.find(function(q) { return q.id === answer.questionId; });
    if (!question) return;

    const option = question.options[answer.optionIndex];
    if (!option) return;

    scores[option.type] += option.score;

    if (question.isDecider) {
      deciderType = option.type;
    }
  });

  const maxScore = Math.max(...Object.values(scores));
  const topTypes = Object.keys(scores).filter(function(type) {
    return scores[type] === maxScore;
  });

  if (topTypes.length === 1) {
    return topTypes[0];
  }

  if (deciderType && topTypes.includes(deciderType)) {
    return deciderType;
  }

  return topTypes[0];
}


// ============================================================
// 動作確認用テスト関数
// ブラウザコンソールで runTests() を呼び出すと結果を表示
// ============================================================

function runTests() {
  console.log('=== うちの子アニマル診断（四柱推命版）ロジックテスト ===\n');
  testCalcHonshitsu();
  testCalcLP();
  testCalcBehaviorType();
  console.log('\n=== テスト完了 ===');
}

/** 四柱推命（本質タイプ）のテスト：家族5人分の検証ケース */
function testCalcHonshitsu() {
  console.log('--- calcHonshitsu テスト（マスタードキュメント検証ケース） ---');

  const typeNames = window.UCHINOKO && window.UCHINOKO.ANIMAL_TYPES
    ? window.UCHINOKO.ANIMAL_TYPES
    : null;

  // [year, month, day, 期待日柱, 期待運星, 期待タイプID, メモ]
  const cases = [
    [2016,  5, 23, '乙巳', '沐浴', 4,  '長女・紗花 → マイペースなネコ'],
    [2019, 12, 17, '戊子', '胎',   9,  '次女・柊花 → わくわくサル'],
    [2021, 11,  1, '癸丑', '冠帯', 5,  '長男・蒼大 → しっかりキツネ'],
    [1982,  9, 30, '丙辰', '冠帯', 5,  'パパ（おっくん） → しっかりキツネ'],
    [1983, 10,  9, '庚午', '沐浴', 4,  'ママ → マイペースなネコ'],
  ];

  let pass = 0;
  cases.forEach(function([year, month, day, expKanji, expUnsei, expTypeId, memo]) {
    const pillar = calcDayPillar(year, month, day);
    const unsei  = UNSEI_TABLE[pillar.dayKanIdx][pillar.dayShiIdx];
    const typeId = UNSEI_TO_TYPE_ID[unsei];
    const typeName = typeNames ? typeNames[typeId].name : `タイプ${typeId}`;

    const okKanji  = pillar.kanji === expKanji;
    const okUnsei  = unsei === expUnsei;
    const okTypeId = typeId === expTypeId;
    const ok = okKanji && okUnsei && okTypeId;
    if (ok) pass++;

    const mark = ok ? '✅' : '❌';
    console.log(
      `  ${mark} ${year}/${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}`,
      `→ 日柱:${pillar.kanji}(期待:${expKanji})`,
      `運星:${unsei}(期待:${expUnsei})`,
      `${typeName}(ID:${typeId} 期待:${expTypeId})`,
      `\n     ＊${memo}`
    );
  });
  console.log(`\n  → ${pass}/${cases.length} 件パス`);
}

/** 数秘術（LP）のテスト */
function testCalcLP() {
  console.log('\n--- calcLP テスト ---');

  const cases = [
    [1985,  3, 12, 11, '1+9+8+5+3+1+2=29 → 2+9=11'],
    [1990,  7, 15,  5, '1+9+9+0+7+1+5=32 → 3+2=5'],
  ];

  cases.forEach(function([year, month, day, expected, memo]) {
    const result = calcLP(year, month, day);
    const ok = result === expected ? '✅ OK' : `❌ NG（期待値: LP${expected}）`;
    console.log(`  ${ok}  ${year}/${month}/${day} → LP${result}  ＊${memo}`);
  });
}

/** 行動タイプのテスト */
function testCalcBehaviorType() {
  console.log('\n--- calcBehaviorType テスト ---');

  const allOmoi = [
    { questionId: 1, optionIndex: 0 },
    { questionId: 2, optionIndex: 2 },
    { questionId: 3, optionIndex: 2 },
    { questionId: 4, optionIndex: 1 },
    { questionId: 5, optionIndex: 3 },
    { questionId: 6, optionIndex: 2 },
    { questionId: 7, optionIndex: 1 },
  ];
  const result1 = calcBehaviorType(allOmoi);
  const ok1 = result1 === 'omoi' ? '✅ OK' : `❌ NG（期待: omoi）`;
  console.log(`  ${ok1}  全問思いやり → ${result1}`);

  const allShikkari = [
    { questionId: 1, optionIndex: 3 },
    { questionId: 2, optionIndex: 1 },
    { questionId: 3, optionIndex: 3 },
    { questionId: 4, optionIndex: 0 },
    { questionId: 5, optionIndex: 0 },
    { questionId: 6, optionIndex: 0 },
    { questionId: 7, optionIndex: 2 },
  ];
  const result2 = calcBehaviorType(allShikkari);
  const ok2 = result2 === 'shikkari' ? '✅ OK' : `❌ NG（期待: shikkari）`;
  console.log(`  ${ok2}  全問しっかり → ${result2}`);
}


// ============================================================
// エクスポート（window.UCHINOKO に格納）
// ============================================================
window.UCHINOKO = window.UCHINOKO || {};
window.UCHINOKO.calcHonshitsu    = calcHonshitsu;
window.UCHINOKO.calcLP           = calcLP;
window.UCHINOKO.calcBehaviorType = calcBehaviorType;
window.UCHINOKO.calcDayPillar    = calcDayPillar;
window.UCHINOKO.runTests         = runTests;
