/**
 * shindan.js
 * うちの子アニマル診断 - 診断ページ制御
 *
 * 処理の流れ：
 *   STEP 0: 生年月日入力
 *   STEP 1〜7: 質問（1問ずつ表示）
 *   STEP 8: 診断中アニメーション → 結果ページへ遷移
 *
 * 依存：
 *   data.js   (window.UCHINOKO.QUESTIONS)
 *   logic.js  (window.UCHINOKO.calcHonshitsu, calcLP, calcBehaviorType)
 */

'use strict';

// ============================================================
// 定数・状態管理
// ============================================================

// QUESTIONS は data.js が同じグローバルスコープで宣言済み（const QUESTIONS = [...]）
// ここで再宣言すると SyntaxError になるため、data.js の変数をそのまま参照する
const TOTAL_STEPS = QUESTIONS.length + 1; // 合計ステップ数（生年月日 + 7問 = 8）

// 診断の状態
const state = {
  birthYear:  null, // 入力された西暦年
  birthMonth: null, // 入力された月
  birthDay:   null, // 入力された日
  currentQ:   0,    // 現在表示中の質問インデックス（0〜6）
  answers:    [],   // 回答配列 { questionId, optionIndex }[]
};


// ============================================================
// DOM 要素の参照
// ============================================================

const stepBirthday    = document.getElementById('step-birthday');
const stepQuestions   = document.getElementById('step-questions');
const stepCalculating = document.getElementById('step-calculating');
const progressText    = document.getElementById('progressText');
const progressFill    = document.getElementById('progressFill');
const questionCard    = document.getElementById('questionCard');
const btnPrev         = document.getElementById('btnPrev');
const btnNext         = document.getElementById('btnNext');
const birthdayError   = document.getElementById('birthdayError');
const questionError   = document.getElementById('questionError');


// ============================================================
// 初期化
//
// スクリプトが <body> 末尾に配置されているため、
// 読み込み時点でDOMは構築済み。
// DOMContentLoaded を使わず直接実行することで、
// イベント発火タイミングのズレによる不具合を防ぐ。
// ============================================================

function init() {
  buildBirthdaySelects(); // 年・月・日のセレクトボックスを構築
  bindBirthdayEvents();   // 生年月日フォームのイベントバインド
  bindNavEvents();        // 前へ・次へボタンのイベントバインド
  bindTopButton();        // トップへ戻るボタン
}

// DOM構築済みなら即実行、まだ解析中なら待機（安全網）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


// ============================================================
// 生年月日セレクトボックスの構築
// ============================================================

function buildBirthdaySelects() {
  const yearSel  = document.getElementById('birthYear');
  const monthSel = document.getElementById('birthMonth');
  const daySel   = document.getElementById('birthDay');

  // 年：1980年〜今年まで（新しい年を上に表示）
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 1980; y--) {
    const opt = document.createElement('option');
    opt.value       = y;
    opt.textContent = y + '年';
    yearSel.appendChild(opt);
  }

  // 月：1〜12
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value       = m;
    opt.textContent = m + '月';
    monthSel.appendChild(opt);
  }

  // 日：1〜31（月変更時に動的更新）
  updateDaySelect();

  // 月が変わったら日の選択肢を更新
  monthSel.addEventListener('change', updateDaySelect);
  yearSel.addEventListener('change', updateDaySelect);
}

/** 選択中の年・月に合わせて日の選択肢を更新する */
function updateDaySelect() {
  const yearSel  = document.getElementById('birthYear');
  const monthSel = document.getElementById('birthMonth');
  const daySel   = document.getElementById('birthDay');

  const year  = parseInt(yearSel.value,  10) || 2022;
  const month = parseInt(monthSel.value, 10) || 1;

  // 選択中の年・月の最終日を取得（月末日は月によって異なる）
  const lastDay = new Date(year, month, 0).getDate(); // 翌月の0日 = 今月の末日

  const currentDay = parseInt(daySel.value, 10); // 現在選択中の日
  daySel.innerHTML = '<option value="">日</option>';

  for (let d = 1; d <= lastDay; d++) {
    const opt = document.createElement('option');
    opt.value       = d;
    opt.textContent = d + '日';
    if (d === currentDay) opt.selected = true; // 以前の選択を維持
    daySel.appendChild(opt);
  }
}


