<template>
  <q-page class="signup-page">
    <div class="page-shell">
      <div class="signup-page__back">
        <q-btn flat dense no-caps color="primary" icon="arrow_back" label="活動列表" @click="goPortal" />
      </div>

      <div v-if="isLoading" class="surface-card q-pa-md">
        <q-skeleton type="text" width="50%" />
        <q-skeleton type="text" width="70%" />
        <q-skeleton height="180px" class="q-mt-md" />
      </div>

      <div v-else-if="error || !event || !schema" class="surface-card signup-page__state">
        <q-icon name="error_outline" size="34px" color="grey-6" />
        <p>{{ error ?? '找不到這個活動。' }}</p>
        <q-btn unelevated no-caps color="primary" label="回活動列表" @click="goPortal" />
      </div>

      <template v-else>
        <!-- 活動摘要 -->
        <header
          class="signup-page__hero"
          :class="{ 'has-image': !!imageSrc }"
          :style="heroStyle"
        >
          <div class="signup-page__hero-inner">
            <p class="eyebrow">Registration</p>
            <h1 class="signup-page__title">{{ event.title }}</h1>
            <p class="signup-page__subtitle">{{ event.subtitle }}</p>
          </div>
        </header>

        <section class="signup-page__summary">
          <dl class="signup-page__info">
            <div>
              <dt>日期</dt>
              <dd>{{ dateText }}</dd>
            </div>
            <div>
              <dt>地點</dt>
              <dd>{{ event.location }}</dd>
            </div>
            <div v-if="schema.deadline">
              <dt>報名截止</dt>
              <dd>{{ formatDate(schema.deadline) }}</dd>
            </div>
          </dl>

          <p class="signup-page__desc">{{ event.description }}</p>
        </section>

        <q-form ref="formRef" greedy @submit.prevent="onSubmit">
          <!-- 1. 聯絡人 -->
          <section v-if="schema.contactFields.length" class="surface-card signup-page__block">
            <h2 class="section-title">報名聯絡人</h2>
            <div class="signup-page__fields">
              <DynamicField
                v-for="field in schema.contactFields"
                :key="field.key"
                :field="field"
                :model-value="store.draft.contact[field.key] ?? ''"
                @update:model-value="(v: string) => store.setContactValue(field.key, v)"
              />
            </div>
          </section>

          <!-- 2. 房型 -->
          <section v-if="schema.requiresAccommodation" class="surface-card signup-page__block">
            <h2 class="section-title">
              選擇房型 <span class="text-negative">*</span>
              <span v-if="isSyncingQuota" class="signup-page__syncing">
                <q-spinner size="12px" /> 名額更新中
              </span>
            </h2>
            <RoomTypePicker
              :model-value="store.draft.roomTypeId"
              :guests="store.draft.guests"
              :room-types="schema.roomTypes"
              @update:model-value="store.setRoomType"
              @update:guests="store.setGuests"
            />
            <p v-if="roomError" class="signup-page__error">請選擇一個房型</p>
            <p class="signup-page__note">
              通鋪以「床位」計價，訂幾個床位就填幾位參加者資料；一般房型以「整間」計價，
              可以少住人但不能超過房間床位數，選幾位就填幾位入住者的資料（保險用）。
            </p>
          </section>

          <!-- 3. 參加者（數量由房型決定） -->
          <section
            v-if="schema.participantFields.length && store.requiredParticipants > 0"
            class="surface-card signup-page__block"
          >
            <h2 class="section-title">
              參加者資料
              <span class="signup-page__count">共 {{ store.requiredParticipants }} 位</span>
            </h2>
            <p class="signup-page__note signup-page__note--top">
              以下資料用於辦理旅平險，請與證件一致。
            </p>

            <div
              v-for="(person, index) in store.draft.participants"
              :key="index"
              class="participant"
            >
              <div class="participant__head">第 {{ index + 1 }} 位</div>
              <div class="signup-page__fields">
                <DynamicField
                  v-for="field in schema.participantFields"
                  :key="field.key"
                  :field="field"
                  :model-value="person[field.key] ?? ''"
                  @update:model-value="(v: string) => store.setParticipantValue(index, field.key, v)"
                />
              </div>
            </div>
          </section>

          <!-- 4. 加購 -->
          <section v-if="schema.addons.length" class="surface-card signup-page__block">
            <h2 class="section-title">餐費與保險</h2>
            <AddonPicker
              :addons="schema.addons"
              :model-value="store.draft.addons"
              @update:model-value="store.setAddons"
            />
          </section>

          <!-- 5. 即時試算 -->
          <section v-if="breakdown.length" class="surface-card signup-page__block">
            <h2 class="section-title">費用試算</h2>
            <PriceBreakdown :items="breakdown" :total="total" />
            <p v-if="config.SHOW_PRICE_NOTE" class="signup-page__note">
              以上為預估金額，送出後會顯示正式的費用明細。
            </p>
          </section>

          <!-- 6. 注意事項 -->
          <section v-if="schema.notices.length" class="surface-card signup-page__block">
            <h2 class="section-title">注意事項</h2>
            <ul class="signup-page__notices">
              <li v-for="(notice, i) in schema.notices" :key="i">{{ notice }}</li>
            </ul>
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
            />
          </div>
        </q-form>
      </template>
    </div>

    <!-- 送出確認：persistent 讓它不能點外面或按 ESC 關掉，避免誤觸重複送出 -->
    <q-dialog v-model="confirmOpen" persistent>
      <div class="confirm">
        <template v-if="!isSubmitting">
          <p class="eyebrow">Confirm</p>
          <h2 class="confirm__title">確認送出報名</h2>
          <p class="confirm__desc">
            送出後名額即會保留，請勿重複送出。如需更改請聯絡教會同工。
          </p>

          <dl class="confirm__info">
            <div v-for="row in confirmRows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>

          <div class="confirm__total">
            <span>應繳總額</span>
            <strong>{{ formatPrice(total) }}</strong>
          </div>

          <div class="confirm__actions">
            <q-btn flat no-caps color="primary" label="返回修改" @click="confirmOpen = false" />
            <q-btn unelevated no-caps color="primary" label="確認送出" @click="confirmSubmit" />
          </div>
        </template>

        <div v-else class="confirm__loading">
          <q-spinner-tail size="40px" />
          <p class="confirm__loading-title">報名處理中</p>
          <p class="confirm__loading-desc">請勿關閉視窗或重新整理，這需要幾秒鐘。</p>
        </div>
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar, type QForm } from 'quasar';
import DynamicField from 'components/DynamicField.vue';
import RoomTypePicker from 'components/RoomTypePicker.vue';
import AddonPicker from 'components/AddonPicker.vue';
import PriceBreakdown from 'components/PriceBreakdown.vue';
import { useEventDetail } from 'src/lib/useEvents';
import { submitSignup } from 'src/service/SignupService';
import { calcBreakdown, sumBreakdown } from 'src/lib/pricing';
import { useSignupStore } from 'src/stores/signup-store';
import { useConfigStore } from 'src/stores/config-store';
import { formatDate, formatDateRange, formatPrice } from 'src/lib/format';
import { assetUrl } from 'src/lib/assets';

