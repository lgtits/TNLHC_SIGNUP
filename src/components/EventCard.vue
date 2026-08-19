<template>
  <article
    class="event-card"
    :class="{ 'has-image': !!imageSrc }"
    role="button"
    tabindex="0"
    @click="emit('select', event)"
    @keydown.enter.prevent="emit('select', event)"
    @keydown.space.prevent="emit('select', event)"
  >
    <!-- 左：標題，照片當背景；沒照片就是淺灰底 -->
    <div class="event-card__main" :style="mainStyle">
      <div class="event-card__inner">
        <p class="eyebrow event-card__status" :class="`is-${event.status}`">
          {{ statusLabel }}
        </p>
        <h3 class="event-card__title">{{ event.title }}</h3>
        <p class="event-card__subtitle">{{ event.subtitle }}</p>
      </div>
    </div>

    <!-- 右：資訊與報名 -->
    <div class="event-card__aside">
      <dl class="event-card__info">
        <div>
          <dt>日期</dt>
          <dd>{{ dateText }}</dd>
        </div>
        <div>
          <dt>地點</dt>
          <dd>{{ event.location }}</dd>
        </div>
        <div v-if="deadlineText">
          <dt>報名截止</dt>
          <dd>{{ deadlineText }}</dd>
        </div>
      </dl>

      <div class="event-card__actions">
        <q-btn
          unelevated
          no-caps
          color="primary"
          class="event-card__btn"
          :disable="isClosed"
          :label="isClosed ? '已截止' : '立即報名'"
          @click.stop="emit('select', event)"
        />
        <!-- 報過名的人回來查房號與繳費狀態 -->
        <q-btn
          outline
          no-caps
          color="primary"
          class="event-card__btn event-card__btn--ghost"
          label="查詢報名"
          @click.stop="emit('lookup')"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EventItem } from 'src/types/signup';
import { formatDate, formatDateRange } from 'src/lib/format';
import { assetUrl } from 'src/lib/assets';

const props = withDefaults(
  defineProps<{
    event: EventItem;
    showTags?: boolean;
  }>(),
  { showTags: true },
);

const emit = defineEmits<{
  (e: 'select', event: EventItem): void;
  (e: 'lookup'): void;
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

const imageSrc = computed(() => assetUrl(props.event.image));

const mainStyle = computed(() =>
  imageSrc.value ? { backgroundImage: `url("${imageSrc.value}")` } : undefined,
);

const dateText = computed(() =>
  formatDateRange(props.event.startDate, props.event.endDate),
);

const deadlineText = computed(() => {
  const deadline = props.event.registration.deadline;
  return deadline ? formatDate(deadline) : '';
});
</script>

<style scoped lang="scss">
.event-card {
  display: grid;
  grid-template-columns: 1fr minmax(0, 290px);
  background: var(--card-bg);
  border: 1px solid var(--hairline);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
  }

  // 左欄：照片鋪底，文字壓在上面
  &__main {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 168px;
    padding: 22px var(--content-pad-x);
    background-color: #e9e8e5;
    background-size: cover;
    background-position: center 55%;
    background-repeat: no-repeat;
  }

  // 深色遮罩：只有有照片時才蓋，確保白字讀得到
  &__main::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      rgba(0, 0, 0, 0.8) 0%,
      rgba(0, 0, 0, 0.55) 60%,
      rgba(0, 0, 0, 0.38) 100%
    );
    opacity: 0;
  }

  &__inner {
    position: relative;
    z-index: 1;
  }

  &__status {
    &.is-almost_full {
      color: var(--q-warning);
    }

    &.is-full,
    &.is-closed {
      color: rgba(0, 0, 0, 0.38);
    }
  }

  &__title {
    margin: 8px 0 0;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.22;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-muted);
  }

  &__aside {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 20px var(--content-pad-x);
    border-left: 1px solid var(--hairline);
  }

  &__info {
    margin: 0;

    > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 14px;
      padding: 8px 0;
      border-bottom: 1px solid var(--hairline);

      &:first-child {
        padding-top: 0;
      }
    }

    dt {
      flex: 0 0 auto;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: var(--text-muted);
    }

    dd {
      margin: 0;
      text-align: right;
      font-size: 12.5px;
      line-height: 1.45;
      font-weight: 600;
    }
  }

  // 主行動（立即報名）撐滿剩餘寬度，查詢只佔自己需要的寬度
  &__actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }

  &__btn {
    flex: 1 1 auto;
    padding: 10px 0;
  }

  &__btn--ghost {
    flex: 0 0 auto;
    padding: 10px 14px;
  }
}

// 有照片時：遮罩打開，文字轉白
.event-card.has-image .event-card__main::before {
  opacity: 1;
}

.event-card.has-image .event-card__title {
  color: #fff;
}

.event-card.has-image .event-card__subtitle {
  color: rgba(255, 255, 255, 0.86);
}

.event-card.has-image .event-card__status {
  color: rgba(255, 255, 255, 0.82);
}

// ── 手機：單欄堆疊 ────────────────────────────────────────
@media (max-width: 767px) {
  .event-card {
    grid-template-columns: 1fr;

    &__main {
      min-height: 148px;
      padding: 18px var(--content-pad-x);
    }

    &__title {
      font-size: 20px;
    }

    &__aside {
      border-left: none;
      border-top: 1px solid var(--hairline);
      padding: 16px var(--content-pad-x) 18px;
    }

    &__btn {
      padding: 12px 0;
    }
  }
}
</style>
