import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  EventItem,
  FieldDef,
  FieldValues,
  RoomType,
  SignupDraft,
  SignupResult,
} from 'src/types/signup';

/** 依欄位定義產生一份空白資料 */
function blankValues(fields: FieldDef[]): FieldValues {
  return Object.fromEntries(fields.map((f) => [f.key, '']));
}

function blankDraft(eventId = ''): SignupDraft {
  return {
    eventId,
    contact: {},
    roomTypeId: null,
    units: 1,
    participants: [],
    addons: {},
  };
}

export const useSignupStore = defineStore('signup', () => {
  // ── State ──────────────────────────────────
  const events = ref<EventItem[]>([]);
  const currentEvent = ref<EventItem | null>(null);
  const draft = ref<SignupDraft>(blankDraft());
  const result = ref<SignupResult | null>(null);

  // ── Getters ────────────────────────────────
  const schema = computed(() => currentEvent.value?.registration ?? null);

  const selectedRoom = computed<RoomType | null>(() => {
    if (!schema.value || !draft.value.roomTypeId) return null;
    return schema.value.roomTypes.find((r) => r.id === draft.value.roomTypeId) ?? null;
  });

  /**
   * 要填幾個人的資料：
   *   通鋪（bed）  → 訂幾個床位就填幾人
   *   房間（room）→ 該房型床位數 × 訂幾間
   *   不需住宿      → 不逐人填寫（0）
   */
  const requiredParticipants = computed(() => {
    const room = selectedRoom.value;
    if (!room || !schema.value?.participantFields.length) return 0;
    return room.bookingUnit === 'bed'
      ? draft.value.units
      : room.capacity * draft.value.units;
  });

  const needsAccommodation = computed(() => schema.value?.requiresAccommodation ?? false);

  // ── Actions ────────────────────────────────
  function setEvents(list: EventItem[]) {
    events.value = list;
  }

  function setCurrentEvent(event: EventItem | null) {
    currentEvent.value = event;
    if (!event) return;

    // 換活動就整份重來，避免帶到別的活動的欄位或房型 id
    if (draft.value.eventId !== event.id) {
      draft.value = blankDraft(event.id);
      draft.value.contact = blankValues(event.registration.contactFields);
      draft.value.addons = Object.fromEntries(
        event.registration.addons.map((a) => [a.id, a.defaultOn]),
      );
      syncParticipants();
    }
  }

  /** 讓 participants 的長度對上目前選的房型／數量 */
  function syncParticipants() {
    const fields = schema.value?.participantFields ?? [];
    if (!fields.length) {
      draft.value.participants = [];
      return;
    }

    const target = requiredParticipants.value;
    const list = [...draft.value.participants];

    while (list.length < target) list.push(blankValues(fields));
    list.length = Math.min(list.length, target);

    draft.value.participants = list;
  }

  function setContactValue(key: string, value: string) {
    draft.value.contact = { ...draft.value.contact, [key]: value };
  }

  function setParticipantValue(index: number, key: string, value: string) {
    const list = [...draft.value.participants];
    const current = list[index];
    if (!current) return;
    list[index] = { ...current, [key]: value };
    draft.value.participants = list;
  }

  function setRoomType(id: string | null) {
    draft.value.roomTypeId = id;
    draft.value.units = 1;
    syncParticipants();
  }

  function setUnits(units: number) {
    draft.value.units = units;
    syncParticipants();
  }

  function setAddons(map: Record<string, boolean>) {
    draft.value.addons = map;
  }

  function setResult(data: SignupResult | null) {
    result.value = data;
  }

  function clearResult() {
    result.value = null;
  }

  function reset() {
    currentEvent.value = null;
    draft.value = blankDraft();
    result.value = null;
  }

  return {
    events,
    currentEvent,
    draft,
    result,
    schema,
    selectedRoom,
    requiredParticipants,
    needsAccommodation,
    setEvents,
    setCurrentEvent,
    syncParticipants,
    setContactValue,
    setParticipantValue,
    setRoomType,
    setUnits,
    setAddons,
    setResult,
    clearResult,
    reset,
  };
});
