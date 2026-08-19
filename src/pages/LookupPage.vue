<template>
  <q-page class="lookup-page">
    <div class="page-shell">
      <div class="lookup-page__back">
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          icon="arrow_back"
          label="活動列表"
          @click="goPortal"
        />
      </div>

      <header class="lookup-page__hero">
        <p class="eyebrow">Lookup</p>
        <h1 class="lookup-page__title">查詢報名</h1>
        <p class="lookup-page__desc">
          輸入報名時填寫的姓名與身分證字號，就能查到你所屬的報名，包含分配到的房號與同行者名單。
        </p>
      </header>

      <!-- 查詢表單 -->
      <section class="surface-card lookup-page__block">
        <q-form ref="formRef" greedy @submit.prevent="onSubmit">
          <div class="lookup-page__fields">
            <DynamicField
              v-for="field in FIELDS"
              :key="field.key"
              :field="field"
              :model-value="form[field.key] ?? ''"
              @update:model-value="(v: string) => (form[field.key] = v)"
            />
          </div>

          <q-btn
            type="submit"
            unelevated
            no-caps
            color="primary"
            size="lg"
            class="full-width q-mt-md"
            :loading="isLoading"
            label="查詢"
          />
        </q-form>
      </section>

      <!-- 查無資料 -->
      <section
        v-if="hasSearched && !isLoading && !bookings.length"
        class="surface-card lookup-page__state"
      >
        <q-icon name="search_off" size="34px" color="grey-6" />
        <p>
          查不到符合的報名。<br />
          請確認姓名與身分證字號和報名時填寫的完全一致，或聯絡教會同工協助。
        </p>
      </section>

      <!-- 查詢結果 -->
      <section
        v-for="booking in bookings"
        :key="booking.orderNo"
        class="surface-card lookup-page__block"
      >
        <div class="lookup-page__result-head">
          <div>
            <p class="eyebrow">訂單編號</p>
            <p class="lookup-page__order">{{ booking.orderNo }}</p>
          </div>
          <p v-if="createdText(booking)" class="lookup-page__created">
            {{ createdText(booking) }} 報名
          </p>
        </div>

        <!-- 房號放最大，報到當天最常被翻出來看 -->
        <div v-if="booking.roomNo" class="lookup-page__room-no">
          <span>分配房號</span>
          <strong>{{ booking.roomNo }}</strong>
        </div>

        <dl class="lookup-page__info">
          <div>
            <dt>房型</dt>
            <dd>{{ booking.roomTypeName || "—" }}</dd>
          </div>
          <div v-if="booking.bedInfo">
            <dt>床位配置</dt>
            <dd>{{ booking.bedInfo }}</dd>
          </div>
          <div>
            <dt>入住人數</dt>
            <dd>{{ booking.guests }} 位</dd>
          </div>
          <div v-if="booking.addons.length">
            <dt>加購項目</dt>
            <dd>{{ booking.addons.join("、") }}</dd>
          </div>
          <div>
            <dt>應繳總額</dt>
            <dd>{{ formatPrice(booking.total) }}</dd>
          </div>
        </dl>

        <h2 class="section-title lookup-page__people-title">
          參加者
          <span class="lookup-page__count"
            >共 {{ booking.participants.length }} 位</span
          >
        </h2>
        <ul class="lookup-page__people">
          <li v-for="(person, i) in booking.participants" :key="i">
            <span class="lookup-page__person-name">{{ person.name }}</span>
            <span class="lookup-page__person-meta">
              {{ person.twid }}
              <template v-if="person.birthday">・{{ person.birthday }}</template>
              <template v-if="person.phone">・{{ person.phone }}</template>
            </span>
          </li>
        </ul>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuasar, type QForm } from "quasar";
import DynamicField from "components/DynamicField.vue";
import { lookupBookings } from "src/service/SignupService";
import { formatPrice } from "src/lib/format";
import type { FieldDef, LookupBooking } from "src/types/signup";

/** 查詢欄位沿用 DynamicField，twid 的檢查碼驗證直接複用 */
const FIELDS: FieldDef[] = [
  {
    key: "name",
    label: "姓名",
    type: "text",
    required: true,
    placeholder: "請填寫報名時填的姓名",
    maxLength: 30,
  },
  {
    key: "twid",
    label: "身分證字號",
    type: "twid",
    required: true,
    placeholder: "A123456789",
    maxLength: 10,
    hint: "",
  },
];

const $q = useQuasar();
const router = useRouter();

const formRef = ref<QForm | null>(null);
const form = reactive<Record<string, string>>({ name: "", twid: "" });
const bookings = ref<LookupBooking[]>([]);
const isLoading = ref(false);
const hasSearched = ref(false);

function goPortal() {
  void router.push({ name: "portal" });
}

function createdText(booking: LookupBooking): string {
  const d = new Date(booking.createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

async function onSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid || isLoading.value) return;

  isLoading.value = true;
  try {
    bookings.value = await lookupBookings(form.name ?? "", form.twid ?? "");
    hasSearched.value = true;
  } catch (err) {
    bookings.value = [];
    hasSearched.value = false;
    $q.notify({
      type: "negative",
      message: err instanceof Error ? err.message : "查詢失敗，請稍後再試",
      position: "top",
      timeout: 5000,
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped lang="scss">
.lookup-page {
  &__back {
    padding: 4px var(--edge-pad-x) 10px;

    :deep(.q-btn) {
      margin-left: -8px;
    }
  }

  &__hero {
    padding: 4px var(--edge-pad-x) 22px;
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

  &__block {
    margin-bottom: var(--card-gap);
    padding: 22px var(--content-pad-x) 24px;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__result-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--hairline);
  }

  &__order {
    margin: 4px 0 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  &__created {
    margin: 0;
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--text-muted);
  }

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

  &__info {
    margin: 16px 0 0;
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
    }
  }

  &__people-title {
    margin-top: 20px;
  }

  &__count {
    margin-left: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--q-primary);
  }

  &__people {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 10px;
      padding: 9px 0;
      border-bottom: 1px dashed var(--hairline);
    }
  }

  &__person-name {
    font-size: 14px;
    font-weight: 700;
  }

  &__person-meta {
    font-size: 12px;
    color: var(--text-muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
      font-size: 13.5px;
      line-height: 1.8;
      color: var(--text-muted);
    }
  }
}
</style>
