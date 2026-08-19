<template>
  <div class="payment-info">
    <dl class="payment-info__list">
      <div>
        <dt>銀行</dt>
        <dd>{{ payment.bankName }}（代碼 {{ payment.bankCode }}）</dd>
      </div>
      <div>
        <dt>帳號</dt>
        <dd class="payment-info__account">
          <span>{{ payment.account }}</span>
          <q-btn flat dense no-caps size="sm" color="primary" label="複製" @click="copyAccount" />
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
      <div v-if="dueDateText">
        <dt>繳費期限</dt>
        <dd :class="{ 'is-overdue': isOverdue }">{{ dueDateText }}</dd>
      </div>
      <div>
        <dt>應繳金額</dt>
        <dd>{{ formatPrice(total) }}</dd>
      </div>
    </dl>

    <!-- 過期不把帳號藏起來，藏起來只會讓人找不到匯款資訊 -->
    <p v-if="isOverdue" class="payment-info__overdue">
      繳費期限已過。若尚未完成轉帳，請先聯絡教會同工確認名額是否仍保留。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { formatPrice } from 'src/lib/format';
import type { PaymentInfo } from 'src/types/signup';

const props = defineProps<{
  payment: PaymentInfo;
  total: number;
  /** 報名時間 ISO 字串，用來推算繳費期限 */
  createdAt: string;
}>();

const $q = useQuasar();

/** 繳費期限 = 報名時間 + dueDays */
const dueDate = computed<Date | null>(() => {
  const due = new Date(props.createdAt);
  if (Number.isNaN(due.getTime())) return null;
  due.setDate(due.getDate() + props.payment.dueDays);
  return due;
});

const dueDateText = computed(() => {
  const due = dueDate.value;
  if (!due) return '';
  return `${due.getFullYear()}/${due.getMonth() + 1}/${due.getDate()}`;
});

const isOverdue = computed(() => {
  const due = dueDate.value;
  if (!due) return false;
  // 期限當天整天都算數，所以比對的是隔天零點
  const deadline = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1);
  return Date.now() >= deadline.getTime();
});

async function copyAccount() {
  try {
    await navigator.clipboard.writeText(props.payment.account);
    $q.notify({ message: '帳號已複製', position: 'top', timeout: 1500 });
  } catch {
    $q.notify({
      type: 'negative',
      message: '複製失敗，請手動選取帳號',
      position: 'top',
    });
  }
}
</script>

<style scoped lang="scss">
.payment-info {
  &__list {
    margin: 0;
    display: flex;
    flex-direction: column;

    > div {
      display: flex;
      gap: 16px;
      padding: 9px 0;
      border-bottom: 1px dashed var(--hairline);
    }

    dt {
      flex: 0 0 84px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
    }

    dd {
      margin: 0;
      flex: 1;
      font-size: 13.5px;
      line-height: 1.55;
      font-weight: 600;

      &.is-overdue {
        color: var(--text-muted);
        text-decoration: line-through;
      }
    }
  }

  &__account {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    span {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 0.04em;
    }

    :deep(.q-btn) {
      margin: -4px 0;
    }
  }

  &__overdue {
    margin: 12px 0 0;
    padding: 10px 12px;
    background: var(--tint);
    font-size: 12px;
    line-height: 1.7;
    color: var(--text-muted);
  }
}
</style>
