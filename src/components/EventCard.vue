<template>
  <article
    class="event-card surface-card"
    role="button"
    tabindex="0"
    @click="emit('select', event)"
    @keydown.enter.prevent="emit('select', event)"
    @keydown.space.prevent="emit('select', event)"
  >
    <div class="event-card__cover" :style="coverStyle">
      <q-icon :name="event.icon" size="34px" />
      <q-badge class="event-card__status" :class="`is-${event.status}`" rounded>
        {{ statusLabel }}
      </q-badge>
    </div>

    <div class="event-card__body">
      <h3 class="event-card__title">{{ event.title }}</h3>
      <p class="event-card__subtitle">{{ event.subtitle }}</p>

      <div class="event-card__meta">
        <span><q-icon name="event" size="16px" /> {{ dateText }}</span>
        <span><q-icon name="place" size="16px" /> {{ event.location }}</span>
      </div>

      <div v-if="showTags && event.tags.length" class="event-card__tags">
        <q-chip
          v-for="tag in event.tags"
          :key="tag"
          dense
          square
          outline
          color="primary"
          text-color="primary"
          :ripple="false"
        >
          {{ tag }}
        </q-chip>
      </div>

      <div class="event-card__footer">
        <div class="event-card__price">
          <span class="text-muted">最低</span>
          <strong>{{ formatPrice(fromPrice) }}</strong>
          <span class="text-muted">起 / 人</span>
        </div>
        <q-btn
          unelevated
          no-caps
          color="primary"
          :disable="isClosed"
          :label="isClosed ? '已截止' : '我要報名'"
          icon-right="chevron_right"
          @click.stop="emit('select', event)"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EventItem } from 'src/types/signup';
import { formatDateRange, formatPrice } from 'src/lib/format';

const props = withDefaults(
  defineProps<{
    event: EventItem;
    showTags?: boolean;
  }>(),
  { showTags: true },
);

const emit = defineEmits<{
  (e: 'select', event: EventItem): void;
}>();

const STATUS_LABEL: Record<EventItem['status'], string> = {
  open: '報名中',
  almost_full: '名額有限',
  full: '已額滿',
  closed: '已截止',
};

const statusLabel = computed(() => STATUS_LABEL[props.event.status]);
const isClosed = computed(
  () => props.event.status === 'closed' || props.event.status === 'full',
);

const dateText = computed(() =>
  formatDateRange(props.event.startDate, props.event.endDate),
);

const coverStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.event.coverFrom} 0%, ${props.event.coverTo} 100%)`,
}));

/** 卡片上的「最低價」：基本費 + 最便宜房型 − 早鳥 */
const fromPrice = computed(() => {
  const cheapest = props.event.roomTypes.reduce(
    (min, room) => Math.min(min, room.price),
    Number.POSITIVE_INFINITY,
  );
  const room = Number.isFinite(cheapest) ? cheapest : 0;
  return Math.max(0, props.event.basePrice + room - props.event.earlyBirdDiscount);
});
</script>

<style scoped lang="scss">
.event-card {
  cursor: pointer;
  transition: box-shadow 0.18s ease, transform 0.18s ease;

  &:hover,
  &:focus-visible {
    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.1);
    outline: none;
  }

  &:active {
    transform: scale(0.995);
  }

  &__cover {
    position: relative;
    height: 86px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.9);
  }

  &__status {
    position: absolute;
    top: 10px;
    right: 12px;
    font-size: 11px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.92);
    color: #2f6f5e;

    &.is-almost_full {
      color: #b26a00;
    }

    &.is-full,
    &.is-closed {
      color: rgba(0, 0, 0, 0.5);
    }
  }

  &__body {
    padding: 14px var(--content-pad-x) 16px;
  }

  &__title {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.3;
  }

  &__subtitle {
    margin: 3px 0 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 10px;
    font-size: 13px;
    color: var(--text-muted);

    span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;

    :deep(.q-chip) {
      margin: 0;
      font-size: 11.5px;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed var(--hairline);
  }

  &__price {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 12px;

    strong {
      font-size: 18px;
      color: var(--q-primary);
    }
  }
}
</style>
