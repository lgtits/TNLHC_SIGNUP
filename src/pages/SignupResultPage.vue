<template>
  <q-page class="result-page">
    <div class="page-shell">
      <template v-if="result">
        <!-- 成功抬頭 -->
        <section class="surface-card result-page__hero">
          <q-icon name="check_circle" size="42px" color="positive" />
          <h1 class="result-page__title">報名資料已送出</h1>
          <p class="result-page__desc">
            以下是這次報名的費用明細，請確認後於 3 天內完成繳費。
          </p>
          <div class="result-page__order">
            訂單編號 <strong>{{ result.orderNo }}</strong>
          </div>
        </section>

        <!-- 費用 -->
        <section class="surface-card result-page__block">
          <h2 class="section-title">費用明細</h2>
          <PriceBreakdown :items="result.breakdown" :total="result.total" />
          <p v-if="configStore.SHOW_PRICE_NOTE" class="result-page__note">
            金額為單人費用。若需開立收據或申請補助，請於繳費時一併告知。
          </p>
        </section>

        <!-- 報名內容 -->
        <section class="surface-card result-page__block">
          <h2 class="section-title">報名內容</h2>
          <dl class="result-page__info">
            <div>
              <dt>活動</dt>
              <dd>{{ result.event.title }}</dd>
            </div>
            <div>
              <dt>日期</dt>
              <dd>{{ dateText }}</dd>
            </div>
            <div>
              <dt>地點</dt>
              <dd>{{ result.event.location }}</dd>
            </div>
            <div>
              <dt>姓名</dt>
              <dd>{{ result.form.name }}</dd>
            </div>
            <div>
              <dt>電話</dt>
              <dd>{{ result.form.phone }}</dd>
            </div>
            <div>
              <dt>房型</dt>
              <dd>{{ result.roomType.name }}（{{ result.roomType.capacity }} 人房）</dd>
            </div>
          </dl>
        </section>

        <!-- 返回 -->
        <div class="sticky-actions result-page__actions">
          <q-btn
            outline
            no-caps
            color="primary"
            size="lg"
            class="col"
            icon="arrow_back"
            label="返回修改"
            @click="goBackToForm"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            size="lg"
            class="col"
            icon="event"
            label="回活動列表"
            @click="goPortal"
          />
        </div>
      </template>

      <!-- 直接開這頁 / 重整後沒資料 -->
      <div v-else class="surface-card result-page__state">
        <q-icon name="receipt_long" size="34px" color="grey-6" />
        <p>沒有可顯示的報名資料，請先從活動列表開始報名。</p>
        <q-btn unelevated no-caps color="primary" label="回活動列表" @click="goPortal" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import PriceBreakdown from 'components/PriceBreakdown.vue';
import { useSignupStore } from 'src/stores/signup-store';
import { useConfigStore } from 'src/stores/config-store';
import { formatDateRange } from 'src/lib/format';

const router = useRouter();
const signupStore = useSignupStore();
const configStore = useConfigStore();

const result = computed(() => signupStore.result);

const dateText = computed(() =>
  result.value
    ? formatDateRange(result.value.event.startDate, result.value.event.endDate)
    : '',
);

/** 返回表單：保留填過的資料，只清掉這次的試算結果 */
function goBackToForm() {
  const eventId = result.value?.event.id;
  signupStore.clearResult();
  if (eventId) {
    void router.push({ name: 'signup', params: { eventId } });
  } else {
    void router.push({ name: 'portal' });
  }
}

function goPortal() {
  void router.push({ name: 'portal' });
}
</script>

<style scoped lang="scss">
.result-page {
  &__hero,
  &__block {
    margin-bottom: var(--card-gap);
  }

  &__hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 28px var(--content-pad-x) 22px;
    text-align: center;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
  }

  &__desc {
    margin: 0;
    font-size: 13px;
    line-height: 1.65;
    color: var(--text-muted);
  }

  &__order {
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--text-muted);

    strong {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13.5px;
      color: rgba(0, 0, 0, 0.8);
      letter-spacing: 0.03em;
    }
  }

  &__block {
    padding: 14px var(--content-pad-x) 16px;
  }

  &__info {
    margin: 0;
    display: flex;
    flex-direction: column;

    > div {
      display: flex;
      gap: 16px;
      padding: 9px 0;
      border-bottom: 1px dashed var(--hairline);

      &:last-child {
        border-bottom: none;
      }
    }

    dt {
      flex: 0 0 68px;
      font-size: 13px;
      color: var(--text-muted);
    }

    dd {
      margin: 0;
      flex: 1;
      font-size: 14px;
      font-weight: 600;
    }
  }

  &__note {
    margin: 12px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  &__actions {
    display: flex;
    gap: 10px;
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px var(--content-pad-x);
    text-align: center;

    p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }
  }
}
</style>