const props = defineProps<{ eventId: string }>();

const $q = useQuasar();
const router = useRouter();
const store = useSignupStore();
const config = useConfigStore();
const { isLoading, isSyncingQuota, error, load, syncQuota } = useEventDetail();

const formRef = ref<QForm | null>(null);
const isSubmitting = ref(false);
const roomError = ref(false);
const confirmOpen = ref(false);

const event = computed(() => store.currentEvent);
const schema = computed(() => store.schema);

const dateText = computed(() =>
  event.value ? formatDateRange(event.value.startDate, event.value.endDate) : '',
);

const imageSrc = computed(() => assetUrl(event.value?.image));

const heroStyle = computed(() =>
  imageSrc.value ? { backgroundImage: `url("${imageSrc.value}")` } : undefined,
);

const breakdown = computed(() =>
  event.value ? calcBreakdown(event.value, store.draft) : [],
);
const total = computed(() => sumBreakdown(breakdown.value));

/** 彈窗上的摘要，讓人送出前再確認一次 */
const confirmRows = computed(() => {
  const rows: { label: string; value: string }[] = [];
  if (event.value) rows.push({ label: '活動', value: event.value.title });

  const room = store.selectedRoom;
  if (room) {
    rows.push({
      label: '房型',
      value:
        room.bookingUnit === 'bed'
          ? `${room.name}（${store.draft.guests} 個床位）`
          : `${room.name}（整間・入住 ${store.draft.guests} / ${room.capacity} 人）`,
    });
  }

  // 房號的最終決定權在後端（併發時可能被別人先拿走），所以這裡寫「預計」
  const nextRoomNo = room?.bookingUnit === 'room' ? room.remainingRooms?.[0] : undefined;
  if (nextRoomNo) {
    rows.push({ label: '預計房號', value: `${nextRoomNo} 號房` });
  }

  if (store.draft.participants.length) {
    rows.push({ label: '參加人數', value: `${store.draft.participants.length} 位` });
  }

  return rows;
});

watch(
  () => store.draft.roomTypeId,
  (v) => {
    if (v) roomError.value = false;
  },
);

onMounted(() => {
  void load(props.eventId);
});

