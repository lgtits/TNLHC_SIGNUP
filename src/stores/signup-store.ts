import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { EventItem, SignupForm, SignupResult } from 'src/types/signup';

function emptyForm(eventId = ''): SignupForm {
  return { eventId, name: '', phone: '', roomTypeId: null };
}

export const useSignupStore = defineStore('signup', () => {
  // ── State ──────────────────────────────────
  const events = ref<EventItem[]>([]);
  const currentEvent = ref<EventItem | null>(null);
  const form = ref<SignupForm>(emptyForm());
  const result = ref<SignupResult | null>(null);

  // ── Getters ────────────────────────────────
  const selectedRoomType = computed(() => {
    if (!currentEvent.value || !form.value.roomTypeId) return null;
    return currentEvent.value.roomTypes.find((r) => r.id === form.value.roomTypeId) ?? null;
  });

  /** 表單是否填齊，用來控制送出鍵 */
  const isFormComplete = computed(
    () =>
      form.value.name.trim().length > 0 &&
      form.value.phone.trim().length > 0 &&
      form.value.roomTypeId !== null,
  );

  /** 沒有結果就不該停在價格頁 */
  const hasResult = computed(() => result.value !== null);

  // ── Actions ────────────────────────────────
  function setEvents(list: EventItem[]) {
    events.value = list;
  }

  function setCurrentEvent(event: EventItem | null) {
    currentEvent.value = event;
    // 換活動就把表單的房型清掉，避免帶到別的活動的房型 id
    if (event && form.value.eventId !== event.id) {
      form.value = emptyForm(event.id);
    }
  }

  function updateForm(patch: Partial<SignupForm>) {
    form.value = { ...form.value, ...patch };
  }

  function setResult(data: SignupResult | null) {
    result.value = data;
  }

  /** 從價格頁按「返回修改」時用：保留表單，只清掉結果 */
  function clearResult() {
    result.value = null;
  }

  /** 完整重來（回活動列表用） */
  function reset() {
    currentEvent.value = null;
    form.value = emptyForm();
    result.value = null;
  }

  return {
    events,
    currentEvent,
    form,
    result,
    selectedRoomType,
    isFormComplete,
    hasResult,
    setEvents,
    setCurrentEvent,
    updateForm,
    setResult,
    clearResult,
    reset,
  };
});
