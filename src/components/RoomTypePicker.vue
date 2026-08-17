<template>
  <div class="room-picker" role="radiogroup" aria-label="選擇房型">
    <label
      v-for="room in roomTypes"
      :key="room.id"
      class="room-option"
      :class="{
        'is-active': modelValue === room.id,
        'is-disabled': room.quota <= 0,
      }"
    >
      <q-radio
        :model-value="modelValue"
        :val="room.id"
        :disable="room.quota <= 0"
        dense
        color="primary"
        @update:model-value="onPick"
      />

      <div class="room-option__main">
        <div class="room-option__head">
          <span class="room-option__name">{{ room.name }}</span>
          <span class="room-option__price">
            {{ room.price === 0 ? '免費' : formatPrice(room.price) }}
          </span>
        </div>
        <p class="room-option__desc">{{ room.description }}</p>
        <div class="room-option__meta">
          <span><q-icon name="king_bed" size="15px" /> {{ room.capacity }} 人房</span>
          <span :class="{ 'text-negative': room.quota <= 3 }">
            <q-icon name="inventory_2" size="15px" />
            {{ room.quota > 0 ? `剩 ${room.quota} 個名額` : '已額滿' }}
          </span>
        </div>
      </div>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { RoomType } from 'src/types/signup';
import { formatPrice } from 'src/lib/format';

defineProps<{
  modelValue: string | null;
  roomTypes: RoomType[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

function onPick(value: string | null) {
  emit('update:modelValue', value);
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
  padding: 12px;
  border: 1.5px solid var(--hairline);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover:not(.is-disabled) {
    border-color: rgba(47, 111, 94, 0.45);
  }

  &.is-active {
    border-color: var(--q-primary);
    background: rgba(47, 111, 94, 0.05);
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
    font-size: 15px;
    font-weight: 800;
    color: var(--q-primary);
    white-space: nowrap;
  }

  &__desc {
    margin: 4px 0 0;
    font-size: 12.5px;
    line-height: 1.5;
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
}
</style>