function goPortal() {
  void router.push({ name: 'portal' });
}

/** 驗證通過只開確認彈窗，不直接送出 */
async function onSubmit() {
  if (!event.value || !schema.value) return;

  roomError.value = schema.value.requiresAccommodation && !store.draft.roomTypeId;
  const valid = await formRef.value?.validate();
  if (!valid || roomError.value) return;

  confirmOpen.value = true;
}

/** 真正送出。isSubmitting 期間彈窗鎖住，避免重複報名 */
async function confirmSubmit() {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const result = await submitSignup(store.draft);
    store.setResult(result);
    confirmOpen.value = false;
    void router.push({ name: 'result' });
  } catch (err) {
    confirmOpen.value = false;
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : '送出失敗，請稍後再試',
      position: 'top',
      timeout: 6000,
    });
    // 失敗常是名額被別人搶走，重新抓一次讓畫面回到真實狀態
    await syncQuota();
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped lang="scss">
.signup-page {
  // 對齊卡片外緣；再用負邊距抵銷 QBtn 自己的內距，讓箭頭真正切齊
  &__back {
    padding: 4px var(--edge-pad-x) 10px;

    :deep(.q-btn) {
      margin-left: -8px;
    }
  }

  &__block {
    margin-bottom: var(--card-gap);
    padding: 22px var(--content-pad-x) 24px;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  // Hero：照片鋪底、標題壓在上面，底部對齊
  &__hero {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 300px;
    padding: 30px var(--content-pad-x);
    background-color: #e9e8e5;
    background-size: cover;
    background-position: center 55%;
    background-repeat: no-repeat;
  }

  // 遮罩由下往上加深，讓底部的標題最清楚，上緣仍看得到照片
  &__hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.82) 0%,
      rgba(0, 0, 0, 0.45) 45%,
      rgba(0, 0, 0, 0.16) 100%
    );
    opacity: 0;
  }

  &__hero-inner {
    position: relative;
    z-index: 1;
    max-width: 34ch;
  }

  &__summary {
    padding: 22px var(--edge-pad-x) 24px;
    border-bottom: 1px solid var(--hairline);
  }

  &__title {
    margin: 10px 0 0;
    font-size: 30px;
    font-weight: 800;
    line-height: 1.16;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  &__info {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0 24px;
    border-top: 1px solid var(--hairline);

    > div {
      padding: 12px 0;
      border-bottom: 1px solid var(--hairline);
    }

    dt {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: var(--text-muted);
    }

    dd {
      margin: 5px 0 0;
      font-size: 13.5px;
      line-height: 1.5;
      font-weight: 600;
    }
  }

  &__desc {
    margin: 18px 0 0;
    font-size: 13.5px;
    line-height: 1.8;
    color: var(--text-muted);
  }

  &__count {
    margin-left: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--q-primary);
  }

  &__syncing {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 8px;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
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

    &--top {
      margin: 0 0 12px;
    }
  }

  &__notices {
    margin: 0;
    padding-left: 18px;
    font-size: 12.5px;
    line-height: 1.75;
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

// 送出確認彈窗
.confirm {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border: 1px solid var(--hairline);
  border-radius: 0;
  padding: 26px 24px 20px;

  &__title {
    margin: 10px 0 0;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  &__desc {
    margin: 8px 0 0;
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--text-muted);
  }

  &__info {
    margin: 18px 0 0;

    > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      padding: 9px 0;
      border-bottom: 1px solid var(--hairline);
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
      font-size: 13px;
      font-weight: 600;
    }
  }

  &__total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-top: 4px;
    padding-top: 14px;
    border-top: 2px solid var(--ink);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.16em;

    strong {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 22px;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 34px 0 30px;
    text-align: center;
  }

  &__loading-title {
    margin: 14px 0 0;
    font-size: 15px;
    font-weight: 700;
  }

  &__loading-desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.7;
    color: var(--text-muted);
  }
}

// 有照片時：遮罩打開，文字轉白
.signup-page__hero.has-image::before {
  opacity: 1;
}

.signup-page__hero.has-image .signup-page__title {
  color: #fff;
}

.signup-page__hero.has-image .signup-page__subtitle {
  color: rgba(255, 255, 255, 0.88);
}

.signup-page__hero.has-image :deep(.eyebrow) {
  color: rgba(255, 255, 255, 0.78);
}

@media (max-width: 767px) {
  .signup-page {
    &__hero {
      min-height: 220px;
      padding: 22px var(--content-pad-x);
    }

    &__title {
      font-size: 24px;
    }
  }
}

.participant {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--hairline);


  &:last-child {
    margin-bottom: 0;
  }

  &__head {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--q-primary);
    margin-bottom: 6px;
  }
}
</style>
