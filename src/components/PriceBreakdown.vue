<template>
  <div class="price-breakdown">
    <div v-for="item in items" :key="item.label" class="price-breakdown__row">
      <div class="price-breakdown__label">
        <span>{{ item.label }}</span>
        <small v-if="item.note" class="text-muted">{{ item.note }}</small>
      </div>
      <div class="price-breakdown__amount" :class="{ 'is-discount': item.amount < 0 }">
        {{ formatPrice(item.amount) }}
      </div>
    </div>

    <div class="price-breakdown__total">
      <span>應付總額</span>
      <strong>{{ formatPrice(total) }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PriceBreakdownItem } from 'src/types/signup';
import { formatPrice } from 'src/lib/format';

defineProps<{
  items: PriceBreakdownItem[];
  total: number;
}>();
</script>

<style scoped lang="scss">
.price-breakdown {
  &__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 0;
    border-bottom: 1px dashed var(--hairline);
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 14px;

    small {
      font-size: 11.5px;
    }
  }

  &__amount {
    font-size: 14.5px;
    font-weight: 700;
    white-space: nowrap;

    &.is-discount {
      color: var(--q-negative);
    }
  }

  &__total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding-top: 14px;
    font-size: 14px;
    font-weight: 700;

    strong {
      font-size: 26px;
      font-weight: 800;
      color: var(--q-primary);
      letter-spacing: -0.01em;
    }
  }
}
</style>
