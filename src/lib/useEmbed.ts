import { readonly, ref } from 'vue';

/**
 * 嵌入模式偵測。
 *
 * Google Sites 用 iframe 嵌入時左右本來就有間距，所以嵌入狀態下要把
 * 版面的左右 padding 收掉，也不顯示 header / footer。
 *
 * 判斷優先序：
 *   1. 網址參數 ?embed=1 / ?embed=0（含 hash 後面的 query）— 方便直接預覽兩種版型
 *   2. config.json 的 EMBED_MODE（always / never）
 *   3. 自動偵測是否被包在 iframe 裡
 */
export type EmbedMode = 'auto' | 'always' | 'never';

const isEmbedded = ref(false);
const isReady = ref(false);

function inIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // 跨網域存取 window.top 會丟例外 → 代表一定在別人的 iframe 裡
    return true;
  }
}

function readQueryFlag(): boolean | null {
  if (typeof window === 'undefined') return null;

  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const hashQuery = hash.includes('?')
    ? new URLSearchParams(hash.slice(hash.indexOf('?') + 1))
    : null;

  const raw = search.get('embed') ?? hashQuery?.get('embed') ?? null;
  if (raw === null) return null;
  return raw !== '0' && raw !== 'false';
}

function applyBodyClass(value: boolean) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('is-embedded', value);
  document.body.classList.toggle('is-standalone', !value);
}

/** 由 boot/embed.ts 呼叫一次 */
export function initEmbed(mode: EmbedMode = 'auto') {
  const queryFlag = readQueryFlag();

  if (queryFlag !== null) {
    isEmbedded.value = queryFlag;
  } else if (mode === 'always') {
    isEmbedded.value = true;
  } else if (mode === 'never') {
    isEmbedded.value = false;
  } else {
    isEmbedded.value = inIframe();
  }

  applyBodyClass(isEmbedded.value);
  isReady.value = true;
}

export function useEmbed() {
  return {
    isEmbedded: readonly(isEmbedded),
    isReady: readonly(isReady),
  };
}