// ============================================================
// 生年月日フォームのイベント
// ============================================================

function bindBirthdayEvents() {
  const btn = document.getElementById('btnBirthdayNext');
  btn.addEventListener('click', function() {
    const year  = parseInt(document.getElementById('birthYear').value,  10);
    const month = parseInt(document.getElementById('birthMonth').value, 10);
    const day   = parseInt(document.getElementById('birthDay').value,   10);

    // バリデーション
    if (!year || !month || !day) {
      birthdayError.classList.add('visible');
      return;
    }

    birthdayError.classList.remove('visible');
    state.birthYear  = year;
    state.birthMonth = month;
    state.birthDay   = day;

    // 質問ステップへ移行
    showStep('questions');
    renderQuestion(0);
    updateProgress(1); // ステップ1（1問目）
  });
}


// ============================================================
// 質問の描画
// ============================================================

/**
 * 指定インデックスの質問をカードに描画する
 * @param {number} qIdx - 質問インデックス（0〜6）
 */
function renderQuestion(qIdx) {
  const q = QUESTIONS[qIdx];
  state.currentQ = qIdx;

  // 既存の選択状態をリセット
  const existingAnswer = state.answers.find(function(a) {
    return a.questionId === q.id;
  });
  const selectedIdx = existingAnswer ? existingAnswer.optionIndex : -1;

  // Q7（決め手）用のバッジ
  const deciderBadge = q.isDecider
    ? '<div class="decider-badge">✨ 決め手の質問（+3点）</div>'
    : '';

  // 選択肢HTML
  const optionsHTML = q.options.map(function(opt, i) {
    const labels = ['A', 'B', 'C', 'D'];
    const selectedClass = i === selectedIdx ? ' selected' : '';
    return `
      <li>
        <button
          class="option-btn${selectedClass}"
          data-index="${i}"
          aria-pressed="${i === selectedIdx}"
        >
          <span class="option-badge">${labels[i]}</span>${opt.text}
        </button>
      </li>`;
  }).join('');

  questionCard.innerHTML = `
    <div class="question-num">Q${q.id} / ${QUESTIONS.length}</div>
    ${deciderBadge}
    <p class="question-text">${q.text}</p>
    <ul class="options-list">
      ${optionsHTML}
    </ul>
  `;

  // 「次へ」ボタンの状態：既に回答済みなら有効化
  btnNext.disabled = selectedIdx === -1;

  // Q7（最後の問）は「次へ」のラベルを変える
  if (q.isDecider) {
    btnNext.textContent = '診断結果を見る 🎉';
  } else {
    btnNext.textContent = '次の質問へ';
  }

  // 「戻る」ボタン：最初の問の前ステップは生年月日入力に戻る
  btnPrev.textContent = qIdx === 0 ? '← 生年月日に戻る' : '← 前の質問へ';

  // 選択肢のクリックイベントを登録
  questionCard.querySelectorAll('.option-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectOption(qIdx, parseInt(btn.dataset.index, 10));
    });
  });

  // エラーメッセージを隠す
  questionError.classList.remove('visible');

  // カードをスクロールトップへ
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 選択肢を選んだときの処理
 * @param {number} qIdx       - 質問インデックス
 * @param {number} optionIdx  - 選んだ選択肢インデックス
 */
function selectOption(qIdx, optionIdx) {
  const q = QUESTIONS[qIdx];

  // 回答を記録（既存があれば上書き）
  const existingIdx = state.answers.findIndex(function(a) {
    return a.questionId === q.id;
  });
  const newAnswer = { questionId: q.id, optionIndex: optionIdx };
  if (existingIdx >= 0) {
    state.answers[existingIdx] = newAnswer;
  } else {
    state.answers.push(newAnswer);
  }

  // 選択肢のUIを更新
  questionCard.querySelectorAll('.option-btn').forEach(function(btn, i) {
    btn.classList.toggle('selected', i === optionIdx);
    btn.setAttribute('aria-pressed', String(i === optionIdx));
  });

  // 「次へ」ボタンを有効化
  btnNext.disabled = false;
  questionError.classList.remove('visible');
}


