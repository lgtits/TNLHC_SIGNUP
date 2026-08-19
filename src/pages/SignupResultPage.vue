<template>
  <q-page class="result-page">
    <div class="page-shell">
      <template v-if="result">
        <!-- 成功抬頭 -->
        <section class="result-page__hero">
          <p class="eyebrow">Confirmation</p>
          <h1 class="result-page__title">報名成功</h1>
          <p class="result-page__desc">
            <template v-if="dueDateText">
              請於 <strong>{{ dueDateText }}</strong> 前完成轉帳，逾期名額不予保留。
            </template>
            <template v-else>報名資料已送出，感謝你的參與。</template>
          </p>
          <div class="result-page__order">
            訂單編號 <strong>{{ result.orderNo }}</strong>
          </div>

          <!-- 系統分配到的房號，當天報到直接看這裡 -->
          <div v-if="result.roomNo" class="result-page__room-no">
            <span>分配房號</span>
            <strong>{{ result.roomNo }}</strong>
          </div>
        </section>

        <!-- 費用 -->
        <section class="surface-card result-page__block">
          <h2 class="section-title">費用明細</h2>
          <PriceBreakdown :items="result.breakdown" :total="result.total" />
        </section>

        <!-- 轉帳資訊 -->
        <section v-if="payment" class="surface-card result-page__block">
          <h2 class="section-title">轉帳資訊</h2>
          <dl class="result-page__info">
            <div>
              <dt>銀行</dt>
              <dd>{{ payment.bankName }}（代碼 {{ payment.bankCode }}）</dd>
            </div>
            <div>
              <dt>帳號</dt>
              <dd class="result-page__account">
                <span>{{ payment.account }}</span>
                <q-btn
                  flat
                  dense
                  no-caps
                  size="sm"
                  color="primary"
                  label="複製"
                  @click="copyAccount"
                />
              </dd>
            </div>
            <div>
              <dt>戶名</dt>
              <dd>{{ payment.accountName }}</dd>
            </div>
            <div>
              <dt>轉帳備註</dt>
              <dd>{{ payment.noteFormat }}</dd>
            </div>
            <div>
              <dt>繳費期限</dt>
              <dd>{{ dueDateText }}</dd>
            </div>
            <div>
              <dt>應繳金額</dt>
              <dd>{{ formatPrice(result.total) }}</dd>
            </div>
          </dl>
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
            <div v-for="field in contactFields" :key="field.key">
              <dt>{{ field.label }}</dt>
              <dd>{{ displayValue(field, result.draft.contact[field.key] ?? '') }}</dd>
            </div>
            <div v-if="result.roomType">
              <dt>房型</dt>
              <dd>{{ roomText }}</dd>
            </div>
            <div v-if="result.roomNo">
              <dt>分配房號</dt>
              <dd>{{ result.roomNo }} 號房</dd>
            </div>
          </dl>
        </section>

        <!-- 參加者名單（有逐人填寫時才出現） -->
        <section v-if="result.draft.participants.length" class="surface-card result-page__block">
          <h2 class="section-title">
            參加者名單
            <span class="result-page__count">共 {{ result.draft.participants.length }} 位</span>
          </h2>
          <div
            v-for="(person, index) in result.draft.participants"
            :key="index"
            class="result-page__person"
          >
            <div class="result-page__person-head">第 {{ index + 1 }} 位</div>
            <dl class="result-page__info">
              <div v-for="field in participantFields" :key="field.key">
                <dt>{{ field.label }}</dt>
                <dd>{{ displayValue(field, person[field.key] ?? '') }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <!-- 日後回來查房號與繳費狀態的入口 -->
        <section class="surface-card result-page__block result-page__lookup">
          <p>
            這頁關掉之後，可以用<strong>參加者姓名與身分證字號</strong>查詢這筆報名，
            確認分配到的房號與報名內容。
          </p>
          <q-btn outline no-caps color="primary" label="查詢報名" @click="goLookup" />
        </section>

        <!-- 返回 -->
        <div class="sticky-actions">
          <q-btn
            unelevated
            no-caps
            color="primary"
            size="lg"
            class="full-width"
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
import { useQuasar } from 'quasar';
import { formatDateRange, formatPrice } from 'src/lib/format';
import type { FieldDef } from 'src/types/signup';

const $q = useQuasar();
const router = useRouter();
const signupStore = useSignupStore();

const result = computed(() => signupStore.result);

const dateText = computed(() =>
  result.value
    ? formatDateRange(result.value.event.startDate, result.value.event.endDate)
    : '',
);

const contactFields = computed(() => result.value?.event.registration.contactFields ?? []);
const participantFields = computed(
  () => result.value?.event.registration.participantFields ?? [],
);

const payment = computed(() => result.value?.event.registration.payment ?? null);

/** 繳費期限 = 報名時間 + dueDays */
const dueDateText = computed(() => {
  const r = result.value;
  const p = payment.value;
  if (!r || !p) return '';
  const due = new Date(r.createdAt);
  if (Number.isNaN(due.getTime())) return '';
  due.setDate(due.getDate() + p.dueDays);
  return `${due.getFullYear()}/${due.getMonth() + 1}/${due.getDate()}`;
});

async function copyAccount() {
  const account = payment.value?.account;
  if (!account) return;
  try {
    await navigator.clipboard.writeText(account);
    $q.notify({ message: '帳號已複製', position: 'top', timeout: 1500 });
  } catch {
    $q.notify({
      type: 'negative',
      message: '複製失敗，請手動選取帳號',
      position: 'top',
    });
  }
}

const roomText = computed(() => {
  const r = result.value;
  if (!r?.roomType) return '';
  const room = r.roomType;
  return room.bookingUnit === 'bed'
    ? `${room.name}（${r.draft.guests} 個床位）`
    : `${room.name}（整間・入住 ${r.draft.guests} / ${room.capacity} 人）`;
});

function displayValue(_field: FieldDef, value: string): string {
  return value || '—';
}

function goPortal() {
  void router.push({ name: 'portal' });
}

function goLookup() {
  void router.push({ name: 'lookup' });
}
</script>

<style scoped lang="scss">
.result-page {
  &__block {
    margin-bottom: var(--card-gap);
  }

  &__hero {
    padding: 4px var(--edge-pad-x) 24px;
    margin-bottom: var(--card-gap);
    border-bottom: 1px solid var(--hairline);
  }

  &__title {
    margin: 10px 0 0;
    font-size: 28px;
    font-weight: 800;
    line-height: 1.18;
    letter-spacing: -0.02em;
  }

  &__desc {
    margin: 8px 0 0;
    font-size: 13.5px;
    line-height: 1.75;
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

  // 房號是報到當天最常被翻出來看的資訊，給它一塊獨立的視覺區
  &__room-no {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-top: 16px;
    padding: 12px 14px;
    border: 1px solid var(--ink);
    background: var(--tint);

    span {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: var(--text-muted);
    }

    strong {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
  }

  &__block {
    padding: 14px var(--content-pad-x) 16px;
  }

  &__lookup {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 18px var(--content-pad-x) 20px;

    p {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.75;
      color: var(--text-muted);
    }
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

  &__account {
    display: flex;
    align-items: center;
    gap: 8px;

    span {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 0.04em;
    }
  }

  &__count {
    margin-left: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--q-primary);
  }

  &__person {
    padding: 10px 12px;
    margin-bottom: 8px;
    border: 1px solid var(--hairline);


    &:last-child {
      margin-bottom: 0;
    }
  }

  &__person-head {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--q-primary);
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
