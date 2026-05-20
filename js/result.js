/**
 * result.js
 * うちの子アニマル診断 - 結果ページ制御
 *
 * 処理の流れ：
 *   1. sessionStorage から診断データを取得
 *   2. data.js のコンテンツデータを参照して結果を構築
 *   3. 本質・LP・行動タイプの3軸を描画
 *   4. SNSシェアボタンを設置
 *   5. LINE・note・親診断への導線を表示
 *
 * 依存：
 *   data.js  (window.UCHINOKO.ANIMAL_TYPES / LP_TYPES / BEHAVIOR_TYPES)
 *   logic.js (window.UCHINOKO.calcHonshitsu / calcLP / calcBehaviorType)
 */

'use strict';

// ANIMAL_TYPES / LP_TYPES / BEHAVIOR_TYPES は data.js が同じグローバルスコープで宣言済み
// ここで再宣言すると SyntaxError になるため、関数内で window.UCHINOKO 経由で参照する

// ============================================================
// ページ読み込み時に実行
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  const result = loadResult();

  if (!result) {
    renderNoData();
    return;
  }

  renderResult(result);
});


// ============================================================
// セッションストレージからデータを読み込む
// ============================================================

/**
 * sessionStorage に保存された診断結果を取得する
 * @returns {Object|null} 結果オブジェクト or null（データなし）
 */
