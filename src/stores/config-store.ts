import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { EmbedMode } from 'src/lib/useEmbed';

/**
 * 功能開關一律走 public/config.json，不用 .env，
 * 這樣 build 完丟到靜態空間還能直接改檔調整。
 *
 * 用 `export let` 是為了讓 Service 層可以 `import { IS_DEMO_MODE }`
 * 直接當值用（ES module live binding，loadConfig 更新後 import 端會跟著變）。
 */
export let IS_DEMO_MODE = true;
export let API_BASE_URL = '';

interface RawConfig {
  IS_DEMO_MODE?: unknown;
  API_BASE_URL?: unknown;
  EMBED_MODE?: unknown;
  SHOW_EVENT_TAGS?: unknown;
  SHOW_PRICE_NOTE?: unknown;
}

export const useConfigStore = defineStore('config', () => {
  // ── State ──────────────────────────────────
  const isDemoMode = ref(true);
  const apiBaseUrl = ref('');
  const EMBED_MODE = ref<EmbedMode>('auto');
  const SHOW_EVENT_TAGS = ref(true);
  const SHOW_PRICE_NOTE = ref(true);
  const isLoaded = ref(false);

  // ── Actions ────────────────────────────────
  async function loadConfig() {
    if (isLoaded.value) return;

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as RawConfig;

        if (typeof data.IS_DEMO_MODE === 'boolean') {
          isDemoMode.value = data.IS_DEMO_MODE;
          IS_DEMO_MODE = data.IS_DEMO_MODE;
        }
        if (typeof data.API_BASE_URL === 'string') {
          apiBaseUrl.value = data.API_BASE_URL;
          API_BASE_URL = data.API_BASE_URL;
        }
        if (data.EMBED_MODE === 'auto' || data.EMBED_MODE === 'always' || data.EMBED_MODE === 'never') {
          EMBED_MODE.value = data.EMBED_MODE;
        }
        if (typeof data.SHOW_EVENT_TAGS === 'boolean') {
          SHOW_EVENT_TAGS.value = data.SHOW_EVENT_TAGS;
        }
        if (typeof data.SHOW_PRICE_NOTE === 'boolean') {
          SHOW_PRICE_NOTE.value = data.SHOW_PRICE_NOTE;
        }
      }
    } catch (err) {
      console.warn('[config] 讀取 config.json 失敗，改用預設值', err);
    }

    isLoaded.value = true;
  }

  return {
    isDemoMode,
    apiBaseUrl,
    EMBED_MODE,
    SHOW_EVENT_TAGS,
    SHOW_PRICE_NOTE,
    isLoaded,
    loadConfig,
  };
});
