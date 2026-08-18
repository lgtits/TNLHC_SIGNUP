<template>
  <div class="room-picker" role="radiogroup" aria-label="選擇房型">
    <label
      v-for="room in roomTypes"
      :key="room.id"
      class="room-option"
      :class="{ 'is-active': modelValue === room.id, 'is-disabled': room.available <= 0 }"
    >
      <q-radio
        :model-value="modelValue"
        :val="room.id"
        :disable="room.available <= 0"
        dense
        color="primary"
        @update:model-value="() => onPick(room)"
      />

      <div class="room-option__main">
        <div class="room-option__head">
          <span class="room-option__name">
            {{ room.name }}
            <q-badge v-if="room.priority" color="secondary" class="q-ml-xs">尊榮優先</q-badge>
          </span>
          <!-- 通鋪以床位計價，其餘房型以「整間」計價 -->
          <span class="room-option__price">
            <small class="room-option__price-prefix">補助後</small>
            {{ formatPrice(roomDisplayPrice(room)) }}<small>/{{ priceUnit(room) }}</small>
          </span>
        </div>

        <p class="room-option__bed">{{ room.bedInfo }}</p>
        <p v-if="room.description" class="room-option__desc">{{ room.description }}</p>

        <div class="room-option__meta">
          <!-- 通鋪：算床位；房間：算間數 -->
          <span :class="stockClass(room)">{{ stockText(room) }}</span>
        </div>

        <!-- 選中之後才問住幾個人：房間可以少住人，但不能超過床位數 -->
        <div v-if="modelValue === room.id && maxGuests(room) > 1" class="room-option__units">
          <div class="room-option__units-row">
            <span class="room-option__units-label">
              {{ room.bookingUnit === 'bed' ? '要訂幾個床位？' : '這間房要住幾位？' }}
            </span>
            <q-select
              :model-value="guests"
              outlined
              dense
              emit-value
              map-options
              class="room-option__units-select"
              :options="guestOptions(room)"
              @update:model-value="onGuests"
            />
          </div>
          <p v-if="room.bookingUnit === 'room'" class="room-option__units-hint">
            費用以整間計算，可以少住人（最多 {{ room.capacity }} 位），少住不減價。
          </p>
        </div>
      </div>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { RoomType } from 'src/types/signup';
import { formatPrice } from 'src/lib/format';
import { defaultGuests, maxGuests, roomDisplayPrice } from 'src/lib/pricing';

defineProps<{
  modelValue: string | null;
  guests: number;
  roomTypes: RoomType[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
  (e: 'update:guests', value: number): void;
}>();

function priceUnit(room: RoomType): string {
  return room.bookingUnit === 'bed' ? '人' : '間';
}

function stockText(room: RoomType): string {
  if (room.available <= 0) return '已額滿';
  return room.bookingUnit === 'bed'
    ? `剩 ${room.available} / ${room.capacity} 個床位`
    : `剩 ${room.available} 間・每間最多 ${room.capacity} 人`;
}

function stockClass(room: RoomType) {
  if (room.available <= 0) return 'text-muted';
  const low = room.bookingUnit === 'bed' ? room.available <= 5 : room.available <= 1;
  return low ? 'text-negative' : '';
}

function guestOptions(room: RoomType) {
  const suffix = room.bookingUnit === 'bed' ? '個床位' : '位';
  return Array.from({ length: maxGuests(room) }, (_, i) => ({
    label: `${i + 1} ${suffix}`,
    value: i + 1,
  }));
}

/** 選到房型時一併帶出預設人數：房間預設住滿，通鋪預設 1 個床位 */
function onPick(room: RoomType) {
  emit('update:modelValue', room.id);
  emit('update:guests', defaultGuests(room));
}

function onGuests(value: number) {
  emit('update:guests', value);
}
</script>

<style scoped lang="scss">
.room-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-option {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--hairline);
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover:not(.is-disabled) {
    border-color: rgba(0, 0, 0, 0.4);
  }

  &.is-active {
    border-color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--ink);
    background: var(--tint);
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  &__name {
    font-size: 15px;
    font-weight: 700;
  }

  &__price {
    font-size: 16px;
    font-weight: 800;
    color: var(--q-primary);
    white-space: nowrap;

    small {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.75;
    }
  }

  &__price-prefix {
    margin-right: 3px;
    letter-spacing: 0.04em;
  }

  &__bed {
    margin: 4px 0 0;
    font-size: 12.5px;
    color: rgba(0, 0, 0, 0.72);
  }

  &__desc {
    margin: 3px 0 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--text-muted);
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-muted);

    span {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
  }

  &__units {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px dashed var(--hairline);
  }

  &__units-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__units-hint {
    margin: 8px 0 0;
    font-size: 11.5px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  &__units-label {
    font-size: 12.5px;
    font-weight: 600;
  }

  &__units-select {
    width: 130px;
  }
}
</style>
