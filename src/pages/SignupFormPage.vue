<template>
  <q-page class="signup-page">
    <div class="page-shell">
      <!-- 嵌入時沒有 header，返回鍵放在頁面裡 -->
      <div class="signup-page__back">
        <q-btn flat dense no-caps color="primary" icon="arrow_back" label="活動列表" @click="goPortal" />
      </div>

      <div v-if="isLoading" class="surface-card q-pa-md">
        <q-skeleton type="text" width="50%" />
        <q-skeleton type="text" width="70%" />
        <q-skeleton height="180px" class="q-mt-md" />
      </div>

      <div v-else-if="error || !event" class="surface-card signup-page__state">
        <q-icon name="error_outline" size="34px" color="grey-6" />
        <p>{{ error ?? '找不到這個活動。' }}</p>
        <q-btn unelevated no-caps color="primary" label="回活動列表" @click="goPortal" />
      </div>

      <template v-else>
        <!-- 活動摘要 -->
        <section class="surface-card signup-page__summary">
          <div class="signup-page__cover" :style="coverStyle">
            <q-icon :name="event.icon" size="26px" />
            <div>
              <h1 class="signup-page__title">{{ event.title }}</h1>
              <p class="signup-page__subtitle">{{ event.subtitle }}</p>
            </div>
          </div>
          <div class="signup-page__meta">
            <span><q-icon name="event" size="16px" /> {{ dateText }}（{{ days }} 天）</span>
            <span><q-icon name="place" size="16px" /> {{ event.location }}</span>
          </div>
          <p class="signup-page__desc">{{ event.description }}</p>
        </section>

        <q-form ref="formRef" greedy @submit.prevent="onSubmit">
          <!-- 報名人資料 -->
          <section class="surface-card signup-page__block">
            <h2 class="section-title">報名人資料</h2>

            <q-input
              v-model="name"
              outlined
              dense
              label="姓名"
              placeholder="請填寫真實姓名"
              maxlength="30"
              counter
              :rules="nameRules"
              lazy-rules
            >
              <template #prepend><q-icon name="person" /></template>
            </q-input>

            <q-input
              v-model="phone"
              outlined
              dense
              label="手機號碼"
              placeholder="09xxxxxxxx"
              inputmode="numeric"
              maxlength="10"
              :rules="phoneRules"
              lazy-rules
              class="q-mt-sm"
            >
              <template #prepend><q-icon name="smartphone" /></template>
            </q-input>
          </section>

          <!-- 房型 -->
          <section class="surface-card signup-page__block">
            <h2 class="section-title">
              選擇房型
              <span class="text-negative">*</span>
            </h2>
            <RoomTypePicker v-model="roomTypeId" :room-types="event.roomTypes" />
            <p v-if="roomError" class="signup-page__error">
              <q-icon name="error" size="15px" /> 請選擇一個房型
            </p>
          </section>

          <!-- 即時試算 -->
          <section v-if="selectedRoom" class="surface-card signup-page__block">
            <h2 class="section-title">費用試算</h2>
            <PriceBreakdown :items="previewBreakdown" :total="previewTotal" />
            <p v-if="configStore.SHOW_PRICE_NOTE" class="signup-page__note">
              以上為預估金額，送出後會顯示正式的費用明細。
            </p>
          </section>

          <div class="sticky-actions">
            <q-btn
              type="submit"
              unelevated
              no-caps
              color="primary"
              size="lg"
              class="full-width"
              :loading="isSubmitting"
              label="送出報名"
              icon-right="arrow_forward"
            />
          </div>
        </q-form>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar, type QForm } from 'quasar';
import RoomTypePicker from 'components/RoomTypePicker.vue';
import PriceBreakdown from 'components/PriceBreakdown.vue';
import { useEventDetail } from 'src/lib/useEvents';
import { calcPrice, submitSignup } from 'src/service/SignupService';
import { useSignupStore } from 'src/stores/signup-store';
import { useConfigStore } from 'src/stores/config-store';
import { countDays, formatDateRange } from 'src/lib/format';

const props = defineProps<{ eventId: string }>();

const $q = useQuasar();
const router = useRouter();
const signupStore = useSignupStore();
const configStore = useConfigStore();
const { isLoading, error, load } = useEventDetail();

const formRef = ref<QForm | null>(null);
const isSubmitting = ref(false);
const roomError = ref(false);

const event = computed(() => signupStore.currentEvent);

// 用 computed 讀寫 store，讓表單狀態離開頁面也留著（返回修改時不用重填）
const name = computed({
  get: () => signupStore.form.name,
  set: (v: string) => signupStore.updateForm({ name: v }),
});
const phone = computed({
  get: () => signupStore.form.phone,
  set: (v: string) => signupStore.updateForm({ phone: v.replace(/\D/g, '') }),
});
const roomTypeId = computed({
  get: () => signupStore.form.roomTypeId,
  set: (v: string | null) => signupStore.updateForm({ roomTypeId: v }),
});

const selectedRoom = computed(() => signupStore.selectedRoomType);

const nameRules = [
  (v: string) => (!!v && v.trim().length > 0) || '請填寫姓名',
  (v: string) => v.trim().length >= 2 || '姓名至少 2 個字',
];

const phoneRules = [
  (v: string) => (!!v && v.length > 0) || '請填寫手機號碼',
  (v: string) => /^09\d{8}$/.test(v) || '請輸入 09 開頭的 10 碼手機號碼',
];

const dateText = computed(() =>
  event.value ? formatDateRange(event.value.startDate, event.value.endDate) : '',
);
const days = computed(() =>
  event.value ? countDays(event.value.startDate, event.value.endDate) : 0,
);

const coverStyle = computed(() =>
  event.value
    ? { background: `linear-gradient(135deg, ${event.value.coverFrom} 0%, ${event.value.coverTo} 100%)` }
    : {},
);

const previewBreakdown = computed(() =>
  event.value && selectedRoom.value ? calcPrice(event.value, selectedRoom.value) : [],
);
const previewTotal = computed(() =>
  previewBreakdown.value.reduce((sum, item) => sum + item.amount, 0),
);

watch(roomTypeId, (v) => {
  if (v) roomError.value = false;
});

onMounted(() => {
  void load(props.eventId);
});

function goPortal() {
  void router.push({ name: 'portal' });
}

async function onSubmit() {
  roomError.value = signupStore.form.roomTypeId === null;
  const valid = await formRef.value?.validate();
  if (!valid || roomError.value) return;
  if (!event.value) return;

  isSubmitting.value = true;
  try {
    const result = await submitSignup({ ...signupStore.form, eventId: event.value.id });
    signupStore.setResult(result);
    void router.push({ name: 'result' });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : '送出失敗，請稍後再試',
      position: 'top',
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped lang="scss">
.signup-page {
  &__back {
    padding: 8px var(--content-pad-x);
  }

  &__summary,
  &__block {
    margin-bottom: var(--card-gap);
  }

  &__block {
    padding: 14px var(--content-pad-x) 16px;
  }

  &__cover {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px var(--content-pad-x);
    color: #fff;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.3;
  }

  &__subtitle {
    margin: 2px 0 0;
    font-size: 12.5px;
    opacity: 0.9;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    padding: 12px var(--content-pad-x) 0;
    font-size: 13px;
    color: var(--text-muted);

    span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  }

  &__desc {
    margin: 8px 0 0;
    padding: 0 var(--content-pad-x) 14px;
    font-size: 13px;
    line-height: 1.65;
    color: var(--text-muted);
  }

  &__error {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--q-negative);
  }

  &__note {
    margin: 12px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-muted);
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