// ============================================================
// 前へ・次へのナビゲーション
// ============================================================

function bindNavEvents() {

  // 「次へ」ボタン
  btnNext.addEventListener('click', function() {
    const q = QUESTIONS[state.currentQ];
    const answered = state.answers.some(function(a) {
      return a.questionId === q.id;
    });

    if (!answered) {
      questionError.classList.add('visible');
      return;
    }

    if (state.currentQ < QUESTIONS.length - 1) {
      // 次の質問へ
      renderQuestion(state.currentQ + 1);
      updateProgress(state.currentQ + 2); // ステップ番号（1始まり）
    } else {
      // 全問回答済み → 診断実行
      runDiagnosis();
    }
  });

  // 「戻る」ボタン
  btnPrev.addEventListener('click', function() {
    if (state.currentQ === 0) {
      // 最初の問 → 生年月日入力に戻る
      showStep('birthday');
      updateProgress(0);
    } else {
      renderQuestion(state.currentQ - 1);
      updateProgress(state.currentQ); // 前のステップ番号
    }
  });
}


// ============================================================
// 診断実行 → result.html へ遷移
// ============================================================

function runDiagnosis() {
  // 診断中アニメーションを表示
  showStep('calculating');

  // 演出のため少し待ってから計算（1.2秒）
  setTimeout(function() {
    const { calcHonshitsu, calcLP, calcBehaviorType } = window.UCHINOKO;

    // 3軸を計算
    const honshitsuId    = calcHonshitsu(state.birthYear, state.birthMonth, state.birthDay);
    const lpNumber       = calcLP(state.birthYear, state.birthMonth, state.birthDay);
    const behaviorTypeId = calcBehaviorType(state.answers);

    // 結果をセッションストレージに保存して result.html へ遷移
    sessionStorage.setItem('uchinoko_result', JSON.stringify({
      birthYear:    state.birthYear,
      birthMonth:   state.birthMonth,
      birthDay:     state.birthDay,
      honshitsuId:  honshitsuId,
      lpNumber:     lpNumber,
      behaviorTypeId: behaviorTypeId,
    }));

    window.location.href = './result.html';
  }, 1200);
}


// ============================================================
// プログレスバー更新
// ============================================================

/**
 * プログレスバーとステップテキストを更新する
 * @param {number} currentStep - 現在のステップ（0=生年月日, 1〜7=質問）
 */
function updateProgress(currentStep) {
  const percent = Math.round((currentStep / TOTAL_STEPS) * 100);
  progressFill.style.width = percent + '%';
  progressText.textContent = 'ステップ ' + (currentStep + 1) + ' / ' + (TOTAL_STEPS + 1);
}


// ============================================================
// ステップ表示切り替え
// ============================================================

/**
 * 指定ステップのセクションを表示し、他を隠す
 * @param {string} stepName - 'birthday' / 'questions' / 'calculating'
 */
function showStep(stepName) {
  stepBirthday.classList.remove('active');
  stepQuestions.classList.remove('active');
  stepCalculating.classList.remove('active');

  if (stepName === 'birthday') {
    stepBirthday.classList.add('active');
  } else if (stepName === 'questions') {
    stepQuestions.classList.add('active');
  } else if (stepName === 'calculating') {
    stepCalculating.classList.add('active');
  }
}


// ============================================================
// トップへ戻るボタン（shindan.html 用）
// 確認ダイアログあり・sessionStorage クリア
// ============================================================

function bindTopButton() {
  const btn = document.getElementById('btnToTop');
  if (!btn) return;
  btn.addEventListener('click', function() {
    const ok = window.confirm(
      '診断を中止してトップページに戻りますか？\n入力中の回答は失われます。'
    );
    if (ok) {
      sessionStorage.removeItem('uchinoko_result');
      window.location.href = './index.html';
    }
  });
}
