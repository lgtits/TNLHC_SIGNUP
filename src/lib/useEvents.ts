import { ref } from 'vue';
import {
  fetchAvailability,
  fetchEventById,
  fetchEventList,
} from 'src/service/SignupService';
import { useSignupStore } from 'src/stores/signup-store';

/** 活動列表：負責 loading / error 狀態，資料落在 signup store */
export function useEventList() {
  const signupStore = useSignupStore();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function load(force = false) {
    if (!force && signupStore.events.length > 0) return;

    isLoading.value = true;
    error.value = null;
    try {
      signupStore.setEvents(await fetchEventList());
    } catch (err) {
      error.value = err instanceof Error ? err.message : '活動列表載入失敗';
    } finally {
      isLoading.value = false;
    }
  }

  return { isLoading, error, load };
}

/** 單一活動：優先用列表裡已有的資料，沒有才打 service */
export function useEventDetail() {
  const signupStore = useSignupStore();
  const isLoading = ref(false);
  const isSyncingQuota = ref(false);
  const error = ref<string | null>(null);

  /**
   * 名額同步。失敗不擋報名流程 —— 送出時後端還會再檢查一次，
   * 這裡只是讓畫面盡量顯示真實數字。
   */
  async function syncQuota() {
    isSyncingQuota.value = true;
    try {
      const map = await fetchAvailability();
      if (Object.keys(map).length > 0) signupStore.applyAvailability(map);
    } catch (err) {
      console.warn('[quota] 名額同步失敗，改用資料檔中的數字', err);
    } finally {
      isSyncingQuota.value = false;
    }
  }

  async function load(eventId: string) {
    isLoading.value = true;
    error.value = null;

    const cached = signupStore.events.find((e) => e.id === eventId);
    if (cached) {
      signupStore.setCurrentEvent(cached);
      isLoading.value = false;
      await syncQuota();
      return;
    }

    try {
      const event = await fetchEventById(eventId);
      if (!event) {
        error.value = '找不到這個活動，可能已經下架了。';
        signupStore.setCurrentEvent(null);
        return;
      }
      signupStore.setCurrentEvent(event);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '活動資料載入失敗';
      return;
    } finally {
      isLoading.value = false;
    }

    await syncQuota();
  }

  return { isLoading, isSyncingQuota, error, load, syncQuota };
}
