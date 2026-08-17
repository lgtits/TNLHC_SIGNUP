<template>
  <div class="addon-picker">
    <div
      v-for="addon in addons"
      :key="addon.id"
      class="addon-item"
      :class="{ 'is-required': !addon.optional }"
    >
      <q-checkbox
        :model-value="isOn(addon)"
        :disable="!addon.optional"
        dense
        color="primary"
        @update:model-value="(v: boolean) => onToggle(addon.id, v)"
      />

      <div class="addon-item__main">
        <div class="addon-item__head">
          <span class="addon-item__name">
            {{ addon.name }}
            <q-badge v-if="!addon.optional" color="grey-7" class="q-ml-xs">必收</q-badge>
          </span>
          <span class="addon-item__price">
            {{ formatPrice(addon.price) }}<small>/{{ addon.per === 'per_person' ? '人' : '筆' }}</small>
          </span>
        </div>

        <p v-if="addon.description" class="addon-item__desc">{{ addon.description }}</p>

        <p v-if="addon.freeUnderAge" class="addon-item__free">
          {{ addon.freeUnderAge }} 歲以下免費（依填寫的出生年月日自動判定）
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AddonDef } from 'src/types/signup';
import { formatPrice } from 'src/lib/format';

const props = defineProps<{
  addons: AddonDef[];
  modelValue: Record<string, boolean>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, boolean>): void;
}>();

function isOn(addon: AddonDef): boolean {
  if (!addon.optional) return true;
  return props.modelValue[addon.id] ?? addon.defaultOn;
}

function onToggle(id: string, value: boolean) {
  emit('update:modelValue', { ...props.modelValue, [id]: value });
}
</script>

<style scoped lang="scss">
.addon-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.addon-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--hairline);
  background: #fff;

  &.is-required {
    background: var(--tint);
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

    small {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.75;
    }
  }

  &__desc {
    margin: 4px 0 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--text-muted);
  }

  &__free {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--q-positive);
  }
}
</style>