function loadResult() {
  try {
    const raw = sessionStorage.getItem('uchinoko_result');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}


// ============================================================
// 結果ページ全体を描画する
// ============================================================

/**
 * 3軸の診断結果をページに描画する
 * @param {Object} result - { honshitsuId, lpNumber, behaviorTypeId, birthYear, birthMonth, birthDay }
 */
function renderResult(result) {
  const animal   = window.UCHINOKO.ANIMAL_TYPES[result.honshitsuId];
  const lp       = window.UCHINOKO.LP_TYPES[result.lpNumber];
  const behavior = window.UCHINOKO.BEHAVIOR_TYPES[result.behaviorTypeId];

  // データが不正な場合はエラー表示
  if (!animal || !lp || !behavior) {
    renderNoData();
    return;
  }

  // シェア用テキストを先に作成（ボタンに渡すため）
  // X は文字数制約があるため、ハッシュタグを短縮した版も用意する
  const shareText      = buildShareText(animal, lp, behavior);
  const shareTextForX  = buildShareText(animal, lp, behavior, { shortHashtags: true });

  const main = document.getElementById('resultMain');
  main.innerHTML = `

    <h1 class="result-page-title">🌟 うちの子アニマル診断結果 🌟</h1>

    <!-- ===== 軸1：本質（アニマルタイプ） ===== -->
    <div class="honshitsu-card fade-in-up">
      <span class="section-label label-honshitsu">🌟 本質</span>
      <div class="honshitsu-emoji">${animal.emoji}</div>
      <div class="honshitsu-name">${animal.name}</div>
      <p class="result-description">${escapeHtml(animal.description)}</p>
    </div>

    <!-- ===== 軸2：隠れた数字（LP） ===== -->
    <div class="lp-card fade-in-up">
      <span class="section-label label-lp">✨ 隠れた数字</span>
      <div>
        <span class="lp-number-badge">LP ${lp.lp}</span>
        ${lp.isMaster ? '<span class="master-badge">マスターナンバー</span>' : ''}
      </div>
      <div class="lp-keyword">${lp.emoji} ${lp.keyword}</div>
      <p class="result-description">${escapeHtml(lp.description)}</p>
    </div>

    <!-- ===== 軸3：行動タイプ ===== -->
    <div class="behavior-card fade-in-up">
      <span class="section-label label-behavior">🎯 行動タイプ</span>
      <div class="behavior-name">${behavior.emoji} ${behavior.name}</div>
      <div class="behavior-axis">${behavior.axis}</div>
      <p class="result-description">${escapeHtml(behavior.description)}</p>
    </div>

    <!-- ===== 共通メッセージ ===== -->
    <div class="message-box fade-in-up">
      <p>
        本質、隠れた数字、行動タイプ。<br>
        3つの軸から見える、うちの子のいいところ。<br>
        <strong>今日もそのままで素敵な存在だよ。</strong>🌈
      </p>
    </div>

    <!-- ===== SNSシェア ===== -->
    <div class="share-section fade-in-up">
      <p class="share-title">📲 結果をシェアする</p>
      <button class="btn-share btn-threads" id="shareThreads">
        Threads でシェア
      </button>
      <p class="threads-note">※ コピー後、Threads画面で貼り付けて投稿してください</p>
      <button class="btn-share btn-x" id="shareX">
        𝕏（Twitter）でシェア
      </button>
      <button class="btn-share btn-copy" id="shareCopy">
        📋 テキストをコピー
      </button>
    </div>

    <!-- ===== もう一度診断 / トップへ戻る ===== -->
    <div class="retry-btn-wrap fade-in-up">
      <a href="./shindan.html" class="btn btn-secondary">
        🔄 もう一度診断する
      </a>
    </div>
    <div class="back-to-top-wrap fade-in-up">
      <button class="btn-to-top" id="btnToTop">
        🏠 トップページへ戻る
      </button>
    </div>

  `;

  // シェアボタンのイベント登録（X 用は短縮版を渡す）
  bindShareButtons(shareText, shareTextForX);
  // トップへ戻るボタンのイベント登録
  bindTopButton();
}


// ============================================================
// トップへ戻るボタン（result.html 用）
// 確認ダイアログなし・sessionStorage クリアのみ
// ============================================================

function bindTopButton() {
  const btn = document.getElementById('btnToTop');
  if (!btn) return;
  btn.addEventListener('click', function() {
    sessionStorage.removeItem('uchinoko_result');
    window.location.href = './index.html';
  });
}


// ============================================================
// データなし（直接アクセス等）のエラー表示
// ============================================================

function renderNoData() {
  const main = document.getElementById('resultMain');
  main.innerHTML = `
    <div class="no-data-msg">
      <p>
        診断データが見つかりませんでした。<br>
        診断ページから改めてお試しください。
      </p>
      <a href="./shindan.html" class="btn btn-primary">
        🔍 診断スタート
      </a>
    </div>
  `;
}


// ============================================================
// SNSシェア
// ============================================================

/**
 * シェア用テキストを生成する
 *
 * テンプレート：
 *   うちの子は{絵文字}{タイプ名}✨
 *   {本質説明文の2行目}
 *
 *   3軸でわかったうちの子のトリセツ
 *   🌟 本質：{タイプ名}
 *   ✨ 数秘術：LP{数字}（{キーワード}）
 *   🎯 行動：{行動タイプ名}
 *
 *   【うちの子アニマル診断】
 *   https://billy-sns.github.io/uchinoko-animal-shindan2/
 *
 *   #うちの子アニマル診断 #育児 #子育て #ママ #パパ
 */
function buildShareText(animal, lp, behavior, options) {
  options = options || {};
  // X 等の文字数制約が厳しい媒体向けに、ハッシュタグを最小限に切り替える
  const hashtags = options.shortHashtags
    ? `#うちの子アニマル診断`
    : `#うちの子アニマル診断 #育児 #子育て #ママ #パパ`;

  // 本質説明文の2行目（空行を除いた2番目の行）を取得
  const descLines  = animal.description.split('\n').filter(function(l) { return l.trim() !== ''; });
  const secondLine = descLines[1] || '';

  return [
    `うちの子は${animal.emoji}${animal.name}✨`,
    secondLine,
    ``,
    `3軸でわかったうちの子のトリセツ`,
    `🌟 本質：${animal.name}`,
    `✨ 数秘術：LP${lp.lp}（${lp.keyword}）`,
    `🎯 行動：${behavior.name}`,
    ``,
    `【うちの子アニマル診断】`,
    `https://billy-sns.github.io/uchinoko-animal-shindan2/`,
    ``,
    hashtags,
  ].join('\n');
}

/**
 * シェアボタン3本にイベントを登録する
 *   Threads  → threads.net の投稿画面へ遷移
 *   X        → twitter.com の投稿画面へ遷移
 *   コピー   → クリップボードにコピー
 */
function bindShareButtons(shareText, shareTextForX) {
  const threadsBtn = document.getElementById('shareThreads');
  const xBtn       = document.getElementById('shareX');
  const copyBtn    = document.getElementById('shareCopy');

  // X 用のテキストが未指定なら通常テキストを使う（後方互換）
  shareTextForX = shareTextForX || shareText;

  // Threads は intent/post?text= のクエリ経由だと絵文字（サロゲートペア）が
  // 文字化けする既知の問題があるため、シェアテキストを clipboard にコピー
  // してから空の投稿画面を開き、ユーザーに貼り付けてもらう方式にしている。
  // ボタン直下の注意書きで導線を案内しているためトーストは出さない。
  //
  // 重要：window.open を copyToClipboard より前 or 直後に呼ぶと、フォーカスが
  // 新タブに奪われて writeText の Promise が reject → fallbackCopy(execCommand)
  // にフォールスルーして絵文字が化ける。Promise の完了を待ってから開くこと。
  if (threadsBtn) {
    threadsBtn.addEventListener('click', function() {
      copyToClipboard(shareText).then(function() {
        window.open('https://www.threads.net/intent/post', '_blank', 'noopener,noreferrer');
      });
    });
  }

  // X（Twitter）は intent/tweet?text= で絵文字も正しく扱える。
  // 文字数制約があるためハッシュタグ短縮版（shareTextForX）を使用。
  if (xBtn) {
    xBtn.addEventListener('click', function() {
      const params = new URLSearchParams();
      params.set('text', shareTextForX);
      const twitterUrl = 'https://twitter.com/intent/tweet?' + params.toString();
      window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // クリップボードコピー
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      copyToClipboard(shareText);
      showCopyToast('コピーしました！\nSNSに貼り付けてシェアしてください🐾');
    });
  }
}

/**
 * テキストをクリップボードにコピーする（Promise を返す）
 *
 * navigator.clipboard.writeText は非同期。直後に window.open など
 * フォーカスを奪う操作をすると Promise が reject されてフォールバックの
 * execCommand 経由になり、絵文字（サロゲートペア）が化けるケースがあるため、
 * 呼び出し側で .then() でコピー完了を待てるよう Promise を返す形にしている。
 */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
    return Promise.resolve();
  }
}

/** clipboard API が使えない環境用のフォールバック */
function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity  = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

/** コピー完了のトースト通知 */
function showCopyToast(message) {
  // 既存のトーストがあれば削除
  const existing = document.getElementById('copyToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'copyToast';
  toast.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'left:50%',
    'transform:translateX(-50%)',
    'background:rgba(0,0,0,0.78)',
    'color:#fff',
    'padding:12px 20px',
    'border-radius:12px',
    'font-size:0.82rem',
    'line-height:1.6',
    'white-space:pre-line',
    'text-align:center',
    'z-index:9999',
    'box-shadow:0 4px 12px rgba(0,0,0,0.25)',
    'animation:fadeInUp 0.3s ease',
  ].join(';');
  toast.textContent = message;
  document.body.appendChild(toast);

  // 3秒後に消える
  setTimeout(function() {
    toast.remove();
  }, 3000);
}


// ============================================================
// ユーティリティ：XSS対策のためのHTMLエスケープ
// （description にユーザー入力は含まないが念のため）
// ============================================================

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
